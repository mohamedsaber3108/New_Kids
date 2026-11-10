// Form-level browser journeys: types into the real React inputs, clicks the real buttons of the
// production build, and verifies the result in the database (and through the API).
// Run: npm run build && node scripts/verify-forms.mjs
import {existsSync} from 'node:fs';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createApp} from '../server/app.mjs';
import {launch,sleep} from './lib/cdp.mjs';
import {missions} from '../src/data.js';

const root=fileURLToPath(new URL('../',import.meta.url));
if(!existsSync(join(root,'dist','index.html'))){console.error('dist/ missing: run npm run build first');process.exit(1)}
const results=[];const ok=(name,cond,detail)=>{results.push(!!cond);console.log((cond?'  PASS ':'  FAIL ')+name+(cond||detail===undefined?'':' -> '+String(detail).slice(0,300)))};

const app=createApp({database:':memory:',secureCookies:false,publicOrigin:'',adminEmail:'admin@forms.test',adminPassword:'Forms-Admin-Password-123',moderatorEmail:'mod@forms.test',moderatorPassword:'Forms-Moderator-Password-123'});
await new Promise(r=>app.server.listen(0,'127.0.0.1',r));
const base='http://127.0.0.1:'+app.server.address().port,db=app.db;
const call=async(path,{method='GET',body,cookie}={})=>{const res=await fetch(base+path,{method,headers:{...(body?{'Content-Type':'application/json'}:{}),...(method!=='GET'?{Origin:base}:{}),...(cookie?{Cookie:cookie}:{})},body:body?JSON.stringify(body):undefined});return {status:res.status,data:await res.json().catch(()=>null),cookie:res.headers.get('set-cookie')?.split(';')[0]}};
const admin=(await call('/api/auth/login',{method:'POST',body:{email:'admin@forms.test',password:'Forms-Admin-Password-123'}})).cookie;
const moderator=(await call('/api/auth/login',{method:'POST',body:{email:'mod@forms.test',password:'Forms-Moderator-Password-123'}})).cookie;
await call('/api/auth/register',{method:'POST',body:{email:'parent@forms.test',password:'Forms-Guardian-Password-123',displayName:'Parent'}});
const gid=(await call('/api/admin/guardians/pending',{cookie:admin})).data.guardians[0].id;
await call('/api/admin/guardians/'+gid+'/approve',{method:'POST',cookie:admin,body:{attestation:true}});
const relogin=async()=>(await call('/api/auth/login',{method:'POST',body:{email:'parent@forms.test',password:'Forms-Guardian-Password-123'}})).cookie;
let guardian=await relogin();
const childId=(await call('/api/guardians/learners',{method:'POST',cookie:guardian,body:{nickname:'Explorer',ageYear:10}})).data.id;
const learner=(await call('/api/guardians/learners/'+childId+'/enter',{method:'POST',cookie:guardian,body:{}})).cookie;
guardian=await relogin();
await call('/api/learner/preferences',{method:'POST',cookie:learner,body:{language:'en',interest:'coding',goal:'make',build:'game',companion:'azouz'}});
await call('/api/placement',{method:'POST',cookie:learner,body:{answers:[1,2,0,1,2,0,1,2,0,1]}});
const reportId=(await call('/api/reports',{method:'POST',cookie:learner,body:{reason:'Something in a story felt unkind to me.'}})).data.id;

