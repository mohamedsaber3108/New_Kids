// Phase A (backend-only) improvements: evidence taxonomy + mastery confidence (L1/L2),
// guardian weekly activity + world balance (P1 data), AI coaching modes (A2), model routing (A1).
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHash,randomBytes,randomUUID} from 'node:crypto';
import {createApp} from '../server/app.mjs';
import {loadConfig} from '../server/config.mjs';
import {evidenceKind,worldInsights,weeklyActivity} from '../server/engines/insights.mjs';
import {coachingMode,chooseModel,systemPrompt} from '../server/providers/ai.mjs';
import {worlds,missions} from '../src/data.js';

const DAY=86400000,NOW=Date.parse('2026-11-04T12:00:00Z');
const worldOfMission=id=>missions.find(m=>m.id===id)?.world;
const codingMission=missions.find(m=>m.world==='coding').id;

// ---------- evidence taxonomy ----------
test('evidence taxonomy maps every activity kind to a learning-evidence kind',()=>{
 assert.equal(evidenceKind({kind:'quiz'}),'knowledge');
 assert.equal(evidenceKind({kind:'ENGLISH_SKILL',detail:{track:'writing'}}),'production');
 assert.equal(evidenceKind({kind:'ENGLISH_SKILL',detail:{track:'vocabulary'}}),'knowledge');
 assert.equal(evidenceKind({kind:'CODE_CHALLENGE'}),'problem_solving');
 assert.equal(evidenceKind({kind:'STORY_PATH'}),'reflection');
 for(const k of ['AI_TOPIC','THINKING_CASE','AI_TRUTH','SIMULATION','SIMULATION_CASE','AGE_CHALLENGE'])assert.equal(evidenceKind({kind:k}),'application');
 assert.equal(evidenceKind({source:'project'}),'creation');
 assert.equal(evidenceKind({source:'reflection'}),'reflection');
});

// ---------- mastery confidence ----------
test('no evidence -> NOT_STARTED with null confidence (never a guess)',()=>{
 const r=worldInsights({evidence:[],projects:[],worlds,worldOfMission,now:NOW});
 for(const w of worlds){assert.equal(r[w.id].status,'NOT_STARTED');assert.equal(r[w.id].confidence,null)}
});

test('confidence follows the documented formula and rewards varied, spaced evidence',()=>{
 const at=d=>new Date(NOW-d*DAY).toISOString();
 // One perfect quiz today: success 1, 1 kind (0.25), 1 day (0.2), recency 1 -> 0.6+0.05+0.04 = 0.69
 const single=worldInsights({evidence:[{kind:'quiz',missionId:codingMission,score:3,total:3,at:at(0)}],worlds,worldOfMission,now:NOW}).coding;
 assert.equal(single.confidence,0.69);assert.equal(single.status,'GETTING_STRONGER');assert.deepEqual(single.kinds,['knowledge']);
 // Same success, but 4 kinds over 5 days -> 0.6+0.2+0.2 = 1.0
 const varied=worldInsights({evidence:[
  {kind:'quiz',missionId:codingMission,score:3,total:3,at:at(0)},
  {kind:'CODE_CHALLENGE',world:'coding',score:1,total:1,at:at(1)},
  {kind:'AGE_CHALLENGE',world:'coding',score:1,total:1,at:at(2)},
  {kind:'quiz',missionId:codingMission,score:3,total:3,at:at(3)}],
  projects:[{world:'coding',at:at(4),updatedAt:at(4),notes:[{stage:'REFLECTION',updatedAt:at(4)}]}],worlds,worldOfMission,now:NOW}).coding;
 assert.equal(varied.confidence,1);assert.equal(varied.status,'ALMOST_MASTERED','never MASTERED without the authoritative rule');
 assert.equal(varied.learningDays,5);
});

test('old strong evidence becomes REVIEW_NEEDED; MASTERED comes only from the authoritative rule',()=>{
 const old=new Date(NOW-30*DAY).toISOString();
 const ev=[{kind:'quiz',missionId:codingMission,score:3,total:3,at:old},{kind:'CODE_CHALLENGE',world:'coding',score:1,total:1,at:old}];
 assert.equal(worldInsights({evidence:ev,worlds,worldOfMission,now:NOW}).coding.status,'REVIEW_NEEDED');
 assert.equal(worldInsights({evidence:ev,worlds,worldOfMission,now:NOW,authoritativeMastery:{coding:'MASTERED'}}).coding.status,'MASTERED');
});

test('next step is evidence-based (low scores -> practise; no project -> create)',()=>{
 const today=new Date(NOW).toISOString();
 assert.match(worldInsights({evidence:[{kind:'quiz',missionId:codingMission,score:0,total:3,at:today}],worlds,worldOfMission,now:NOW}).coding.nextStep,/lower scores/);
 assert.match(worldInsights({evidence:[{kind:'quiz',missionId:codingMission,score:3,total:3,at:today}],worlds,worldOfMission,now:NOW}).coding.nextStep,/project/);
});

