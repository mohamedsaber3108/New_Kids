// Every guardian / admin / moderator call the USAM_New frontend makes, exercised end-to-end
// with real writes, read-back, audit trail, and privacy cascades.
// Run: node tests/roles.e2e.mjs
import {createApp} from '../server/app.mjs';

const app=createApp({database:':memory:',secureCookies:false,publicOrigin:'',adminEmail:'admin@example.test',adminPassword:'Admin-Password-Long-123',moderatorEmail:'mod@example.test',moderatorPassword:'Moderator-Password-123',guardianConsentRequired:true});
await new Promise(r=>app.server.listen(0,'127.0.0.1',r));
const base='http://127.0.0.1:'+app.server.address().port,db=app.db;
const call=async(path,{method='GET',body,cookie}={})=>{const res=await fetch(base+path,{method,headers:{...(body?{'Content-Type':'application/json'}:{}),...(method!=='GET'?{Origin:base}:{}),...(cookie?{Cookie:cookie}:{})},body:body?JSON.stringify(body):undefined});let data=null;try{data=await res.json()}catch{}return {status:res.status,data,cookie:res.headers.get('set-cookie')?.split(';')[0],headers:res.headers}};
let pass=0,fail=0;const failures=[];
const check=(name,cond,detail)=>{if(cond)pass++;else{fail++;failures.push(name);console.log('  FAIL',name,detail===undefined?'':'-> '+JSON.stringify(detail).slice(0,240))}};
const count=(sql,...args)=>db.prepare(sql).get(...args).n;

