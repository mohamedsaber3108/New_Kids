import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHash,randomBytes,randomUUID} from 'node:crypto';
import {createApp} from '../server/app.mjs';
import {loadConfig} from '../server/config.mjs';
import {createEmailSender,buildRequest} from '../server/providers/email.mjs';
import {buildAIRequest,parseAIResponse} from '../server/providers/ai.mjs';
import {signPaymentPayload,verifyPaymentWebhook} from '../server/providers/payments.mjs';
import {openDatabase} from '../server/db.mjs';

// ---- helpers ----
const okJson=(data,status=200)=>({ok:status>=200&&status<300,status,json:async()=>data,headers:{get:()=>null}});
async function start(opts){
 const app=createApp({database:':memory:',secureCookies:false,publicOrigin:'',...opts});
 await new Promise(r=>app.server.listen(0,'127.0.0.1',r));
 const base='http://127.0.0.1:'+app.server.address().port;
 const call=async(path,{method='GET',body,cookie,headers={},raw,origin=true}={})=>{const res=await fetch(base+path,{method,headers:{...(body||raw?{'Content-Type':'application/json'}:{}),...(method!=='GET'&&origin?{Origin:opts.publicOrigin||base}:{}),...(cookie?{Cookie:cookie}:{}),...headers},body:raw??(body?JSON.stringify(body):undefined)});let data=null;try{data=await res.json()}catch{}return {status:res.status,data,cookie:res.headers.get('set-cookie')?.split(';')[0]}};
 return {app,base,call,stop:()=>new Promise(r=>app.server.close(()=>{app.db.close();r()}))};
}
function mintLearner(db,{liveAi=false}={}){
 const at=new Date().toISOString(),gid=randomUUID(),lid=randomUUID(),token=randomBytes(32).toString('base64url'),gtoken=randomBytes(32).toString('base64url');
 db.prepare('INSERT INTO users(id,role,email,password_hash,display_name,guardian_approved_at,created_at) VALUES(?,?,?,?,?,?,?)').run(gid,'GUARDIAN',gid+'@example.test','x','Parent',at,at);
 db.prepare('INSERT INTO learners(id,guardian_id,nickname,age_band,age_year,created_at) VALUES(?,?,?,?,?,?)').run(lid,gid,'Kid','10-12',10,at);
 const h=t=>createHash('sha256').update(t).digest('hex');
 db.prepare('INSERT INTO sessions VALUES(?,?,?,?,?)').run(h(token),gid,lid,Date.now()+3600_000,at);
 db.prepare('INSERT INTO sessions VALUES(?,?,?,?,?)').run(h(gtoken),gid,null,Date.now()+3600_000,at);
 return {guardianId:gid,learnerId:lid,learner:'kids_session='+token,guardian:'kids_session='+gtoken};
}

// ================= EMAIL =================
test('email: postmark and sendgrid requests use documented shapes and bilingual content',()=>{
 const pm=buildRequest('postmark',{token:'pm-token',from:'no-reply@usamif.com'},{to:'p@example.com',template:'password-reset',url:'https://kids.usamif.com/reset-password?token=abc'});
 assert.equal(pm.url,'https://api.postmarkapp.com/email');assert.equal(pm.headers['X-Postmark-Server-Token'],'pm-token');
 assert.equal(pm.body.To,'p@example.com');assert.match(pm.body.Subject,/إعادة تعيين/);assert.match(pm.body.Subject,/Reset/);assert.match(pm.body.TextBody,/token=abc/);
 const sg=buildRequest('sendgrid',{token:'sg-token',from:'no-reply@usamif.com'},{to:'p@example.com',template:'email-verification',url:'https://kids.usamif.com/verify?token=xyz'});
 assert.equal(sg.url,'https://api.sendgrid.com/v3/mail/send');assert.equal(sg.headers.Authorization,'Bearer sg-token');
 assert.equal(sg.body.personalizations[0].to[0].email,'p@example.com');assert.ok(sg.body.content.some(c=>c.type==='text/html'&&c.value.includes('verify?token=xyz')));
 const wh=buildRequest('webhook',{url:'https://mail.example.com/hook',token:'t'},{to:'p@example.com',template:'email-verification',url:'https://x/verify?token=1'});
 assert.equal(wh.body.verificationUrl,'https://x/verify?token=1');assert.equal(wh.body.template,'email-verification');assert.equal(wh.headers.Authorization,'Bearer t');
});

