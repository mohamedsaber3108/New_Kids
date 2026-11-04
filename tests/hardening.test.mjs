import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createApp} from '../server/app.mjs';
import {loadConfig} from '../server/config.mjs';

async function start(opts){
 const app=createApp({database:':memory:',secureCookies:false,publicOrigin:'',...opts});
 await new Promise(r=>app.server.listen(0,'127.0.0.1',r));
 const base='http://127.0.0.1:'+app.server.address().port;
 const call=async(path,{method='GET',body,cookie}={})=>{const res=await fetch(base+path,{method,headers:{...(body?{'Content-Type':'application/json'}:{}),...(method!=='GET'?{Origin:base}:{}),...(cookie?{Cookie:cookie}:{})},body:body?JSON.stringify(body):undefined});return {status:res.status,data:await res.json(),cookie:res.headers.get('set-cookie')?.split(';')[0]}};
 return {app,call,stop:()=>new Promise(r=>app.server.close(()=>{app.db.close();r()}))};
}

test('config: production requires an https PUBLIC_ORIGIN',()=>{
 assert.ok(loadConfig({NODE_ENV:'production'}).errors.some(e=>e.includes('PUBLIC_ORIGIN is required')));
 assert.ok(loadConfig({NODE_ENV:'production',PUBLIC_ORIGIN:'http://kids.example.com'}).errors.some(e=>e.includes('https')));
 assert.deepEqual(loadConfig({NODE_ENV:'production',PUBLIC_ORIGIN:'https://kids.example.com'}).errors,[]);
});

test('config: rejects origins with paths, half-set credentials, weak passwords, http webhooks',()=>{
 assert.ok(loadConfig({PUBLIC_ORIGIN:'https://kids.example.com/app'}).errors.some(e=>e.includes('origin only')));
 assert.ok(loadConfig({ADMIN_EMAIL:'a@example.com'}).errors.some(e=>e.includes('must be set together')));
 assert.ok(loadConfig({MODERATOR_EMAIL:'m@example.com',MODERATOR_PASSWORD:'short'}).errors.some(e=>e.includes('at least 12')));
 assert.ok(loadConfig({EMAIL_WEBHOOK_URL:'http://mail.example.com'}).errors.some(e=>e.includes('HTTPS')));
 assert.ok(loadConfig({PORT:'99999'}).errors.some(e=>e.includes('PORT')));
});

test('config: valid development defaults produce no errors',()=>{
 const c=loadConfig({});
 assert.deepEqual(c.errors,[]);assert.equal(c.port,3001);assert.equal(c.secureCookies,false);assert.equal(c.email,null);
});

test('moderator account is provisioned, can use the moderator desk, and cannot reach admin',async()=>{
 const {call,stop}=await start({moderatorEmail:'mod@example.test',moderatorPassword:'Moderator-Password-123'});
 try{
  const login=await call('/api/auth/login',{method:'POST',body:{email:'mod@example.test',password:'Moderator-Password-123'}});
  assert.equal(login.status,200);assert.equal(login.data.role,'MODERATOR');
  assert.equal((await call('/api/auth/me',{cookie:login.cookie})).data.role,'MODERATOR');
  assert.equal((await call('/api/moderation/queue',{cookie:login.cookie})).status,200);
  assert.equal((await call('/api/moderation/audit',{cookie:login.cookie})).status,200);
  assert.equal((await call('/api/admin/overview',{cookie:login.cookie})).status,403);
  assert.equal((await call('/api/admin/guardians/pending',{cookie:login.cookie})).status,403);
 }finally{await stop()}
});