const b=await launch();
const {evaluate,waitFor}=b;
const open=async(cookie,path)=>{await b.setCookie(base,cookie);await b.cdp('Page.navigate',{url:base+'/'});await waitFor("document.readyState==='complete'");await evaluate("localStorage.setItem('usamkids-lang','en')");await b.cdp('Page.navigate',{url:base+path});await waitFor("document.readyState==='complete'");await waitFor("document.querySelector('#root')?.children.length>0")};
const setValue=(selector,value,index=0)=>evaluate(`(()=>{const el=document.querySelectorAll(${JSON.stringify(selector)})[${index}];if(!el)return false;const proto=el.tagName==='TEXTAREA'?HTMLTextAreaElement.prototype:el.tagName==='SELECT'?HTMLSelectElement.prototype:HTMLInputElement.prototype;Object.getOwnPropertyDescriptor(proto,'value').set.call(el,${JSON.stringify(String(value))});el.dispatchEvent(new Event(el.tagName==='SELECT'?'change':'input',{bubbles:true}));return true})()`);
const clickText=(text,scope='document')=>evaluate(`(()=>{const b=[...${scope}.querySelectorAll('button')].find(x=>x.textContent.trim().startsWith(${JSON.stringify(text)})&&!x.disabled);if(!b)return false;b.click();return true})()`);
const bodyHas=t=>`document.body.innerText.includes(${JSON.stringify(t)})`;
const poll=async(fn,ms=6000)=>{const end=Date.now()+ms;while(Date.now()<end){const v=fn();if(v)return v;await sleep(120)}return fn()};

