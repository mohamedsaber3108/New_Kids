// Real-browser verification (headless Chrome via the DevTools Protocol, no extra dependencies).
// Serves the production build (dist/) from the real API server, seeds data through the real API,
// then clicks the real UI and checks the database. Screenshots -> node_modules/.cache/browser-shots/.
// Run: npm run build && node scripts/verify-browser.mjs
import {spawn} from 'node:child_process';
import {existsSync,mkdtempSync,mkdirSync,rmSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createApp} from '../server/app.mjs';
import {ageChallenges} from '../src/age-challenges.js';
import {codingChallenges} from '../src/coding-content.js';

const root=fileURLToPath(new URL('../',import.meta.url));
if(!existsSync(join(root,'dist','index.html'))){console.error('dist/ missing: run npm run build first');process.exit(1)}
const chromePath=[process.env.CHROME_PATH,'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe','C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe','/usr/bin/google-chrome','/usr/bin/chromium'].find(p=>p&&existsSync(p));
if(!chromePath){console.error('No Chrome/Edge found (set CHROME_PATH)');process.exit(1)}
const shots=join(root,'node_modules','.cache','browser-shots');mkdirSync(shots,{recursive:true});
const results=[];const ok=(name,cond,detail)=>{results.push(!!cond);console.log((cond?'  PASS ':'  FAIL ')+name+(cond||detail===undefined?'':' -> '+String(detail).slice(0,300)))};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));

// ---------- server + seed data through the real API ----------
const app=createApp({database:':memory:',secureCookies:false,publicOrigin:'',adminEmail:'admin@browser.test',adminPassword:'Browser-Admin-Password-123'});
await new Promise(r=>app.server.listen(0,'127.0.0.1',r));
const base='http://127.0.0.1:'+app.server.address().port;
const call=async(path,{method='GET',body,cookie}={})=>{const res=await fetch(base+path,{method,headers:{...(body?{'Content-Type':'application/json'}:{}),...(method!=='GET'?{Origin:base}:{}),...(cookie?{Cookie:cookie}:{})},body:body?JSON.stringify(body):undefined});return {status:res.status,data:await res.json().catch(()=>null),cookie:res.headers.get('set-cookie')?.split(';')[0]}};
const admin=(await call('/api/auth/login',{method:'POST',body:{email:'admin@browser.test',password:'Browser-Admin-Password-123'}})).cookie;
await call('/api/auth/register',{method:'POST',body:{email:'parent@browser.test',password:'Browser-Guardian-Password-123',displayName:'Parent'}});
const gid=(await call('/api/admin/guardians/pending',{cookie:admin})).data.guardians[0].id;
await call('/api/admin/guardians/'+gid+'/approve',{method:'POST',cookie:admin,body:{attestation:true}});
let guardian=(await call('/api/auth/login',{method:'POST',body:{email:'parent@browser.test',password:'Browser-Guardian-Password-123'}})).cookie;
const childId=(await call('/api/guardians/learners',{method:'POST',cookie:guardian,body:{nickname:'Explorer',ageYear:10}})).data.id;
const learner=(await call('/api/guardians/learners/'+childId+'/enter',{method:'POST',cookie:guardian,body:{}})).cookie;
guardian=(await call('/api/auth/login',{method:'POST',body:{email:'parent@browser.test',password:'Browser-Guardian-Password-123'}})).cookie;
await call('/api/learner/preferences',{method:'POST',cookie:learner,body:{language:'en',interest:'coding',goal:'make',build:'game',companion:'azouz'}});
await call('/api/placement',{method:'POST',cookie:learner,body:{answers:[1,2,0,1,2,0,1,2,0,1]}});
await call('/api/attempts',{method:'POST',cookie:learner,body:{missionId:'coding-square',answers:[0,1,0]}});
const hintCount=()=>app.db.prepare('SELECT count(*) AS n FROM hint_events WHERE learner_id=?').get(childId).n;

