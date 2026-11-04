// Phase B: hint-usage tracking — real API (POST /api/hints, guardian overview insights.hints),
// real database, and the real guardian/learner components rendered from real API JSON.
import {test,before,after} from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {mkdtempSync,mkdirSync,writeFileSync,rmSync} from 'node:fs';
import {join} from 'node:path';
import {pathToFileURL,fileURLToPath} from 'node:url';
import {createHash,randomBytes,randomUUID} from 'node:crypto';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {createApp} from '../server/app.mjs';
import {hintSummary} from '../server/engines/insights.mjs';
import {worlds,missions} from '../src/data.js';
import {ageChallenges} from '../src/age-challenges.js';
import {codingChallenges} from '../src/coding-content.js';

let t,dir,ui;
before(async()=>{
 const cache=fileURLToPath(new URL('../node_modules/.cache/',import.meta.url));mkdirSync(cache,{recursive:true});dir=mkdtempSync(join(cache,'usam-hint-'));
 ui={};
 for(const name of ['guardian-details','coding-challenges','age-challenges']){
  const out=await build({entryPoints:[fileURLToPath(new URL('../src/'+name+'.jsx',import.meta.url))],bundle:true,format:'esm',platform:'node',write:false,external:['react','react-dom','lucide-react'],logLevel:'silent'});
  const file=join(dir,name+'.mjs');writeFileSync(file,out.outputFiles[0].text);ui[name]=await import(pathToFileURL(file).href);
 }
 const app=createApp({database:':memory:',secureCookies:false,publicOrigin:''});
 await new Promise(r=>app.server.listen(0,'127.0.0.1',r));
 const base='http://127.0.0.1:'+app.server.address().port;
 const call=async(path,{method='GET',body,cookie}={})=>{const res=await fetch(base+path,{method,headers:{...(body?{'Content-Type':'application/json'}:{}),...(method!=='GET'?{Origin:base}:{}),...(cookie?{Cookie:cookie}:{})},body:body?JSON.stringify(body):undefined});return {status:res.status,data:await res.json()}};
 const h=x=>createHash('sha256').update(x).digest('hex'),at=new Date().toISOString();
 const mint=()=>{const gid=randomUUID(),lid=randomUUID(),lt=randomBytes(32).toString('base64url'),gt=randomBytes(32).toString('base64url');
  app.db.prepare('INSERT INTO users(id,role,email,password_hash,display_name,guardian_approved_at,created_at) VALUES(?,?,?,?,?,?,?)').run(gid,'GUARDIAN',gid+'@example.test','x','Parent',at,at);
  app.db.prepare('INSERT INTO learners(id,guardian_id,nickname,age_band,age_year,created_at) VALUES(?,?,?,?,?,?)').run(lid,gid,'Kid','10-12',10,at);
  app.db.prepare('INSERT INTO sessions VALUES(?,?,?,?,?)').run(h(lt),gid,lid,Date.now()+3600_000,at);
  app.db.prepare('INSERT INTO sessions VALUES(?,?,?,?,?)').run(h(gt),gid,null,Date.now()+3600_000,at);
  return {guardianId:gid,learnerId:lid,learner:'kids_session='+lt,guardian:'kids_session='+gt}};
 t={app,call,mint,count:lid=>app.db.prepare('SELECT count(*) AS n FROM hint_events WHERE learner_id=?').get(lid).n};
});
after(async()=>{await new Promise(r=>t.app.server.close(r));t.app.db.close();rmSync(dir,{recursive:true,force:true})});

const hint=(f,body)=>t.call('/api/hints',{method:'POST',cookie:f.learner,body});
const startSession=async f=>(await t.call('/api/learning-sessions',{method:'POST',cookie:f.learner,body:{missionId:'coding-square',mode:'MISSION'}})).data.session.id;

