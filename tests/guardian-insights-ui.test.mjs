// Approved Phase B: guardian insights UI. Renders the REAL components (src/guardian-details.jsx,
// compiled with the project's esbuild) using REAL overview JSON from the running backend.
import {test,before,after} from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {mkdtempSync,mkdirSync,writeFileSync,rmSync} from 'node:fs';
import {join} from 'node:path';
import {pathToFileURL,fileURLToPath} from 'node:url';
import {createHash,randomBytes,randomUUID} from 'node:crypto';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {createApp} from '../server/app.mjs';
import {worlds} from '../src/data.js';

let ui,dir,t;
before(async()=>{
 // Compiled inside node_modules/.cache (gitignored) so the bundle resolves the project's react.
 const cache=fileURLToPath(new URL('../node_modules/.cache/',import.meta.url));mkdirSync(cache,{recursive:true});
 dir=mkdtempSync(join(cache,'usam-ui-'));
 const out=await build({entryPoints:[fileURLToPath(new URL('../src/guardian-details.jsx',import.meta.url))],bundle:true,format:'esm',platform:'node',write:false,external:['react','react-dom'],jsx:'transform',logLevel:'silent'});
 const file=join(dir,'guardian-details.mjs');writeFileSync(file,out.outputFiles[0].text);
 ui=await import(pathToFileURL(file).href);
 const app=createApp({database:':memory:',secureCookies:false,publicOrigin:''});
 await new Promise(r=>app.server.listen(0,'127.0.0.1',r));
 const base='http://127.0.0.1:'+app.server.address().port;
 const call=async(path,{method='GET',body,cookie}={})=>{const res=await fetch(base+path,{method,headers:{...(body?{'Content-Type':'application/json'}:{}),...(method!=='GET'?{Origin:base}:{}),...(cookie?{Cookie:cookie}:{})},body:body?JSON.stringify(body):undefined});return {status:res.status,data:await res.json()}};
 const h=x=>createHash('sha256').update(x).digest('hex'),at=new Date().toISOString();
 const mint=()=>{const gid=randomUUID(),lid=randomUUID(),lt=randomBytes(32).toString('base64url'),gt=randomBytes(32).toString('base64url');
  app.db.prepare('INSERT INTO users(id,role,email,password_hash,display_name,guardian_approved_at,created_at) VALUES(?,?,?,?,?,?,?)').run(gid,'GUARDIAN',gid+'@example.test','x','Parent',at,at);
  app.db.prepare('INSERT INTO learners(id,guardian_id,nickname,age_band,age_year,created_at) VALUES(?,?,?,?,?,?)').run(lid,gid,'Kid','10-12',10,at);
  app.db.prepare('INSERT INTO sessions VALUES(?,?,?,?,?)').run(h(lt),gid,lid,Date.now()+3600_000,at);
  app.db.prepare('INSERT INTO sessions VALUES(?,?,?,?,?)').run(h(gt),gid,null,Date.now()+3600_000,at);
  return {learnerId:lid,learner:'kids_session='+lt,guardian:'kids_session='+gt}};
 t={app,call,mint};
});
after(async()=>{await new Promise(r=>t.app.server.close(r));t.app.db.close();rmSync(dir,{recursive:true,force:true})});

const trFor=lang=>(ar,en)=>lang==='ar'?ar:en;
const render=(Component,props,lang)=>renderToStaticMarkup(React.createElement(Component,{...props,tr:trFor(lang),lang}));
const clean=html=>{assert.ok(!/NaN|undefined|\[object Object\]/.test(html),'no broken values rendered');return html};
const overviewOf=async f=>(await t.call('/api/guardian/children/'+f.learnerId+'/overview',{cookie:f.guardian})).data;

test('empty data: honest empty states in both languages, no broken values',async()=>{
 const f=t.mint(),ov=await overviewOf(f);
 const en=clean(render(ui.GuardianActivity,{overview:ov},'en'));
 assert.match(en,/Tracked activity, last 7 days/);assert.match(en,/No tracked minutes in the last 7 days/);assert.match(en,/No recorded activities in the last 28 days yet/);
 assert.match(en,/not a guaranteed measure of focused learning/);
 const ar=clean(render(ui.GuardianActivity,{overview:ov},'ar'));
 assert.match(ar,/النشاط المتتبَّع خلال آخر ٧ أيام/);assert.match(ar,/لا توجد دقائق متتبَّعة/);
 for(const w of worlds){
  const html=clean(render(ui.SubjectInsight,{insight:ov.insights.worlds[w.id],mastery:ov.mastery[w.id]},'en'));
  assert.match(html,/No evidence yet/);assert.match(html,/Try a first mission in this world/);
  assert.ok(!/role="progressbar"/.test(html),'no confidence bar without evidence');
 }
});