// ---------- weekly activity ----------
test('weekly activity: 7 days of measured minutes and a 28-day world balance',()=>{
 const day=d=>new Date(NOW-d*DAY).toISOString().slice(0,10);
 const r=weeklyActivity({usageByDay:[{day:day(0),minutes:12},{day:day(2),minutes:5},{day:day(9),minutes:99}],
  evidence:[{kind:'quiz',missionId:codingMission,at:new Date(NOW).toISOString()},{kind:'ENGLISH_SKILL',world:'english',at:new Date(NOW-DAY).toISOString()},{kind:'AI_TOPIC',world:'ai',at:new Date(NOW-40*DAY).toISOString()}],
  worlds,worldOfMission,now:NOW});
 assert.equal(r.days.length,7);assert.equal(r.days[6].day,day(0));assert.equal(r.days[6].minutes,12);
 assert.equal(r.totalMinutes,17,'minutes outside the 7-day window are excluded');assert.equal(r.activeDays,2);
 const share=Object.fromEntries(r.worldBalance.map(w=>[w.worldId,w.share]));
 assert.deepEqual([share.coding,share.english,share.ai],[0.5,0.5,0],'evidence older than 28 days excluded');
});

// ---------- API wiring + privacy ----------
async function start(opts={}){
 const app=createApp({database:':memory:',secureCookies:false,publicOrigin:'',...opts});
 await new Promise(r=>app.server.listen(0,'127.0.0.1',r));
 const base='http://127.0.0.1:'+app.server.address().port;
 const call=async(path,{method='GET',body,cookie}={})=>{const res=await fetch(base+path,{method,headers:{...(body?{'Content-Type':'application/json'}:{}),...(method!=='GET'?{Origin:base}:{}),...(cookie?{Cookie:cookie}:{})},body:body?JSON.stringify(body):undefined});return {status:res.status,data:await res.json()}};
 const h=t=>createHash('sha256').update(t).digest('hex'),at=new Date().toISOString();
 const mint=()=>{const gid=randomUUID(),lid=randomUUID(),lt=randomBytes(32).toString('base64url'),gt=randomBytes(32).toString('base64url');
  app.db.prepare('INSERT INTO users(id,role,email,password_hash,display_name,guardian_approved_at,created_at) VALUES(?,?,?,?,?,?,?)').run(gid,'GUARDIAN',gid+'@example.test','x','Parent',at,at);
  app.db.prepare('INSERT INTO learners(id,guardian_id,nickname,age_band,age_year,created_at) VALUES(?,?,?,?,?,?)').run(lid,gid,'Kid','10-12',10,at);
  app.db.prepare('INSERT INTO sessions VALUES(?,?,?,?,?)').run(h(lt),gid,lid,Date.now()+3600_000,at);
  app.db.prepare('INSERT INTO sessions VALUES(?,?,?,?,?)').run(h(gt),gid,null,Date.now()+3600_000,at);
  return {learnerId:lid,learner:'kids_session='+lt,guardian:'kids_session='+gt}};
 return {app,call,mint,stop:()=>new Promise(r=>app.server.close(()=>{app.db.close();r()}))};
}

test('guardian views include insights built from real evidence and server-measured minutes',async()=>{
 const t=await start();
 try{
  const f=t.mint();
  await t.call('/api/attempts',{method:'POST',cookie:f.learner,body:{missionId:'coding-square',answers:[0,1,0]}});
  for(let i=0;i<3;i++)await t.call('/api/usage/heartbeat',{method:'POST',cookie:f.learner,body:{}});
  const today=new Date().toISOString().slice(0,10);
  t.app.db.prepare('INSERT OR IGNORE INTO learner_usage_minutes VALUES(?,?,?,?)').run(f.learnerId,today,today+'T00:01',new Date().toISOString());
  const overview=(await t.call('/api/guardian/children/'+f.learnerId+'/overview',{cookie:f.guardian})).data;
  assert.ok(overview.insights,'overview has insights');
  assert.equal(overview.insights.worlds.coding.evidenceCount,1);assert.equal(typeof overview.insights.worlds.coding.confidence,'number');
  assert.equal(overview.insights.worlds.english.status,'NOT_STARTED');
  assert.ok(overview.insights.weekly.days.at(-1).minutes>=1,'today shows measured minutes');
  assert.equal(overview.insights.weekly.worldBalance.find(w=>w.worldId==='coding').share,1);
  assert.ok((await t.call('/api/parents/children/'+f.learnerId+'/progress',{cookie:f.guardian})).data.insights);
  assert.ok((await t.call('/api/parents/children/'+f.learnerId+'/dashboard',{cookie:f.guardian})).data.insights);
  assert.ok((await t.call('/api/guardian/children/'+f.learnerId+'/export',{cookie:f.guardian})).data.insights,'export includes insights');
 }finally{await t.stop()}
});

