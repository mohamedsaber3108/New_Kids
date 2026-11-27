// T-23: guardian export and child deletion must cover every table that holds child data.
// Tables are discovered from sqlite_master and foreign keys, so a new table cannot be missed.
// Known gaps are listed explicitly and shown as test.todo; nothing here is faked to pass.
import {test,before,after} from 'node:test';
import assert from 'node:assert/strict';
import {createHash,randomBytes,randomUUID} from 'node:crypto';
import {createApp} from '../server/app.mjs';

const MARK='Mangrove';
let app,call,f,exp,rowsBefore,tables,childTables;
const h=x=>createHash('sha256').update(x).digest('hex');

// Tables that reference learners directly or through another child table (foreign keys).
function discoverChildTables(db){
  const all=db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").all().map(r=>r.name);
  const parents=Object.fromEntries(all.map(t=>[t,db.prepare(`PRAGMA foreign_key_list(${t})`).all().map(r=>r.table)]));
  const child=new Set(['learners']);
  for(let changed=true;changed;){changed=false;for(const t of all)if(!child.has(t)&&parents[t].some(p=>child.has(p))){child.add(t);changed=true}}
  // users-level tables (password_resets, email_verifications, guardian_consents, subscriptions) are guardian data, not child data.
  return {all,child:[...child]};
}

// Export content found per table. A table is "covered" when its predicate holds on the export JSON.
const covered={
  learners:d=>d.learner?.nickname==='Mango Kid',
  learner_preferences:d=>d.preferences?.companion==='codey',
  guardian_goals:d=>d.goal?.weeklyMissions===3,
  learner_controls:d=>d.controls&&'guidesEnabled' in d.controls,
  learner_time_limits:d=>d.timeLimits?.dailyMinutes===45,
  daily_goals:d=>d.dailyGoal?.target===2,
  placements:d=>!!d.placement,
  attempts:d=>d.attempts.length>0,
  activities:d=>d.activities.length>0,
  projects:d=>d.projects.some(p=>p.body.includes(MARK)),
  project_notes:d=>d.projects.some(p=>p.notes.some(n=>n.body.includes(MARK))),
  learning_sessions:d=>d.sessions.length>0, // IN_PROGRESS rows only; see exportGaps
  conversations:d=>d.conversations.length>0,
  conversation_messages:d=>d.conversations.some(c=>c.messages.length>0),
};
// Known export gaps (table holds child rows, export does not return them). Keep in sync: the
// test fails if a table moves between lists without this file being updated.
const exportGaps=['sessions','learner_usage_minutes','learner_cosmetics','streak_freezes','gamification_wallets','learning_sessions (COMPLETE rows)','project_milestones','project_showcase_requests','reports','hint_events','ai_usage'];
// Known deletion leftovers: rows that still exist after DELETE /api/guardian/children/:id.
const deleteLeftovers=['audit','reports'];