try{
 await b.viewport(1280);
 // ===== Learner: full mission run through the UI with correct answers =====
 const mission=missions.find(m=>m.id==='coding-square');
 await open(learner,'/app/missions/coding-square/run');
 ok('mission run opens a server session',await waitFor("location.pathname.includes('/run/session-')"),await evaluate('location.pathname'));
 for(let i=0;i<mission.questions.length;i++){
  const q=mission.questions[i];
  await waitFor(bodyHas(q.en));
  const chose=await clickText(q.optionsEn[q.answer]);
  await waitFor("[...document.querySelectorAll('button')].some(b=>b.textContent.trim().startsWith('Check answer')&&!b.disabled)");
  const checked=await clickText('Check answer');
  await waitFor("[...document.querySelectorAll('button')].some(b=>/^(Next question|Finish session)/.test(b.textContent.trim()))");
  const advanced=await clickText(i===mission.questions.length-1?'Finish session':'Next question');
  ok(`question ${i+1}: chose answer, checked, continued`,chose&&checked&&advanced,{chose,checked,advanced});
 }
 const attempt=await poll(()=>db.prepare("SELECT score,total FROM attempts WHERE learner_id=? AND mission_id='coding-square' ORDER BY created_at DESC").get(childId));
 ok('completed run saved one server-scored attempt with full marks',attempt?.score===mission.questions.length&&attempt.total===mission.questions.length,JSON.stringify(attempt));
 ok('learning session marked COMPLETE',!!db.prepare("SELECT 1 FROM learning_sessions WHERE learner_id=? AND status='COMPLETE'").get(childId));

 // ===== Learner: create a project through the editor =====
 await open(learner,'/app/projects/new');
 await waitFor("!!document.querySelector('.editor-panel input')");
 await setValue('.editor-panel input','Seed Sorter');await setValue('.editor-panel textarea','A little machine that sorts seeds by size for our school garden.');
 await waitFor("!document.querySelector('.editor-footer button').disabled");
 await evaluate("document.querySelector('.editor-footer button').click()");
 const project=await poll(()=>db.prepare("SELECT id,title,world FROM projects WHERE learner_id=? AND title='Seed Sorter'").get(childId));
 ok('project form saved on the server',!!project,JSON.stringify(project));
 ok('editor navigates to the saved project',await waitFor(`location.pathname==='/app/projects/${project?.id}'`),await evaluate('location.pathname'));
 ok('privacy filter enforced through the form',await (async()=>{await open(learner,'/app/projects/new');await waitFor("!!document.querySelector('.editor-panel input')");await setValue('.editor-panel input','Call me');await setValue('.editor-panel textarea','You can reach me on 01012345678 any time after school.');await waitFor("!document.querySelector('.editor-footer button').disabled");await evaluate("document.querySelector('.editor-footer button').click()");await sleep(800);return !db.prepare("SELECT 1 FROM projects WHERE title='Call me'").get()&&await evaluate("!!document.querySelector('[role=alert]')")})());

 // ===== Guardian: create a child through the form =====
 await open(guardian,'/guardian');
 await waitFor(bodyHas('Add a child'));
 const before=db.prepare('SELECT count(*) AS n FROM learners WHERE guardian_id=?').get(gid).n;
 const filled=await evaluate(`(()=>{const label=[...document.querySelectorAll('label')].find(l=>l.textContent.startsWith('Nickname only'));const input=label?.querySelector('input')||label?.nextElementSibling;if(!input)return false;Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,'Star Kid');input.dispatchEvent(new Event('input',{bubbles:true}));return true})()`);
 const created=filled&&await clickText('Create profile');
 const after=await poll(()=>db.prepare('SELECT count(*) AS n FROM learners WHERE guardian_id=?').get(gid).n>before&&db.prepare("SELECT nickname FROM learners WHERE guardian_id=? AND nickname='Star Kid'").get(gid));
 ok('guardian "Add a child" form creates the profile',!!after,{filled,created});

 // ===== Guardian: child controls + time limits forms =====
 await open(guardian,'/guardian/children/'+childId+'/safety');
 await waitFor(bodyHas('Learning time limits'));
 const unchecked=await evaluate(`(()=>{const l=[...document.querySelectorAll('label')].find(l=>l.textContent.includes('Allow guides and text help'));const i=l?.querySelector('input');if(!i)return false;i.click();return i.checked===false})()`);
 const savedControls=unchecked&&await clickText('Save controls');
 const ctl=await poll(()=>db.prepare('SELECT guides_enabled FROM learner_controls WHERE learner_id=?').get(childId)?.guides_enabled===0);
 ok('guardian controls form turns guides off on the server',ctl,{unchecked,savedControls});
 ok('guides-off is enforced for the child (/api/assist 403)',(await call('/api/assist',{method:'POST',cookie:learner,body:{message:'hello',companionId:'azouz'}})).status===403);
 const formSel="[...document.querySelectorAll('form')].find(f=>f.textContent.includes('Learning time limits'))";
 const setNum=(idx,v)=>evaluate(`(()=>{const i=${formSel}?.querySelectorAll('input[type=number]')[${idx}];if(!i)return false;Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(i,'${v}');i.dispatchEvent(new Event('input',{bubbles:true}));return true})()`);
 const set3=await setNum(0,45)&&await setNum(1,200)&&await setNum(2,20);
 const submitted=set3&&await evaluate(`(()=>{const f=${formSel};const btn=f?.querySelector('button');if(!btn)return false;btn.click();return true})()`);
 const lim=await poll(()=>db.prepare('SELECT daily_minutes AS d,weekly_minutes AS w,bedtime_hour AS h FROM learner_time_limits WHERE learner_id=?').get(childId)?.d===45&&db.prepare('SELECT daily_minutes AS d,weekly_minutes AS w,bedtime_hour AS h FROM learner_time_limits WHERE learner_id=?').get(childId));
 ok('guardian time-limits form saved 45 / 200 / 20',lim&&lim.w===200&&lim.h===20,JSON.stringify({set3,submitted,lim}));

 // ===== Moderator: resolve a report through the case screen =====
 await open(moderator,'/moderator/cases/'+reportId);
 await waitFor(bodyHas('Reason after review'));
 await setValue('textarea','Reviewed the story text with care and updated it.');
 await waitFor("[...document.querySelectorAll('button')].some(b=>b.textContent.trim()==='Resolve report'&&!b.disabled)");
 await clickText('Resolve report');
 ok('moderator sees the saved decision',await waitFor(bodyHas('Decision saved in the audit log.')));
 const rep=db.prepare('SELECT status,resolution FROM reports WHERE id=?').get(reportId);
 ok('report RESOLVED with the typed reason, and audited',rep.status==='RESOLVED'&&/with care/.test(rep.resolution)&&!!db.prepare("SELECT 1 FROM audit WHERE action='REPORT_RESOLVED' AND target_id=?").get(reportId),JSON.stringify(rep));
}catch(e){ok('form verification aborted',false,e.stack||e.message)}
finally{await b.close();await new Promise(r=>app.server.close(r));db.close()}
const failed=results.filter(x=>!x).length;
console.log(`\nFORMS RESULT: ${results.length-failed} passed, ${failed} failed`);
process.exit(failed?1:0);
