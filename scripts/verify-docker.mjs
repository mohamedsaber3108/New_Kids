// Builds and runs the real Docker images (isolated compose project "usam-verify"), then
// verifies the deployed stack through the Nginx reverse proxy exactly as EC2 would run it.
// Cleans up only its own project + volume. Run: node scripts/verify-docker.mjs
import {execFileSync,spawnSync} from 'node:child_process';
import {mkdtempSync,writeFileSync,rmSync,readFileSync,existsSync,readdirSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {DatabaseSync} from 'node:sqlite';

const project='usam-verify',origin='https://kids.verify.local',web='http://127.0.0.1:8080';
const dir=mkdtempSync(join(tmpdir(),'usam-docker-')),envFile=join(dir,'verify.env');
writeFileSync(envFile,[`PUBLIC_ORIGIN=${origin}`,'ADMIN_EMAIL=admin@verify.local','ADMIN_PASSWORD=Verify-Admin-Password-123','MODERATOR_EMAIL=mod@verify.local','MODERATOR_PASSWORD=Verify-Moderator-Password-123','REQUIRE_GUARDIAN_CONSENT=true'].join('\n'));
const dc=(...args)=>spawnSync('docker',['compose','-p',project,'--env-file',envFile,...args],{encoding:'utf8',maxBuffer:64*1024*1024});
const results=[];const ok=(name,cond,detail)=>{results.push(cond);console.log((cond?'  PASS ':'  FAIL ')+name+(cond||detail===undefined?'':' -> '+String(detail).slice(0,300)))};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function waitFor(url,ms=120000){const end=Date.now()+ms;while(Date.now()<end){try{const r=await fetch(url);if(r.ok)return true}catch{}await sleep(1500)}return false}
async function call(path,{method='GET',body,cookie}={}){const res=await fetch(web+path,{method,headers:{...(body?{'Content-Type':'application/json'}:{}),...(method!=='GET'?{Origin:origin}:{}),...(cookie?{Cookie:cookie}:{})},body:body?JSON.stringify(body):undefined});let data=null;try{data=await res.json()}catch{}return {status:res.status,data,headers:res.headers,cookie:res.headers.get('set-cookie')?.split(';')[0]}}

try{
 console.log('Building images (runs npm test + vite build inside the web image)...');
 const build=dc('build');
 ok('docker compose build',build.status===0,build.stderr.split('\n').slice(-15).join('\n'));
 if(build.status!==0)throw new Error('build failed');
 const up=dc('up','-d');
 ok('docker compose up -d',up.status===0,up.stderr);
 ok('web /healthz becomes healthy through Nginx',await waitFor(web+'/healthz'));
 ok('API /api/health reachable through Nginx proxy',await waitFor(web+'/api/health'));

 const health=await call('/api/health');ok('health identifies usam-kids-api',health.data?.service==='usam-kids-api',JSON.stringify(health.data));
 ok('readiness checks the database',(await call('/api/health/ready')).data?.ready===true);
 const page=await fetch(web+'/app/worlds');const html=await page.text();
 ok('SPA deep link served by Nginx fallback',page.status===200&&html.includes('<div id="root">'));
 const securityHeaders=h=>h.get('x-frame-options')==='DENY'&&h.get('x-content-type-options')==='nosniff'&&!!h.get('referrer-policy')&&!!h.get('permissions-policy');
 ok('SPA pages carry security headers',securityHeaders(page.headers),JSON.stringify(Object.fromEntries(page.headers)));
 const csp=page.headers.get('content-security-policy')||'';
 ok('SPA pages carry a strict CSP (self scripts, no framing)',/script-src 'self'/.test(csp)&&/frame-ancestors 'none'/.test(csp)&&/fonts\.googleapis\.com/.test(csp),csp);
 ok('API responses keep their own CSP through the proxy',/frame-ancestors 'none'/.test((await fetch(web+'/api/health')).headers.get('content-security-policy')||''));
 const asset=html.match(/\/assets\/[^"]+\.js/)?.[0];
 const assetRes=asset?await fetch(web+asset):null;
 ok('hashed assets cached immutable',!!assetRes&&assetRes.status===200&&/immutable/.test(assetRes.headers.get('cache-control')||''),assetRes?.headers.get('cache-control'));
 ok('hashed assets carry security headers',!!assetRes&&securityHeaders(assetRes.headers));
 const gz=asset&&await fetch(web+asset,{headers:{'Accept-Encoding':'gzip'}});
 // Per-IP limits through the real proxy chain: one client exhausting its login limit must not lock out another.
 const tryLogin=xff=>fetch(web+'/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json',Origin:origin,'X-Forwarded-For':xff},body:JSON.stringify({email:'ratelimit@verify.local',password:'Wrong-Password-123'})}).then(r=>r.status);
 for(let i=0;i<10;i++)await tryLogin('203.0.113.50');
 ok('proxy: same client limited after 10 logins',await tryLogin('203.0.113.50')===429);
 ok('proxy: a different client is NOT limited (real client IP reaches the API)',await tryLogin('198.51.100.60')===401);
 ok('proxy: spoofed private X-Forwarded-For prefix does not escape the limit',await tryLogin('10.9.9.9, 203.0.113.50')===429);
 ok('JavaScript served gzip-compressed with Vary',!!gz&&gz.headers.get('content-encoding')==='gzip'&&/Accept-Encoding/i.test(gz.headers.get('vary')||''),gz&&gz.headers.get('content-encoding'));
 ok('API port not published on the host',spawnSync('docker',['port',`${project}-usam-kids-api-1`],{encoding:'utf8'}).stdout.trim()==='');
 const uid=dc('exec','-T','usam-kids-api','id','-u').stdout.trim();
 ok('API container runs as non-root',uid!==''&&uid!=='0','uid='+uid);
 const ro=dc('exec','-T','usam-kids-api','sh','-c','touch /app/x 2>&1 || echo READONLY').stdout;
 ok('API container filesystem is read-only',/READONLY|Read-only/i.test(ro),ro);
 const logs=dc('logs','usam-kids-api').stdout;
 ok('API emits structured JSON startup logs',/"msg":"listening"/.test(logs)&&/"production":true/.test(logs),logs.slice(-400));
 ok('API honestly reports email disabled',/email_delivery_disabled/.test(logs));
 ok('wrong Origin rejected through proxy',(await fetch(web+'/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json',Origin:'https://evil.example'},body:'{}'})).status===403);

 // Full journey through the proxy.
 const admin=(await call('/api/auth/login',{method:'POST',body:{email:'admin@verify.local',password:'Verify-Admin-Password-123'}}));
 ok('admin login (seeded from env)',admin.status===200&&/Secure/.test(admin.headers.get('set-cookie')||''),admin.headers.get('set-cookie'));
 const reg=await call('/api/auth/register',{method:'POST',body:{email:'parent@verify.local',password:'Verify-Guardian-Password-123',displayName:'Parent'}});
 ok('guardian registers',reg.status===201,JSON.stringify(reg.data));
 const gid=(await call('/api/admin/guardians/pending',{cookie:admin.cookie})).data.guardians[0].id;
 await call('/api/admin/guardians/'+gid+'/approve',{method:'POST',cookie:admin.cookie,body:{attestation:true}});
 const policy=await call('/api/guardian/consent',{cookie:reg.cookie});
 await call('/api/guardian/consent',{method:'POST',cookie:reg.cookie,body:{policyVersion:policy.data.policyVersion,attestation:true}});
 const child=await call('/api/guardians/learners',{method:'POST',cookie:reg.cookie,body:{nickname:'Docker Kid',ageYear:10}});
 ok('child created after approval + consent',child.status===201,JSON.stringify(child.data));
 const learner=(await call('/api/guardians/learners/'+child.data.id+'/enter',{method:'POST',cookie:reg.cookie,body:{}})).cookie;
 const attempt=await call('/api/attempts',{method:'POST',cookie:learner,body:{missionId:'coding-square',answers:[0,1,0]}});
 ok('learner attempt scored + saved',attempt.status===201&&typeof attempt.data.score==='number',JSON.stringify(attempt.data).slice(0,200));
 // Approved change 1: companion choice persists on the server.
 await call('/api/learner/preferences',{method:'POST',cookie:learner,body:{language:'ar',interest:'coding',goal:'make',build:'game',companion:'azouz'}});
 const pick=await call('/api/learner/companion',{method:'PUT',cookie:learner,body:{companionId:'luma'}});
 ok('companion choice saved through proxy',pick.status===200,JSON.stringify(pick.data));
 ok('companion choice in persisted snapshot',(await call('/api/learners/'+child.data.id+'/snapshot',{cookie:learner})).data.preferences?.companion==='luma');
 // Approved change 2: guardian live-AI opt-in (no provider configured in this stack -> honest unavailable).
 const guardianAgain=(await call('/api/auth/login',{method:'POST',body:{email:'parent@verify.local',password:'Verify-Guardian-Password-123'}})).cookie;
 const controls=(await call('/api/guardian/children/'+child.data.id+'/controls',{cookie:guardianAgain})).data.controls;
 ok('live AI off by default and honestly unavailable',controls.liveAiAllowed===false&&controls.liveAiAvailable===false,JSON.stringify(controls));
 // Approved Phase B: guardian insights served through the proxy; never to the child.
 const ov=(await call('/api/guardian/children/'+child.data.id+'/overview',{cookie:guardianAgain})).data;
 ok('guardian overview includes learning insights + weekly activity',!!ov.insights?.worlds?.coding&&ov.insights.weekly?.days?.length===7,JSON.stringify(ov.insights||{}).slice(0,200));
 // Phase B: hint-usage tracking through the proxy.
 const hintSid=(await call('/api/learning-sessions',{method:'POST',cookie:learner,body:{missionId:'coding-square',mode:'MISSION'}})).data.session.id;
 const h1=await call('/api/hints',{method:'POST',cookie:learner,body:{source:'MISSION',sessionId:hintSid,step:0}});
 const h2=await call('/api/hints',{method:'POST',cookie:learner,body:{source:'MISSION',sessionId:hintSid,step:0}});
 ok('hint recorded once through proxy (retry is a duplicate)',h1.status===201&&h2.data?.duplicate===true,JSON.stringify([h1.data,h2.data]));
 ok('guardian sees authoritative hint count',(await call('/api/guardian/children/'+child.data.id+'/overview',{cookie:guardianAgain})).data.insights?.hints?.last7Days===1);
 ok('guardian session cannot record hints',(await call('/api/hints',{method:'POST',cookie:guardianAgain,body:{source:'MISSION',sessionId:hintSid,step:0}})).status===403);
 ok('child snapshot carries no guardian insights',(await call('/api/learners/'+child.data.id+'/snapshot',{cookie:learner})).data.insights===undefined);
 ok('learner cannot change guardian controls',(await call('/api/guardian/children/'+child.data.id+'/controls',{method:'PATCH',cookie:learner,body:{guidesEnabled:true,voiceEnabled:true,liveAiAllowed:true}})).status===403);
 const mod=await call('/api/auth/login',{method:'POST',body:{email:'mod@verify.local',password:'Verify-Moderator-Password-123'}});
 ok('moderator login + queue',mod.status===200&&(await call('/api/moderation/queue',{cookie:mod.cookie})).status===200);

 // Backup + restore drill.
 const backup=dc('exec','-T','usam-kids-api','node','server/backup.mjs','/data/backup-verify.sqlite');
 ok('online backup inside running container',backup.status===0&&/Verified SQLite backup/.test(backup.stdout),backup.stderr||backup.stdout);
 const container=dc('ps','-q','usam-kids-api').stdout.trim(),local=join(dir,'restored.sqlite');
 const copy=spawnSync('docker',['cp',`${container}:/data/backup-verify.sqlite`,local],{encoding:'utf8'});
 ok('backup copied off the container',copy.status===0,copy.stderr);
 if(copy.status===0){const restored=new DatabaseSync(local,{readOnly:true});
  ok('restored copy passes integrity_check',restored.prepare('PRAGMA integrity_check').get().integrity_check==='ok');
  ok('restored copy contains the journey data',restored.prepare("SELECT count(*) AS n FROM attempts").get().n===1&&restored.prepare("SELECT count(*) AS n FROM learners").get().n===1);
  ok('restored copy has all migrations recorded',restored.prepare('SELECT max(version) AS v FROM schema_migrations').get().v>=3);
  restored.close()}
 ok('backup refuses to overwrite an existing file',dc('exec','-T','usam-kids-api','node','server/backup.mjs','/data/backup-verify.sqlite').status===1);

 // Host backup script (deploy/backup.sh, used by the systemd timer) against this isolated stack.
 const bash=[process.env.BASH_PATH,'C:\\Program Files\\Git\\bin\\bash.exe','/bin/bash','/usr/bin/bash'].find(p=>p&&existsSync(p));
 if(!bash)ok('deploy/backup.sh (bash not found; set BASH_PATH)',false);
 else{
  const hostDir=join(dir,'host-backups').replace(/\\/g,'/');
  const env={...process.env,COMPOSE_PROJECT_NAME:project,COMPOSE_ENV_FILES:envFile,BACKUP_DIR:hostDir,KEEP:'1',MSYS_NO_PATHCONV:'1'};
  const runScript=()=>spawnSync(bash,['deploy/backup.sh'],{encoding:'utf8',env,timeout:120000});
  const first=runScript();await sleep(1200);const second=runScript();
  ok('deploy/backup.sh succeeds twice',first.status===0&&second.status===0,first.stderr+second.stderr);
  const files=existsSync(hostDir)?readdirSync(hostDir).filter(f=>/^backup-\d{8}T\d{6}Z\.sqlite$/.test(f)):[];
  ok('deploy/backup.sh keeps only KEEP newest copies',files.length===1,files.join(','));
  if(files.length){const db=new DatabaseSync(join(hostDir,files[0]),{readOnly:true});
   ok('deploy/backup.sh copy passes integrity_check',db.prepare('PRAGMA integrity_check').get().integrity_check==='ok');db.close()}
  const leftovers=dc('exec','-T','usam-kids-api','sh','-c','ls /data | grep "^backup-2" || true').stdout.trim();
  ok('deploy/backup.sh leaves no files on the volume (incl. -wal/-shm)',leftovers==='',leftovers);
  ok('backup is a single self-contained file (no -wal/-shm beside the in-container copy)',dc('exec','-T','usam-kids-api','sh','-c','ls /data/backup-verify.sqlite-wal /data/backup-verify.sqlite-shm 2>/dev/null | wc -l').stdout.trim()==='0');
 }

 // Restart persistence + graceful shutdown.
 const restart=dc('restart','usam-kids-api');
 ok('API container restarts',restart.status===0,restart.stderr);
 ok('API healthy after restart',await waitFor(web+'/api/health'));
 const again=await call('/api/auth/login',{method:'POST',body:{email:'parent@verify.local',password:'Verify-Guardian-Password-123'}});
 ok('data persisted across container restart (guardian login + child list)',again.status===200&&(await call('/api/guardians/learners',{cookie:again.cookie})).data.learners.length===1);
 ok('graceful shutdown logged on SIGTERM',/"msg":"shutdown","signal":"SIGTERM"/.test(dc('logs','usam-kids-api').stdout));

 // Production config gate inside the real image.
 const bad=spawnSync('docker',['run','--rm','-e','PUBLIC_ORIGIN=http://insecure.example',`${project}-usam-kids-api`],{encoding:'utf8',timeout:60000});
 ok('image refuses to start with an http PUBLIC_ORIGIN in production',bad.status===1&&/config_invalid/.test(bad.stdout),bad.stdout+bad.stderr);
}catch(e){ok('verification aborted',false,e.message)}
finally{
 const down=dc('down','-v','--remove-orphans');
 console.log(down.status===0?'Cleaned up compose project '+project:'Cleanup warning: '+down.stderr);
 rmSync(dir,{recursive:true,force:true});
}
const failed=results.filter(x=>!x).length;
console.log(`\nDOCKER RESULT: ${results.length-failed} passed, ${failed} failed`);
process.exit(failed?1:0);