before(async()=>{
  app=createApp({database:':memory:',secureCookies:false,publicOrigin:''});
  await new Promise(r=>app.server.listen(0,'127.0.0.1',r));
  const base='http://127.0.0.1:'+app.server.address().port;
  call=async(path,{method='GET',body,cookie}={})=>{const res=await fetch(base+path,{method,headers:{...(body?{'Content-Type':'application/json'}:{}),...(method!=='GET'?{Origin:base}:{}),...(cookie?{Cookie:cookie}:{})},body:body?JSON.stringify(body):undefined});return {status:res.status,data:await res.json()}};
  const at=new Date().toISOString(),gid=randomUUID(),lid=randomUUID(),lt=randomBytes(32).toString('base64url'),gt=randomBytes(32).toString('base64url');
  app.db.prepare('INSERT INTO users(id,role,email,password_hash,display_name,guardian_approved_at,created_at) VALUES(?,?,?,?,?,?,?)').run(gid,'GUARDIAN',gid+'@example.test','x','Parent',at,at);
  app.db.prepare('INSERT INTO learners(id,guardian_id,nickname,age_band,age_year,created_at) VALUES(?,?,?,?,?,?)').run(lid,gid,'Mango Kid','10-12',10,at);
  app.db.prepare('INSERT INTO sessions VALUES(?,?,?,?,?)').run(h(lt),gid,lid,Date.now()+3600_000,at);
  app.db.prepare('INSERT INTO sessions VALUES(?,?,?,?,?)').run(h(gt),gid,null,Date.now()+3600_000,at);
  f={guardianId:gid,learnerId:lid,learner:'kids_session='+lt,guardian:'kids_session='+gt};
  const L=(path,method,body)=>call(path,{method,cookie:f.learner,body}),G=(path,method,body)=>call(path,{method,cookie:f.guardian,body});
  const ok=async(p,codes=[200,201,202])=>{const r=await p;assert.ok(codes.includes(r.status),JSON.stringify(r));return r};
  // Learner-side data through the API.
  await ok(L('/api/learner/preferences','POST',{language:'en',interest:'coding',goal:'make',build:'game',companion:'codey'}));
  await ok(L('/api/placement','POST',{answers:[1,2,0,1,2,0,1,2,0,1]}));
  await ok(L('/api/daily-goals/me','PUT',{target:2}));
  const s1=(await ok(L('/api/learning-sessions','POST',{missionId:'coding-square',mode:'MISSION'}))).data.session.id;
  for(const choice of [0,1,0])await ok(L('/api/learning-sessions/'+s1,'PATCH',{choice}));
  await ok(L('/api/learning-sessions/'+s1+'/complete','POST',{}));
  const s2=(await ok(L('/api/learning-sessions','POST',{missionId:'coding-square',mode:'PRACTICE'}))).data.session.id;
  await ok(L('/api/hints','POST',{source:'MISSION',sessionId:s2,step:0}));
  await ok(L('/api/activities','POST',{kind:'CODE_LAB',payload:{steps:['move','move','left','move']}}));
  await ok(L('/api/usage/heartbeat','POST',{}));
  const project=(await ok(L('/api/projects','POST',{title:'My '+MARK+' garden',body:'A project about the '+MARK+' trees and how they grow.',world:'coding'}))).data.project.id;
  await ok(L('/api/projects/'+project+'/research','PATCH',{body:'Research note about '+MARK+' roots in water.'}));
  await ok(L('/api/projects/'+project+'/reflection','PATCH',{body:'Reflection note about '+MARK+' and what I learned.'}));
  await ok(L('/api/projects/'+project+'/milestones','POST',{title:'Draw the '+MARK+' tree'}));
  await ok(L('/api/projects/'+project+'/showcase','POST',{}));
  await ok(L('/api/assist','POST',{message:'Hello '+MARK+' helper',companionId:'codey',missionId:'coding-square'}));
  await ok(L('/api/reports','POST',{reason:'Something felt odd about '+MARK+' today'}));
  // Guardian-side data.
  await ok(G('/api/guardian/children/'+lid+'/goal','PATCH',{weeklyMissions:3,focusWorld:'coding',note:'Keep going'}));
  await ok(G('/api/guardian/children/'+lid+'/controls','PATCH',{guidesEnabled:true,voiceEnabled:true,liveAiAllowed:false}));
  await ok(G('/api/guardian/children/'+lid+'/time-limits','PATCH',{dailyMinutes:45,weeklyMinutes:300,bedtimeHour:21}));
  // Not reachable without earning coins or enabling a live provider: written directly.
  app.db.prepare('INSERT INTO learner_cosmetics VALUES(?,?,?,?)').run(lid,'green-trail',0,at);
  app.db.prepare('INSERT INTO streak_freezes VALUES(?,?,?)').run(lid,1,at);
  app.db.prepare('INSERT INTO gamification_wallets VALUES(?,?,?)').run(lid,5,at);
  app.db.prepare('INSERT INTO ai_usage(id,learner_id,provider,model,status,input_tokens,output_tokens,latency_ms,created_at) VALUES(?,?,?,?,?,?,?,?,?)').run(randomUUID(),lid,'test','m','OK',1,1,1,at);
  ({all:tables,child:childTables}=discoverChildTables(app.db));
  rowsBefore=Object.fromEntries(childTables.map(t=>[t,app.db.prepare(`SELECT count(*) AS n FROM ${t}`).get().n]));
  const e=await G('/api/guardian/children/'+lid+'/export','GET');
  assert.equal(e.status,200);exp=e.data;
});
after(async()=>{await new Promise(r=>app.server.close(r));app.db.close()});

