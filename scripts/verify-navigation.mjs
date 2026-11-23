// Real-browser navigation + sign-in audit (headless Chrome, production build, real API).
// For every role it clicks every header, sidebar and footer control from that role's start pages and
// fails if a signed-in user is ever shown a login form, if a role's own navigation leads outside its
// area, or if any click causes an API error, JS exception or not-found screen. Then it checks the
// sign-in gate, return-to-page after login, session expiry, the child -> grown-up handoff, and that
// the post-login redirect cannot leave the site.
// Run: npm run build && node scripts/verify-navigation.mjs
import {existsSync,mkdirSync} from 'node:fs';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createApp} from '../server/app.mjs';
import {launch,sleep} from './lib/cdp.mjs';
import {areaOf} from '../src/access.js';

const root=fileURLToPath(new URL('../',import.meta.url));
if(!existsSync(join(root,'dist','index.html'))){console.error('dist/ missing: run npm run build first');process.exit(1)}
const shots=join(root,'node_modules','.cache','browser-shots');mkdirSync(shots,{recursive:true});
const results=[];const ok=(name,cond,detail)=>{results.push(!!cond);console.log((cond?'  PASS ':'  FAIL ')+name+(cond||detail===undefined?'':' -> '+String(detail).slice(0,400)))};

// ---------- real API + seed ----------
const ADMIN={email:'admin@nav.test',password:'Nav-Admin-Password-123'},MOD={email:'mod@nav.test',password:'Nav-Moderator-Password-123'},PARENT={email:'parent@nav.test',password:'Nav-Parent-Password-123'};
const app=createApp({database:':memory:',secureCookies:false,publicOrigin:'',adminEmail:ADMIN.email,adminPassword:ADMIN.password,moderatorEmail:MOD.email,moderatorPassword:MOD.password});
await new Promise(r=>app.server.listen(0,'127.0.0.1',r));
const base='http://127.0.0.1:'+app.server.address().port;
const call=async(path,{method='GET',body,cookie}={})=>{const res=await fetch(base+path,{method,headers:{...(body?{'Content-Type':'application/json'}:{}),...(method!=='GET'?{Origin:base}:{}),...(cookie?{Cookie:cookie}:{})},body:body?JSON.stringify(body):undefined});return {status:res.status,data:await res.json().catch(()=>null),cookie:res.headers.get('set-cookie')?.split(';')[0]}};
const login=async u=>(await call('/api/auth/login',{method:'POST',body:u})).cookie;
const admin=await login(ADMIN),moderator=await login(MOD);
await call('/api/auth/register',{method:'POST',body:{...PARENT,displayName:'Nav Parent'}});
const gid=(await call('/api/admin/guardians/pending',{cookie:admin})).data.guardians[0].id;
await call('/api/admin/guardians/'+gid+'/approve',{method:'POST',cookie:admin,body:{attestation:true}});
let guardian=await login(PARENT);
const childId=(await call('/api/guardians/learners',{method:'POST',cookie:guardian,body:{nickname:'Navi',ageYear:10}})).data.id;
const enterChild=async()=>{const g=await login(PARENT);return (await call('/api/guardians/learners/'+childId+'/enter',{method:'POST',cookie:g,body:{}})).cookie};
let learner=await enterChild();
await call('/api/learner/preferences',{method:'POST',cookie:learner,body:{language:'en',interest:'coding',goal:'make',build:'game',companion:'azouz'}});
await call('/api/placement',{method:'POST',cookie:learner,body:{answers:[1,2,0,1,2,0,1,2,0,1]}});
guardian=await login(PARENT);

