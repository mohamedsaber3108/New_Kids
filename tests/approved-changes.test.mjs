// Tests for the two user-approved frontend changes:
//  1. Companion selection persisted per child (PUT /api/learner/companion).
//  2. Guardian-controlled Live AI opt-in (PATCH /api/guardian/children/:id/controls liveAiAllowed).
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createApp} from '../server/app.mjs';
import {fromSnapshot} from '../src/api.js';

const PASSWORD='Guardian-Password-123';
async function start(opts={}){
 const app=createApp({database:':memory:',secureCookies:false,publicOrigin:'',adminEmail:'admin@example.test',adminPassword:'Admin-Password-Long-123',...opts});
 await new Promise(r=>app.server.listen(0,'127.0.0.1',r));
 const base='http://127.0.0.1:'+app.server.address().port;
 const call=async(path,{method='GET',body,cookie}={})=>{const res=await fetch(base+path,{method,headers:{...(body?{'Content-Type':'application/json'}:{}),...(method!=='GET'?{Origin:base}:{}),...(cookie?{Cookie:cookie}:{})},body:body?JSON.stringify(body):undefined});let data=null;try{data=await res.json()}catch{}return {status:res.status,data,cookie:res.headers.get('set-cookie')?.split(';')[0]}};
 const admin=(await call('/api/auth/login',{method:'POST',body:{email:'admin@example.test',password:'Admin-Password-Long-123'}})).cookie;
 // Real guardian flow: register -> admin approve -> consent -> children.
 async function family(email,kids=1){
  const reg=await call('/api/auth/register',{method:'POST',body:{email,password:PASSWORD,displayName:'Parent'}});
  const gid=(await call('/api/admin/guardians/pending',{cookie:admin})).data.guardians.find(g=>g.email===email).id;
  await call('/api/admin/guardians/'+gid+'/approve',{method:'POST',cookie:admin,body:{attestation:true}});
  const children=[];for(let i=0;i<kids;i++)children.push((await call('/api/guardians/learners',{method:'POST',cookie:reg.cookie,body:{nickname:'Kid '+(i+1),ageYear:10}})).data.id);
  return {email,guardian:reg.cookie,children};
 }
 // Enter a child's space (revokes the guardian session by design), onboard, then sign the guardian back in.
 async function enter(fam,childId,{onboard=true}={}){
  const learner=(await call('/api/guardians/learners/'+childId+'/enter',{method:'POST',cookie:fam.guardian,body:{}})).cookie;
  fam.guardian=(await call('/api/auth/login',{method:'POST',body:{email:fam.email,password:PASSWORD}})).cookie;
  if(onboard)await call('/api/learner/preferences',{method:'POST',cookie:learner,body:{language:'ar',interest:'coding',goal:'make',build:'game',companion:'azouz'}});
  return learner;
 }
 return {app,call,family,enter,stop:()=>new Promise(r=>app.server.close(()=>{app.db.close();r()}))};
}

// ============ 1. Companion persistence ============
test('companion: child choice is saved on the server and restored after a fresh sign-in',async()=>{
 const t=await start();
 try{
  const fam=await t.family('c1@example.test');const kid=fam.children[0];
  let learner=await t.enter(fam,kid);
  const saved=await t.call('/api/learner/companion',{method:'PUT',cookie:learner,body:{companionId:'luma'}});
  assert.equal(saved.status,200);assert.equal(saved.data.companion,'luma');
  // Simulate reload / sign-in again: a brand-new learner session for the same child.
  learner=await t.enter(fam,kid,{onboard:false});
  const snap=(await t.call('/api/learners/'+kid+'/snapshot',{cookie:learner})).data;
  assert.equal(snap.preferences.companion,'luma');
  assert.equal(fromSnapshot(snap).activeCompanion,'luma','frontend hydration restores the saved companion');
  assert.equal(snap.preferences.completed,true,'other onboarding preferences are preserved');
  assert.equal(snap.preferences.interest,'coding');
 }finally{await t.stop()}
});

