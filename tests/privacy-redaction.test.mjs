import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHash,randomBytes,randomUUID} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {createApp} from '../server/app.mjs';

// T-07: synthetic personal values must never reach logs, ai_usage, audit, the email delivery log
// or the request sent to the AI provider. All values below are fake.
const PRIVATE={
 email:'sara.mostafa.fake@example.test',
 phoneLatin:'01012345678',
 phoneArabic:'٠١٠١٢٣٤٥٦٧٨',
 phoneSpaced:'010 1234 5678',
 fullName:'Youssef Abdelrahman Zaki',
 fullNameAr:'يوسف عبد الرحمن زكي',
 school:'Nile Bright Stars School',
 schoolAr:'مدرسة نجوم النيل',
 address:'27 Moonberry Street Toytown',
 addressAr:'شارع قوس قزح رقم ٢٧ بلدة اللعب'
};
// Distinctive fragments that must not appear anywhere outside the table that stores the user's own text.
const NEEDLES=[PRIVATE.email,PRIVATE.phoneLatin,PRIVATE.phoneArabic,PRIVATE.phoneSpaced,'1234 5678','Abdelrahman','Bright Stars','Moonberry Street','عبد الرحمن','نجوم النيل','قوس قزح'];

const okJson=(data,status=200)=>({ok:status>=200&&status<300,status,json:async()=>data,headers:{get:()=>null}});
const sha=t=>createHash('sha256').update(t).digest('hex');

async function startApp(){
 const logs=[],aiBodies=[],emailBodies=[],consoleLines=[];
 const fetchImpl=async(url,init)=>{
  const body=String(init?.body||'');
  if(/postmarkapp/.test(url)){emailBodies.push(body);return okJson({MessageID:'m1'})}
  aiBodies.push(body);
  return okJson({choices:[{message:{content:'What is the first step you could try?'}}],usage:{prompt_tokens:10,completion_tokens:5}});
 };
 const origError=console.error,origWarn=console.warn,origLog=console.log;
 console.error=(...a)=>{consoleLines.push(a.map(String).join(' '))};console.warn=console.error;console.log=(...a)=>{consoleLines.push(a.map(String).join(' '))};
 const app=createApp({database:':memory:',secureCookies:false,publicOrigin:'https://kids.example.test',logger:e=>logs.push(e),
  emailSettings:{provider:'postmark',token:'pm',from:'no-reply@example.test'},
  aiSettings:{provider:'openai',key:'k',model:'gpt-test',dailyLimit:50,timeoutMs:2000,maxTokens:200,maxReplyChars:600},fetchImpl});
 await new Promise(r=>app.server.listen(0,'127.0.0.1',r));
 const base='http://127.0.0.1:'+app.server.address().port;
 const call=async(path,{method='GET',body,cookie}={})=>{const res=await fetch(base+path,{method,headers:{...(body?{'Content-Type':'application/json'}:{}),...(method!=='GET'?{Origin:'https://kids.example.test'}:{}),...(cookie?{Cookie:cookie}:{})},body:body?JSON.stringify(body):undefined});let data=null;try{data=await res.json()}catch{}return {status:res.status,data,cookie:res.headers.get('set-cookie')?.split(';')[0]}};
 const stop=()=>new Promise(r=>app.server.close(()=>{console.error=origError;console.warn=origWarn;console.log=origLog;app.db.close();r()}));
 return {app,call,stop,logs,aiBodies,emailBodies,consoleLines};
}
function mintLearner(db){
 const at=new Date().toISOString(),gid=randomUUID(),lid=randomUUID(),token=randomBytes(32).toString('base64url'),gtoken=randomBytes(32).toString('base64url');
 db.prepare('INSERT INTO users(id,role,email,password_hash,display_name,guardian_approved_at,created_at) VALUES(?,?,?,?,?,?,?)').run(gid,'GUARDIAN',gid+'@example.test','x','Parent',at,at);
 db.prepare('INSERT INTO learners(id,guardian_id,nickname,age_band,age_year,created_at) VALUES(?,?,?,?,?,?)').run(lid,gid,'Kid','10-12',10,at);
 db.prepare('INSERT INTO sessions VALUES(?,?,?,?,?)').run(sha(token),gid,lid,Date.now()+3600_000,at);
 db.prepare('INSERT INTO sessions VALUES(?,?,?,?,?)').run(sha(gtoken),gid,null,Date.now()+3600_000,at);
 return {guardianId:gid,learnerId:lid,learner:'kids_session='+token,guardian:'kids_session='+gtoken};
}
const dump=(db,table)=>JSON.stringify(db.prepare('SELECT * FROM '+table).all());