// ---------------- recording ----------------
test('mission hint is recorded with server-derived learner/mission/world/step; retries are idempotent',async()=>{
 const f=t.mint(),sid=await startSession(f),mission=missions.find(m=>m.id==='coding-square');
 // Exactly the payload SessionPlayer sends: {source,sessionId:id,step:session.answers.length}
 const first=await hint(f,{source:'MISSION',sessionId:sid,step:0,world:'english',itemId:'forged'});
 assert.equal(first.status,201);assert.equal(first.data.recorded,true);
 const retry=await hint(f,{source:'MISSION',sessionId:sid,step:0});
 assert.equal(retry.status,200);assert.equal(retry.data.duplicate,true);
 const burst=await Promise.all(Array.from({length:6},()=>hint(f,{source:'MISSION',sessionId:sid,step:0})));
 assert.ok(burst.every(r=>r.status===200&&r.data.duplicate),'parallel duplicates are not new records');
 assert.equal(t.count(f.learnerId),1);
 const row=t.app.db.prepare('SELECT * FROM hint_events WHERE learner_id=?').get(f.learnerId);
 assert.deepEqual({source:row.source,world:row.world,item:row.item_id,step:row.step,session:row.session_id},{source:'MISSION',world:mission.world,item:'coding-square',step:0,session:sid},'client-sent world/itemId are ignored');
 // Next question after answering q0; a late hint for q0 (racing the answer) stays a duplicate.
 await t.call('/api/learning-sessions/'+sid,{method:'PATCH',cookie:f.learner,body:{choice:0}});
 assert.equal((await hint(f,{source:'MISSION',sessionId:sid,step:1})).status,201);
 assert.equal((await hint(f,{source:'MISSION',sessionId:sid,step:0})).data.duplicate,true);
 assert.equal(t.count(f.learnerId),2);
 // A new practice session for the same mission is a genuinely new use.
 const sid2=(await t.call('/api/learning-sessions',{method:'POST',cookie:f.learner,body:{missionId:'coding-square',mode:'PRACTICE'}})).data.session.id;
 assert.equal((await hint(f,{source:'MISSION',sessionId:sid2,step:0})).status,201);
 assert.equal(t.count(f.learnerId),3);
});

test('invalid identifiers and undisplayable hints are rejected and never counted',async()=>{
 const f=t.mint(),other=t.mint(),sid=await startSession(f),otherSid=await startSession(other);
 const bad=[
  [{source:'MISSION',sessionId:sid,step:2},400,'question ahead of the learner progress'],
  [{source:'MISSION',sessionId:sid,step:99},400,'question index out of range'],
  [{source:'MISSION',sessionId:sid,step:-1},400,'negative index'],
  [{source:'MISSION',sessionId:sid},400,'missing step'],
  [{source:'MISSION',sessionId:'not-a-session',step:0},400,'malformed session id'],
  [{source:'MISSION',sessionId:'session-'+randomUUID(),step:0},404,'unknown session'],
  [{source:'MISSION',sessionId:otherSid,step:0},404,'another learner\'s session'],
  [{source:'AGE_CHALLENGE',itemId:'age-99-nothing'},400,'unknown age challenge'],
  [{source:'CODE_CHALLENGE',itemId:'no-such-route'},400,'unknown coding challenge'],
  [{source:'CODE_CHALLENGE',itemId:123},400,'non-string id'],
  [{source:'AI_CHAT'},400,'unsupported source'],
  [{},400,'empty body'],
 ];
 for(const [body,status,why] of bad){const r=await hint(f,body);assert.equal(r.status,status,why+' -> '+JSON.stringify(r.data))}
 assert.equal(t.count(f.learnerId),0,'nothing recorded for rejected requests');
 assert.equal(t.count(other.learnerId),0,'nothing recorded against the other learner');
});

test('challenge hints: exact component payloads, one count per challenge per UTC day',async()=>{
 const f=t.mint(),age=ageChallenges[0],code=codingChallenges[0];
 assert.equal((await hint(f,{source:'AGE_CHALLENGE',itemId:age.id})).status,201);
 assert.equal((await hint(f,{source:'AGE_CHALLENGE',itemId:age.id})).data.duplicate,true,'Reset/re-reveal the same day is not double counted');
 assert.equal((await hint(f,{source:'CODE_CHALLENGE',itemId:code.id})).status,201);
 const rows=t.app.db.prepare('SELECT source,world,item_id AS item FROM hint_events WHERE learner_id=? ORDER BY source').all(f.learnerId).map(r=>({...r}));
 assert.deepEqual(rows,[{source:'AGE_CHALLENGE',world:age.world,item:age.id},{source:'CODE_CHALLENGE',world:'coding',item:code.id}]);
});

