// Route crawler: opens EVERY frontend route for every role in real headless Chrome against the
// real API (production build in dist/), with rich data seeded through the real API, and reports
// any failing /api request, uncaught JS error, console error, broken rendered value
// (undefined / NaN / [object Object]) or fall-through to the "not found" page.
// Run: npm run build && node scripts/verify-routes.mjs   (set ROUTE_LANGS=en,ar; default both)
import {existsSync,mkdirSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {build} from 'esbuild';
import {createApp} from '../server/app.mjs';
import {launch,sleep} from './lib/cdp.mjs';
import {missions,worlds,companions} from '../src/data.js';
import {ageChallenges} from '../src/age-challenges.js';
import {codingChallenges} from '../src/coding-content.js';
import {thinkingCases} from '../src/thinking-content.js';
import {aiTopics} from '../src/ai-content.js';
import {stories,simulations} from '../src/narratives.js';
import {englishTracks} from '../src/english-content.js';

const root=fileURLToPath(new URL('../',import.meta.url));
if(!existsSync(join(root,'dist','index.html'))){console.error('dist/ missing: run npm run build first');process.exit(1)}
const langs=(process.env.ROUTE_LANGS||'en,ar').split(',');

// skillKey lives in a JSX module: compile it with the project's esbuild.
const cache=join(root,'node_modules','.cache');mkdirSync(cache,{recursive:true});
const lib=await build({entryPoints:[join(root,'src','library.jsx')],bundle:true,format:'esm',platform:'node',write:false,external:['react','react-dom','lucide-react'],logLevel:'silent'});
const libFile=join(cache,'library-routes.mjs');writeFileSync(libFile,lib.outputFiles[0].text);
const {skillKey}=await import(pathToFileURL(libFile).href);

// ---------- real server + rich data via the real API ----------
const app=createApp({database:':memory:',secureCookies:false,publicOrigin:'',adminEmail:'admin@routes.test',adminPassword:'Routes-Admin-Password-123',moderatorEmail:'mod@routes.test',moderatorPassword:'Routes-Moderator-Password-123',guardianConsentRequired:true});
await new Promise(r=>app.server.listen(0,'127.0.0.1',r));
const base='http://127.0.0.1:'+app.server.address().port;
const call=async(path,{method='GET',body,cookie}={})=>{const res=await fetch(base+path,{method,headers:{...(body?{'Content-Type':'application/json'}:{}),...(method!=='GET'?{Origin:base}:{}),...(cookie?{Cookie:cookie}:{})},body:body?JSON.stringify(body):undefined});return {status:res.status,data:await res.json().catch(()=>null),cookie:res.headers.get('set-cookie')?.split(';')[0]}};
const must=(r,what)=>{if(r.status>=400)throw new Error('seed failed: '+what+' '+r.status+' '+JSON.stringify(r.data));return r};
const admin=must(await call('/api/auth/login',{method:'POST',body:{email:'admin@routes.test',password:'Routes-Admin-Password-123'}}),'admin').cookie;
const moderator=must(await call('/api/auth/login',{method:'POST',body:{email:'mod@routes.test',password:'Routes-Moderator-Password-123'}}),'mod').cookie;
must(await call('/api/auth/register',{method:'POST',body:{email:'parent@routes.test',password:'Routes-Guardian-Password-123',displayName:'Parent'}}),'register');
const gid=(await call('/api/admin/guardians/pending',{cookie:admin})).data.guardians[0].id;
must(await call('/api/admin/guardians/'+gid+'/approve',{method:'POST',cookie:admin,body:{attestation:true}}),'approve');
const relogin=async()=>must(await call('/api/auth/login',{method:'POST',body:{email:'parent@routes.test',password:'Routes-Guardian-Password-123'}}),'guardian login').cookie;
let guardian=await relogin();
const policy=(await call('/api/guardian/consent',{cookie:guardian})).data;
must(await call('/api/guardian/consent',{method:'POST',cookie:guardian,body:{policyVersion:policy.policyVersion,attestation:true}}),'consent');
const childId=must(await call('/api/guardians/learners',{method:'POST',cookie:guardian,body:{nickname:'Explorer',ageYear:10}}),'child').data.id;
const learner=must(await call('/api/guardians/learners/'+childId+'/enter',{method:'POST',cookie:guardian,body:{}}),'enter').cookie;
guardian=await relogin();
const L={cookie:learner};
must(await call('/api/learner/preferences',{method:'POST',...L,body:{language:'en',interest:'coding',goal:'make',build:'game',companion:'azouz'}}),'prefs');
must(await call('/api/placement',{method:'POST',...L,body:{answers:[1,2,0,1,2,0,1,2,0,1]}}),'placement');
const attemptId=must(await call('/api/attempts',{method:'POST',...L,body:{missionId:'coding-square',answers:[0,1,0]}}),'attempt').data.id;
const englishActivityId=must(await call('/api/activities',{method:'POST',...L,body:{kind:'ENGLISH_SKILL',payload:{track:'dictation',level:1,answers:['sun','star','book']}}}),'english').data.id;
must(await call('/api/activities',{method:'POST',...L,body:{kind:'CODE_LAB',payload:{steps:['move','move','left','move']}}}),'codelab');
const projectId=must(await call('/api/projects',{method:'POST',...L,body:{title:'Robot Garden',body:'A robot that waters plants on a weekly schedule for the class.',world:'coding'}}),'project').data.project.id;
must(await call('/api/projects/'+projectId+'/research',{method:'PATCH',...L,body:{body:'Researching soil moisture sensors for this project.'}}),'research');
const conversationId=must(await call('/api/assist',{method:'POST',...L,body:{message:'how do I start?',companionId:'codey'}}),'assist').data.conversationId;
const sessionId=must(await call('/api/learning-sessions',{method:'POST',...L,body:{missionId:'english-hello',mode:'PRACTICE'}}),'session').data.session.id;
must(await call('/api/hints',{method:'POST',...L,body:{source:'MISSION',sessionId,step:0}}),'hint');
for(let i=0;i<3;i++)await call('/api/usage/heartbeat',{method:'POST',...L,body:{}});
const reportId=must(await call('/api/reports',{method:'POST',...L,body:{reason:'A sentence in a story felt unkind to me.'}}),'report').data.id;
const draftId=must(await call('/api/admin/curriculum/drafts',{method:'POST',cookie:admin,body:{titleAr:'مهمة تجريبية جديدة',titleEn:'A new pilot mission',world:'coding',objectiveAr:'يتعلم الطفل التسلسل',objectiveEn:'Learn sequencing steps'}}),'draft').data.id;
const experimentId=must(await call('/api/admin/experiments',{method:'POST',cookie:admin,body:{name:'Hint timing test',hypothesis:'Earlier hints reduce retries',variantA:'Hint after one try',variantB:'Hint after two tries'}}),'experiment').data.id;
await call('/api/guardian/children/'+childId+'/goal',{method:'PATCH',cookie:guardian,body:{weeklyMissions:3,focusWorld:'coding',note:'A little every day'}});

const firstMission=missions[0],age=ageChallenges.find(c=>c.age===10),thinking=Object.values(thinkingCases).flat()[0];
const routes={
 anonymous:['/','/how-it-works','/learn','/worlds','/characters','/english','/coding','/ai-literacy','/creativity','/projects','/voice','/parents','/safety','/pricing','/privacy','/terms','/cookies','/help','/faq','/session-expired','/unauthorized','/login','/signup','/forgot-password','/reset-password','/verify'],
 learner:['/app','/app/learn','/app/skills/'+skillKey(firstMission),'/app/objectives/'+firstMission.id,'/app/worlds',...worlds.map(w=>'/app/worlds/'+w.id),'/app/domains/coding','/app/missions/coding-square','/app/missions/coding-square/run','/app/missions/coding-square/run/'+attemptId,'/app/practice','/app/practice/start/english-hello','/app/practice/session/'+sessionId,'/app/progress','/app/progress/mastery','/app/progress/evidence','/app/progress/evidence/'+attemptId,'/app/projects','/app/projects/new','/app/projects/'+projectId,'/app/projects/'+projectId+'/research','/app/projects/'+projectId+'/edit','/app/projects/'+projectId+'/reflection','/app/portfolio','/app/portfolio/projects/'+projectId,'/app/search','/app/notifications','/app/rewards','/app/achievements','/app/rewards/shop','/app/leaderboard','/app/characters',...companions.slice(0,3).map(c=>'/app/characters/'+c.id),'/app/conversations','/app/conversations/'+conversationId,'/app/companion','/app/settings','/app/placement/result','/app/english',...englishTracks.map(t=>'/app/english/'+t),'/app/english/session/'+englishActivityId,'/app/coding','/app/coding/lab','/app/coding/learn','/app/coding/challenges',...codingChallenges.map(c=>'/app/coding/challenges/'+c.id),'/app/coding/project/'+projectId,'/app/ai','/app/ai/hallucination-challenge',...Object.keys(aiTopics).map(t=>'/app/ai/'+t),'/app/thinking',...Object.keys(thinkingCases).map(t=>'/app/thinking/'+t),'/app/thinking/challenge/'+thinking.id,'/app/creativity','/app/creativity/create','/app/creativity/gallery','/app/creativity/'+projectId,'/app/stories',...stories.map(s=>'/app/stories/'+s.id),'/app/simulations',...simulations.map(s=>'/app/simulations/'+s.id),'/app/challenges','/app/challenges/10','/app/challenges/10/'+age.id],
 guardian:['/guardian','/guardian/children','/guardian/children/'+childId,...['overview','progress','evidence','projects','activity','safety','settings'].map(t=>'/guardian/children/'+childId+'/'+t),'/guardian/goals','/guardian/recommendations','/guardian/settings'],
 admin:['/admin',...['experiments','experiments/'+experimentId,'feature-flags','entitlements','ai','prompt-templates','safety-policies','projects','rubrics','misconceptions','interventions','difficulty','analytics','legal','privacy','domains','domains/coding','skills','competencies','objectives','missions','missions/new','missions/coding-square','missions/'+draftId+'/edit','activities','questions','question-templates','content','content-qa','provenance','curriculum-mapping'].map(x=>'/admin/'+x)],
 moderator:['/moderator','/moderator/queue','/moderator/reports','/moderator/audit','/moderator/cases/'+reportId],
};
const cookies={anonymous:null,learner,guardian,admin,moderator};
// Negative controls (learner): must be flagged by the detectors.
routes.controls=['/app/missions/does-not-exist','/app/projects/does-not-exist','/app/progress/evidence/does-not-exist'];cookies.controls=learner;
// Route-specific content expectations (English run).
const expectations={
 ['learner /app/rewards']:Object.assign(t=>/[1-9]\d* day streak/.test(t),{label:'rewards shows the server streak (activity today => >= 1)'}),
 ['guardian /guardian/children/'+childId]:Object.assign(t=>t.includes('Suggested next step:')&&!/Suggested next step: [a-z0-9]+-[a-z0-9-]+/.test(t),{label:'guardian next step shows a readable title, not a raw mission id'}),
};
const expectationFailures=[],controlFindings=[];

// ---------- crawl ----------
const browser=await launch();
let current=null;const findings=[];
const record=(kind,detail)=>{if(current)current.issues.push(kind+': '+String(detail).slice(0,220))};
browser.on('Network.responseReceived',p=>{const u=new URL(p.response.url);if(u.pathname.startsWith('/api/')&&p.response.status>=400)record('API '+p.response.status,u.pathname)});
browser.on('Runtime.exceptionThrown',p=>record('JS exception',p.exceptionDetails?.exception?.description||p.exceptionDetails?.text));
browser.on('Runtime.consoleAPICalled',p=>{if(p.type==='error')record('console.error',p.args.map(a=>a.value||a.description||'').join(' '))});
// Settle = no in-flight /api request for ~360 ms (tracked by requestId; other resources ignored).
const inflight=new Set();
browser.on('Network.requestWillBeSent',p=>{try{if(new URL(p.request.url).pathname.startsWith('/api/'))inflight.add(p.requestId)}catch{}});
browser.on('Network.loadingFinished',p=>inflight.delete(p.requestId));browser.on('Network.loadingFailed',p=>inflight.delete(p.requestId));
async function settle(){let quiet=0;for(let i=0;i<50&&quiet<3;i++){await sleep(120);quiet=inflight.size===0?quiet+1:0}}

let visited=0;
try{
 await browser.viewport(1280);
 for(const lang of langs){
  for(const [role,list] of Object.entries(routes)){
   await browser.setCookie(base,cookies[role]);
   await browser.cdp('Page.navigate',{url:base+'/'});await browser.waitFor("document.readyState==='complete'");
   await browser.evaluate(`localStorage.setItem('usamkids-lang','${lang}')`);
   for(const path of list){
    current={role,lang,path,issues:[]};
    await browser.cdp('Page.navigate',{url:base+path});await browser.waitFor("document.readyState==='complete'");
    await browser.waitFor("document.querySelector('#root')?.children.length>0",8000);await sleep(150);await settle();
    const page=await browser.evaluate(`({text:document.body.innerText,path:location.pathname})`);
    const broken=page.text.match(/\bundefined\b|\bNaN\b|\[object Object\]/);if(broken)record('broken value',broken[0]+' near "'+page.text.slice(Math.max(0,broken.index-60),broken.index+40).replace(/\s+/g,' ')+'"');
    if(/This path is not available|الطريق ده مش موجود بعد|Project not found|لم نجد المشروع|Challenge not found|التحدي غير موجود/.test(page.text))record('not found page','rendered a not-found screen');
    if(role!=='anonymous'&&/^\/login/.test(page.path))record('redirected to login',page.path);
    const expectation=expectations[role+' '+path];
    if(expectation&&lang==='en'&&!expectation(page.text))expectationFailures.push(`[${role}] ${path}: ${expectation.label}`);
    if(role==='controls'){controlFindings.push(current);continue}
    visited++;if(current.issues.length)findings.push(current);
    if(visited%25===0)console.log(`  ... ${visited} routes visited, ${findings.length} with issues`);
   }
  }
 }
}finally{await browser.close();await new Promise(r=>app.server.close(r));app.db.close()}

// Detector self-test: these MUST be flagged, otherwise a "clean" result proves nothing.
const flagged=(p,kind)=>controlFindings.filter(f=>f.path===p).every(f=>f.issues.some(i=>i.startsWith(kind)));
const controlsOk=controlFindings.length>0&&flagged('/app/missions/does-not-exist','not found page')&&flagged('/app/projects/does-not-exist','not found page')&&flagged('/app/progress/evidence/does-not-exist','API 404');
console.log(controlsOk?'  PASS detector controls flagged (2 not-found pages + 1 API 404)':'  FAIL detector controls were not flagged: '+JSON.stringify(controlFindings));
for(const e of expectationFailures)console.log('  FAIL expectation: '+e);
for(const f of findings)console.log(`  ISSUE [${f.lang} ${f.role}] ${f.path}\n      - ${f.issues.join('\n      - ')}`);
console.log(`\nROUTES RESULT: ${visited} route visits, ${visited-findings.length} clean, ${findings.length} with issues, ${expectationFailures.length} expectation failures`);
process.exit(findings.length||expectationFailures.length||!controlsOk?1:0);