test('privacy: personal values never reach logs, ai_usage, audit, email delivery log or the AI provider',async()=>{
 const t=await startApp();
 try{
  const {app,call}=t,f=mintLearner(app.db);
  // Register: the address is legitimately sent to the email provider (not asserted), never logged or stored in clear in deliveries.
  const reg=await call('/api/auth/register',{method:'POST',body:{email:PRIVATE.email,password:'Guardian-Password-123',displayName:'Parent'}});
  assert.equal(reg.status,201);
  assert.equal(t.emailBodies.length,1,'verification email went to the fake provider only');
  await call('/api/auth/login',{method:'POST',body:{email:PRIVATE.email,password:'wrong-password-123'}});
  await call('/api/auth/forgot-password',{method:'POST',body:{email:PRIVATE.email}});
  // Guardian opt-in for live AI.
  assert.equal((await call('/api/guardian/children/'+f.learnerId+'/controls',{method:'PATCH',cookie:f.guardian,body:{guidesEnabled:true,voiceEnabled:true,liveAiAllowed:true}})).data.controls.liveAiAllowed,true);

  // Child chat: every private message must be refused before the provider.
  const privateMessages=[
   'my email is '+PRIVATE.email,'call me on '+PRIVATE.phoneLatin,'call me on '+PRIVATE.phoneArabic,'my number is '+PRIVATE.phoneSpaced,
   'my name is '+PRIVATE.fullName,'اسمي '+PRIVATE.fullNameAr,
   'I go to '+PRIVATE.school,'أنا في '+PRIVATE.schoolAr,
   'I live at '+PRIVATE.address,'أسكن في '+PRIVATE.addressAr
  ];
  const before=t.aiBodies.length;
  for(const message of privateMessages){
   const r=await call('/api/assist',{method:'POST',cookie:f.learner,body:{message,companionId:'codey'}});
   assert.equal(r.status,200,message);assert.equal(r.data.state,'RESTRICTED','refused: '+message);
  }
  assert.equal(t.aiBodies.length,before,'no private chat message was sent to the provider');
  // A normal sentence does reach the provider (control: the capture works).
  const ok=await call('/api/assist',{method:'POST',cookie:f.learner,body:{message:'how do I start my robot project?',companionId:'codey'}});
  assert.equal(ok.data.mode,'LIVE_AI');assert.equal(t.aiBodies.length,before+1);

  // Projects and notes: filter refuses email/phone; names and places are the child's own text and stay in their own tables only.
  const mk=(title,body)=>call('/api/projects',{method:'POST',cookie:f.learner,body:{title,body,world:'coding'}});
  for(const v of [PRIVATE.email,PRIVATE.phoneLatin,PRIVATE.phoneArabic,PRIVATE.phoneSpaced])
   assert.equal((await mk('My robot','This project is about a robot. Contact '+v+' for details.')).status,400);
  const proj=await mk('Robot with '+PRIVATE.fullName,'A robot built with my friend '+PRIVATE.fullName+' at '+PRIVATE.school+', near '+PRIVATE.address+'.');
  assert.equal(proj.status,201);const pid=proj.data.project.id;
  assert.equal((await call('/api/projects/'+pid+'/research-notes',{method:'POST',cookie:f.learner,body:{body:'Research note by '+PRIVATE.fullNameAr+' at '+PRIVATE.schoolAr}})).status,201);
  assert.equal((await call('/api/projects/'+pid+'/research-notes',{method:'POST',cookie:f.learner,body:{body:'Please call '+PRIVATE.phoneArabic+' about it'}})).status,400);
  assert.equal((await call('/api/projects/'+pid+'/reflection',{method:'PUT',cookie:f.learner,body:{body:'Reflection at '+PRIVATE.addressAr+' with my notes'}})).status,200);
  assert.equal((await call('/api/projects/'+pid+'/reflection',{method:'PUT',cookie:f.learner,body:{body:'Write to '+PRIVATE.email+' about reflection'}})).status,400);
  assert.equal((await call('/api/projects/'+pid+'/milestones',{method:'POST',cookie:f.learner,body:{title:'Ask '+PRIVATE.email}})).status,400);
  // Reports keep the child's words for the moderator, but those words must not leak elsewhere.
  assert.equal((await call('/api/reports',{method:'POST',cookie:f.learner,body:{reason:'Someone asked for '+PRIVATE.phoneLatin+' and '+PRIVATE.email+' at '+PRIVATE.school}})).status,201);
  // Query strings carrying personal values are not logged.
  await call('/api/search?q='+encodeURIComponent(PRIVATE.email),{cookie:f.learner});
  await call('/api/auth/reset-password/validate?token='+encodeURIComponent(PRIVATE.phoneLatin));

  // Everything observable outside the child's own content tables.
  const observed={
   logs:JSON.stringify(t.logs),console:t.consoleLines.join('\n'),
   ai_usage:dump(app.db,'ai_usage'),audit:dump(app.db,'audit'),email_deliveries:dump(app.db,'email_deliveries'),
   aiRequests:t.aiBodies.join('\n'),
   // Refused chat messages are not saved; only the allowed control sentence is.
   conversation_messages:dump(app.db,'conversation_messages')
  };
  assert.ok(app.db.prepare('SELECT count(*) AS n FROM conversation_messages').get().n>0,'chat history has the control message (not vacuous)');
  for(const [where,text] of Object.entries(observed))
   for(const needle of NEEDLES)assert.ok(!text.includes(needle),where+' contains '+JSON.stringify(needle));
  assert.ok(t.logs.length>0,'request log is on and captured entries');
  assert.ok(app.db.prepare('SELECT count(*) AS n FROM audit').get().n>0);
  assert.ok(app.db.prepare('SELECT count(*) AS n FROM email_deliveries').get().n>0);
  assert.ok(app.db.prepare('SELECT count(*) AS n FROM ai_usage').get().n>0);
  assert.equal(JSON.parse(dump(app.db,'email_deliveries'))[0].recipient_hash,sha(PRIVATE.email),'delivery log keeps a hash of the address only');
  assert.ok(!t.logs.some(e=>/127\.0\.0\.1|::1/.test(JSON.stringify(e))),'client IP is not logged');
 }finally{await t.stop()}
});