test('populated data: all three features render from the server response (EN + AR)',async()=>{
 const f=t.mint();
 await t.call('/api/attempts',{method:'POST',cookie:f.learner,body:{missionId:'coding-square',answers:[0,1,0]}});
 await t.call('/api/activities',{method:'POST',cookie:f.learner,body:{kind:'CODE_LAB',payload:{steps:['move','move','left','move']}}});
 await t.call('/api/usage/heartbeat',{method:'POST',cookie:f.learner,body:{}});
 const ov=await overviewOf(f);
 // 1. Mastery insights for the coding subject.
 const en=clean(render(ui.SubjectInsight,{insight:ov.insights.worlds.coding,mastery:ov.mastery.coding},'en'));
 for(const s of ['Learning insights','Mastery status','From the platform mastery rules','Evidence strength','Recorded evidence','Suggested next step','not a test score, a psychological assessment, or a judgment'])assert.ok(en.includes(s),'missing: '+s);
 assert.match(en,/role="progressbar" aria-valuenow="\d+"/);
 assert.match(en,/Knowledge/);assert.match(en,/Problem solving/);
 assert.ok(en.includes((({PRACTICING:'Practising',LEARNING:'Learning',GETTING_STRONGER:'Getting stronger'})[ov.mastery.coding])||'Practising'),'shows the authoritative mastery status');
 const ar=clean(render(ui.SubjectInsight,{insight:ov.insights.worlds.coding,mastery:ov.mastery.coding},'ar'));
 for(const s of ['رؤى التعلّم','حالة الإتقان','قوة الأدلة','الخطوة التالية المقترحة','ليست اختبارًا ولا تقييمًا نفسيًا'])assert.ok(ar.includes(s),'missing AR: '+s);
 // 2 + 3. Weekly tracked minutes and subject balance.
 const act=clean(render(ui.GuardianActivity,{overview:ov},'en'));
 assert.match(act,/1 tracked minutes/);assert.match(act,/1\/7 active days/);
 assert.match(act,/Activity by subject \(last 28 days\)/);assert.match(act,/100%/,'all recorded activity is coding');
 assert.equal((act.match(/role="progressbar"/g)||[]).length,7+worlds.length,'7 day bars + one bar per subject');
 const actAr=clean(render(ui.GuardianActivity,{overview:ov},'ar'));
 assert.match(actAr,/دقيقة متتبَّعة/);assert.match(actAr,/توزيع النشاط على العوالم/);assert.match(actAr,/١٠٠%/,'Arabic-Indic numerals');
 // Existing Activity content is still rendered after the new section.
 assert.match(act,/Activity timeline/);assert.match(act,/saved activities/);
});

test('existing guardian screens still render when insights are absent (backward compatible)',async()=>{
 const f=t.mint(),ov=await overviewOf(f);delete ov.insights;
 const progress=clean(render(ui.GuardianProgress,{overview:ov},'en'));
 assert.ok(!progress.includes('Learning insights'));assert.match(progress,/Missions tried/);
 const activity=clean(render(ui.GuardianActivity,{overview:ov},'en'));
 assert.ok(!activity.includes('Tracked activity'));assert.match(activity,/Activity timeline/);
 assert.match(clean(render(ui.GuardianProjects,{overview:ov},'en')),/No projects yet/,'projects tab untouched');
});

test('Progress tab integrates the insight panel for the selected subject',async()=>{
 const f=t.mint();await t.call('/api/attempts',{method:'POST',cookie:f.learner,body:{missionId:'english-greetings',answers:[0,0,0]}}).catch(()=>{});
 const ov=await overviewOf(f);
 const html=clean(render(ui.GuardianProgress,{overview:ov},'en'));
 assert.match(html,/Learning insights/);assert.match(html,/Missions tried/,'existing tiles kept');assert.match(html,/Recent attempts and mission levels/,'existing detail kept');
});

test('security: insights are guardian-only and family-isolated',async()=>{
 const f=t.mint(),other=t.mint();
 assert.equal((await t.call('/api/guardian/children/'+f.learnerId+'/overview',{cookie:other.guardian})).status,403,'other family blocked');
 assert.equal((await t.call('/api/guardian/children/'+f.learnerId+'/overview',{cookie:f.learner})).status,403,'child blocked from guardian overview');
 assert.equal((await t.call('/api/guardian/children/'+f.learnerId+'/overview')).status,401,'anonymous blocked');
 const snap=(await t.call('/api/learners/'+f.learnerId+'/snapshot',{cookie:f.learner})).data;
 assert.equal(snap.insights,undefined,'child snapshot has no insights');
 const ov=await overviewOf(f);
 assert.ok(!JSON.stringify(ov.insights).includes('@'),'insights contain no email or contact data');
});
