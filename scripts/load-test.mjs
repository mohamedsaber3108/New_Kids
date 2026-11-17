// Capacity check against the real API on a file-backed SQLite database in WAL mode (as in production).
// Seeds guardians + learners through the API, then measures:
//   1. a login burst (scrypt cost) and whether it stalls other requests (event-loop responsiveness),
//   2. mixed learner traffic at fixed concurrency (snapshot, rewards, heartbeat, mission attempts).
// Run: node scripts/load-test.mjs [concurrency=50] [seconds=20]
// Single process, same machine as the load generator: treat numbers as a lower bound for one EC2 vCPU class.
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir,cpus} from 'node:os';
import {join} from 'node:path';
import {monitorEventLoopDelay} from 'node:perf_hooks';
import {createApp} from '../server/app.mjs';

const concurrency=Number(process.argv[2]||50),seconds=Number(process.argv[3]||20);
const dir=mkdtempSync(join(tmpdir(),'usam-load-'));
const app=createApp({database:join(dir,'load.db'),trustProxy:true,secureCookies:false,publicOrigin:'',adminEmail:'admin@load.test',adminPassword:'Load-Admin-Password-123'});
await new Promise(r=>app.server.listen(0,'127.0.0.1',r));
const base='http://127.0.0.1:'+app.server.address().port;
let ipSeq=0;const nextIp=()=>`198.18.${(ipSeq>>8)&255}.${ipSeq++&255}`;
async function call(path,{method='GET',body,cookie,ip=nextIp()}={}){
 const res=await fetch(base+path,{method,headers:{'X-Real-IP':ip,...(body?{'Content-Type':'application/json'}:{}),...(method!=='GET'?{Origin:base}:{}),...(cookie?{Cookie:cookie}:{})},body:body?JSON.stringify(body):undefined});
 const data=await res.json().catch(()=>null);return {status:res.status,data,cookie:res.headers.get('set-cookie')?.split(';')[0]};
}
const pct=(arr,p)=>{const s=[...arr].sort((a,b)=>a-b);return s.length?s[Math.min(s.length-1,Math.floor(p/100*s.length))]:0};
const fmt=ms=>ms.toFixed(1)+' ms';

// ---------- seed ----------
const GUARDIANS=20,CHILDREN=3,password='Load-Guardian-Password-123';
const admin=(await call('/api/auth/login',{method:'POST',body:{email:'admin@load.test',password:'Load-Admin-Password-123'}})).cookie;
const learners=[];
for(let g=0;g<GUARDIANS;g++){
 const email=`parent${g}@load.test`;
 await call('/api/auth/register',{method:'POST',body:{email,password,displayName:'Parent '+g}});
}
for(const pending of (await call('/api/admin/guardians/pending',{cookie:admin})).data.guardians)
 await call('/api/admin/guardians/'+pending.id+'/approve',{method:'POST',cookie:admin,body:{attestation:true}});
for(let g=0;g<GUARDIANS;g++){
 let guardian=(await call('/api/auth/login',{method:'POST',body:{email:`parent${g}@load.test`,password}})).cookie;
 for(let c=0;c<CHILDREN;c++){
  const childId=(await call('/api/guardians/learners',{method:'POST',cookie:guardian,body:{nickname:`Kid${g}x${c}`,ageYear:8+((g+c)%7)}})).data.id;
  const cookie=(await call('/api/guardians/learners/'+childId+'/enter',{method:'POST',cookie:guardian,body:{}})).cookie;
  guardian=(await call('/api/auth/login',{method:'POST',body:{email:`parent${g}@load.test`,password}})).cookie;
  await call('/api/learner/preferences',{method:'POST',cookie,body:{language:'en',interest:'coding',goal:'make',build:'game',companion:'azouz'}});
  await call('/api/placement',{method:'POST',cookie,body:{answers:[1,2,0,1,2,0,1,2,0,1]}});
  learners.push({id:childId,cookie,ip:nextIp()});
 }
}
console.log(`Seeded ${GUARDIANS} guardians, ${learners.length} learners (file DB, WAL). CPU: ${cpus()[0].model} x${cpus().length}`);

