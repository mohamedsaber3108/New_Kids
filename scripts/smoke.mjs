// End-to-end smoke check against an ALREADY RUNNING server (local or deployed):
// HTTP (health, frontend build + every asset), every role's APIs, then real headless-Chrome renders of
// the key pages per role, failing on any /api error, JS exception, console error or empty screen.
//
//   SMOKE_BASE=http://localhost:3001 ADMIN_EMAIL=.. ADMIN_PASSWORD=.. node scripts/smoke.mjs
// Optional: MODERATOR_EMAIL/MODERATOR_PASSWORD. SMOKE_SEED=1 creates a demo guardian + child and
// exercises writes (mission attempt, heartbeat). Use SMOKE_SEED only on local/staging, never production.
import {launch,sleep} from './lib/cdp.mjs';

const base=(process.env.SMOKE_BASE||'http://localhost:3001').replace(/\/$/,'');
const seed=process.env.SMOKE_SEED==='1';
const results=[];const ok=(name,cond,detail)=>{results.push(!!cond);console.log((cond?'  PASS ':'  FAIL ')+name+(cond||detail===undefined?'':' -> '+String(detail).slice(0,300)))};
async function call(path,{method='GET',body,cookie}={}){
 const res=await fetch(base+path,{method,headers:{...(body?{'Content-Type':'application/json'}:{}),...(method!=='GET'?{Origin:base}:{}),...(cookie?{Cookie:cookie}:{})},body:body?JSON.stringify(body):undefined});
 return {status:res.status,data:await res.json().catch(()=>null),cookie:res.headers.get('set-cookie')?.split(';')[0]};
}
const login=async(email,password)=>{const r=await call('/api/auth/login',{method:'POST',body:{email,password}});return r.status===200?r.cookie:null};
async function gets(role,cookie,paths){for(const p of paths){const r=await call(p,{cookie});ok(`${role} GET ${p}`,r.status===200,r.status+' '+JSON.stringify(r.data))}}

console.log('Smoke target:',base);
// ---------- HTTP + build ----------
const health=await call('/api/health');ok('API health',health.status===200&&health.data?.service==='usam-kids-api',health.status);
const ready=await call('/api/health/ready');ok('API + database ready',ready.status===200,JSON.stringify(ready.data));
await gets('public',null,['/api/config','/api/catalog']);
const html=await (await fetch(base+'/')).text();
ok('frontend index.html served',html.includes('id="root"'));
const assets=[...html.matchAll(/(?:src|href)="(\/assets\/[^"]+)"/g)].map(m=>m[1]);
ok('frontend references built assets',assets.length>=2,assets.join(','));
for(const a of assets){const r=await fetch(base+a);ok('asset '+a,r.status===200&&(await r.arrayBuffer()).byteLength>0,r.status)}
const deep=await fetch(base+'/app/worlds');ok('SPA deep link returns the app shell',deep.status===200&&(await deep.text()).includes('id="root"'));

// ---------- roles + APIs ----------
const admin=process.env.ADMIN_EMAIL&&await login(process.env.ADMIN_EMAIL,process.env.ADMIN_PASSWORD);
ok('admin login',!!admin,'set ADMIN_EMAIL/ADMIN_PASSWORD');
if(admin)await gets('admin',admin,['/api/auth/me','/api/admin/overview','/api/admin/guardians/pending','/api/admin/integrations','/api/admin/audit','/api/admin/catalog','/api/admin/curriculum','/api/admin/insights','/api/admin/operations','/api/admin/agents','/api/moderation/queue']);
const moderator=process.env.MODERATOR_EMAIL&&await login(process.env.MODERATOR_EMAIL,process.env.MODERATOR_PASSWORD);
if(process.env.MODERATOR_EMAIL){ok('moderator login',!!moderator);if(moderator)await gets('moderator',moderator,['/api/moderation/queue','/api/moderation/reports','/api/moderation/audit'])}