test('companion: isolation, validation and roles',async()=>{
 const t=await start();
 try{
  const fam=await t.family('c2@example.test',2);const [kidA,kidB]=fam.children;
  const learnerA=await t.enter(fam,kidA);const learnerB=await t.enter(fam,kidB);
  assert.equal((await t.call('/api/learner/companion',{method:'PUT',cookie:learnerA,body:{companionId:'nova'}})).status,200);
  const snapB=(await t.call('/api/learners/'+kidB+'/snapshot',{cookie:learnerB})).data;
  assert.equal(snapB.preferences.companion,'azouz','sibling choice untouched');
  assert.equal((await t.call('/api/learners/'+kidA+'/snapshot',{cookie:learnerB})).status,403,'a child cannot read another child\'s choice');
  const other=await t.family('c3@example.test');const outsider=await t.enter(other,other.children[0]);
  assert.equal((await t.call('/api/learners/'+kidA+'/snapshot',{cookie:outsider})).status,403);
  assert.equal((await t.call('/api/learner/companion',{method:'PUT',cookie:learnerA,body:{companionId:'not-a-guide'}})).status,400);
  assert.equal((await t.call('/api/learner/companion',{method:'PUT',cookie:learnerA,body:{}})).status,400);
  assert.equal((await t.call('/api/learner/companion',{method:'PUT',cookie:fam.guardian,body:{companionId:'nova'}})).status,403,'guardian session cannot use the learner endpoint');
  assert.equal((await t.call('/api/learner/companion',{method:'PUT',body:{companionId:'nova'}})).status,401,'anonymous rejected');
  const fresh=await t.family('c4@example.test');const notOnboarded=await t.enter(fresh,fresh.children[0],{onboard:false});
  assert.equal((await t.call('/api/learner/companion',{method:'PUT',cookie:notOnboarded,body:{companionId:'nova'}})).data.error,'onboarding_required');
 }finally{await t.stop()}
});

// ============ 2. Guardian Live AI opt-in ============
test('live AI opt-in: off by default, persisted across logout/login, child cannot enable it',async()=>{
 const t=await start();
 try{
  const fam=await t.family('g1@example.test');const kid=fam.children[0];const learner=await t.enter(fam,kid);
  const initial=(await t.call('/api/guardian/children/'+kid+'/controls',{cookie:fam.guardian})).data.controls;
  assert.equal(initial.liveAiAllowed,false,'OFF by default');
  assert.equal(initial.liveAiAvailable,false,'honest: no provider configured');
  const on=await t.call('/api/guardian/children/'+kid+'/controls',{method:'PATCH',cookie:fam.guardian,body:{guidesEnabled:true,voiceEnabled:true,liveAiAllowed:true}});
  assert.equal(on.data.controls.liveAiAllowed,true);
  await t.call('/api/auth/logout',{method:'POST',cookie:fam.guardian});
  assert.equal((await t.call('/api/guardian/children/'+kid+'/controls',{cookie:fam.guardian})).status,401,'logged-out session is dead');
  fam.guardian=(await t.call('/api/auth/login',{method:'POST',body:{email:fam.email,password:PASSWORD}})).cookie;
  assert.equal((await t.call('/api/guardian/children/'+kid+'/controls',{cookie:fam.guardian})).data.controls.liveAiAllowed,true,'persists after logout/login');
  // A child cannot change it, through any route.
  assert.equal((await t.call('/api/guardian/children/'+kid+'/controls',{method:'PATCH',cookie:learner,body:{guidesEnabled:true,voiceEnabled:true,liveAiAllowed:false}})).status,403);
  assert.equal((await t.call('/api/learner/controls',{method:'PATCH',cookie:learner,body:{liveAiAllowed:true}})).status,404,'no learner-side write route exists');
  // Another guardian cannot change it.
  const other=await t.family('g2@example.test');
  assert.equal((await t.call('/api/guardian/children/'+kid+'/controls',{method:'PATCH',cookie:other.guardian,body:{guidesEnabled:true,voiceEnabled:true,liveAiAllowed:false}})).status,403);
  // Revocation + audit.
  const off=await t.call('/api/guardian/children/'+kid+'/controls',{method:'PATCH',cookie:fam.guardian,body:{guidesEnabled:true,voiceEnabled:true,liveAiAllowed:false}});
  assert.equal(off.data.controls.liveAiAllowed,false);
  const actions=t.app.db.prepare("SELECT action FROM audit WHERE target_id=? AND action LIKE 'LEARNER_LIVE_AI_%' ORDER BY created_at").all(kid).map(r=>r.action);
  assert.deepEqual(actions,['LEARNER_LIVE_AI_ALLOWED','LEARNER_LIVE_AI_REVOKED']);
 }finally{await t.stop()}
});