test('children never receive insights or confidence numbers; other guardians are blocked',async()=>{
 const t=await start();
 try{
  const f=t.mint(),other=t.mint();
  await t.call('/api/attempts',{method:'POST',cookie:f.learner,body:{missionId:'coding-square',answers:[0,1,0]}});
  const snap=(await t.call('/api/learners/'+f.learnerId+'/snapshot',{cookie:f.learner})).data;
  assert.equal(snap.insights,undefined);assert.ok(!JSON.stringify(snap).includes('"confidence"'),'no confidence anywhere in the learner snapshot');
  assert.equal((await t.call('/api/guardian/children/'+f.learnerId+'/overview',{cookie:f.learner})).status,403,'learner cannot read guardian overview');
  assert.equal((await t.call('/api/guardian/children/'+f.learnerId+'/overview',{cookie:other.guardian})).status,403,'unlinked guardian blocked');
 }finally{await t.stop()}
});

// ---------- AI coaching modes + model routing ----------
test('coaching mode: mission subject wins, otherwise the companion role',()=>{
 assert.equal(coachingMode({companionId:'codey'}),'coding');
 assert.equal(coachingMode({companionId:'luma'}),'english');
 assert.equal(coachingMode({companionId:'nova'}),'ai');
 assert.equal(coachingMode({companionId:'azouz'}),'general');
 assert.equal(coachingMode({companionId:'codey',missionWorld:'english'}),'english');
 assert.match(systemPrompt({companion:'Codey',ageBand:'10-12',mode:'coding'}),/Never write the full solution/);
 assert.match(systemPrompt({companion:'Luma',ageBand:'7-9',mode:'english'}),/recast/);
 assert.match(systemPrompt({companion:'X',ageBand:'7-9',mode:'coding'}),/never ask for or repeat personal information/i,'safety rules always present');
});

test('model routing: short hint requests use the fast model; others use the main model',()=>{
 const s={model:'strong-model',modelFast:'fast-model'};
 assert.equal(chooseModel(s,'hint please'),'fast-model');
 assert.equal(chooseModel(s,'أعطني تلميح'),'fast-model');
 assert.equal(chooseModel(s,'x'.repeat(120)),'strong-model');
 assert.equal(chooseModel({model:'only-model'},'hint please'),'only-model','no fast model configured -> main model');
 assert.equal(loadConfig({AI_PROVIDER:'openai',AI_API_KEY:'k',AI_MODEL:'m',AI_MODEL_FAST:'f'}).ai.modelFast,'f');
});

test('end to end: live AI request carries the coaching mode and the routed model, logged per call',async()=>{
 const seen=[];
 const fetchImpl=async(url,init)=>{const body=JSON.parse(init.body);seen.push({model:body.model,system:body.messages[0].content});return {ok:true,status:200,json:async()=>({choices:[{message:{content:'Which step should we check first?'}}],usage:{}}),headers:{get:()=>null}}};
 const t=await start({aiSettings:{provider:'openai',key:'k',model:'strong-model',modelFast:'fast-model',dailyLimit:20,timeoutMs:2000,maxTokens:200,maxReplyChars:600},fetchImpl});
 try{
  const f=t.mint();
  await t.call('/api/guardian/children/'+f.learnerId+'/controls',{method:'PATCH',cookie:f.guardian,body:{guidesEnabled:true,voiceEnabled:true,liveAiAllowed:true}});
  const r1=await t.call('/api/assist',{method:'POST',cookie:f.learner,body:{message:'hint please',companionId:'codey'}});
  assert.equal(r1.data.mode,'LIVE_AI');
  const long='My robot keeps turning the wrong way after the second move and I do not understand why it happens every time I run it';
  await t.call('/api/assist',{method:'POST',cookie:f.learner,body:{message:long,companionId:'codey'}});
  assert.deepEqual(seen.map(s=>s.model),['fast-model','strong-model']);
  assert.ok(seen.every(s=>/Never write the full solution/.test(s.system)),'Codey uses the coding coaching mode');
  assert.deepEqual(t.app.db.prepare('SELECT model FROM ai_usage ORDER BY created_at').all().map(r=>r.model),['fast-model','strong-model']);
 }finally{await t.stop()}
});

test('rewards contract: /gamification/progression includes the server streak the Rewards page reads',async()=>{
 const t=await start();
 try{
  const f=t.mint();
  const before=(await t.call('/api/gamification/progression',{cookie:f.learner})).data;
  assert.equal(before.streak,0,'no activity -> streak 0');
  await t.call('/api/attempts',{method:'POST',cookie:f.learner,body:{missionId:'coding-square',answers:[0,1,0]}});
  const after=(await t.call('/api/gamification/progression',{cookie:f.learner})).data;
  assert.equal(after.streak,1,'activity today -> streak 1');
  for(const k of ['xp','level','nextLevelXp','coins','streak'])assert.equal(typeof after[k],'number',k);
 }finally{await t.stop()}
});