// ---------- headless Chrome over CDP ----------
const profile=mkdtempSync(join(tmpdir(),'usam-chrome-')),port=9300+Math.floor(Math.random()*500);
const chrome=spawn(chromePath,['--headless=new','--remote-debugging-port='+port,'--user-data-dir='+profile,'--no-first-run','--no-default-browser-check','--disable-gpu','--disable-extensions',...(process.env.CI?['--no-sandbox']:[]),'about:blank'],{stdio:'ignore'});
let target;for(let i=0;i<60&&!target;i++){try{target=(await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find(t=>t.type==='page')}catch{}if(!target)await sleep(250)}
if(!target){console.error('Chrome did not start');process.exit(1)}
const ws=new WebSocket(target.webSocketDebuggerUrl);await new Promise((r,j)=>{ws.onopen=r;ws.onerror=j});
let seq=0;const pending=new Map();
ws.onmessage=e=>{const m=JSON.parse(e.data);if(m.id&&pending.has(m.id)){const {resolve,reject}=pending.get(m.id);pending.delete(m.id);m.error?reject(new Error(m.error.message)):resolve(m.result)}};
const cdp=(method,params={})=>new Promise((resolve,reject)=>{const id=++seq;pending.set(id,{resolve,reject});ws.send(JSON.stringify({id,method,params}))});
const evaluate=async expr=>(await cdp('Runtime.evaluate',{expression:expr,returnByValue:true,awaitPromise:true})).result?.value;
async function waitFor(expr,ms=15000){const end=Date.now()+ms;while(Date.now()<end){try{if(await evaluate(expr))return true}catch{}await sleep(200)}return false}
async function viewport(width,height=900){await cdp('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:width<600})}
async function setSession(cookieValue){await cdp('Network.clearBrowserCookies');const [name,value]=cookieValue.split('=');await cdp('Network.setCookie',{name,value,url:base,httpOnly:true,sameSite:'Strict'})}
async function open(path,lang){await cdp('Page.navigate',{url:base+'/'});await waitFor("document.readyState==='complete'");if(lang)await evaluate(`localStorage.setItem('usamkids-lang','${lang}')`);await cdp('Page.navigate',{url:base+path});await waitFor("document.readyState==='complete'")}
async function shot(name){const {cssContentSize:s}=await cdp('Page.getLayoutMetrics');const {data}=await cdp('Page.captureScreenshot',{format:'png',captureBeyondViewport:true,clip:{x:0,y:0,width:Math.ceil(s.width),height:Math.min(6000,Math.ceil(s.height)),scale:1}});const file=join(shots,name+'.png');writeFileSync(file,Buffer.from(data,'base64'));return file}
const clickExact=labels=>evaluate(`(()=>{const b=[...document.querySelectorAll('button')].find(x=>${JSON.stringify(labels)}.includes(x.textContent.trim())&&!x.disabled);if(!b)return false;b.click();return true})()`);
const noOverflow="document.documentElement.scrollWidth<=window.innerWidth+1";
const bodyHas=text=>`document.body.innerText.includes(${JSON.stringify(text)})`;

try{
 await cdp('Page.enable');await cdp('Network.enable');await cdp('Runtime.enable');await viewport(1280);

 // ===== Learner: real Hint clicks =====
 await setSession(learner);
 await open('/app/missions/coding-square/run','en');
 ok('mission session player opens in the browser',await waitFor("location.pathname.includes('/run/session-')&&[...document.querySelectorAll('button')].some(b=>b.textContent.trim()==='Hint')"),await evaluate('location.pathname'));
 const hintText=(await import('../src/data.js')).missions.find(m=>m.id==='coding-square').questions[0].hintEn;
 ok('hint text hidden before the click',!(await evaluate(bodyHas(hintText))));
 const before=hintCount();
 ok('click Hint (mission)',await clickExact(['Hint']));
 ok('hint text shown after the click',await waitFor(bodyHas(hintText)));
 await waitFor(`true`,1);for(let i=0;i<20&&hintCount()===before;i++)await sleep(100);
 ok('mission click recorded exactly one hint event',hintCount()===before+1,hintCount());
 await clickExact(['Hint']);await clickExact(['Hint']);await sleep(600);
 ok('repeat clicks while shown add nothing',hintCount()===before+1,hintCount());

 const age=ageChallenges.find(c=>c.age===10);
 await open('/app/challenges/10/'+age.id,'en');
 ok('age challenge opens',await waitFor("[...document.querySelectorAll('button')].some(b=>b.textContent.trim()==='Hint')"));
 const b2=hintCount();await clickExact(['Hint']);for(let i=0;i<20&&hintCount()===b2;i++)await sleep(100);
 ok('age challenge click recorded one event',hintCount()===b2+1&&await evaluate(bodyHas(age.hintEn)),hintCount());

 const code=codingChallenges[0];
 await open('/app/coding/challenges/'+code.id,'en');
 ok('coding challenge opens',await waitFor("[...document.querySelectorAll('button')].some(b=>b.textContent.trim()==='Hint')"));
 const b3=hintCount();await clickExact(['Hint']);for(let i=0;i<20&&hintCount()===b3;i++)await sleep(100);
 ok('coding challenge click recorded one event',hintCount()===b3+1&&await evaluate(bodyHas(code.hintEn)),hintCount());
 await clickExact(['Reset']);await clickExact(['Hint']);await sleep(700);
 ok('Reset + reveal again the same day is not double counted',hintCount()===b3+1,hintCount());

 // ===== Learner: companion choice persists across reload (approved change 1) =====
 await open('/app/characters','en');
 ok('companions page opens',await waitFor("document.querySelectorAll('.companion-card').length>1"));
 await evaluate("[...document.querySelectorAll('.companion-card')].find(c=>c.textContent.includes('Luma'))?.click()");
 let saved=null;for(let i=0;i<25;i++){saved=JSON.parse(app.db.prepare('SELECT preferences_json FROM learner_preferences WHERE learner_id=?').get(childId).preferences_json).companion;if(saved==='luma')break;await sleep(100)}
 ok('clicking a companion saves it on the server',saved==='luma',saved);
 await cdp('Page.reload');await waitFor("document.readyState==='complete'");
 const snap=(await call('/api/learners/'+childId+'/snapshot',{cookie:learner})).data;
 ok('choice survives a reload / new snapshot',snap.preferences.companion==='luma');

 // ===== Guardian: insights, weekly activity, hints (AR + EN, 3 widths) =====
 await setSession(guardian);
 for(const lang of ['en','ar']){
  for(const width of [360,768,1280]){
   await viewport(width);
   await open('/guardian/children/'+childId+'/progress',lang);
   const insightTitle=lang==='en'?'Learning insights':'رؤى التعلّم';
   ok(`[${lang} ${width}px] Progress tab shows learning insights`,await waitFor(bodyHas(insightTitle)));
   ok(`[${lang} ${width}px] Progress tab has no horizontal overflow`,await evaluate(noOverflow),await evaluate('document.documentElement.scrollWidth+"/"+window.innerWidth'));
   await shot(`guardian-progress-${lang}-${width}`);
   await open('/guardian/children/'+childId+'/activity',lang);
   const hintsTitle=lang==='en'?'Hints used':'التلميحات المستخدمة',weeklyTitle=lang==='en'?'Tracked activity, last 7 days':'النشاط المتتبَّع خلال آخر ٧ أيام';
   ok(`[${lang} ${width}px] Activity tab shows weekly activity + hints`,await waitFor(bodyHas(hintsTitle))&&await evaluate(bodyHas(weeklyTitle)));
   ok(`[${lang} ${width}px] Activity tab has no horizontal overflow`,await evaluate(noOverflow),await evaluate('document.documentElement.scrollWidth+"/"+window.innerWidth'));
   if(lang==='en'&&width===1280)ok('Activity tab shows the 3 recorded hints',await evaluate(bodyHas('3 in the last 7 days')),await evaluate("document.body.innerText.match(/\\d+ in the last 7 days/)?.[0]"));
   if(lang==='ar')ok(`[ar ${width}px] page direction is RTL`,await evaluate("getComputedStyle(document.querySelector('.guardian-insights')||document.body).direction==='rtl'"));
   await shot(`guardian-activity-${lang}-${width}`);
  }
 }
 // ===== Guardian: Live AI opt-in honest unavailable state (approved change 2) =====
 await viewport(1280);await open('/guardian/children/'+childId+'/safety','en');
 const liveAi="[...document.querySelectorAll('label')].find(l=>l.textContent.includes('Allow live AI replies'))";
 ok('Live AI checkbox present, off, and disabled (no provider)',await waitFor(`!!${liveAi}`)&&await evaluate(`${liveAi}.querySelector('input').checked===false&&${liveAi}.querySelector('input').disabled===true`));
 ok('Live AI unavailable message shown',await evaluate(bodyHas('Live AI is not available on this server right now')));
 await shot('guardian-safety-en-1280');
 ok('no uncaught page errors on the last screen',await evaluate("!document.querySelector('.form-error[role=alert]')"));

 // ===== API outage: production build must not fall back to the browser-only demo =====
 // Static server for dist/ whose /api answers like Nginx with a dead upstream (502, HTML).
 const {createServer}=await import('node:http');const {readFileSync}=await import('node:fs');
 const types={'.js':'text/javascript','.css':'text/css','.html':'text/html','.svg':'image/svg+xml','.png':'image/png'};
 let apiUp=false;
 const outage=createServer((req,res)=>{const url=new URL(req.url,'http://x');
  if(url.pathname.startsWith('/api/')){if(apiUp){fetch(base+url.pathname+url.search).then(async r=>{res.writeHead(r.status,{'content-type':r.headers.get('content-type')||''});res.end(Buffer.from(await r.arrayBuffer()))}).catch(()=>{res.writeHead(502);res.end()});return}res.writeHead(502,{'content-type':'text/html'});res.end('<h1>502 Bad Gateway</h1>');return}
  const file=join(root,'dist',url.pathname==='/'||!url.pathname.includes('.')?'index.html':url.pathname);
  try{const body=readFileSync(file);res.writeHead(200,{'content-type':types[file.slice(file.lastIndexOf('.'))]||'application/octet-stream'});res.end(body)}catch{res.writeHead(404);res.end()}});
 await new Promise(r=>outage.listen(0,'127.0.0.1',r));
 const outageBase='http://127.0.0.1:'+outage.address().port;
 await cdp('Page.navigate',{url:outageBase+'/'});await waitFor("document.readyState==='complete'");
 await evaluate("localStorage.clear();localStorage.setItem('usamkids-lang','en')");
 await cdp('Page.navigate',{url:outageBase+'/app'});
 ok('API down: unavailable notice shown instead of the demo',await waitFor("!!document.querySelector('[data-testid=api-unavailable]')",20000),await evaluate('document.body.innerText.slice(0,200)'));
 ok('API down: no demo progress written to localStorage',await evaluate("localStorage.getItem('usamkids-demo')===null"));
 ok('API down: onboarding (demo) is not offered',!(await evaluate("!!document.querySelector('.onboarding-screen')")));
 await shot('api-unavailable-en-1280');
 apiUp=true;
 ok('API back: app reconnects on its own and leaves the notice',await waitFor("!document.querySelector('[data-testid=api-unavailable]')",20000));
 ok('API back: still no demo progress in localStorage',await evaluate("localStorage.getItem('usamkids-demo')===null"));
 outage.closeAllConnections();await new Promise(r=>outage.close(r));
}catch(e){ok('browser verification aborted',false,e.stack||e.message)}
finally{
 try{ws.close()}catch{}chrome.kill();await sleep(500);
 try{rmSync(profile,{recursive:true,force:true})}catch{}
 await new Promise(r=>app.server.close(r));app.db.close();
}
const failed=results.filter(x=>!x).length;
console.log(`\nBROWSER RESULT: ${results.length-failed} passed, ${failed} failed (screenshots: ${shots})`);
process.exit(failed?1:0);