test('live AI opt-in: only consent + configured provider produce live replies; revocation is immediate',async()=>{
 let providerCalls=0;
 const fakeFetch=async()=>{providerCalls++;return {ok:true,status:200,json:async()=>({choices:[{message:{content:'What could you try first?'}}],usage:{}}),headers:{get:()=>null}}};
 const t=await start({aiSettings:{provider:'openai',key:'k',model:'m',dailyLimit:20,timeoutMs:2000,maxTokens:200,maxReplyChars:600},fetchImpl:fakeFetch});
 try{
  const fam=await t.family('g3@example.test');const kid=fam.children[0];const learner=await t.enter(fam,kid);
  const ask=()=>t.call('/api/assist',{method:'POST',cookie:learner,body:{message:'how do I start?',companionId:'codey'}});
  assert.equal((await t.call('/api/guardian/children/'+kid+'/controls',{cookie:fam.guardian})).data.controls.liveAiAvailable,true);
  assert.equal((await ask()).data.mode,'GUIDED_RULES');assert.equal(providerCalls,0,'provider configured but no consent -> no live call');
  await t.call('/api/guardian/children/'+kid+'/controls',{method:'PATCH',cookie:fam.guardian,body:{guidesEnabled:true,voiceEnabled:true,liveAiAllowed:true}});
  const live=await ask();assert.equal(live.data.mode,'LIVE_AI');assert.equal(providerCalls,1);
  await t.call('/api/guardian/children/'+kid+'/controls',{method:'PATCH',cookie:fam.guardian,body:{guidesEnabled:true,voiceEnabled:true,liveAiAllowed:false}});
  const after=await ask();
  assert.equal(after.data.mode,'GUIDED_RULES');assert.equal(providerCalls,1,'revocation stops live calls on the very next request (same child session)');
  // Disabling guides still blocks assist entirely, regardless of live AI.
  await t.call('/api/guardian/children/'+kid+'/controls',{method:'PATCH',cookie:fam.guardian,body:{guidesEnabled:false,voiceEnabled:true,liveAiAllowed:true}});
  assert.equal((await ask()).status,403);
 }finally{await t.stop()}
});

test('live AI opt-in: consent without a configured provider never claims live AI',async()=>{
 const t=await start();
 try{
  const fam=await t.family('g4@example.test');const kid=fam.children[0];const learner=await t.enter(fam,kid);
  await t.call('/api/guardian/children/'+kid+'/controls',{method:'PATCH',cookie:fam.guardian,body:{guidesEnabled:true,voiceEnabled:true,liveAiAllowed:true}});
  const reply=await t.call('/api/assist',{method:'POST',cookie:learner,body:{message:'how do I start?',companionId:'codey'}});
  assert.equal(reply.data.mode,'GUIDED_RULES');
 }finally{await t.stop()}
});