test('email: retries 5xx then succeeds; never retries 4xx; logs hash not address or link',async()=>{
 const db=openDatabase(':memory:');
 let calls=0;const flaky=createEmailSender({provider:'postmark',token:'t',from:'a@b.co'},{db,backoffMs:1,fetchImpl:async()=>(++calls<2?okJson({},502):okJson({MessageID:'pm-1'}))});
 const sent=await flaky({to:'Parent@Example.com',verificationUrl:'https://k/verify?token=SECRET'});
 assert.equal(sent.attempts,2);assert.equal(sent.messageId,'pm-1');
 let bad=0;const rejecting=createEmailSender({provider:'postmark',token:'t',from:'a@b.co'},{db,backoffMs:1,fetchImpl:async()=>{bad++;return okJson({},422)}});
 await assert.rejects(rejecting({to:'x@example.com',resetUrl:'https://k/reset?token=S2'}),/email_delivery_failed/);
 assert.equal(bad,1,'4xx is not retried');
 const down=createEmailSender({provider:'sendgrid',token:'t',from:'a@b.co'},{db,retries:2,backoffMs:1,fetchImpl:async()=>{throw new TypeError('fetch failed')}});
 await assert.rejects(down({to:'y@example.com',resetUrl:'https://k/reset?token=S3'}),/email_delivery_failed/);
 const rows=db.prepare('SELECT * FROM email_deliveries ORDER BY created_at').all();
 assert.deepEqual(rows.map(r=>[r.status,r.attempts,r.error]),[['SENT',2,null],['FAILED',1,'http_422'],['FAILED',3,'network_error']]);
 assert.equal(rows[0].recipient_hash,createHash('sha256').update('parent@example.com').digest('hex'));
 assert.ok(!JSON.stringify(rows).includes('@example.com')&&!JSON.stringify(rows).includes('SECRET'),'no address or link stored');
 db.close();
});

test('email: real verification + password-reset flow through the configured provider',async()=>{
 const outbox=[];
 const fakeFetch=async(url,init)=>{outbox.push({url,body:JSON.parse(init.body),headers:init.headers});return okJson({MessageID:'m'+outbox.length})};
 const {call,app,stop}=await start({publicOrigin:'https://kids.example.com',emailSettings:{provider:'postmark',token:'pm',from:'no-reply@usamif.com'},fetchImpl:fakeFetch});
 try{
  const reg=await call('/api/auth/register',{method:'POST',body:{email:'parent@example.test',password:'Guardian-Password-123',displayName:'Parent'}});
  assert.equal(reg.status,201);assert.equal(reg.data.emailVerificationRequired,true);
  assert.equal(outbox.length,1);assert.equal(outbox[0].url,'https://api.postmarkapp.com/email');assert.equal(outbox[0].body.To,'parent@example.test');
  const verifyToken=new URL(outbox[0].body.TextBody.match(/https:\/\/\S+/)[0]).searchParams.get('token');
  assert.equal((await call('/api/auth/verify-email/validate?token='+encodeURIComponent(verifyToken))).data.valid,true);
  assert.equal((await call('/api/auth/verify-email',{method:'POST',body:{token:verifyToken}})).status,200);
  assert.equal((await call('/api/auth/me',{cookie:reg.cookie})).data.emailVerified,true);
  assert.equal((await call('/api/auth/verify-email',{method:'POST',body:{token:verifyToken}})).status,400,'verification link is single-use');
  const forgot=await call('/api/auth/forgot-password',{method:'POST',body:{email:'parent@example.test'}});
  assert.equal(forgot.status,200);assert.equal(outbox.length,2);assert.match(outbox[1].body.Subject,/Reset/);
  const resetToken=new URL(outbox[1].body.TextBody.match(/https:\/\/\S+/)[0]).searchParams.get('token');
  assert.equal((await call('/api/auth/reset-password',{method:'POST',body:{token:resetToken,password:'Brand-New-Password-789'}})).status,200);
  assert.equal((await call('/api/auth/login',{method:'POST',body:{email:'parent@example.test',password:'Brand-New-Password-789'}})).status,200);
  assert.equal(app.db.prepare("SELECT count(*) AS n FROM email_deliveries WHERE status='SENT'").get().n,2);
 }finally{await stop()}
});