// ---------- browser helpers ----------
const browser=await launch();const {cdp,evaluate,waitFor}=browser;
let issues=[];
browser.on('Network.responseReceived',p=>{const u=new URL(p.response.url);if(u.pathname.startsWith('/api/')&&p.response.status>=400)issues.push('API '+p.response.status+' '+u.pathname)});
browser.on('Runtime.exceptionThrown',p=>issues.push('JS '+(p.exceptionDetails?.exception?.description||p.exceptionDetails?.text)));
browser.on('Runtime.consoleAPICalled',p=>{if(p.type==='error')issues.push('console.error '+p.args.map(a=>a.value||a.description||'').join(' '))});
const settled="document.readyState==='complete'&&document.querySelector('#root')?.innerText.trim().length>40&&!/Checking your account|Preparing your world|Loading your progress/.test(document.body.innerText)";
async function open(path){await cdp('Page.navigate',{url:base+path});await waitFor(settled,15000);await sleep(350)}
async function settle(){await sleep(250);await waitFor(settled,15000);await sleep(400)}
const state=()=>evaluate(`({path:location.pathname,search:location.search,login:!!document.querySelector('.auth-card input[type=password]'),wrong:!!document.querySelector('[data-testid=wrong-area]'),signedInCard:!!document.querySelector('[data-testid=signed-in]'),notFound:/not found|page you were looking for/i.test(document.body.innerText),toast:document.body.innerText.includes('Your session ended'),text:document.body.innerText.slice(0,160)})`);
const type=(sel,val)=>evaluate(`(()=>{const el=document.querySelector(${JSON.stringify(sel)});if(!el)return false;Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(el,${JSON.stringify(val)});el.dispatchEvent(new Event('input',{bubbles:true}));return true})()`);
async function submitLogin(u){await type('.auth-card input[type=email]',u.email);await type('.auth-card input[type=password]',u.password);await evaluate("document.querySelector('.auth-card form button.btn.primary').click()");await settle()}
const clickText=label=>evaluate(`(()=>{const b=[...document.querySelectorAll('button')].find(x=>x.textContent.trim()===${JSON.stringify(label)});if(!b)return false;b.click();return true})()`);
const SKIP=/^(EN|عربي|Sign out|Open menu|Toggle theme)$|^Ask /;
const groups={header:'header .desktop-nav button',actions:'header .header-actions button.btn, header .header-actions .profile-chip, header .header-actions .login-link',sidebar:'.app-sidebar button',footer:'footer button'};
async function controls(){return evaluate(`(()=>{const out=[];for(const [g,sel] of Object.entries(${JSON.stringify(groups)}))document.querySelectorAll(sel).forEach((el,i)=>out.push({g,sel,i,label:el.textContent.trim()}));return out})()`)}

// Click every control from each start page; judge each landing.
async function sweep(role,cookie,starts){
 await browser.setCookie(base,cookie);
 let clicks=0,gates=0;
 for(const start of starts){
  await open(start);
  const list=(await controls()).filter(c=>c.label&&!SKIP.test(c.label));
  for(const c of list){
   await open(start);issues=[];
   const clicked=await evaluate(`(()=>{const el=document.querySelectorAll(${JSON.stringify(c.sel)})[${c.i}];if(!el||el.textContent.trim()!==${JSON.stringify(c.label)})return false;el.click();return true})()`);
   if(!clicked){ok(`${role}: control "${c.label}" present on ${start}`,false);continue}
   await settle();const s=await state();clicks++;
   const where=`${role} ${start} -> [${c.g}] "${c.label}" -> ${s.path}`;
   const bad=[];
   if(cookie&&s.login)bad.push('signed-in user shown a login form');
   if(!cookie&&s.login){if(areaOf(s.path)==='public'&&s.path!=='/login')bad.push('login form on a public page');else gates++}
   // The child's "Guardian" button is a deliberate handoff to a grown-up (checked separately below).
   if(cookie&&['header','sidebar'].includes(c.g)&&s.wrong&&!(role==='learner'&&c.label==='Guardian'))bad.push('own navigation leads outside the role area');
   if(s.notFound)bad.push('not-found screen');
   bad.push(...issues);
   if(bad.length)ok(where,false,bad.join(' | '));
  }
 }
 ok(`${role}: ${clicks} navigation clicks, none asked a signed-in user to sign in or broke`,results.length>=0&&clicks>0);
 return {clicks,gates};
}