// ============ Frontend contract checks (the approved files send exactly these requests) ============
test('frontend: companion switches call the persistence endpoint; guardian form sends liveAiAllowed',()=>{
 const main=readFileSync(new URL('../src/main.jsx',import.meta.url),'utf8');
 assert.match(main,/api\('\/learner\/companion',\{method:'PUT',body:\{companionId\}\}\)/);
 assert.equal((main.match(/const chooseCompanion=companionId=>/g)||[]).length,1,'exactly one helper definition');
 assert.equal((main.match(/chooseCompanion\(/g)||[]).length,3,'exactly the 3 approved call sites (card, world guide, Ask Adam)');
 assert.equal((main.match(/update\(\{activeCompanion:/g)||[]).length,1,'only the helper itself writes activeCompanion directly');
 const ops=readFileSync(new URL('../src/operations.jsx',import.meta.url),'utf8');
 assert.match(ops,/liveAiAllowed:!!controls\.liveAiAllowed/);
 assert.match(ops,/disabled=\{!controls\.liveAiAvailable&&!controls\.liveAiAllowed\}/,'unavailable state: cannot newly enable, can still revoke');
 assert.match(ops,/Live AI is not available on this server right now/);
});

// ============ In-flight revocation (requests already waiting on the AI provider) ============
function slowProvider({honourAbort}){
 const state={calls:0,aborted:0,pending:[],started:null};
 let notify;state.started=new Promise(r=>notify=r);
 state.fetchImpl=(url,init)=>new Promise((resolve,reject)=>{
  state.calls++;notify();
  const reply={ok:true,status:200,json:async()=>({choices:[{message:{content:'LIVE PROVIDER REPLY'}}],usage:{}}),headers:{get:()=>null}};
  state.pending.push(()=>resolve(reply));
  if(honourAbort)init.signal.addEventListener('abort',()=>{state.aborted++;reject(Object.assign(new Error('aborted'),{name:'AbortError'}))},{once:true});
 });
 state.release=()=>{for(const r of state.pending.splice(0))r()};
 return state;
}
const aiSettings={provider:'openai',key:'k',model:'m',dailyLimit:50,timeoutMs:10000,maxTokens:200,maxReplyChars:600};
const allow=(t,fam,kid,liveAiAllowed,guidesEnabled=true)=>t.call('/api/guardian/children/'+kid+'/controls',{method:'PATCH',cookie:fam.guardian,body:{guidesEnabled,voiceEnabled:true,liveAiAllowed}});

test('in-flight: revoking consent cancels a pending provider call; the child gets rules, nothing live is stored',async()=>{
 const p=slowProvider({honourAbort:true});
 const t=await start({aiSettings,fetchImpl:p.fetchImpl});
 try{
  const fam=await t.family('f1@example.test');const kid=fam.children[0];const learner=await t.enter(fam,kid);
  await allow(t,fam,kid,true);
  const pending=t.call('/api/assist',{method:'POST',cookie:learner,body:{message:'how do I start?',companionId:'codey'}});
  await p.started;
  await allow(t,fam,kid,false);
  const r=await pending;
  assert.equal(p.aborted,1,'provider request was cancelled mid-flight');
  assert.equal(r.status,200);assert.equal(r.data.mode,'GUIDED_RULES');assert.equal(r.data.fallback,'consent_revoked');
  assert.notEqual(r.data.reply,'LIVE PROVIDER REPLY');
  const stored=(await t.call('/api/conversations/'+r.data.conversationId,{cookie:learner})).data.messages;
  assert.ok(stored.every(m=>m.reply!=='LIVE PROVIDER REPLY'),'no live reply persisted after revocation');
 }finally{await t.stop()}
});

test('in-flight: even if the provider ignores cancellation, a reply arriving after revocation is discarded',async()=>{
 const p=slowProvider({honourAbort:false});
 const t=await start({aiSettings,fetchImpl:p.fetchImpl});
 try{
  const fam=await t.family('f2@example.test');const kid=fam.children[0];const learner=await t.enter(fam,kid);
  await allow(t,fam,kid,true);
  const pending=t.call('/api/assist',{method:'POST',cookie:learner,body:{message:'how do I start?',companionId:'codey'}});
  await p.started;await allow(t,fam,kid,false);p.release();
  const r=await pending;
  assert.equal(r.data.mode,'GUIDED_RULES');assert.equal(r.data.fallback,'consent_revoked');assert.notEqual(r.data.reply,'LIVE PROVIDER REPLY');
 }finally{await t.stop()}
});

test('in-flight: several concurrent live requests are all stopped by one revocation',async()=>{
 const p=slowProvider({honourAbort:true});
 const t=await start({aiSettings,fetchImpl:p.fetchImpl});
 try{
  const fam=await t.family('f3@example.test');const kid=fam.children[0];const learner=await t.enter(fam,kid);
  await allow(t,fam,kid,true);
  const asks=[1,2,3].map(n=>t.call('/api/assist',{method:'POST',cookie:learner,body:{message:'question number '+n,companionId:'codey'}}));
  while(p.calls<3)await new Promise(r=>setTimeout(r,5));
  await allow(t,fam,kid,false);
  const results=await Promise.all(asks);
  assert.equal(p.aborted,3);assert.ok(results.every(r=>r.data.mode==='GUIDED_RULES'&&r.data.fallback==='consent_revoked'),JSON.stringify(results.map(r=>r.data)));
  const callsAfter=p.calls;
  assert.equal((await t.call('/api/assist',{method:'POST',cookie:learner,body:{message:'after revoke',companionId:'codey'}})).data.mode,'GUIDED_RULES');
  assert.equal(p.calls,callsAfter,'no new provider call after revocation');
 }finally{await t.stop()}
});

test('in-flight: turning Guides off mid-call returns 403 and stores nothing',async()=>{
 const p=slowProvider({honourAbort:true});
 const t=await start({aiSettings,fetchImpl:p.fetchImpl});
 try{
  const fam=await t.family('f4@example.test');const kid=fam.children[0];const learner=await t.enter(fam,kid);
  await allow(t,fam,kid,true);
  const before=t.app.db.prepare('SELECT count(*) AS n FROM conversation_messages').get().n;
  const pending=t.call('/api/assist',{method:'POST',cookie:learner,body:{message:'how do I start?',companionId:'codey'}});
  await p.started;await allow(t,fam,kid,true,false);
  const r=await pending;
  assert.equal(r.status,403);assert.equal(r.data.error,'guides_disabled_by_guardian');
  assert.equal(t.app.db.prepare('SELECT count(*) AS n FROM conversation_messages').get().n,before,'nothing stored');
 }finally{await t.stop()}
});

test('in-flight: withdrawing family consent mid-call ends the child session (401) and stores nothing',async()=>{
 const p=slowProvider({honourAbort:true});
 const t=await start({aiSettings,fetchImpl:p.fetchImpl});
 try{
  const fam=await t.family('f5@example.test');const kid=fam.children[0];const learner=await t.enter(fam,kid);
  await allow(t,fam,kid,true);
  const pending=t.call('/api/assist',{method:'POST',cookie:learner,body:{message:'how do I start?',companionId:'codey'}});
  await p.started;
  assert.equal((await t.call('/api/guardian/consent',{method:'DELETE',cookie:fam.guardian})).status,200);
  const r=await pending;
  assert.equal(r.status,401);assert.equal(p.aborted,1);
  assert.equal(t.app.db.prepare('SELECT count(*) AS n FROM conversation_messages').get().n,0);
 }finally{await t.stop()}
});

test('in-flight: deleting the child mid-call fails cleanly (no 500)',async()=>{
 const p=slowProvider({honourAbort:false});
 const t=await start({aiSettings,fetchImpl:p.fetchImpl});
 try{
  const fam=await t.family('f6@example.test');const kid=fam.children[0];const learner=await t.enter(fam,kid);
  await allow(t,fam,kid,true);
  const pending=t.call('/api/assist',{method:'POST',cookie:learner,body:{message:'how do I start?',companionId:'codey'}});
  await p.started;
  assert.equal((await t.call('/api/guardian/children/'+kid,{method:'DELETE',cookie:fam.guardian,body:{confirm:kid}})).status,200);
  p.release();
  const r=await pending;
  assert.equal(r.status,401,'child deleted: request ends as signed-out, not a server error');
 }finally{await t.stop()}
});