test('authentication: only an authenticated learner can record; rate limited',async()=>{
 const f=t.mint();
 assert.equal((await t.call('/api/hints',{method:'POST',body:{source:'AGE_CHALLENGE',itemId:ageChallenges[0].id}})).status,401,'anonymous');
 assert.equal((await t.call('/api/hints',{method:'POST',cookie:f.guardian,body:{source:'AGE_CHALLENGE',itemId:ageChallenges[0].id}})).status,403,'guardian session');
 const statuses=[];for(let i=0;i<62;i++)statuses.push((await hint(f,{source:'AGE_CHALLENGE',itemId:ageChallenges[i%ageChallenges.length].id})).status);
 assert.ok(statuses.includes(429),'hint flooding is throttled');
});

test('privacy: metadata only, removed with the child, never in child-facing data',async()=>{
 const cols=t.app.db.prepare('PRAGMA table_info(hint_events)').all().map(c=>c.name);
 assert.deepEqual(cols,['id','learner_id','source','world','item_id','step','session_id','dedupe_key','created_at']);
 const f=t.mint(),sid=await startSession(f);await hint(f,{source:'MISSION',sessionId:sid,step:0});
 const snap=(await t.call('/api/learners/'+f.learnerId+'/snapshot',{cookie:f.learner})).data;
 assert.equal(snap.insights,undefined);assert.ok(!JSON.stringify(snap).includes('hint_events')&&!('hints' in snap));
 t.app.db.prepare('DELETE FROM learners WHERE id=?').run(f.learnerId);
 assert.equal(t.count(f.learnerId),0,'cascade delete');
});

// ---------------- summaries ----------------
test('aggregation: whole UTC-day 7- and 28-day windows, by world, type and mission',()=>{
 const now=Date.parse('2026-11-04T09:00:00Z'),day=d=>new Date(Date.parse('2026-11-04T00:00:00Z')-d*86400000+3600_000).toISOString();
 const ev=[
  {source:'MISSION',world:'coding',itemId:'coding-square',at:day(0)},
  {source:'MISSION',world:'coding',itemId:'coding-square',at:day(6)},       // still inside 7 days
  {source:'AGE_CHALLENGE',world:'english',itemId:'x',at:day(7)},           // outside 7, inside 28
  {source:'CODE_CHALLENGE',world:'coding',itemId:'y',at:day(27)},          // last day of 28
  {source:'MISSION',world:'ai',itemId:'ai-1',at:day(28)},                  // outside 28
 ];
 const s=hintSummary({events:ev,worlds,now});
 assert.equal(s.last7Days,2);assert.equal(s.last28Days,4);
 assert.deepEqual(Object.fromEntries(s.byWorld.map(w=>[w.worldId,w.count])),{english:1,coding:3,ai:0,creativity:0,thinking:0});
 assert.deepEqual(s.bySource,{MISSION:2,AGE_CHALLENGE:1,CODE_CHALLENGE:1});
 assert.deepEqual(s.topMissions,[{missionId:'coding-square',count:2}]);
 assert.equal(s.windows.timezone,'UTC');
 const empty=hintSummary({events:[],worlds,now});assert.equal(empty.last7Days,0);assert.equal(empty.last28Days,0);assert.deepEqual(empty.topMissions,[]);
});

test('guardian overview reports authoritative hint usage; family isolation and child denial',async()=>{
 const f=t.mint(),other=t.mint(),sid=await startSession(f);
 const empty=(await t.call('/api/guardian/children/'+f.learnerId+'/overview',{cookie:f.guardian})).data.insights.hints;
 assert.equal(empty.last7Days,0);assert.equal(empty.last28Days,0);
 await hint(f,{source:'MISSION',sessionId:sid,step:0});await hint(f,{source:'MISSION',sessionId:sid,step:0});
 await hint(f,{source:'CODE_CHALLENGE',itemId:codingChallenges[0].id});
 // An older event (10 days ago) counts for 28 days only.
 t.app.db.prepare('INSERT INTO hint_events(id,learner_id,source,world,item_id,step,session_id,dedupe_key,created_at) VALUES(?,?,?,?,?,?,?,?,?)').run(randomUUID(),f.learnerId,'AGE_CHALLENGE','english',ageChallenges[0].id,null,null,'old-1',new Date(Date.now()-10*86400000).toISOString());
 const s=(await t.call('/api/guardian/children/'+f.learnerId+'/overview',{cookie:f.guardian})).data.insights.hints;
 assert.equal(s.last7Days,2,'duplicate reveal not double counted');assert.equal(s.last28Days,3);
 assert.equal(s.byWorld.find(w=>w.worldId==='coding').count,2);assert.equal(s.topMissions[0].missionId,'coding-square');
 assert.ok((await t.call('/api/guardian/children/'+f.learnerId+'/export',{cookie:f.guardian})).data.insights.hints,'included in guardian export');
 assert.equal((await t.call('/api/guardian/children/'+f.learnerId+'/overview',{cookie:other.guardian})).status,403,'other family');
 assert.equal((await t.call('/api/guardian/children/'+f.learnerId+'/overview',{cookie:f.learner})).status,403,'child');
 assert.equal((await t.call('/api/guardian/children/'+f.learnerId+'/overview')).status,401,'anonymous');
});