test('email: provider outage makes recovery honestly unavailable (503), never fake success',async()=>{
 const {call,app,stop}=await start({publicOrigin:'https://kids.example.com',emailSettings:{provider:'sendgrid',token:'sg',from:'no-reply@usamif.com'},fetchImpl:async()=>okJson({},503)});
 try{
  app.db.prepare('INSERT INTO users(id,role,email,password_hash,display_name,created_at) VALUES(?,?,?,?,?,?)').run('g','GUARDIAN','down@example.test','x','Parent',new Date().toISOString());
  const r=await call('/api/auth/forgot-password',{method:'POST',body:{email:'down@example.test'}});
  assert.equal(r.status,503);assert.equal(r.data.error,'recovery_unavailable');
  assert.equal(app.db.prepare('SELECT count(*) AS n FROM password_resets').get().n,0,'unsent reset token is not left behind');
 }finally{await stop()}
});

// ================= AI =================
test('ai: openai + anthropic request/response shapes',()=>{
 const o=buildAIRequest({provider:'openai',key:'k',model:'m',maxTokens:200},{system:'S',message:'hi'});
 assert.equal(o.url,'https://api.openai.com/v1/chat/completions');assert.equal(o.headers.Authorization,'Bearer k');assert.deepEqual(o.body.messages.map(m=>m.role),['system','user']);
 const a=buildAIRequest({provider:'anthropic',key:'k',model:'m',maxTokens:200},{system:'S',message:'hi'});
 assert.equal(a.url,'https://api.anthropic.com/v1/messages');assert.equal(a.headers['x-api-key'],'k');assert.equal(a.body.system,'S');
 assert.deepEqual(parseAIResponse('openai',{choices:[{message:{content:'Try it'}}],usage:{prompt_tokens:5,completion_tokens:3}}),{text:'Try it',inputTokens:5,outputTokens:3});
 assert.deepEqual(parseAIResponse('anthropic',{content:[{type:'text',text:'Try'},{type:'text',text:' it'}],usage:{input_tokens:4,output_tokens:2}}),{text:'Try it',inputTokens:4,outputTokens:2});
});