test('moderator provisioning never overwrites an existing account (same DB file, second boot)',async()=>{
 const {mkdtempSync,rmSync}=await import('node:fs');const {tmpdir}=await import('node:os');const {join}=await import('node:path');
 const dir=mkdtempSync(join(tmpdir(),'usam-mod-')),file=join(dir,'kids.db');
 try{
  const first=await start({database:file});
  await first.call('/api/auth/register',{method:'POST',body:{email:'taken@example.test',password:'Guardian-Password-123',displayName:'Parent'}});
  await first.stop();
  // Second boot on the SAME file with MODERATOR_EMAIL pointing at the existing guardian.
  const second=createApp({database:file,moderatorEmail:'taken@example.test',moderatorPassword:'Moderator-Password-123'});
  try{
   assert.equal(second.db.prepare('SELECT role FROM users WHERE email=?').get('taken@example.test').role,'GUARDIAN');
   assert.equal(second.db.prepare("SELECT count(*) AS n FROM users WHERE role='MODERATOR'").get().n,0);
  }finally{second.db.close()}
 }finally{rmSync(dir,{recursive:true,force:true})}
});

test('admin overview counts guardians by role, not total users minus one',async()=>{
 const {call,stop}=await start({adminEmail:'admin@example.test',adminPassword:'Admin-Password-Long-123',moderatorEmail:'mod@example.test',moderatorPassword:'Moderator-Password-123'});
 try{
  await call('/api/auth/register',{method:'POST',body:{email:'g1@example.test',password:'Guardian-Password-123',displayName:'Parent One'}});
  await call('/api/auth/register',{method:'POST',body:{email:'g2@example.test',password:'Guardian-Password-123',displayName:'Parent Two'}});
  const admin=await call('/api/auth/login',{method:'POST',body:{email:'admin@example.test',password:'Admin-Password-Long-123'}});
  const overview=await call('/api/admin/overview',{cookie:admin.cookie});
  assert.equal(overview.status,200);
  assert.equal(overview.data.guardians,2,'2 guardians, not 3 (old formula counted the moderator)');
  assert.equal(overview.data.moderators,1);
 }finally{await stop()}
});

test('cleanupExpired removes only expired sessions and tokens',async()=>{
 const {app,call,stop}=await start({});
 try{
  const reg=await call('/api/auth/register',{method:'POST',body:{email:'g@example.test',password:'Guardian-Password-123',displayName:'Parent'}});
  const userId=app.db.prepare('SELECT id FROM users WHERE email=?').get('g@example.test').id;
  const past=Date.now()-1000,stamp=new Date().toISOString();
  app.db.prepare('INSERT INTO sessions VALUES(?,?,?,?,?)').run('expired-session-hash',userId,null,past,stamp);
  app.db.prepare('INSERT INTO password_resets VALUES(?,?,?,?)').run('expired-reset-hash',userId,past,stamp);
  app.db.prepare('INSERT INTO email_verifications VALUES(?,?,?,?)').run('expired-verify-hash',userId,past,stamp);
  const removed=app.cleanupExpired();
  assert.deepEqual(removed,{sessions:1,resets:1,verifications:1});
  // The live registration session survives and still authenticates.
  assert.equal((await call('/api/auth/me',{cookie:reg.cookie})).data.authenticated,true);
  assert.deepEqual(app.cleanupExpired(),{sessions:0,resets:0,verifications:0});
 }finally{await stop()}
});

test('request logger records method/path/status/requestId without query strings',async()=>{
 const entries=[];
 const {call,stop}=await start({logger:e=>entries.push(e)});
 try{
  await call('/api/auth/reset-password/validate?token=SECRET-TOKEN-VALUE-SHOULD-NOT-BE-LOGGED-123456');
  await call('/api/no-such-route');
  await new Promise(r=>setTimeout(r,20));
  const validate=entries.find(e=>e.path==='/api/auth/reset-password/validate');
  assert.ok(validate,'request was logged');
  assert.equal(validate.method,'GET');assert.equal(validate.status,200);assert.ok(validate.requestId);assert.equal(typeof validate.ms,'number');
  assert.ok(!JSON.stringify(entries).includes('SECRET-TOKEN'),'query-string tokens are never logged');
  assert.equal(entries.find(e=>e.path==='/api/no-such-route').level,'warn');
 }finally{await stop()}
});