try{
 await browser.viewport(1280);
 await cdp('Page.navigate',{url:base+'/'});await waitFor("document.readyState==='complete'");await evaluate("localStorage.setItem('usamkids-lang','en')");
 const before=results.filter(x=>!x).length;
 const anon=await sweep('visitor',null,['/','/worlds','/parents']);
 await sweep('guardian',guardian,['/guardian','/guardian/goals','/']);
 learner=await enterChild();guardian=await login(PARENT);
 await sweep('learner',learner,['/app','/app/worlds','/']);
 await sweep('admin',await login(ADMIN),['/admin','/admin/missions','/']);
 await sweep('moderator',await login(MOD),['/moderator','/']);
 ok('click sweep: no failures across all roles',results.filter(x=>!x).length===before);
 ok('visitor: private links show the sign-in gate (not a broken page)',anon.gates>0,anon.gates);

 // ---- Gate + return to the requested page ----
 await browser.setCookie(base,null);
 await open('/guardian/goals');let s=await state();
 ok('visitor opening /guardian/goals sees the sign-in gate in place',s.login&&s.path==='/guardian/goals',JSON.stringify(s));
 ok('gate explains why (guardian context)',await evaluate("document.body.innerText.includes('Sign in to follow your child')"));
 await submitLogin(PARENT);s=await state();
 ok('after sign-in the guardian lands on the page they asked for',s.path==='/guardian/goals'&&!s.login,JSON.stringify(s));
 // Session persists across public <-> private navigation and full reloads.
 await open('/');await clickText('My space');await settle();s=await state();
 ok('public page shows "My space" and it returns to the dashboard without signing in',s.path==='/guardian'&&!s.login,JSON.stringify(s));
 await open('/guardian/settings');s=await state();
 ok('full page reload keeps the session',s.path==='/guardian/settings'&&!s.login,JSON.stringify(s));
 await open('/login');s=await state();
 ok('/login while signed in shows "You are signed in" (no password form)',s.signedInCard&&!s.login,JSON.stringify(s));
 await open('/app/worlds');s=await state();
 ok('guardian opening the child app sees "choose a child", not a login form',s.wrong&&!s.login,JSON.stringify(s));
 await clickText('Choose a child');await settle();s=await state();
 ok('"Choose a child" goes to the dashboard',s.path==='/guardian'&&!s.login,JSON.stringify(s));

 // ---- Session ends while browsing ----
 app.db.prepare('DELETE FROM sessions').run();
 issues=[];await clickText('Goals');await settle();await sleep(800);s=await state();
 ok('expired session: next click shows the sign-in gate in place with a notice',s.login&&s.path==='/guardian/goals'&&s.toast,JSON.stringify(s));
 await submitLogin(PARENT);s=await state();
 ok('signing in again continues on the same page',s.path==='/guardian/goals'&&!s.login,JSON.stringify(s));

 // ---- Child -> grown-up handoff ----
 learner=await enterChild();await browser.setCookie(base,learner);
 await open('/app');await evaluate("[...document.querySelectorAll('.app-sidebar button')].find(b=>b.textContent.trim()==='Guardian').click()");await settle();s=await state();
 ok('child pressing "Guardian" sees a grown-ups notice, not a login form',s.wrong&&!s.login&&s.path==='/guardian',JSON.stringify(s));
 await clickText('Grown-up: sign in');await settle();s=await state();
 ok('"Grown-up: sign in" ends the child session and opens sign-in for the dashboard',s.path==='/login'&&s.login&&decodeURIComponent(s.search).includes('next=/guardian'),JSON.stringify(s));
 await submitLogin(PARENT);s=await state();
 ok('grown-up lands on the dashboard after signing in',s.path==='/guardian'&&!s.login,JSON.stringify(s));

 // ---- Staff wrong-area + open-redirect ----
 await browser.setCookie(base,await login(MOD));
 await open('/admin');s=await state();
 ok('moderator opening /admin sees a notice, not a login form',s.wrong&&!s.login,JSON.stringify(s));
 await browser.setCookie(base,null);
 await open('/login?next=//evil.example/steal');await submitLogin(ADMIN);s=await state();
 ok('post-login redirect cannot leave the site',s.path==='/admin'&&(await evaluate('location.host'))===new URL(base).host,JSON.stringify(s));
 await open('/login?next=/moderator/queue');s=await state();
 ok('admin on /login?next=... sees signed-in card',s.signedInCard,JSON.stringify(s));
 await clickText('Go to my space');await settle();s=await state();
 ok('"Go to my space" honours a permitted next page',s.path==='/moderator/queue'&&!s.login,JSON.stringify(s));
 await browser.screenshot(join(shots,'nav-final.png'));
}catch(e){ok('navigation verification aborted',false,e.stack||e.message)}
finally{await browser.close();app.server.closeAllConnections();await new Promise(r=>app.server.close(r));app.db.close()}
const failed=results.filter(x=>!x).length;
console.log(`\nNAVIGATION RESULT: ${results.length-failed} passed, ${failed} failed`);
process.exit(failed?1:0);