test('hint tracking never grants AI permission; consent controls unchanged',async()=>{
 const f=t.mint(),sid=await startSession(f);await hint(f,{source:'MISSION',sessionId:sid,step:0});
 const controls=(await t.call('/api/guardian/children/'+f.learnerId+'/controls',{cookie:f.guardian})).data.controls;
 assert.equal(controls.liveAiAllowed,false);assert.equal(controls.liveAiAvailable,false);
 assert.equal((await t.call('/api/assist',{method:'POST',cookie:f.learner,body:{message:'hint please',companionId:'codey'}})).data.mode,'GUIDED_RULES');
});

// ---------------- frontend components (real code, real API JSON) ----------------
const tr=lang=>(ar,en)=>lang==='ar'?ar:en;
const html=(C,props,lang)=>{const out=renderToStaticMarkup(React.createElement(C,{...props,tr:tr(lang),lang}));assert.ok(!/NaN|undefined|\[object Object\]/.test(out),'no broken values');return out};

test('guardian Activity tab: hint summary in English and Arabic, empty and populated',async()=>{
 const f=t.mint();
 let ov=(await t.call('/api/guardian/children/'+f.learnerId+'/overview',{cookie:f.guardian})).data;
 const emptyEn=html(ui['guardian-details'].GuardianActivity,{overview:ov},'en');
 assert.match(emptyEn,/Hints used/);assert.match(emptyEn,/No hints used in the last 28 days/);assert.match(emptyEn,/they are not a score and do not mean your child is struggling/);
 assert.match(emptyEn,/Tracked activity, last 7 days/,'existing weekly section still present');assert.match(emptyEn,/Activity timeline/,'existing timeline still present');
 const sid=await startSession(f);await hint(f,{source:'MISSION',sessionId:sid,step:0});await hint(f,{source:'CODE_CHALLENGE',itemId:codingChallenges[0].id});
 ov=(await t.call('/api/guardian/children/'+f.learnerId+'/overview',{cookie:f.guardian})).data;
 const en=html(ui['guardian-details'].HintInsight,{hints:ov.insights.hints},'en');
 assert.match(en,/2 in the last 7 days/);assert.match(en,/2 in the last 28 days/);assert.match(en,/Missions 1 · Age challenges 0 · Coding challenges 1/);
 assert.ok(en.includes(missions.find(m=>m.id==='coding-square').en),'mission title resolved');
 const ar=html(ui['guardian-details'].HintInsight,{hints:ov.insights.hints},'ar');
 assert.match(ar,/التلميحات المستخدمة/);assert.match(ar,/٢ في آخر ٧ أيام/);assert.match(ar,/وليست درجة ولا تعني أن طفلك يواجه صعوبة/);
 delete ov.insights.hints;
 assert.ok(!html(ui['guardian-details'].GuardianActivity,{overview:ov},'en').includes('Hints used'),'older servers without hints: section hidden, screen intact');
});

test('learner hint screens render exactly as before (hint hidden until revealed; works without recordHint)',()=>{
 const code=codingChallenges[0];
 const withProp=html(ui['coding-challenges'].CodingChallenges,{id:code.id,nav:()=>{},recordActivity:async()=>({}),recordHint:()=>{}},'en');
 const without=html(ui['coding-challenges'].CodingChallenges,{id:code.id,nav:()=>{},recordActivity:async()=>({})},'en');
 assert.equal(withProp,without,'identical markup with or without tracking');
 assert.match(withProp,/Hint/);assert.ok(!withProp.includes(code.hintEn),'hint text not shown before the learner asks');
});