test('ai: live answers only after guardian opt-in; unsafe output, outages and limits fall back to rules',async()=>{
 let mode='good',provided=0;
 const fakeFetch=async(url,init)=>{provided++;const body=JSON.parse(init.body);assert.match(body.messages[0].content,/never ask for or repeat personal information/i);
  if(mode==='down')return okJson({},500);
  if(mode==='leak')return okJson({choices:[{message:{content:'Call me at 01012345678!'}}],usage:{}});
  return okJson({choices:[{message:{content:'What is the first step you could try?'}}],usage:{prompt_tokens:40,completion_tokens:9}})};
 const {app,call,stop}=await start({aiSettings:{provider:'openai',key:'k',model:'gpt-test',dailyLimit:3,timeoutMs:2000,maxTokens:200,maxReplyChars:600},fetchImpl:fakeFetch});
 try{
  const f=mintLearner(app.db);const ask=message=>call('/api/assist',{method:'POST',cookie:f.learner,body:{message,companionId:'codey'}});
  const before=await ask('how do I start?');
  assert.equal(before.data.mode,'GUIDED_RULES');assert.equal(provided,0,'no provider call without guardian opt-in');
  // Existing frontend PATCH (no liveAiAllowed field) must not change the opt-in.
  assert.equal((await call('/api/guardian/children/'+f.learnerId+'/controls',{method:'PATCH',cookie:f.guardian,body:{guidesEnabled:true,voiceEnabled:true}})).data.controls.liveAiAllowed,false);
  assert.equal((await call('/api/guardian/children/'+f.learnerId+'/controls',{method:'PATCH',cookie:f.guardian,body:{guidesEnabled:true,voiceEnabled:true,liveAiAllowed:'yes'}})).status,400);
  assert.equal((await call('/api/guardian/children/'+f.learnerId+'/controls',{method:'PATCH',cookie:f.guardian,body:{guidesEnabled:true,voiceEnabled:true,liveAiAllowed:true}})).data.controls.liveAiAllowed,true);
  const live=await ask('how do I start?');
  assert.equal(live.data.mode,'LIVE_AI');assert.equal(live.data.reply,'What is the first step you could try?');
  const convo=await call('/api/conversations/'+live.data.conversationId,{cookie:f.learner});
  assert.equal(convo.data.messages[0].reply,'What is the first step you could try?','live reply persisted in history');
  mode='leak';const leak=await ask('give me a hint');
  assert.equal(leak.data.mode,'GUIDED_RULES');assert.equal(leak.data.fallback,'blocked_output');assert.ok(!leak.data.reply.includes('0101'));
  mode='down';const down=await ask('give me a hint');
  assert.equal(down.data.mode,'GUIDED_RULES');assert.equal(down.data.fallback,'error');
  mode='good';const limited=await ask('one more?');
  assert.equal(limited.data.fallback,'limit','daily cap of 3 provider calls reached');
  const callsBefore=provided;const privateAsk=await ask('my email is kid@example.com');
  assert.equal(privateAsk.data.state,'RESTRICTED');assert.equal(provided,callsBefore,'private info never sent to the provider');
  const usage=app.db.prepare('SELECT status FROM ai_usage ORDER BY created_at').all().map(r=>r.status);
  assert.deepEqual(usage,['OK','BLOCKED_OUTPUT','ERROR','LIMITED']);
  assert.ok(!app.db.prepare('PRAGMA table_info(ai_usage)').all().some(c=>/message|text|content/.test(c.name)),'usage log stores no message text');
  // Guardian revokes -> rules again, no provider call.
  await call('/api/guardian/children/'+f.learnerId+'/controls',{method:'PATCH',cookie:f.guardian,body:{guidesEnabled:true,voiceEnabled:true,liveAiAllowed:false}});
  const n=provided;assert.equal((await ask('how do I start?')).data.mode,'GUIDED_RULES');assert.equal(provided,n);
 }finally{await stop()}
});

// ================= PAYMENTS =================
test('payments: signature verification rejects forged, stale and malformed signatures',()=>{
 const secret='s'.repeat(40),body='{"a":1}',now=Date.now();
 assert.equal(verifyPaymentWebhook({secret,rawBody:body,signatureHeader:signPaymentPayload(secret,body,Math.floor(now/1000)),now}).ok,true);
 assert.equal(verifyPaymentWebhook({secret,rawBody:body+' ',signatureHeader:signPaymentPayload(secret,body,Math.floor(now/1000)),now}).reason,'invalid_signature');
 assert.equal(verifyPaymentWebhook({secret,rawBody:body,signatureHeader:signPaymentPayload('x'.repeat(40),body,Math.floor(now/1000)),now}).reason,'invalid_signature');
 assert.equal(verifyPaymentWebhook({secret,rawBody:body,signatureHeader:signPaymentPayload(secret,body,Math.floor(now/1000)-3600),now}).reason,'stale_signature');
 assert.equal(verifyPaymentWebhook({secret,rawBody:body,signatureHeader:'garbage',now}).reason,'invalid_signature');
 assert.equal(verifyPaymentWebhook({secret:'',rawBody:body,signatureHeader:'',now}).reason,'payments_not_configured');
});