let guardian=null,learner=null,learnerId=null;
const gEmail=process.env.SMOKE_GUARDIAN_EMAIL||'parent@local.test',gPass=process.env.SMOKE_GUARDIAN_PASSWORD||'Local-Parent-Password-123';
if(seed&&admin){
 const reg=await call('/api/auth/register',{method:'POST',body:{email:gEmail,password:gPass,displayName:'Local Parent'}});
 ok('guardian registration (or already exists)',[201,200,409].includes(reg.status),reg.status+' '+JSON.stringify(reg.data));
 const pending=(await call('/api/admin/guardians/pending',{cookie:admin})).data?.guardians||[];
 for(const g of pending.filter(g=>g.email===gEmail))ok('admin approves guardian',(await call('/api/admin/guardians/'+g.id+'/approve',{method:'POST',cookie:admin,body:{attestation:true}})).status===200);
}
guardian=await login(gEmail,gPass);
if(guardian||seed){
 ok('guardian login',!!guardian);
 if(guardian){
  const policy=await call('/api/guardian/consent',{cookie:guardian});
  if(policy.data?.required&&seed)await call('/api/guardian/consent',{method:'POST',cookie:guardian,body:{policyVersion:'2026-10-child-service-v1',attestation:true}});
  await gets('guardian',guardian,['/api/auth/me','/api/guardian/consent','/api/guardian/entitlement','/api/guardians/learners','/api/parents/children','/api/parents/family-summary']);
  let kids=(await call('/api/guardians/learners',{cookie:guardian})).data?.learners||[];
  if(!kids.length&&seed){const c=await call('/api/guardians/learners',{method:'POST',cookie:guardian,body:{nickname:'Explorer',ageYear:10}});ok('guardian adds a child',c.status===201||c.status===200,c.status+' '+JSON.stringify(c.data));kids=(await call('/api/guardians/learners',{cookie:guardian})).data?.learners||[]}
  if(kids.length){
   learnerId=kids[0].id;
   learner=(await call('/api/guardians/learners/'+learnerId+'/enter',{method:'POST',cookie:guardian,body:{}})).cookie;
   guardian=await login(gEmail,gPass);
   ok('guardian enters child profile',!!learner);
  }
 }
}
if(learner){
 if(seed){
  await call('/api/learner/preferences',{method:'POST',cookie:learner,body:{language:'en',interest:'coding',goal:'make',build:'game',companion:'azouz'}});
  const snap=(await call('/api/learners/'+learnerId+'/snapshot',{cookie:learner})).data;
  if(!snap?.placement)ok('learner placement saved',(await call('/api/placement',{method:'POST',cookie:learner,body:{answers:[1,2,0,1,2,0,1,2,0,1]}})).status===201);
  const att=await call('/api/attempts',{method:'POST',cookie:learner,body:{missionId:'coding-square',answers:[0,1,0]}});ok('learner mission attempt persisted',[200,201].includes(att.status),att.status+' '+JSON.stringify(att.data));
  const hb=await call('/api/usage/heartbeat',{method:'POST',cookie:learner,body:{}});ok('learner heartbeat',hb.status===200,hb.status);
 }
 await gets('learner',learner,['/api/auth/me','/api/learners/'+learnerId+'/snapshot','/api/gamification/progression','/api/learner/controls','/api/conversations','/api/notifications','/api/daily-goals/me/progress','/api/projects/browse','/api/search?q=code']);
}

// ---------- real browser renders ----------
const pages={
 public:['/','/worlds','/characters','/how-it-works','/parents','/safety','/faq','/privacy','/terms','/cookies','/login','/signup','/forgot-password'],
 learner:['/app','/app/worlds','/app/learn','/app/missions/coding-square','/app/practice','/app/challenges','/app/coding/challenges','/app/english','/app/ai','/app/projects','/app/progress','/app/rewards','/app/characters','/app/portfolio','/app/settings'],
 guardian:['/guardian','/guardian/settings','/guardian/goals','/guardian/recommendations'],
 admin:['/admin','/admin/missions','/admin/analytics'],
 moderator:['/moderator'],
};
const sessions={public:null,learner,guardian,admin,moderator};
const browser=await launch();let issues=[];
browser.on('Network.responseReceived',p=>{const u=new URL(p.response.url);if(u.pathname.startsWith('/api/')&&p.response.status>=400)issues.push('API '+p.response.status+' '+u.pathname)});
browser.on('Runtime.exceptionThrown',p=>issues.push('JS '+(p.exceptionDetails?.exception?.description||p.exceptionDetails?.text)));
browser.on('Runtime.consoleAPICalled',p=>{if(p.type==='error')issues.push('console.error '+p.args.map(a=>a.value||a.description||'').join(' '))});
try{
 await browser.viewport(1280);
 for(const [role,list] of Object.entries(pages)){
  if(role!=='public'&&!sessions[role]){console.log(`  SKIP ${role} pages (no ${role} session)`);continue}
  await browser.setCookie(base,sessions[role]);
  await browser.cdp('Page.navigate',{url:base+'/'});await browser.waitFor("document.readyState==='complete'");
  await browser.evaluate("localStorage.setItem('usamkids-lang','en')");
  for(const path of list){
   issues=[];
   await browser.cdp('Page.navigate',{url:base+path});
   const rendered=await browser.waitFor("document.readyState==='complete'&&document.querySelector('#root')?.innerText.trim().length>40&&!/Preparing your world|Loading your progress/.test(document.body.innerText)",15000);
   await sleep(600);
   const text=await browser.evaluate("document.body.innerText");
   const bad=[!rendered&&'did not finish rendering',/\b(undefined|NaN)\b|\[object Object\]/.test(text)&&'broken value in text',/USAM is taking a short break/.test(text)&&'API unreachable notice',/not found|page you were looking for/i.test(text)&&'not-found screen',role!=='public'&&/\/login$/.test(await browser.evaluate('location.pathname'))&&'redirected to login',...issues].filter(Boolean);
   ok(`${role} page ${path}`,bad.length===0,bad.join(' | '));
  }
 }
}finally{await browser.close()}

const failed=results.filter(x=>!x).length;
console.log(`\nSMOKE RESULT: ${results.length-failed} passed, ${failed} failed (${base})`);
process.exit(failed?1:0);