test('every child-data table was seeded, so the checks below are not empty',()=>{
  for(const t of childTables)assert.ok(rowsBefore[t]>0,'no seeded rows in '+t);
});

test('every child table is classified as exported or as a known export gap',()=>{
  const unknown=childTables.filter(t=>!(t in covered)&&!exportGaps.includes(t));
  assert.deepEqual(unknown,[],'new child table not classified: '+unknown);
});

test('export contains the data of each covered table',()=>{
  for(const [t,check] of Object.entries(covered))assert.ok(childTables.includes(t)&&check(exp),'export misses '+t);
});

test('export gaps are real: a COMPLETE learning session and the listed tables are absent from the export',()=>{
  const json=JSON.stringify(exp);
  assert.ok(!json.includes('"COMPLETE"'),'completed sessions now appear: update exportGaps');
  assert.ok(!json.includes('green-trail')&&!json.includes('showcase')&&!json.includes('Draw the '+MARK),'a gap is now exported: update exportGaps');
});
for(const t of exportGaps)test.todo('KNOWN EXPORT GAP: guardian export omits '+t);

test('attempt answers are not in the export list (evidence route has them)',()=>{
  assert.ok(!('answers' in exp.attempts[0]),'attempts now include answers: update the data map');
});

test('DELETE needs confirm, then removes every row of the child from every table',async()=>{
  const G=(method,body)=>call('/api/guardian/children/'+f.learnerId,{method,cookie:f.guardian,body});
  assert.equal((await G('DELETE',{})).status,400);
  assert.equal(app.db.prepare('SELECT count(*) AS n FROM learners WHERE id=?').get(f.learnerId).n,1);
  assert.equal((await G('DELETE',{confirm:f.learnerId})).status,200);
  const left=[];
  for(const t of tables){
    const cols=app.db.prepare(`PRAGMA table_info(${t})`).all().filter(c=>c.type===''||/TEXT|CHAR/i.test(c.type)).map(c=>c.name);
    if(!cols.length)continue;
    const where=cols.map(c=>`${c} LIKE ?1 OR ${c} LIKE ?2`).join(' OR ');
    const n=app.db.prepare(`SELECT count(*) AS n FROM ${t} WHERE ${where}`).get('%'+f.learnerId+'%','%'+MARK+'%').n;
    if(n)left.push(t);
  }
  for(const t of childTables){
    if(t==='reports')continue; // reports keep a row on purpose today (learner_id NULL); listed in deleteLeftovers
    const direct=app.db.prepare(`PRAGMA table_info(${t})`).all().some(c=>c.name==='learner_id');
    const n=direct?app.db.prepare(`SELECT count(*) AS n FROM ${t} WHERE learner_id=?`).get(f.learnerId).n:app.db.prepare(`SELECT count(*) AS n FROM ${t}`).get().n;
    assert.equal(n,0,'rows remain in '+t);
  }
  assert.deepEqual(left.sort(),deleteLeftovers.slice().sort(),'leftover tables changed: update deleteLeftovers and the data map');
});
test.todo('KNOWN DELETE GAP: audit keeps the child id (LEARNER_CREATED/LEARNER_DELETED rows) after deletion');
test.todo('KNOWN DELETE GAP: reports keep the child-written reason text after deletion (learner_id is set to NULL)');
