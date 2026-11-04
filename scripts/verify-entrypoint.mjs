// Verifies the real server entrypoint (node server/app.mjs) as a separate process:
//  1. Production boot WITHOUT PUBLIC_ORIGIN must refuse to start (exit 1, config_invalid log).
//  2. Development boot must start, emit JSON logs, serve /api/health, and log the request.
//  3. Database must persist to the configured DB_FILE.
// Run: node scripts/verify-entrypoint.mjs
import {spawn} from 'node:child_process';
import {mkdtempSync,rmSync,existsSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';

const results=[];const ok=(name,cond,detail)=>{results.push({name,cond});console.log((cond?'  PASS ':'  FAIL ')+name+(cond||detail===undefined?'':' -> '+detail))};
const baseEnv={PATH:process.env.PATH,SystemRoot:process.env.SystemRoot};

function run(env,{waitFor,timeout=8000}={}){
 return new Promise(resolve=>{
  const child=spawn(process.execPath,['server/app.mjs'],{env:{...baseEnv,...env},stdio:['ignore','pipe','pipe']});
  let out='';const lines=()=>out.split('\n').filter(Boolean).map(l=>{try{return JSON.parse(l)}catch{return {raw:l}}});
  // `out` is exposed as a live getter: the process keeps writing after we resolve on waitFor.
  const handle=code=>({code,get out(){return out},get lines(){return lines()},child});
  const done=code=>resolve(handle(code));
  child.stdout.on('data',d=>{out+=d;if(waitFor&&lines().some(waitFor)){resolve(handle(null))}});
  child.stderr.on('data',d=>{out+=d});
  child.on('exit',done);
  setTimeout(()=>resolve(handle('timeout')),timeout);
 });
}

const dir=mkdtempSync(join(tmpdir(),'usam-entry-'));
try{
 // 1. Production without PUBLIC_ORIGIN must fail fast.
 const bad=await run({NODE_ENV:'production',DB_FILE:join(dir,'bad.db'),PORT:'3911'});
 ok('production boot without PUBLIC_ORIGIN exits 1',bad.code===1,'code='+bad.code);
 ok('logs config_invalid as JSON',bad.lines.some(l=>l.msg==='config_invalid'&&/PUBLIC_ORIGIN/.test(l.detail)),bad.out.slice(0,300));

 // 2. Development boot starts and logs.
 const dbFile=join(dir,'kids.db');
 const good=await run({DB_FILE:dbFile,PORT:'3912',ADMIN_EMAIL:'admin@example.test',ADMIN_PASSWORD:'Admin-Password-Long-123'},{waitFor:l=>l.msg==='listening'});
 ok('dev boot logs listening',good.lines.some(l=>l.msg==='listening'&&l.port===3912),good.out.slice(0,300));
 ok('warns that email delivery is disabled (honest state)',good.lines.some(l=>l.msg==='email_delivery_disabled'),good.out.slice(0,300));
 const health=await fetch('http://127.0.0.1:3912/api/health').then(r=>r.json()).catch(e=>({error:e.message}));
 ok('GET /api/health from real process',health.ok===true&&health.service==='usam-kids-api',JSON.stringify(health));
 await new Promise(r=>setTimeout(r,100));
 const logged=good.out.split('\n').filter(Boolean).map(l=>{try{return JSON.parse(l)}catch{return {}}}).some(l=>l.msg==='request'&&l.path==='/api/health'&&l.status===200);
 ok('request is logged as structured JSON',logged,good.out.slice(-300));
 ok('database file created at DB_FILE',existsSync(dbFile));
 good.child.kill();
 await new Promise(r=>good.child.once('exit',r));
}finally{
 rmSync(dir,{recursive:true,force:true});
}
const failed=results.filter(r=>!r.cond).length;
console.log(`\nENTRYPOINT RESULT: ${results.length-failed} passed, ${failed} failed`);
process.exit(failed?1:0);