// ---------- 1. login burst while health is polled ----------
const loop=monitorEventLoopDelay({resolution:10});loop.enable();
const healthLat=[];let polling=true;
const poller=(async()=>{while(polling){const t=performance.now();await fetch(base+'/api/health');healthLat.push(performance.now()-t);await new Promise(r=>setTimeout(r,20))}})();
const loginLat=[];const t0=performance.now();
await Promise.all(Array.from({length:GUARDIANS*2},(_,i)=>(async()=>{const t=performance.now();const r=await call('/api/auth/login',{method:'POST',body:{email:`parent${i%GUARDIANS}@load.test`,password}});loginLat.push(performance.now()-t);if(r.status!==200)throw new Error('login '+r.status)})()));
const burstMs=performance.now()-t0;polling=false;await poller;loop.disable();
console.log(`\nLOGIN BURST: ${loginLat.length} concurrent logins in ${fmt(burstMs)} | login p50 ${fmt(pct(loginLat,50))} p95 ${fmt(pct(loginLat,95))}`);
console.log(`  /api/health during burst: p50 ${fmt(pct(healthLat,50))} p95 ${fmt(pct(healthLat,95))} max ${fmt(Math.max(...healthLat))} | event-loop delay p99 ${fmt(loop.percentile(99)/1e6)}`);

// ---------- 2. mixed learner traffic ----------
const mix=[
 [45,l=>call('/api/learners/'+l.id+'/snapshot',{cookie:l.cookie,ip:l.ip})],
 [20,l=>call('/api/gamification/progression',{cookie:l.cookie,ip:l.ip})],
 [20,l=>call('/api/usage/heartbeat',{method:'POST',cookie:l.cookie,ip:l.ip,body:{}})],
 [10,l=>call('/api/learner/controls',{cookie:l.cookie,ip:l.ip})],
 [5,l=>call('/api/attempts',{method:'POST',cookie:l.cookie,ip:l.ip,body:{missionId:'coding-square',answers:[0,1,0]}})]
];
const pick=()=>{let r=Math.random()*100;for(const [w,f] of mix){if((r-=w)<0)return f}return mix[0][1]};
const lat=[],statuses={};let done=0;const end=Date.now()+seconds*1000;const loop2=monitorEventLoopDelay({resolution:10});loop2.enable();
const memBefore=process.memoryUsage().rss;
await Promise.all(Array.from({length:concurrency},(_,w)=>(async()=>{while(Date.now()<end){const l=learners[(w+done)%learners.length];const t=performance.now();const r=await pick()(l);lat.push(performance.now()-t);statuses[r.status]=(statuses[r.status]||0)+1;done++}})()));
loop2.disable();
const errors=Object.entries(statuses).filter(([s])=>Number(s)>=500).reduce((n,[,c])=>n+c,0);
console.log(`\nMIXED LOAD: concurrency ${concurrency}, ${seconds}s, ${learners.length} learners`);
console.log(`  ${done} requests, ${(done/seconds).toFixed(0)} req/s | p50 ${fmt(pct(lat,50))} p95 ${fmt(pct(lat,95))} p99 ${fmt(pct(lat,99))}`);
console.log(`  statuses ${JSON.stringify(statuses)} | 5xx ${errors} | event-loop p99 ${fmt(loop2.percentile(99)/1e6)} | RSS ${(process.memoryUsage().rss/1048576).toFixed(0)} MB (was ${(memBefore/1048576).toFixed(0)} MB)`);

app.server.closeAllConnections();await new Promise(r=>app.server.close(r));app.db.close();rmSync(dir,{recursive:true,force:true});
const pass=errors===0&&pct(lat,95)<500&&pct(healthLat,95)<250;
console.log(`\nLOAD RESULT: ${pass?'PASS':'FAIL'} (criteria: 0 server errors, mixed p95 < 500 ms, health p95 during login burst < 250 ms)`);
process.exit(pass?0:1);