// ---- labelled privacy-filter set ----
// The filter lives in server/app.mjs and is reachable through the child-chat route: a RESTRICTED
// reply means "detected as personal information". Precision and recall are printed, not gated.
test('privacy filter: precision and recall on the labelled set (measured, printed)',async()=>{
 const set=JSON.parse(readFileSync(new URL('./fixtures/privacy-filter-set.json',import.meta.url),'utf8'));
 assert.ok(set.length>=200,'set has 200+ items');
 assert.ok(set.some(x=>x.lang==='ar')&&set.some(x=>x.lang==='en'));
 const t=await startApp();
 try{
  const {app,call}=t;let f=mintLearner(app.db);
  let tp=0,fp=0,fn=0,tn=0,n=0,hardN=0,hardFp=0;const missed=[],blocked=[],hardBlocked=[];
  for(const item of set){
   if(n++%15===0)f=mintLearner(app.db); // the chat route allows 20 messages a minute per child
   const r=await call('/api/assist',{method:'POST',cookie:f.learner,body:{message:item.text,companionId:'codey'}});
   const detected=r.data.state==='RESTRICTED';
   if(item.private&&detected)tp++;else if(item.private)(fn++,missed.push(item.text));else if(detected)(fp++,blocked.push(item.text));else tn++;
   if(item.hard){hardN++;if(detected){hardFp++;hardBlocked.push(item.text)}}
  }
  const precision=tp/(tp+fp||1),recall=tp/(tp+fn||1);
  process.stdout.write('\n[privacy-filter] items='+set.length+' TP='+tp+' FP='+fp+' FN='+fn+' TN='+tn+' precision='+precision.toFixed(3)+' recall='+recall.toFixed(3)+'\n');
  if(missed.length)process.stdout.write('[privacy-filter] missed (private, allowed): '+JSON.stringify(missed)+'\n');
  if(blocked.length)process.stdout.write('[privacy-filter] blocked (normal, refused): '+JSON.stringify(blocked)+'\n');
  process.stdout.write('[privacy-filter] hard negatives='+hardN+' false positives='+hardFp+'\n');
  assert.ok(hardN>=25,'hard-negative group has 25+ items');
  assert.deepEqual(hardBlocked,[],'no hard negative (normal child text that looks like an identity cue) is blocked');
  // Guard: normal sentences already used in existing tests stay allowed. No pass line is set here.
  f=mintLearner(app.db);
  for(const ok of ['how do I start?','give me a hint','one more?','what is the first step','Try it'])
   assert.equal((await call('/api/assist',{method:'POST',cookie:f.learner,body:{message:ok,companionId:'codey'}})).data.state,'SAFE',ok);
 }finally{await t.stop()}
});