test('payments: verified webhooks drive subscriptions + entitlement; idempotent; no browser trust',async()=>{
 const secret='w'.repeat(48);
 const {app,call,stop}=await start({publicOrigin:'https://kids.example.com',paymentSettings:{provider:'generic',webhookSecret:secret},adminEmail:'admin@example.test',adminPassword:'Admin-Password-Long-123'});
 try{
  const f=mintLearner(app.db);
  const send=(event,sig)=>{const raw=JSON.stringify(event);return call('/api/payments/webhook',{method:'POST',raw,origin:false,headers:{'x-usam-signature':sig??signPaymentPayload(secret,raw)}})};
  const ev={id:'evt_1',type:'subscription.updated',data:{guardianId:f.guardianId,subscriptionRef:'sub_1',plan:'FAMILY_MONTHLY',status:'ACTIVE',currentPeriodEnd:new Date(Date.now()+30*86400000).toISOString()}};
  assert.equal((await call('/api/guardian/entitlement',{cookie:f.guardian})).data.plan,'FREE');
  assert.equal((await send(ev,'t=1,v1='+'0'.repeat(64))).status,401,'forged signature rejected');
  const applied=await send(ev);assert.equal(applied.status,200);assert.equal(applied.data.applied,true,'accepted without browser Origin (server-to-server)');
  const ent=(await call('/api/guardian/entitlement',{cookie:f.guardian})).data;
  assert.equal(ent.plan,'FAMILY_MONTHLY');assert.equal(ent.mode,'FREE_ACCESS','billing stays FREE_ACCESS until approved');assert.equal(ent.access,'ALL_WORLDS');
  assert.equal((await send(ev)).data.duplicate,true,'replayed event id is idempotent');
  assert.equal(app.db.prepare('SELECT count(*) AS n FROM subscriptions').get().n,1);
  assert.equal((await send({...ev,id:'evt_2',type:'subscription.refunded'})).status,400);
  assert.equal((await send({...ev,id:'evt_3',data:{...ev.data,plan:'FREE'}})).status,400);
  const cancel=await send({id:'evt_4',type:'subscription.canceled',data:{guardianId:f.guardianId,subscriptionRef:'sub_1',plan:'FAMILY_MONTHLY'}});
  assert.equal(cancel.data.applied,true);assert.equal((await call('/api/guardian/entitlement',{cookie:f.guardian})).data.plan,'FREE');
  assert.equal((await send({id:'evt_5',type:'subscription.updated',data:{...ev.data,guardianId:'nobody'}})).data.applied,false);
  // Admin integration status: no secrets leaked.
  const admin=(await call('/api/auth/login',{method:'POST',body:{email:'admin@example.test',password:'Admin-Password-Long-123'}})).cookie;
  const status=await call('/api/admin/integrations',{cookie:admin});
  assert.equal(status.status,200);assert.equal(status.data.payments.configured,true);assert.equal(status.data.email.configured,false);assert.equal(status.data.ai.configured,false);assert.equal(status.data.voice.recording,false);
  assert.ok(!JSON.stringify(status.data).includes(secret),'webhook secret never exposed');
  assert.equal((await call('/api/admin/integrations',{cookie:f.guardian})).status,403);
 }finally{await stop()}
});

test('payments: webhook disabled (503) when no secret is configured',async()=>{
 const {call,stop}=await start({});
 try{assert.equal((await call('/api/payments/webhook',{method:'POST',raw:'{}',origin:false})).status,503)}finally{await stop()}
});

// ================= CONFIG =================
test('config: provider settings are validated',()=>{
 assert.ok(loadConfig({EMAIL_PROVIDER:'postmark'}).errors.some(e=>e.includes('EMAIL_API_TOKEN')));
 assert.ok(loadConfig({EMAIL_PROVIDER:'mailchimp'}).errors.some(e=>e.includes('EMAIL_PROVIDER')));
 assert.deepEqual(loadConfig({EMAIL_PROVIDER:'sendgrid',EMAIL_API_TOKEN:'t',EMAIL_FROM:'no-reply@usamif.com'}).errors,[]);
 assert.ok(loadConfig({AI_PROVIDER:'openai'}).errors.some(e=>e.includes('AI_API_KEY')));
 assert.ok(loadConfig({AI_PROVIDER:'openai',AI_API_KEY:'k',AI_MODEL:'m',AI_BASE_URL:'http://x'}).errors.some(e=>e.includes('HTTPS')));
 assert.deepEqual(loadConfig({AI_PROVIDER:'anthropic',AI_API_KEY:'k',AI_MODEL:'m'}).errors,[]);
 assert.ok(loadConfig({PAYMENT_WEBHOOK_SECRET:'short'}).errors.some(e=>e.includes('32')));
 assert.equal(loadConfig({EMAIL_WEBHOOK_URL:'https://mail.example.com/h'}).email.provider,'webhook');
});