try{
 // ---------- ADMIN ----------
 const admin=(await call('/api/auth/login',{method:'POST',body:{email:'admin@example.test',password:'Admin-Password-Long-123'}})).cookie;
 const reg=await call('/api/auth/register',{method:'POST',body:{email:'parent@example.test',password:'Guardian-Password-123',displayName:'Parent One'}});
 let guardian=reg.cookie;
 const pending=await call('/api/admin/guardians/pending',{cookie:admin});
 check('admin: pending guardian listed',pending.data?.guardians?.length===1,pending.data);
 const gid=pending.data.guardians[0].id;
 check('admin: approve requires attestation',(await call('/api/admin/guardians/'+gid+'/approve',{method:'POST',cookie:admin,body:{}})).status===400);
 check('admin: approve unknown guardian 404',(await call('/api/admin/guardians/nope/approve',{method:'POST',cookie:admin,body:{attestation:true}})).status===404);
 check('admin: approve guardian',(await call('/api/admin/guardians/'+gid+'/approve',{method:'POST',cookie:admin,body:{attestation:true}})).status===200);

 const curriculum=await call('/api/admin/curriculum',{cookie:admin});
 check('admin: curriculum lists worlds + missions',curriculum.status===200&&curriculum.data.worlds.length===5&&curriculum.data.missions.length>0,curriculum.data?.missions?.length);
 check('admin: curriculum hides answers (questionsCount only)',curriculum.data.missions.every(m=>!m.questions&&Number.isInteger(m.questionsCount)));
 const draft=await call('/api/admin/curriculum/drafts',{method:'POST',cookie:admin,body:{titleAr:'مهمة تجريبية جديدة',titleEn:'A new pilot mission',world:'coding',objectiveAr:'يتعلم الطفل التسلسل',objectiveEn:'Learn sequencing steps'}});
 check('admin: create curriculum draft',draft.status===201&&draft.data.status==='DRAFT',draft.data);
 check('admin: invalid draft rejected',(await call('/api/admin/curriculum/drafts',{method:'POST',cookie:admin,body:{titleAr:'x',titleEn:'x',world:'nope',objectiveAr:'x',objectiveEn:'x'}})).status===400);
 const edited=await call('/api/admin/curriculum/drafts/'+draft.data.id,{method:'PATCH',cookie:admin,body:{titleAr:'مهمة تجريبية معدلة',titleEn:'An edited pilot mission',world:'coding',objectiveAr:'يتعلم الطفل التسلسل',objectiveEn:'Learn sequencing steps',status:'REVIEW'}});
 check('admin: edit draft -> REVIEW persisted',edited.status===200&&edited.data.draft.status==='REVIEW'&&edited.data.draft.title_en==='An edited pilot mission',edited.data);
 check('admin: edit unknown draft 404',(await call('/api/admin/curriculum/drafts/nope',{method:'PATCH',cookie:admin,body:{titleAr:'مهمة تجريبية',titleEn:'Pilot mission',world:'coding',objectiveAr:'هدف واضح',objectiveEn:'Clear goal',status:'DRAFT'}})).status===404);
 const catalog=await call('/api/admin/catalog',{cookie:admin});
 check('admin: catalog includes drafts + analytics',catalog.status===200&&catalog.data.drafts.some(d=>d.id===draft.data.id)&&catalog.data.analytics,catalog.status);

 const exp=await call('/api/admin/experiments',{method:'POST',cookie:admin,body:{name:'Hint timing test',hypothesis:'Earlier hints reduce retries',variantA:'Hint after one try',variantB:'Hint after two tries'}});
 check('admin: create experiment draft',exp.status===201,exp.data);
 check('admin: experiment status -> REVIEW',(await call('/api/admin/experiments/'+exp.data.id,{method:'PATCH',cookie:admin,body:{status:'REVIEW'}})).status===200);
 check('admin: invalid experiment status rejected',(await call('/api/admin/experiments/'+exp.data.id,{method:'PATCH',cookie:admin,body:{status:'LIVE'}})).status===400);
 const ops=await call('/api/admin/operations',{cookie:admin});
 check('admin: operations shows experiment + honest FREE_ACCESS entitlements',ops.data.experiments.some(e=>e.id===exp.data.id&&e.status==='REVIEW')&&ops.data.entitlements.billingEnabled===false,ops.data?.entitlements);

 check('admin: voice flag OFF',(await call('/api/admin/feature-flags/VOICE_PLAYBACK',{method:'PATCH',cookie:admin,body:{enabled:false}})).status===200);
 check('flag reflected in public /config',(await call('/api/config')).data.voicePlayback===false);
 await call('/api/admin/feature-flags/VOICE_PLAYBACK',{method:'PATCH',cookie:admin,body:{enabled:true}});
 check('flag back ON in /config',(await call('/api/config')).data.voicePlayback===true);

 const agents=await call('/api/admin/agents',{cookie:admin});
 check('admin: companion safety evaluations all pass',agents.status===200&&agents.data.evaluations.length>0&&agents.data.evaluations.every(e=>e.passed),agents.data?.evaluations?.filter(e=>!e.passed));
 check('admin: agents honestly report no live model',agents.data.controls.liveModel===false);
 check('admin: insights available',(await call('/api/admin/insights',{cookie:admin})).status===200);
 const audit=await call('/api/admin/audit',{cookie:admin});
 for(const action of ['GUARDIAN_APPROVED','CURRICULUM_DRAFT_CREATED','CURRICULUM_DRAFT_REVIEW','EXPERIMENT_DRAFT_CREATED','FEATURE_VOICE_PLAYBACK_OFF'])check('audit trail records '+action,audit.data.audit.some(a=>a.action===action));

 // ---------- GUARDIAN ----------
 const policy=await call('/api/guardian/consent',{cookie:guardian});
 check('guardian: consent policy required + versioned',policy.data.required===true&&!!policy.data.policyVersion,policy.data);
 check('guardian: consent needs attestation',(await call('/api/guardian/consent',{method:'POST',cookie:guardian,body:{policyVersion:policy.data.policyVersion}})).status===400);
 check('guardian: give consent',(await call('/api/guardian/consent',{method:'POST',cookie:guardian,body:{policyVersion:policy.data.policyVersion,attestation:true}})).status===200);
 const child=await call('/api/guardians/learners',{method:'POST',cookie:guardian,body:{nickname:'Explorer',ageYear:10}});
 check('guardian: create child',child.status===201,child.data);
 const childId=child.data.id;
 check('guardian: child listed',(await call('/api/guardians/learners',{cookie:guardian})).data.learners.some(l=>l.id===childId));
 check('guardian: rename child + set age',(await call('/api/guardian/children/'+childId,{method:'PATCH',cookie:guardian,body:{nickname:'Star Explorer',ageYear:11}})).data?.learner?.nickname==='Star Explorer');

 // Child does some learning so guardian views have real data.
 const learner=(await call('/api/guardians/learners/'+childId+'/enter',{method:'POST',cookie:guardian,body:{}})).cookie;
 guardian=(await call('/api/auth/login',{method:'POST',body:{email:'parent@example.test',password:'Guardian-Password-123'}})).cookie;
 const attempt=await call('/api/attempts',{method:'POST',cookie:learner,body:{missionId:'coding-square',answers:[0,1,0]}});
 await call('/api/projects',{method:'POST',cookie:learner,body:{title:'Robot Garden',body:'A robot that waters plants on a weekly schedule.',world:'coding'}});
 await call('/api/assist',{method:'POST',cookie:learner,body:{message:'how do I start?',companionId:'codey'}});

 const overview=await call('/api/guardian/children/'+childId+'/overview',{cookie:guardian});
 check('guardian: overview shows real attempt + project',overview.status===200&&overview.data.attempts.length===1&&overview.data.projects.length===1,overview.status);
 const evidence=await call('/api/guardian/children/'+childId+'/evidence/'+attempt.data.id,{cookie:guardian});
 check('guardian: evidence detail with answers',evidence.status===200&&Array.isArray(evidence.data.evidence.answers),evidence.data);
 const exported=await call('/api/guardian/children/'+childId+'/export',{cookie:guardian});
 check('guardian: export includes conversations with messages',exported.status===200&&exported.data.conversations.length===1&&exported.data.conversations[0].messages.length===1,exported.data?.conversations);
 const goal=await call('/api/guardian/children/'+childId+'/goal',{method:'PATCH',cookie:guardian,body:{weeklyMissions:3,focusWorld:'coding',note:'Practice a little every day'}});
 check('guardian: weekly goal saved',goal.status===200&&goal.data.goal.weeklyMissions===3,goal.data);
 check('guardian: goal progress counts this week focus missions',goal.data.progress.completed===1&&goal.data.progress.remaining===2,goal.data.progress);
 check('guardian: goal with private info rejected',(await call('/api/guardian/children/'+childId+'/goal',{method:'PATCH',cookie:guardian,body:{weeklyMissions:3,focusWorld:'coding',note:'call 0101234567890'}})).status===400);
 check('guardian: family summary',(await call('/api/parents/family-summary',{cookie:guardian})).status===200);
 check('guardian: parents progress view',(await call('/api/parents/children/'+childId+'/progress',{cookie:guardian})).status===200);

 check('guardian: rename account',(await call('/api/guardian/account',{method:'PATCH',cookie:guardian,body:{displayName:'Parent Renamed'}})).status===200);
 check('guardian: name reflected in /auth/me',(await call('/api/auth/me',{cookie:guardian})).data.name==='Parent Renamed');

 // Consent withdrawal revokes the child's live session.
 check('child session works before withdrawal',(await call('/api/usage/status',{cookie:learner})).status===200);
 const withdraw=await call('/api/guardian/consent',{method:'DELETE',cookie:guardian});
 check('guardian: withdraw consent',withdraw.status===200&&withdraw.data.childSessionsRevoked===true,withdraw.data);
 check('child session revoked after consent withdrawal',(await call('/api/usage/status',{cookie:learner})).status===401);
 check('re-entering child blocked? (new child creation needs consent again)',(await call('/api/guardians/learners',{method:'POST',cookie:guardian,body:{nickname:'Second Kid',ageYear:9}})).data?.error==='guardian_consent_required');

 // Child deletion: requires confirmation and cascades ALL child data.
 check('delete child requires confirmation',(await call('/api/guardian/children/'+childId,{method:'DELETE',cookie:guardian,body:{confirm:'wrong'}})).status===400);
 const del=await call('/api/guardian/children/'+childId,{method:'DELETE',cookie:guardian,body:{confirm:childId}});
 check('delete child',del.status===200&&del.data.deleted===true,del.data);
 for(const table of ['attempts','activities','projects','conversations','sessions','learner_preferences'])check(`delete cascades ${table}`,count(`SELECT count(*) AS n FROM ${table} WHERE learner_id=?`,childId)===0);
 check('conversation messages removed with the child',count('SELECT count(*) AS n FROM conversation_messages')===0);

 // Password change revokes other sessions.
 const second=(await call('/api/auth/login',{method:'POST',body:{email:'parent@example.test',password:'Guardian-Password-123'}})).cookie;
 check('change password needs current password',(await call('/api/guardian/change-password',{method:'POST',cookie:guardian,body:{currentPassword:'wrong-password',newPassword:'New-Guardian-Password-456'}})).status===401);
 check('change password',(await call('/api/guardian/change-password',{method:'POST',cookie:guardian,body:{currentPassword:'Guardian-Password-123',newPassword:'New-Guardian-Password-456'}})).status===200);
 check('other session revoked after password change',(await call('/api/auth/me',{cookie:second})).data.authenticated===false);

 // ---------- MODERATOR ----------
 const mod=(await call('/api/auth/login',{method:'POST',body:{email:'mod@example.test',password:'Moderator-Password-123'}})).cookie;
 // a fresh learner files a report
 await call('/api/guardian/consent',{method:'POST',cookie:guardian,body:{policyVersion:policy.data.policyVersion,attestation:true}});
 const kid=(await call('/api/guardians/learners',{method:'POST',cookie:guardian,body:{nickname:'Reporter',ageYear:12}})).data.id;
 const kidCookie=(await call('/api/guardians/learners/'+kid+'/enter',{method:'POST',cookie:guardian,body:{}})).cookie;
 const report=await call('/api/reports',{method:'POST',cookie:kidCookie,body:{reason:'A message in a story felt unkind to me.'}});
 check('learner files report',report.status===201,report.data);
 check('moderator: queue shows report',(await call('/api/moderation/queue',{cookie:mod})).data.reports.some(r=>r.id===report.data.id));
 const caseView=await call('/api/moderation/reports/'+report.data.id,{cookie:mod});
 check('moderator: case detail is human-only review',caseView.status===200&&caseView.data.reviewMode==='HUMAN_ONLY',caseView.data);
 check('moderator: resolution needs a reason',(await call('/api/moderation/reports/'+report.data.id,{method:'PATCH',cookie:mod,body:{status:'RESOLVED',resolution:'ok'}})).status===400);
 check('moderator: resolve',(await call('/api/moderation/reports/'+report.data.id,{method:'PATCH',cookie:mod,body:{status:'RESOLVED',resolution:'Reviewed the story content with care.'}})).status===200);
 check('moderator: report left the queue',!(await call('/api/moderation/queue',{cookie:mod})).data.reports.some(r=>r.id===report.data.id));
 check('moderator: history shows resolution',(await call('/api/moderation/reports',{cookie:mod})).data.reports.find(r=>r.id===report.data.id)?.status==='RESOLVED');
 check('moderator: audit lists REPORT_RESOLVED',(await call('/api/moderation/audit',{cookie:mod})).data.audit.some(a=>a.action==='REPORT_RESOLVED'&&a.target_id===report.data.id));

 // ---------- CROSS-ROLE DENIALS (every protected area) ----------
 const denials=[['guardian -> admin overview',guardian,'/api/admin/overview'],['guardian -> moderation queue',guardian,'/api/moderation/queue'],['moderator -> admin catalog',mod,'/api/admin/catalog'],['moderator -> guardian children',mod,'/api/guardians/learners'],['learner -> guardian children',kidCookie,'/api/guardians/learners'],['learner -> admin audit',kidCookie,'/api/admin/audit'],['admin -> learner snapshot of unlinked child',admin,'/api/learners/'+kid+'/snapshot'],['anonymous -> admin overview',undefined,'/api/admin/overview'],['anonymous -> guardian export',undefined,'/api/guardian/children/'+kid+'/export']];
 for(const [name,cookie,path] of denials){const r=await call(path,{cookie});check('DENY '+name,r.status===401||r.status===403,r.status)}
}finally{await new Promise(r=>app.server.close(r));db.close()}
console.log(`\nROLES RESULT: ${pass} passed, ${fail} failed`);
if(failures.length)console.log('Failed:',failures.join(' | '));
process.exit(fail?1:0);
