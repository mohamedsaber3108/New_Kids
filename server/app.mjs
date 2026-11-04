import http from 'node:http';
import {randomBytes,randomUUID,scryptSync,timingSafeEqual,createHash} from 'node:crypto';
import {readFile,stat} from 'node:fs/promises';
import {resolve,join,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {openDatabase} from './db.mjs';
import {retentionCohorts} from './analytics.mjs';
import {missions,worlds,companions} from '../src/data.js';
import {scorePlacement} from '../src/placement.js';
import {scoreMission,nextReviewAt,recommendNext,masteryStatus,xpFromEvidence,xpFromActivities,scoreActivity} from '../src/engine.js';
import {learningSignals,gamificationSummary,dailyGoalProgress} from '../src/platform-engines.js';

const root=resolve(fileURLToPath(new URL('../',import.meta.url)));
const dist=join(root,'dist');
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.ico':'image/x-icon','.woff2':'font/woff2'};
const id=()=>randomUUID(),now=()=>new Date().toISOString();
const hash=t=>createHash('sha256').update(t).digest('hex');
function passwordHash(p){const salt=randomBytes(16).toString('hex');return salt+':'+scryptSync(p,salt,64).toString('hex')}
function passwordMatches(p,h){try{const [salt,hex]=h.split(':');const expected=Buffer.from(hex,'hex');return expected.length===64&&timingSafeEqual(expected,scryptSync(p,salt,64))}catch{return false}}
const securityHeaders={'X-Content-Type-Options':'nosniff','X-Frame-Options':'DENY','Referrer-Policy':'strict-origin-when-cross-origin','Permissions-Policy':'camera=(), microphone=(), geolocation=(), payment=(), usb=()','Cross-Origin-Resource-Policy':'same-origin','Content-Security-Policy':"default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; form-action 'self'; connect-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self'"};
function json(res,code,value,headers={}){res.writeHead(code,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store',...securityHeaders,...headers});res.end(JSON.stringify(value))}
function fail(res,code,error){json(res,code,{error})}
function parseCookies(header=''){return Object.fromEntries(header.split(';').map(s=>s.trim().split('=')).filter(a=>a.length===2))}
function cookie(token,secure){return 'kids_session='+token+'; HttpOnly; Path=/; SameSite=Strict; Max-Age=604800'+(secure?'; Secure':'')}
async function body(req){if(!(req.headers['content-type']||'').startsWith('application/json'))throw Object.assign(new Error('json_required'),{status:415});let chunks=[],size=0;for await(const chunk of req){size+=chunk.length;if(size>16384)throw Object.assign(new Error('body_too_large'),{status:413});chunks.push(chunk)}try{return JSON.parse(Buffer.concat(chunks).toString('utf8'))}catch{throw Object.assign(new Error('invalid_json'),{status:400})}}
const validNickname=s=>typeof s==='string'&&s.trim().length>=2&&s.trim().length<=28&&!/[<>\r\n]/.test(s);
const validPassword=s=>typeof s==='string'&&s.length>=12&&s.length<=128;
// Child-privacy filter for free text (projects, notes, milestones, reflections, goals, chat).
// Detects emails and phone numbers in the formats children in the primary market actually
// type: Egyptian mobiles (01012345678, 010-1234-5678, 010 1234 5678), Arabic-Indic digits
// (٠١٠١٢٣٤٥٦٧٨ / ۰۱۰...), +country codes and (555) 123-4567 styles. Rule: after normalizing
// digits and joining digit groups (2+ digits) split by space/dash/dot/brackets, any run of
// 9+ digits is treated as a phone/ID number. Short numbers (scores, years, levels) pass.
const privateInfo={test(value){
  const text=String(value??'').replace(/[٠-٩]/g,d=>String(d.charCodeAt(0)-0x660)).replace(/[۰-۹]/g,d=>String(d.charCodeAt(0)-0x6F0));
  if(/[\w.+-]+@[\w-]+(?:\.[\w-]+)*\.[A-Za-z]{2,}/.test(text))return true;
  let joined=text,prev;do{prev=joined;joined=joined.replace(/(\d{2,})[\s\-.()]+(?=\(?\d{2,})/g,'$1').replace(/\((\d{2,})\)/g,'$1')}while(joined!==prev);
  return /\d{9,}/.test(joined);
}};
function safeGuidance(message,companionId,missionId){
  if(privateInfo.test(message)||/(password|كلمة السر|عنواني|رقم تليفوني)/i.test(message))return {state:'RESTRICTED',reply:'لا تشارك معلوماتك الشخصية هنا. اطلب مساعدة ولي أمرك إذا احتجت.'};
  const guide=companions.find(c=>c.id===companionId)||companions[0];
  const mission=missions.find(m=>m.id===missionId);
  if(/(hint|تلميح|ساعد)/i.test(message)&&mission)return {state:'SAFE',reply:mission.questions[0].hintAr};
  const prompts={azouz:'ما الذي تعرفه بالفعل؟ اختر فكرة واحدة وجرّبها.',luma:'جرب جملة إنجليزية قصيرة ثم غيّر كلمة فيها.',codey:'قسّم المشكلة إلى خطوات ثم اختبر كل خطوة.',nova:'كيف تتأكد من المعلومة من مصدر موثوق؟',mira:'تخيل بداية مختلفة، ثم اسأل ماذا سيتغير.',adam:'من يحتاج هذا الحل؟ وما أبسط تجربة يمكنك عملها؟',zein:'ما أصغر خطوة تستطيع إنهاءها الآن؟',rami:'ما ملاحظتك؟ اكتب توقعًا ثم فكر في اختبار آمن.',faris:'حدد المشكلة ثم قارن حلين بدليل واحد.',tala:'ما الفكرة التي فهمتها من النص؟ احكها بجملة قصيرة.',byte:'اقرأ الأوامر بالترتيب: أين تختلف النتيجة عما توقعت؟',nour:'ما الذي نجح في محاولتك، وما الذي ستغيره؟',rex:'ابدأ بالجزء الذي تعرفه، ثم اطلب تلميحًا للجزء الصعب.',zara:'من سيستخدم فكرتك؟ ما الشيء الذي يمكن توضيحه؟',atlas:'أي مشكلة حقيقية يمكن أن تطبق عليها ما تعلمته؟'};
  return {state:'SAFE',reply:prompts[guide.id]||prompts.azouz};
}

export function createApp({database=':memory:',publicOrigin=process.env.PUBLIC_ORIGIN||'',secureCookies=process.env.NODE_ENV==='production',adminEmail=process.env.ADMIN_EMAIL,adminPassword=process.env.ADMIN_PASSWORD,moderatorEmail=process.env.MODERATOR_EMAIL,moderatorPassword=process.env.MODERATOR_PASSWORD,emailSender=null,guardianConsentRequired=process.env.REQUIRE_GUARDIAN_CONSENT==='true',logger=null}={}){
  const db=openDatabase(database);
  const requireEmailVerification=!!emailSender&&!!publicOrigin;
  db.prepare('INSERT OR IGNORE INTO feature_flags VALUES(?,?,?)').run('VOICE_PLAYBACK',1,now());
  if(adminEmail&&adminPassword&&!db.prepare('SELECT id FROM users WHERE role=? LIMIT 1').get('ADMIN')){
    if(!validPassword(adminPassword))throw new Error('ADMIN_PASSWORD must be at least 12 characters');
    db.prepare('INSERT INTO users(id,role,email,password_hash,display_name,guardian_approved_at,created_at) VALUES(?,?,?,?,?,?,?)').run(id(),'ADMIN',adminEmail.toLowerCase(),passwordHash(adminPassword),'USAM Admin',now(),now());
  }
  // Staff moderator provisioning (the /moderator desk needs a real MODERATOR account).
  // Idempotent by email: never overwrites an existing account or its password.
  if(moderatorEmail&&moderatorPassword&&!db.prepare('SELECT id FROM users WHERE email=?').get(moderatorEmail.toLowerCase())){
    if(!validPassword(moderatorPassword))throw new Error('MODERATOR_PASSWORD must be at least 12 characters');
    db.prepare('INSERT INTO users(id,role,email,password_hash,display_name,guardian_approved_at,created_at) VALUES(?,?,?,?,?,?,?)').run(id(),'MODERATOR',moderatorEmail.toLowerCase(),passwordHash(moderatorPassword),'USAM Moderator',now(),now());
  }
  // Removes expired sessions and one-time tokens. Returns counts; safe to run repeatedly.
  function cleanupExpired(at=Date.now()){
    const sessions=db.prepare('DELETE FROM sessions WHERE expires_at<=?').run(at).changes;
    const resets=db.prepare('DELETE FROM password_resets WHERE expires_at<=?').run(at).changes;
    const verifications=db.prepare('DELETE FROM email_verifications WHERE expires_at<=?').run(at).changes;
    return {sessions,resets,verifications};
  }
  const rate=new Map();
  function limited(key,limit=12){const t=Date.now(),item=rate.get(key)||{count:0,until:t+60_000};if(item.until<t){item.count=0;item.until=t+60_000}item.count++;rate.set(key,item);return item.count>limit}
  function audit(actor,action,type,target){db.prepare('INSERT INTO audit VALUES(?,?,?,?,?,?)').run(id(),actor,action,type,target,now())}
  function session(req){const token=parseCookies(req.headers.cookie).kids_session;if(!token)return null;let row=db.prepare('SELECT s.user_id,s.learner_id,u.role,u.email,u.display_name,u.guardian_approved_at,u.email_verified_at FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires_at>?').get(hash(token),Date.now());return row||null}
  function requireRole(res,session,roles){if(!session){fail(res,401,'sign_in_required');return false}let role=session.learner_id?'LEARNER':session.role;if(!roles.includes(role)){fail(res,403,'forbidden');return false}return true}
  function linked(res,s,learnerId){if(!s){fail(res,401,'sign_in_required');return false}if(s.learner_id===learnerId)return true;if(s.role==='GUARDIAN'&&!s.learner_id&&db.prepare('SELECT id FROM learners WHERE id=? AND guardian_id=?').get(learnerId,s.user_id))return true;fail(res,403,'learner_not_linked');return false}
  function newSession(res,userId,learnerId=null){const token=randomBytes(32).toString('base64url');db.prepare('INSERT INTO sessions VALUES(?,?,?,?,?)').run(hash(token),userId,learnerId,Date.now()+604800000,now());res.setHeader('Set-Cookie',cookie(token,secureCookies))}
  async function sendVerification(user){const token=randomBytes(32).toString('base64url');db.prepare('DELETE FROM email_verifications WHERE user_id=?').run(user.id);db.prepare('INSERT INTO email_verifications VALUES(?,?,?,?)').run(hash(token),user.id,Date.now()+86400000,now());try{await emailSender({to:user.email,verificationUrl:publicOrigin.replace(/\/$/,'')+'/verify?token='+encodeURIComponent(token)})}catch(e){db.prepare('DELETE FROM email_verifications WHERE token_hash=?').run(hash(token));throw e}}
  function goalProgress(learnerId,goal){const today=new Date(),weekday=(today.getUTCDay()+6)%7,weekStart=new Date(Date.UTC(today.getUTCFullYear(),today.getUTCMonth(),today.getUTCDate()-weekday)).toISOString();const completed=goal?db.prepare('SELECT count(DISTINCT mission_id) AS n FROM attempts WHERE learner_id=? AND mission_id LIKE ? AND created_at>=?').get(learnerId,goal.focusWorld+'-%',weekStart).n:0;return {weekStart,completed,target:goal?.weeklyMissions||0,remaining:Math.max(0,(goal?.weeklyMissions||0)-completed),met:!!goal&&completed>=goal.weeklyMissions,rule:'DISTINCT_FOCUS_MISSIONS_UTC_WEEK'}}
  function learnerControls(learnerId){const row=db.prepare('SELECT guides_enabled,voice_enabled,updated_at FROM learner_controls WHERE learner_id=?').get(learnerId);return {guidesEnabled:row?!!row.guides_enabled:true,voiceEnabled:row?!!row.voice_enabled:true,updatedAt:row?.updated_at||null}}
  function timeLimits(learnerId){const row=db.prepare('SELECT daily_minutes AS dailyMinutes,weekly_minutes AS weeklyMinutes,bedtime_hour AS bedtimeHour,updated_at AS updatedAt FROM learner_time_limits WHERE learner_id=?').get(learnerId);return row?{...row,configured:true}:{dailyMinutes:60,weeklyMinutes:300,bedtimeHour:21,updatedAt:null,configured:false}}
  function timeLimitStatus(learnerId){const limits=timeLimits(learnerId),date=new Date(),today=date.toISOString().slice(0,10),monday=new Date(Date.UTC(date.getUTCFullYear(),date.getUTCMonth(),date.getUTCDate()-((date.getUTCDay()+6)%7))).toISOString().slice(0,10),daily=db.prepare('SELECT count(*) AS n FROM learner_usage_minutes WHERE learner_id=? AND day=?').get(learnerId,today).n,weekly=db.prepare('SELECT count(*) AS n FROM learner_usage_minutes WHERE learner_id=? AND day>=?').get(learnerId,monday).n,hour=Number(new Intl.DateTimeFormat('en-GB',{timeZone:'Africa/Cairo',hour:'2-digit',hour12:false}).format(date)),bedtimeBlocked=limits.configured&&(hour>=limits.bedtimeHour||hour<6);return {limits,dailyUsed:daily,weeklyUsed:weekly,dailyRemaining:Math.max(0,limits.dailyMinutes-daily),weeklyRemaining:Math.max(0,limits.weeklyMinutes-weekly),bedtimeBlocked,allowed:!limits.configured||daily<limits.dailyMinutes&&weekly<limits.weeklyMinutes&&!bedtimeBlocked,timeZone:'Africa/Cairo'}}
  function snapshot(learnerId){const learner=db.prepare('SELECT id,nickname,age_band,age_year FROM learners WHERE id=?').get(learnerId);const attempts=db.prepare('SELECT id,mission_id,score,total,created_at,next_review_at FROM attempts WHERE learner_id=? ORDER BY created_at DESC').all(learnerId).map(a=>({id:a.id,missionId:a.mission_id,score:a.score,total:a.total,at:a.created_at,nextReviewAt:a.next_review_at}));const completed={};for(const a of attempts)completed[a.missionId]=Math.max(completed[a.missionId]||0,a.score);const projects=db.prepare('SELECT id,title,body,world,created_at AS at,updated_at AS updatedAt FROM projects WHERE learner_id=? ORDER BY created_at DESC').all(learnerId).map(project=>({...project,notes:db.prepare('SELECT stage,body,updated_at AS updatedAt FROM project_notes WHERE project_id=?').all(project.id)}));const activities=db.prepare('SELECT id,kind,world,score,total,detail_json,created_at AS at FROM activities WHERE learner_id=? ORDER BY created_at DESC').all(learnerId).map(a=>({id:a.id,kind:a.kind,world:a.world,score:a.score,total:a.total,detail:JSON.parse(a.detail_json),at:a.at}));const preferencesRow=db.prepare('SELECT preferences_json FROM learner_preferences WHERE learner_id=?').get(learnerId);const preferences=preferencesRow?JSON.parse(preferencesRow.preferences_json):null;const placementRow=db.prepare('SELECT results_json,created_at FROM placements WHERE learner_id=?').get(learnerId);const placement=placementRow?{...JSON.parse(placementRow.results_json),at:placementRow.created_at}:null;const recommendation=recommendNext({attempts,completed,projects,placement});const mastery=Object.fromEntries(worlds.map(w=>[w.id,masteryStatus({attempts,projects},w.id)]));const evidence=[...attempts.map(a=>({id:a.id,missionId:a.missionId,score:a.score,total:a.total,at:a.at,kind:'quiz'})),...activities].sort((a,b)=>new Date(b.at)-new Date(a.at));const dailyGoal=db.prepare('SELECT target FROM daily_goals WHERE learner_id=?').get(learnerId)||{target:2};const gamification=gamificationSummary({completed,projects,activities,attempts});return {learner,completed,evidence,attempts,activities,projects,sessions:db.prepare("SELECT id,mission_id AS missionId,mode,status,answers_json AS answersJson,updated_at AS updatedAt FROM learning_sessions WHERE learner_id=? AND status='IN_PROGRESS' ORDER BY updated_at DESC LIMIT 20").all(learnerId).map(x=>({id:x.id,missionId:x.missionId,mode:x.mode,status:x.status,answers:JSON.parse(x.answersJson),updatedAt:x.updatedAt})),preferences,placement,controls:learnerControls(learnerId),timeLimits:timeLimits(learnerId),goal:db.prepare('SELECT weekly_missions AS weeklyMissions,focus_world AS focusWorld,note FROM guardian_goals WHERE learner_id=?').get(learnerId)||null,dailyGoal,dailyGoalProgress:dailyGoalProgress(dailyGoal,evidence),gamification,recommendation,mastery,xp:gamification.xp}}
  async function handler(req,res){
    const requestId=id();res.setHeader('X-Request-Id',requestId);
    if(logger){const started=process.hrtime.bigint(),pathOnly=String(req.url||'').split('?')[0];res.on('finish',()=>{try{logger({level:res.statusCode>=500?'error':res.statusCode>=400?'warn':'info',msg:'request',requestId,method:req.method,path:pathOnly,status:res.statusCode,ms:Number((process.hrtime.bigint()-started)/1000000n)})}catch{}})}if(secureCookies)res.setHeader('Strict-Transport-Security','max-age=31536000; includeSubDomains');
    try{
      const url=new URL(req.url,'http://localhost'),p=url.pathname,method=req.method;
      if(p.startsWith('/api/')){
        if(method!=='GET'&&method!=='HEAD'){const origin=req.headers.origin;if((publicOrigin&&origin!==publicOrigin)||(!publicOrigin&&origin&&origin!==new URL((req.headers['x-forwarded-proto']||'http')+'://'+req.headers.host).origin)){return fail(res,403,'origin_mismatch')}}
        if(method==='GET'&&p==='/api/health')return json(res,200,{ok:true,service:'usam-kids-api',version:2,capabilities:['guardian-consent','time-limits','adaptive-learning','gamification','private-projects','safe-companions']});
        if(method==='GET'&&p==='/api/health/ready'){db.prepare('SELECT 1 AS ok').get();return json(res,200,{ok:true,ready:true,service:'usam-kids-api',requestId});}
        if(method==='GET'&&p==='/api/config')return json(res,200,{voicePlayback:!!db.prepare('SELECT enabled FROM feature_flags WHERE key=?').get('VOICE_PLAYBACK').enabled,guardianConsentRequired});
        const s=session(req);
        const learningMutation=s?.learner_id&&method!=='GET'&&method!=='HEAD'&&/^\/api\/(placement|attempts|learning-sessions|activities|projects|assist|learner\/preferences)/.test(p);
        if(learningMutation&&!timeLimitStatus(s.learner_id).allowed)return fail(res,403,'learning_time_paused');
        if(method==='GET'&&p==='/api/catalog')return json(res,200,{worlds,companions,missions:missions.map(({questions,...m})=>({...m,questions:questions.map(({answer,...q})=>q)}))});
        if(method==='GET'&&p==='/api/auth/me')return json(res,200,s?{authenticated:true,role:s.learner_id?'LEARNER':s.role,name:s.display_name,email:s.learner_id?undefined:s.email,learnerId:s.learner_id,guardianApproved:!!s.guardian_approved_at,emailVerified:!!s.email_verified_at,emailVerificationRequired:requireEmailVerification}:{authenticated:false});
        if(method==='PATCH'&&p==='/api/guardian/account'){
          if(!requireRole(res,s,['GUARDIAN']))return;const b=await body(req);
          if(!validNickname(b.displayName))return fail(res,400,'invalid_display_name');
          db.prepare('UPDATE users SET display_name=? WHERE id=?').run(b.displayName.trim(),s.user_id);
          audit(s.user_id,'GUARDIAN_PROFILE_UPDATED','user',s.user_id);
          return json(res,200,{name:b.displayName.trim()});
        }
        if(method==='POST'&&p==='/api/guardian/change-password'){
          if(!requireRole(res,s,['GUARDIAN']))return;
          if(limited('change-password:'+s.user_id,5))return fail(res,429,'rate_limited');
          const b=await body(req),u=db.prepare('SELECT password_hash FROM users WHERE id=?').get(s.user_id);
          if(!passwordMatches(String(b.currentPassword||''),u.password_hash))return fail(res,401,'invalid_credentials');
          if(!validPassword(b.newPassword)||b.currentPassword===b.newPassword)return fail(res,400,'invalid_new_password');
          const currentToken=hash(parseCookies(req.headers.cookie).kids_session||'');
          db.exec('BEGIN IMMEDIATE');try{
            db.prepare('UPDATE users SET password_hash=? WHERE id=?').run(passwordHash(b.newPassword),s.user_id);
            db.prepare('DELETE FROM sessions WHERE user_id=? AND token_hash<>?').run(s.user_id,currentToken);
            audit(s.user_id,'PASSWORD_CHANGED','user',s.user_id);
            db.exec('COMMIT');
          }catch(e){db.exec('ROLLBACK');throw e}
          return json(res,200,{changed:true,otherSessionsRevoked:true});
        }
        if(method==='GET'&&p==='/api/learner/controls'){if(!requireRole(res,s,['LEARNER']))return;return json(res,200,{controls:learnerControls(s.learner_id)})}
        if(method==='POST'&&p==='/api/auth/register'){
          if(limited('register:'+req.socket.remoteAddress,5))return fail(res,429,'rate_limited');
          const b=await body(req),email=String(b.email||'').trim().toLowerCase();
          if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||!validPassword(b.password)||!validNickname(b.displayName))return fail(res,400,'invalid_registration');
          if(db.prepare('SELECT id FROM users WHERE email=?').get(email))return fail(res,409,'email_exists');
          const userId=id();db.prepare('INSERT INTO users(id,role,email,password_hash,display_name,guardian_approved_at,created_at) VALUES(?,?,?,?,?,?,?)').run(userId,'GUARDIAN',email,passwordHash(b.password),b.displayName.trim(),null,now());
          if(requireEmailVerification){try{await sendVerification({id:userId,email})}catch{db.prepare('DELETE FROM users WHERE id=?').run(userId);return fail(res,503,'verification_delivery_unavailable')}}
          newSession(res,userId);audit(userId,'GUARDIAN_REGISTERED','user',userId);return json(res,201,{role:'GUARDIAN',guardianApproved:false,emailVerificationRequired:requireEmailVerification});
        }
        if(method==='GET'&&p==='/api/auth/verify-email/validate'){const token=url.searchParams.get('token')||'';const valid=token.length>=32&&!!db.prepare('SELECT 1 FROM email_verifications WHERE token_hash=? AND expires_at>?').get(hash(token),Date.now());return json(res,200,{valid})}
        if(method==='POST'&&p==='/api/auth/verify-email'){
          if(limited('verify:'+req.socket.remoteAddress,10))return fail(res,429,'rate_limited');const b=await body(req);if(typeof b.token!=='string'||b.token.length<32)return fail(res,400,'invalid_token');const row=db.prepare('SELECT user_id FROM email_verifications WHERE token_hash=? AND expires_at>?').get(hash(b.token),Date.now());if(!row)return fail(res,400,'invalid_or_expired_token');db.exec('BEGIN IMMEDIATE');try{db.prepare('UPDATE users SET email_verified_at=? WHERE id=? AND role=?').run(now(),row.user_id,'GUARDIAN');db.prepare('DELETE FROM email_verifications WHERE user_id=?').run(row.user_id);audit(row.user_id,'EMAIL_VERIFIED','user',row.user_id);db.exec('COMMIT')}catch(e){db.exec('ROLLBACK');throw e}return json(res,200,{verified:true})
        }
        if(method==='POST'&&p==='/api/auth/verify-email/resend'){
          if(!requireRole(res,s,['GUARDIAN']))return;if(!requireEmailVerification)return fail(res,503,'verification_unavailable');if(s.email_verified_at)return json(res,200,{verified:true});if(limited('verify-resend:'+s.user_id,3))return fail(res,429,'rate_limited');try{await sendVerification({id:s.user_id,email:s.email})}catch{return fail(res,503,'verification_delivery_unavailable')}return json(res,200,{sent:true})
        }
        if(method==='POST'&&p==='/api/auth/login'){
          if(limited('login:'+req.socket.remoteAddress,10))return fail(res,429,'rate_limited');
          const b=await body(req),u=db.prepare('SELECT * FROM users WHERE email=?').get(String(b.email||'').trim().toLowerCase());
          if(!u||!passwordMatches(String(b.password||''),u.password_hash))return fail(res,401,'invalid_credentials');
          newSession(res,u.id);return json(res,200,{role:u.role,name:u.display_name,guardianApproved:!!u.guardian_approved_at});
        }
        if(method==='POST'&&p==='/api/auth/forgot-password'){
          if(limited('recovery:'+req.socket.remoteAddress,3))return fail(res,429,'rate_limited');
          const b=await body(req),email=String(b.email||'').trim().toLowerCase();if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))return fail(res,400,'invalid_email');
          if(!emailSender||!publicOrigin)return fail(res,503,'recovery_unavailable');
          const user=db.prepare('SELECT id,email FROM users WHERE email=?').get(email);
          if(user){const token=randomBytes(32).toString('base64url');db.prepare('DELETE FROM password_resets WHERE user_id=?').run(user.id);db.prepare('INSERT INTO password_resets VALUES(?,?,?,?)').run(hash(token),user.id,Date.now()+900000,now());try{await emailSender({to:user.email,resetUrl:publicOrigin.replace(/\/$/,'')+'/reset-password?token='+encodeURIComponent(token)})}catch{db.prepare('DELETE FROM password_resets WHERE token_hash=?').run(hash(token));return fail(res,503,'recovery_unavailable')}}
          return json(res,200,{sent:true});
        }
        if(method==='GET'&&p==='/api/auth/reset-password/validate'){
          const token=url.searchParams.get('token')||'';const valid=token.length>=32&&!!db.prepare('SELECT 1 FROM password_resets WHERE token_hash=? AND expires_at>?').get(hash(token),Date.now());return json(res,200,{valid});
        }
        if(method==='POST'&&p==='/api/auth/reset-password'){
          if(limited('reset:'+req.socket.remoteAddress,8))return fail(res,429,'rate_limited');const b=await body(req);
          if(typeof b.token!=='string'||b.token.length<32||!validPassword(b.password))return fail(res,400,'invalid_reset');
          const row=db.prepare('SELECT user_id FROM password_resets WHERE token_hash=? AND expires_at>?').get(hash(b.token),Date.now());if(!row)return fail(res,400,'invalid_or_expired_token');
          db.exec('BEGIN IMMEDIATE');try{db.prepare('UPDATE users SET password_hash=? WHERE id=?').run(passwordHash(b.password),row.user_id);db.prepare('DELETE FROM password_resets WHERE user_id=?').run(row.user_id);db.prepare('DELETE FROM sessions WHERE user_id=?').run(row.user_id);audit(row.user_id,'PASSWORD_RESET','user',row.user_id);db.exec('COMMIT')}catch(e){db.exec('ROLLBACK');throw e}
          return json(res,200,{reset:true});
        }
        if(method==='POST'&&p==='/api/auth/logout'){if(s){const token=parseCookies(req.headers.cookie).kids_session;db.prepare('DELETE FROM sessions WHERE token_hash=?').run(hash(token))}res.setHeader('Set-Cookie','kids_session=; HttpOnly; Path=/; SameSite=Strict; Max-Age=0'+(secureCookies?'; Secure':''));return json(res,200,{ok:true})}
        if(p==='/api/guardian/consent'){
          if(!requireRole(res,s,['GUARDIAN']))return;
          if(method==='GET'){const current=db.prepare('SELECT policy_version AS policyVersion,attested_at AS attestedAt,withdrawn_at AS withdrawnAt FROM guardian_consents WHERE guardian_id=? ORDER BY attested_at DESC LIMIT 1').get(s.user_id)||null;return json(res,200,{required:guardianConsentRequired,policyVersion:'2026-10-child-service-v1',current})}
          if(method==='POST'){const b=await body(req);if(b.policyVersion!=='2026-10-child-service-v1'||b.attestation!==true)return fail(res,400,'consent_attestation_required');db.prepare('INSERT INTO guardian_consents VALUES(?,?,?,NULL) ON CONFLICT(guardian_id,policy_version) DO UPDATE SET attested_at=excluded.attested_at,withdrawn_at=NULL').run(s.user_id,b.policyVersion,now());audit(s.user_id,'GUARDIAN_CONSENT_ATTESTED','user',s.user_id);return json(res,200,{consented:true,policyVersion:b.policyVersion})}
          if(method==='DELETE'){db.prepare('UPDATE guardian_consents SET withdrawn_at=? WHERE guardian_id=? AND withdrawn_at IS NULL').run(now(),s.user_id);db.prepare('DELETE FROM sessions WHERE user_id=? AND learner_id IS NOT NULL').run(s.user_id);audit(s.user_id,'GUARDIAN_CONSENT_WITHDRAWN','user',s.user_id);return json(res,200,{withdrawn:true,childSessionsRevoked:true})}
        }
        if(method==='GET'&&p==='/api/guardians/learners'){if(!requireRole(res,s,['GUARDIAN']))return;return json(res,200,{learners:db.prepare('SELECT id,nickname,age_band,age_year,created_at FROM learners WHERE guardian_id=? ORDER BY created_at DESC').all(s.user_id)})}
        if(method==='GET'&&p==='/api/parents/children'){if(!requireRole(res,s,['GUARDIAN']))return;return json(res,200,{children:db.prepare('SELECT id,nickname,age_band AS ageBand,age_year AS ageYear,created_at AS createdAt FROM learners WHERE guardian_id=? ORDER BY created_at DESC').all(s.user_id)})}
        if(method==='GET'&&p==='/api/parents/family-summary'){if(!requireRole(res,s,['GUARDIAN']))return;const children=db.prepare('SELECT id,nickname FROM learners WHERE guardian_id=?').all(s.user_id);return json(res,200,{children:children.map(child=>{const shot=snapshot(child.id);return {id:child.id,nickname:child.nickname,missions:Object.keys(shot.completed).length,projects:shot.projects.length,evidence:shot.evidence.length,dailyGoal:shot.dailyGoalProgress,timeLimits:timeLimitStatus(child.id)}})})}
        if(method==='POST'&&p==='/api/guardians/learners'){
          if(!requireRole(res,s,['GUARDIAN']))return;if(requireEmailVerification&&!s.email_verified_at)return fail(res,403,'email_verification_required');if(!s.guardian_approved_at)return fail(res,403,'guardian_approval_required');if(guardianConsentRequired&&!db.prepare('SELECT 1 FROM guardian_consents WHERE guardian_id=? AND policy_version=? AND withdrawn_at IS NULL').get(s.user_id,'2026-10-child-service-v1'))return fail(res,403,'guardian_consent_required');
          const b=await body(req),ageYear=b.ageYear===undefined?null:b.ageYear,ageBand=ageYear===null?b.ageBand:ageYear<=9?'7-9':ageYear<=12?'10-12':'13-15';if(!validNickname(b.nickname)||!['7-9','10-12','13-15'].includes(ageBand)||ageYear!==null&&(!Number.isInteger(ageYear)||ageYear<7||ageYear>15||b.ageBand!==undefined&&b.ageBand!==ageBand))return fail(res,400,'invalid_learner');
          const learnerId=id();db.prepare('INSERT INTO learners(id,guardian_id,nickname,age_band,age_year,created_at) VALUES(?,?,?,?,?,?)').run(learnerId,s.user_id,b.nickname.trim(),ageBand,ageYear,now());audit(s.user_id,'LEARNER_CREATED','learner',learnerId);return json(res,201,{id:learnerId,nickname:b.nickname.trim(),ageBand,ageYear});
        }
        const enter=p.match(/^\/api\/guardians\/learners\/([^/]+)\/enter$/);
        if(method==='POST'&&enter){if(!requireRole(res,s,['GUARDIAN']))return;const child=db.prepare('SELECT id FROM learners WHERE id=? AND guardian_id=?').get(enter[1],s.user_id);if(!child)return fail(res,404,'learner_not_found');const token=parseCookies(req.headers.cookie).kids_session;db.prepare('DELETE FROM sessions WHERE token_hash=?').run(hash(token));newSession(res,s.user_id,child.id);return json(res,200,{role:'LEARNER',learnerId:child.id})}
        const snap=p.match(/^\/api\/learners\/([^/]+)\/snapshot$/);
        if(method==='GET'&&snap){if(!linked(res,s,snap[1]))return;return json(res,200,snapshot(snap[1]))}
        if(p==='/api/usage/status'){if(!requireRole(res,s,['LEARNER']))return;return json(res,200,timeLimitStatus(s.learner_id))}
        if(method==='POST'&&p==='/api/usage/heartbeat'){if(!requireRole(res,s,['LEARNER']))return;const status=timeLimitStatus(s.learner_id);if(!status.allowed)return fail(res,403,'learning_time_paused');const stamp=new Date().toISOString(),minute=stamp.slice(0,16);db.prepare('INSERT OR IGNORE INTO learner_usage_minutes VALUES(?,?,?,?)').run(s.learner_id,stamp.slice(0,10),minute,stamp);return json(res,200,timeLimitStatus(s.learner_id))}
        if(p==='/api/daily-goals/me'){
          if(!requireRole(res,s,['LEARNER']))return;const row=db.prepare('SELECT target,updated_at AS updatedAt FROM daily_goals WHERE learner_id=?').get(s.learner_id)||{target:2,updatedAt:null};
          if(method==='GET')return json(res,200,{goal:row,progress:dailyGoalProgress(row,snapshot(s.learner_id).evidence)});
          if(method==='PUT'){const b=await body(req);if(!Number.isInteger(b.target)||b.target<1||b.target>5)return fail(res,400,'invalid_daily_goal');db.prepare('INSERT INTO daily_goals VALUES(?,?,?) ON CONFLICT(learner_id) DO UPDATE SET target=excluded.target,updated_at=excluded.updated_at').run(s.learner_id,b.target,now());return json(res,200,{goal:{target:b.target},progress:dailyGoalProgress({target:b.target},snapshot(s.learner_id).evidence)})}
        }
        if(method==='GET'&&p==='/api/daily-goals/me/progress'){if(!requireRole(res,s,['LEARNER']))return;const goal=db.prepare('SELECT target FROM daily_goals WHERE learner_id=?').get(s.learner_id)||{target:2};return json(res,200,{progress:dailyGoalProgress(goal,snapshot(s.learner_id).evidence)})}
        if(method==='GET'&&p.startsWith('/api/adaptive/')){
          if(!requireRole(res,s,['LEARNER']))return;const shot=snapshot(s.learner_id),signals=learningSignals(shot),name=p.slice('/api/adaptive/'.length).split('/')[0],map={engagement:signals.engagement,'cognitive-load':signals.cognitiveLoad,'interleaved-practice':signals.interleavedPractice,'transfer-opportunities':signals.transferOpportunities,recommendations:signals.recommendation,'next-activity':signals.recommendation,'learning-path':{worldId:signals.recommendation.worldId||missions.find(m=>m.id===signals.recommendation.missionId)?.world,missionId:signals.recommendation.missionId||null},difficulty:signals.zpd,'growth-velocity':signals.growthVelocity,'should-level-up':{shouldLevelUp:signals.shouldLevelUp},zpd:signals.zpd};if(!(name in map))return fail(res,404,'adaptive_capability_not_found');return json(res,200,{data:map[name],generatedAt:now()})
        }
        if(method==='GET'&&p.startsWith('/api/gamification/')){
          if(!requireRole(res,s,['LEARNER']))return;const shot=snapshot(s.learner_id),summary=gamificationSummary(shot),spent=db.prepare('SELECT spent_coins FROM gamification_wallets WHERE learner_id=?').get(s.learner_id)?.spent_coins||0,coins=Math.max(0,summary.coins-spent),name=p.slice('/api/gamification/'.length),owned=db.prepare('SELECT cosmetic_id AS id,equipped,unlocked_at AS unlockedAt FROM learner_cosmetics WHERE learner_id=?').all(s.learner_id).map(x=>({...x,equipped:!!x.equipped})),catalog=[{id:'green-trail',cost:5},{id:'star-frame',cost:10},{id:'inventor-badge',cost:15}];if(name==='progression')return json(res,200,{xp:summary.xp,level:summary.level,nextLevelXp:summary.nextLevelXp,coins});if(name==='streak')return json(res,200,{streak:summary.streak});if(name==='achievements')return json(res,200,{achievements:summary.achievements});if(name==='leaderboard'||name==='rank')return json(res,200,{mode:'PRIVATE_PERSONAL_BEST',rank:null,message:'Public child ranking is disabled'});if(name==='cosmetics')return json(res,200,{coins,catalog:catalog.map(x=>({...x,owned:owned.some(o=>o.id===x.id),equipped:owned.some(o=>o.id===x.id&&o.equipped)}))});if(name==='streak-freeze/status')return json(res,200,{available:db.prepare('SELECT available FROM streak_freezes WHERE learner_id=?').get(s.learner_id)?.available||0,cost:20});return fail(res,404,'gamification_capability_not_found')
        }
        const cosmeticAction=p.match(/^\/api\/gamification\/cosmetics\/([^/]+)\/(unlock|equip)$/);
        if(method==='POST'&&cosmeticAction){if(!requireRole(res,s,['LEARNER']))return;const catalog={"green-trail":5,"star-frame":10,"inventor-badge":15},cosmeticId=cosmeticAction[1],action=cosmeticAction[2];if(!(cosmeticId in catalog))return fail(res,404,'cosmetic_not_found');if(action==='unlock'){if(db.prepare('SELECT 1 FROM learner_cosmetics WHERE learner_id=? AND cosmetic_id=?').get(s.learner_id,cosmeticId))return json(res,200,{ok:true,cosmeticId,action,alreadyOwned:true});const earned=gamificationSummary(snapshot(s.learner_id)).coins,spent=db.prepare('SELECT spent_coins FROM gamification_wallets WHERE learner_id=?').get(s.learner_id)?.spent_coins||0;if(earned-spent<catalog[cosmeticId])return fail(res,409,'not_enough_coins');db.exec('BEGIN IMMEDIATE');try{db.prepare('INSERT INTO learner_cosmetics VALUES(?,?,0,?)').run(s.learner_id,cosmeticId,now());db.prepare('INSERT INTO gamification_wallets VALUES(?,?,?) ON CONFLICT(learner_id) DO UPDATE SET spent_coins=spent_coins+excluded.spent_coins,updated_at=excluded.updated_at').run(s.learner_id,catalog[cosmeticId],now());db.exec('COMMIT')}catch(e){db.exec('ROLLBACK');throw e}}else{if(!db.prepare('SELECT 1 FROM learner_cosmetics WHERE learner_id=? AND cosmetic_id=?').get(s.learner_id,cosmeticId))return fail(res,409,'cosmetic_locked');db.exec('BEGIN IMMEDIATE');try{db.prepare('UPDATE learner_cosmetics SET equipped=0 WHERE learner_id=?').run(s.learner_id);db.prepare('UPDATE learner_cosmetics SET equipped=1 WHERE learner_id=? AND cosmetic_id=?').run(s.learner_id,cosmeticId);db.exec('COMMIT')}catch(e){db.exec('ROLLBACK');throw e}}return json(res,200,{ok:true,cosmeticId,action})}
        if(method==='POST'&&p==='/api/gamification/streak-freeze/purchase'){if(!requireRole(res,s,['LEARNER']))return;const earned=gamificationSummary(snapshot(s.learner_id)).coins,spent=db.prepare('SELECT spent_coins FROM gamification_wallets WHERE learner_id=?').get(s.learner_id)?.spent_coins||0,current=db.prepare('SELECT available FROM streak_freezes WHERE learner_id=?').get(s.learner_id)?.available||0;if(current>=3)return fail(res,409,'freeze_capacity_reached');if(earned-spent<20)return fail(res,409,'not_enough_coins');db.exec('BEGIN IMMEDIATE');try{db.prepare('INSERT INTO streak_freezes VALUES(?,?,?) ON CONFLICT(learner_id) DO UPDATE SET available=available+1,updated_at=excluded.updated_at').run(s.learner_id,1,now());db.prepare('INSERT INTO gamification_wallets VALUES(?,?,?) ON CONFLICT(learner_id) DO UPDATE SET spent_coins=spent_coins+excluded.spent_coins,updated_at=excluded.updated_at').run(s.learner_id,20,now());db.exec('COMMIT')}catch(e){db.exec('ROLLBACK');throw e}return json(res,200,{available:current+1})}
        if(method==='POST'&&p==='/api/learner/preferences'){
          if(!requireRole(res,s,['LEARNER']))return;
          const b=await body(req),allowed=(value,list)=>typeof value==='string'&&list.includes(value);
          if(!allowed(b.language,['ar','en'])||!allowed(b.interest,worlds.map(w=>w.id))||!allowed(b.goal,['explore','practice','make'])||!allowed(b.build,['story','game','guide'])||!allowed(b.companion,companions.map(c=>c.id)))return fail(res,400,'invalid_preferences');
          const preferences={language:b.language,interest:b.interest,goal:b.goal,build:b.build,companion:b.companion,completed:true};
          db.prepare('INSERT INTO learner_preferences VALUES(?,?,?) ON CONFLICT(learner_id) DO UPDATE SET preferences_json=excluded.preferences_json,updated_at=excluded.updated_at').run(s.learner_id,JSON.stringify(preferences),now());
          return json(res,200,{preferences,snapshot:snapshot(s.learner_id)});
        }
        if(method==='POST'&&p==='/api/placement'){
          if(!requireRole(res,s,['LEARNER']))return;
          if(db.prepare('SELECT learner_id FROM placements WHERE learner_id=?').get(s.learner_id))return fail(res,409,'placement_already_completed');
          const b=await body(req);const learner=db.prepare('SELECT age_band FROM learners WHERE id=?').get(s.learner_id);
          let result;try{result=scorePlacement(b.answers,learner.age_band)}catch{return fail(res,400,'invalid_placement')}
          const at=now();db.prepare('INSERT INTO placements VALUES(?,?,?,?)').run(s.learner_id,JSON.stringify(b.answers),JSON.stringify(result),at);
          audit(s.user_id,'PLACEMENT_COMPLETED','learner',s.learner_id);
          return json(res,201,{placement:{...result,at},snapshot:snapshot(s.learner_id)});
        }
        if(method==='POST'&&p==='/api/attempts'){
          if(!requireRole(res,s,['LEARNER']))return;if(limited('attempt:'+s.learner_id,40))return fail(res,429,'rate_limited');
          const b=await body(req);let result;try{result=scoreMission(b.missionId,b.answers)}catch{return fail(res,400,'invalid_attempt')}
          const count=db.prepare('SELECT count(*) AS n FROM attempts WHERE learner_id=? AND mission_id=?').get(s.learner_id,b.missionId).n+1,at=now();
          const next=nextReviewAt(at,result.score,result.total,count),attemptId=id();
          db.prepare('INSERT INTO attempts VALUES(?,?,?,?,?,?,?,?)').run(attemptId,s.learner_id,b.missionId,result.score,result.total,JSON.stringify(b.answers),at,next);
          return json(res,201,{id:attemptId,score:result.score,total:result.total,nextReviewAt:next,snapshot:snapshot(s.learner_id)});
        }
        if(method==='POST'&&p==='/api/learning-sessions'){
          if(!requireRole(res,s,['LEARNER']))return;
          const b=await body(req);if(!['MISSION','PRACTICE'].includes(b.mode)||!missions.some(m=>m.id===b.missionId))return fail(res,400,'invalid_session');
          let sessionRow=db.prepare("SELECT * FROM learning_sessions WHERE learner_id=? AND mission_id=? AND mode=? AND status='IN_PROGRESS' ORDER BY updated_at DESC LIMIT 1").get(s.learner_id,b.missionId,b.mode);
          if(!sessionRow){const sessionId='session-'+id(),at=now();db.prepare('INSERT INTO learning_sessions VALUES(?,?,?,?,?,?,?,?,?)').run(sessionId,s.learner_id,b.missionId,b.mode,'IN_PROGRESS','[]',null,at,at);sessionRow=db.prepare('SELECT * FROM learning_sessions WHERE id=?').get(sessionId)}
          return json(res,200,{session:{id:sessionRow.id,missionId:sessionRow.mission_id,mode:sessionRow.mode,status:sessionRow.status,answers:JSON.parse(sessionRow.answers_json),attemptId:sessionRow.attempt_id}});
        }
        const learningSession=p.match(/^\/api\/learning-sessions\/(session-[a-f0-9-]+)(?:\/(complete))?$/);
        if(learningSession){if(!requireRole(res,s,['LEARNER']))return;const row=db.prepare('SELECT * FROM learning_sessions WHERE id=? AND learner_id=?').get(learningSession[1],s.learner_id);if(!row)return fail(res,404,'session_not_found');const m=missions.find(x=>x.id===row.mission_id);if(!m)return fail(res,409,'mission_unavailable');const answers=JSON.parse(row.answers_json);
          if(method==='GET'&&!learningSession[2])return json(res,200,{session:{id:row.id,missionId:row.mission_id,mode:row.mode,status:row.status,answers,attemptId:row.attempt_id}});
          if(method==='PATCH'&&!learningSession[2]){if(row.status!=='IN_PROGRESS'||answers.length>=m.questions.length)return fail(res,409,'session_not_editable');const b=await body(req);const options=m.questions[answers.length].optionsEn.length;if(!Number.isInteger(b.choice)||b.choice<0||b.choice>=options)return fail(res,400,'invalid_choice');answers.push(b.choice);const saved=db.prepare("UPDATE learning_sessions SET answers_json=?,updated_at=? WHERE id=? AND status='IN_PROGRESS' AND answers_json=?").run(JSON.stringify(answers),now(),row.id,row.answers_json);if(!saved.changes)return fail(res,409,'session_changed');return json(res,200,{session:{id:row.id,missionId:row.mission_id,mode:row.mode,status:'IN_PROGRESS',answers}})}
          if(method==='POST'&&learningSession[2]){if(row.status==='COMPLETE')return json(res,200,{id:row.attempt_id,sessionId:row.id,alreadyComplete:true,snapshot:snapshot(s.learner_id)});if(answers.length!==m.questions.length)return fail(res,409,'session_not_ready');if(limited('attempt:'+s.learner_id,40))return fail(res,429,'rate_limited');const result=scoreMission(row.mission_id,answers),count=db.prepare('SELECT count(*) AS n FROM attempts WHERE learner_id=? AND mission_id=?').get(s.learner_id,row.mission_id).n+1,at=now(),next=nextReviewAt(at,result.score,result.total,count),attemptId=id();db.exec('BEGIN IMMEDIATE');try{db.prepare('INSERT INTO attempts VALUES(?,?,?,?,?,?,?,?)').run(attemptId,s.learner_id,row.mission_id,result.score,result.total,JSON.stringify(answers),at,next);db.prepare("UPDATE learning_sessions SET status='COMPLETE',attempt_id=?,updated_at=? WHERE id=? AND status='IN_PROGRESS'").run(attemptId,at,row.id);db.exec('COMMIT')}catch(e){db.exec('ROLLBACK');throw e}return json(res,201,{id:attemptId,sessionId:row.id,score:result.score,total:result.total,nextReviewAt:next,snapshot:snapshot(s.learner_id)})}
        }
        if(method==='POST'&&p==='/api/activities'){
          if(!requireRole(res,s,['LEARNER']))return;if(limited('activity:'+s.learner_id,35))return fail(res,429,'rate_limited');
          const b=await body(req);if(['STORY_PATH','SIMULATION_CASE'].includes(b.kind)&&privateInfo.test(String(b.payload?.reflection||'')))return fail(res,400,'private_information_not_allowed');let result;try{result=scoreActivity(b.kind,b.payload)}catch{return fail(res,400,'invalid_activity')}
          const activityId=id();db.prepare('INSERT INTO activities VALUES(?,?,?,?,?,?,?,?)').run(activityId,s.learner_id,b.kind,result.world,result.score,result.total,JSON.stringify(b.payload),now());
          return json(res,201,{id:activityId,...result,snapshot:snapshot(s.learner_id)});
        }
        if(method==='GET'&&(p==='/api/projects'||p==='/api/projects/my')){if(!requireRole(res,s,['LEARNER']))return;return json(res,200,{projects:snapshot(s.learner_id).projects})}
        if(method==='GET'&&p==='/api/projects/browse'){if(!requireRole(res,s,['LEARNER']))return;return json(res,200,{projects:[],mode:'MODERATED_SHOWCASE_ONLY',message:'No child project is public by default'})}
        if(method==='GET'&&p==='/api/projects/real-world-challenges/list'){if(!requireRole(res,s,['LEARNER']))return;return json(res,200,{challenges:[{id:'paper-waste',world:'thinking'},{id:'accessible-story',world:'creativity'},{id:'kind-robot',world:'coding'}]})}
        if(method==='GET'&&p==='/api/projects/cross-domain/list'){if(!requireRole(res,s,['LEARNER']))return;return json(res,200,{challenges:[{id:'story-game',worlds:['english','coding','creativity']},{id:'fair-ai-helper',worlds:['ai','thinking','coding']}]})}
        const portfolioRoute=p.match(/^\/api\/projects\/portfolio\/([^/]+)$/);if(method==='GET'&&portfolioRoute){if(!linked(res,s,portfolioRoute[1]))return;return json(res,200,{projects:snapshot(portfolioRoute[1]).projects})}
        if(method==='POST'&&p==='/api/projects'){
          if(!requireRole(res,s,['LEARNER']))return;const b=await body(req);
          if(typeof b.title!=='string'||b.title.trim().length<3||b.title.length>80||typeof b.body!=='string'||b.body.trim().length<20||b.body.length>2500||!worlds.some(w=>w.id===b.world)||privateInfo.test(b.title+' '+b.body))return fail(res,400,'invalid_project_or_private_information');
          const projectId=id(),at=now();db.prepare('INSERT INTO projects VALUES(?,?,?,?,?,?,?,?)').run(projectId,s.learner_id,b.title.trim(),b.body.trim(),b.world,'PRIVATE',at,at);return json(res,201,{project:{id:projectId,title:b.title.trim(),body:b.body.trim(),world:b.world,at},snapshot:snapshot(s.learner_id)});
        }
        const projectCapability=p.match(/^\/api\/projects\/([^/]+)\/(curriculum-context|showcase|milestones|research-notes|collaborators)(?:\/([^/]+))?$/);
        if(projectCapability){if(!requireRole(res,s,['LEARNER']))return;const project=db.prepare('SELECT id,title,body,world,visibility,created_at AS at,updated_at AS updatedAt FROM projects WHERE id=? AND learner_id=?').get(projectCapability[1],s.learner_id);if(!project)return fail(res,404,'project_not_found');const capability=projectCapability[2],itemId=projectCapability[3];
          if(capability==='curriculum-context'&&method==='GET')return json(res,200,{projectId:project.id,worldId:project.world,missions:missions.filter(m=>m.world===project.world).map(m=>({id:m.id,level:m.level,objectiveAr:m.objectiveAr,objectiveEn:m.objectiveEn}))});
          if(capability==='showcase'&&method==='POST'){db.prepare("INSERT INTO project_showcase_requests VALUES(?,'PENDING',?) ON CONFLICT(project_id) DO UPDATE SET status='PENDING',requested_at=excluded.requested_at").run(project.id,now());audit(s.user_id,'PROJECT_SHOWCASE_REQUESTED','project',project.id);return json(res,202,{status:'PENDING',visibility:'PRIVATE_UNTIL_MODERATED'})}
          if(capability==='collaborators'){if(method==='GET')return json(res,200,{collaborators:[],mode:'DISABLED_FOR_CHILD_SAFETY'});return fail(res,403,'child_collaboration_disabled')}
          if(capability==='research-notes'){if(method==='GET')return json(res,200,{notes:db.prepare("SELECT stage,body,updated_at AS updatedAt FROM project_notes WHERE project_id=? AND stage='RESEARCH'").all(project.id)});if(method==='POST'){const b=await body(req);if(typeof b.body!=='string'||b.body.trim().length<10||b.body.length>2500||privateInfo.test(b.body))return fail(res,400,'invalid_note_or_private_information');db.prepare("INSERT INTO project_notes VALUES(?,'RESEARCH',?,?) ON CONFLICT(project_id,stage) DO UPDATE SET body=excluded.body,updated_at=excluded.updated_at").run(project.id,b.body.trim(),now());return json(res,201,{saved:true})}}
          if(capability==='milestones'){if(method==='GET')return json(res,200,{milestones:db.prepare('SELECT id,title,complete,updated_at AS updatedAt FROM project_milestones WHERE project_id=? ORDER BY updated_at').all(project.id).map(x=>({...x,complete:!!x.complete}))});if(method==='POST'&&!itemId){const b=await body(req);if(typeof b.title!=='string'||b.title.trim().length<3||b.title.length>100||privateInfo.test(b.title))return fail(res,400,'invalid_milestone');const milestoneId=id();db.prepare('INSERT INTO project_milestones VALUES(?,?,?,?,?)').run(milestoneId,project.id,b.title.trim(),0,now());return json(res,201,{id:milestoneId,title:b.title.trim(),complete:false})}if(method==='PUT'&&itemId){const b=await body(req);if(typeof b.complete!=='boolean')return fail(res,400,'invalid_milestone');const changed=db.prepare('UPDATE project_milestones SET complete=?,updated_at=? WHERE id=? AND project_id=?').run(b.complete?1:0,now(),itemId,project.id);if(!changed.changes)return fail(res,404,'milestone_not_found');return json(res,200,{id:itemId,complete:b.complete})}}
        }
        const projectRoute=p.match(/^\/api\/projects\/([^/]+)(?:\/(research|reflection))?$/);
        if(projectRoute){
          if(!requireRole(res,s,['LEARNER']))return;
          const project=db.prepare('SELECT id,title,body,world,visibility,created_at AS at,updated_at AS updatedAt FROM projects WHERE id=? AND learner_id=?').get(projectRoute[1],s.learner_id);
          if(!project)return fail(res,404,'project_not_found');
          const stage=projectRoute[2]?.toUpperCase();
          if(method==='GET')return json(res,200,{project,notes:db.prepare('SELECT stage,body,updated_at AS updatedAt FROM project_notes WHERE project_id=?').all(project.id)});
          if(method==='PATCH'||method==='PUT'){
            if(limited('project:'+s.learner_id,30))return fail(res,429,'rate_limited');
            const b=await body(req);
            if(stage){
              if(typeof b.body!=='string'||b.body.trim().length<10||b.body.length>2500||privateInfo.test(b.body))return fail(res,400,'invalid_note_or_private_information');
              db.prepare('INSERT INTO project_notes VALUES(?,?,?,?) ON CONFLICT(project_id,stage) DO UPDATE SET body=excluded.body,updated_at=excluded.updated_at').run(project.id,stage,b.body.trim(),now());
              audit(s.user_id,'PROJECT_'+stage+'_SAVED','project',project.id);
            }else{
              if(typeof b.title!=='string'||b.title.trim().length<3||b.title.length>80||typeof b.body!=='string'||b.body.trim().length<20||b.body.length>2500||!worlds.some(w=>w.id===b.world)||privateInfo.test(b.title+' '+b.body))return fail(res,400,'invalid_project_or_private_information');
              db.prepare('UPDATE projects SET title=?,body=?,world=?,updated_at=? WHERE id=? AND learner_id=?').run(b.title.trim(),b.body.trim(),b.world,now(),project.id,s.learner_id);
              audit(s.user_id,'PROJECT_EDITED','project',project.id);
            }
            return json(res,200,{snapshot:snapshot(s.learner_id)});
          }
          if(method==='DELETE'&&!stage){db.prepare('DELETE FROM projects WHERE id=? AND learner_id=?').run(project.id,s.learner_id);audit(s.user_id,'PROJECT_DELETED','project',project.id);return json(res,200,{deleted:true,snapshot:snapshot(s.learner_id)})}
          return fail(res,405,'method_not_allowed');
        }
        const evidenceRoute=p.match(/^\/api\/evidence\/([^/]+)$/);
        if(method==='GET'&&evidenceRoute){
          if(!requireRole(res,s,['LEARNER']))return;
          const attempt=db.prepare('SELECT id,mission_id,score,total,answers_json,created_at,next_review_at FROM attempts WHERE id=? AND learner_id=?').get(evidenceRoute[1],s.learner_id);
          if(attempt)return json(res,200,{evidence:{id:attempt.id,kind:'quiz',missionId:attempt.mission_id,score:attempt.score,total:attempt.total,answers:JSON.parse(attempt.answers_json),at:attempt.created_at,nextReviewAt:attempt.next_review_at}});
          const activity=db.prepare('SELECT * FROM activities WHERE id=? AND learner_id=?').get(evidenceRoute[1],s.learner_id);
          if(activity)return json(res,200,{evidence:{id:activity.id,kind:activity.kind,world:activity.world,score:activity.score,total:activity.total,detail:JSON.parse(activity.detail_json),at:activity.created_at}});
          return fail(res,404,'evidence_not_found');
        }
        const guardianEvidence=p.match(/^\/api\/guardian\/children\/([^/]+)\/evidence\/([^/]+)$/);
        if(method==='GET'&&guardianEvidence){
          if(!requireRole(res,s,['GUARDIAN']))return;if(!linked(res,s,guardianEvidence[1]))return;
          const attempt=db.prepare('SELECT id,mission_id,score,total,answers_json,created_at,next_review_at FROM attempts WHERE id=? AND learner_id=?').get(guardianEvidence[2],guardianEvidence[1]);
          if(attempt)return json(res,200,{evidence:{id:attempt.id,kind:'quiz',missionId:attempt.mission_id,score:attempt.score,total:attempt.total,answers:JSON.parse(attempt.answers_json),at:attempt.created_at,nextReviewAt:attempt.next_review_at}});
          const activity=db.prepare('SELECT id,kind,world,score,total,detail_json,created_at FROM activities WHERE id=? AND learner_id=?').get(guardianEvidence[2],guardianEvidence[1]);
          if(activity)return json(res,200,{evidence:{id:activity.id,kind:activity.kind,world:activity.world,score:activity.score,total:activity.total,detail:JSON.parse(activity.detail_json),at:activity.created_at}});
          return fail(res,404,'evidence_not_found');
        }
        if(method==='POST'&&p==='/api/assist'){
          if(!requireRole(res,s,['LEARNER']))return;if(!learnerControls(s.learner_id).guidesEnabled)return fail(res,403,'guides_disabled_by_guardian');if(limited('assist:'+s.learner_id,20))return fail(res,429,'rate_limited');
          const b=await body(req);if(typeof b.message!=='string'||b.message.length<1||b.message.length>240||!companions.some(c=>c.id===b.companionId))return fail(res,400,'invalid_message');
          const guidance=safeGuidance(b.message,b.companionId,b.missionId);
          if(guidance.state==='RESTRICTED')return json(res,200,{...guidance,mode:'GUIDED_RULES'});
          let conversationId=b.conversationId;
          if(conversationId){const existing=db.prepare('SELECT id FROM conversations WHERE id=? AND learner_id=? AND companion_id=?').get(conversationId,s.learner_id,b.companionId);if(!existing)return fail(res,404,'conversation_not_found')}
          else{conversationId=id();db.prepare('INSERT INTO conversations VALUES(?,?,?,?,?)').run(conversationId,s.learner_id,b.companionId,now(),now())}
          if(db.prepare('SELECT count(*) AS n FROM conversation_messages WHERE conversation_id=?').get(conversationId).n>=100)return fail(res,409,'conversation_full');
          db.prepare('INSERT INTO conversation_messages VALUES(?,?,?,?,?)').run(id(),conversationId,b.message.trim(),guidance.reply,now());db.prepare('UPDATE conversations SET updated_at=? WHERE id=?').run(now(),conversationId);
          return json(res,200,{...guidance,mode:'GUIDED_RULES',conversationId});
        }
        if(method==='GET'&&p==='/api/conversations'){if(!requireRole(res,s,['LEARNER']))return;return json(res,200,{conversations:db.prepare('SELECT id,companion_id AS companionId,created_at AS at,updated_at AS updatedAt FROM conversations WHERE learner_id=? ORDER BY updated_at DESC LIMIT 50').all(s.learner_id)})}
        if(method==='GET'&&p==='/api/search'){if(!requireRole(res,s,['LEARNER']))return;const query=String(url.searchParams.get('q')||'').trim().toLocaleLowerCase();if(query.length>80)return fail(res,400,'invalid_search');const match=value=>!query||String(value||'').toLocaleLowerCase().includes(query),shot=snapshot(s.learner_id),results=[...worlds.filter(w=>match(w.ar+' '+w.en+' '+w.subjectAr+' '+w.subjectEn)).map(w=>({id:w.id,type:'WORLD',titleAr:w.ar,titleEn:w.en,path:'/app/worlds/'+w.id})),...missions.filter(m=>match(m.ar+' '+m.en+' '+m.objectiveAr+' '+m.objectiveEn)).map(m=>({id:m.id,type:'MISSION',titleAr:m.ar,titleEn:m.en,path:'/app/missions/'+m.id})),...shot.projects.filter(project=>match(project.title+' '+project.body)).map(project=>({id:project.id,type:'PRIVATE_PROJECT',titleAr:project.title,titleEn:project.title,path:'/app/projects/'+project.id}))].slice(0,50);return json(res,200,{query,results,privateScope:true})}
        if(method==='GET'&&p==='/api/notifications'){if(!requireRole(res,s,['LEARNER']))return;const shot=snapshot(s.learner_id),current=new Date(),items=[...shot.attempts.filter(a=>a.nextReviewAt&&new Date(a.nextReviewAt)<=current).slice(0,10).map(a=>({id:'review-'+a.id,type:'REVIEW_DUE',missionId:a.missionId,path:'/app/practice/start/'+a.missionId})),...shot.projects.slice(0,5).map(project=>({id:'project-'+project.id,type:'PROJECT_SAVED',title:project.title,path:'/app/projects/'+project.id}))];return json(res,200,{notifications:items,generatedAt:now(),privateScope:true})}
        const conversationRoute=p.match(/^\/api\/conversations\/([^/]+)$/);
        if(method==='GET'&&conversationRoute){if(!requireRole(res,s,['LEARNER']))return;const row=db.prepare('SELECT id,companion_id AS companionId,created_at AS at FROM conversations WHERE id=? AND learner_id=?').get(conversationRoute[1],s.learner_id);if(!row)return fail(res,404,'conversation_not_found');return json(res,200,{conversation:row,messages:db.prepare('SELECT message,reply,created_at AS at FROM conversation_messages WHERE conversation_id=? ORDER BY created_at ASC LIMIT 100').all(row.id)})}
        if(method==='POST'&&p==='/api/reports'){
          if(!requireRole(res,s,['LEARNER']))return;const b=await body(req);if(typeof b.reason!=='string'||b.reason.trim().length<10||b.reason.length>500)return fail(res,400,'invalid_report');
          const reportId=id();db.prepare('INSERT INTO reports(id,learner_id,reason,created_at) VALUES(?,?,?,?)').run(reportId,s.learner_id,b.reason.trim(),now());return json(res,201,{id:reportId,status:'OPEN'});
        }
        const overview=p.match(/^\/api\/guardian\/children\/([^/]+)\/(overview|export)$/);
        if(method==='GET'&&overview){if(!requireRole(res,s,['GUARDIAN']))return;if(!linked(res,s,overview[1]))return;const data=snapshot(overview[1]);if(overview[2]==='export')data.conversations=db.prepare('SELECT id,companion_id AS companionId,created_at AS at FROM conversations WHERE learner_id=?').all(overview[1]).map(c=>({...c,messages:db.prepare('SELECT message,reply,created_at AS at FROM conversation_messages WHERE conversation_id=?').all(c.id)}));return json(res,200,data)}
        const parentChild=p.match(/^\/api\/parents\/children\/([^/]+)\/(dashboard|progress|activity|reflections|safety|time-limits)$/);if(parentChild){if(!requireRole(res,s,['GUARDIAN']))return;if(!linked(res,s,parentChild[1]))return;const learnerId=parentChild[1],view=parentChild[2],shot=snapshot(learnerId);if(method==='GET'){if(view==='dashboard')return json(res,200,shot);if(view==='progress')return json(res,200,{completed:shot.completed,mastery:shot.mastery,recommendation:shot.recommendation,dailyGoal:shot.dailyGoalProgress});if(view==='activity')return json(res,200,{evidence:shot.evidence,usage:timeLimitStatus(learnerId)});if(view==='reflections')return json(res,200,{reflections:db.prepare("SELECT p.id AS projectId,p.title,n.body,n.updated_at AS updatedAt FROM project_notes n JOIN projects p ON p.id=n.project_id WHERE p.learner_id=? AND n.stage='REFLECTION' ORDER BY n.updated_at DESC").all(learnerId)});if(view==='safety')return json(res,200,{controls:learnerControls(learnerId),timeLimits:timeLimitStatus(learnerId)})}if(method==='POST'&&view==='time-limits'){const b=await body(req);if(!Number.isInteger(b.dailyMinutes)||b.dailyMinutes<10||b.dailyMinutes>240||!Number.isInteger(b.weeklyMinutes)||b.weeklyMinutes<30||b.weeklyMinutes>1200||b.weeklyMinutes<b.dailyMinutes||!Number.isInteger(b.bedtimeHour)||b.bedtimeHour<0||b.bedtimeHour>23)return fail(res,400,'invalid_time_limits');db.prepare('INSERT INTO learner_time_limits VALUES(?,?,?,?,?) ON CONFLICT(learner_id) DO UPDATE SET daily_minutes=excluded.daily_minutes,weekly_minutes=excluded.weekly_minutes,bedtime_hour=excluded.bedtime_hour,updated_at=excluded.updated_at').run(learnerId,b.dailyMinutes,b.weeklyMinutes,b.bedtimeHour,now());return json(res,200,{timeLimits:timeLimits(learnerId),status:timeLimitStatus(learnerId)})}}
        const controlsRoute=p.match(/^\/api\/guardian\/children\/([^/]+)\/controls$/);
        if(controlsRoute){if(!requireRole(res,s,['GUARDIAN']))return;if(!linked(res,s,controlsRoute[1]))return;
          if(method==='GET')return json(res,200,{controls:learnerControls(controlsRoute[1])});
          if(method==='PATCH'){const b=await body(req);if(typeof b.guidesEnabled!=='boolean'||typeof b.voiceEnabled!=='boolean')return fail(res,400,'invalid_controls');db.prepare('INSERT INTO learner_controls VALUES(?,?,?,?) ON CONFLICT(learner_id) DO UPDATE SET guides_enabled=excluded.guides_enabled,voice_enabled=excluded.voice_enabled,updated_at=excluded.updated_at').run(controlsRoute[1],b.guidesEnabled?1:0,b.voiceEnabled?1:0,now());audit(s.user_id,'LEARNER_CONTROLS_UPDATED','learner',controlsRoute[1]);return json(res,200,{controls:learnerControls(controlsRoute[1])})}
        }
        const timeLimitsRoute=p.match(/^\/api\/guardian\/children\/([^/]+)\/time-limits$/);
        if(timeLimitsRoute){if(!requireRole(res,s,['GUARDIAN']))return;if(!linked(res,s,timeLimitsRoute[1]))return;
          if(method==='GET')return json(res,200,{timeLimits:timeLimits(timeLimitsRoute[1]),status:timeLimitStatus(timeLimitsRoute[1])});
          if(method==='PATCH'||method==='POST'){const b=await body(req);if(!Number.isInteger(b.dailyMinutes)||b.dailyMinutes<10||b.dailyMinutes>240||!Number.isInteger(b.weeklyMinutes)||b.weeklyMinutes<30||b.weeklyMinutes>1200||b.weeklyMinutes<b.dailyMinutes||!Number.isInteger(b.bedtimeHour)||b.bedtimeHour<0||b.bedtimeHour>23)return fail(res,400,'invalid_time_limits');db.prepare('INSERT INTO learner_time_limits VALUES(?,?,?,?,?) ON CONFLICT(learner_id) DO UPDATE SET daily_minutes=excluded.daily_minutes,weekly_minutes=excluded.weekly_minutes,bedtime_hour=excluded.bedtime_hour,updated_at=excluded.updated_at').run(timeLimitsRoute[1],b.dailyMinutes,b.weeklyMinutes,b.bedtimeHour,now());audit(s.user_id,'LEARNER_TIME_LIMITS_UPDATED','learner',timeLimitsRoute[1]);return json(res,200,{timeLimits:timeLimits(timeLimitsRoute[1]),status:timeLimitStatus(timeLimitsRoute[1])})}
        }
        const goalRoute=p.match(/^\/api\/guardian\/children\/([^/]+)\/goal$/);
        if(goalRoute){if(!requireRole(res,s,['GUARDIAN']))return;if(!linked(res,s,goalRoute[1]))return;
          if(method==='GET'){const goal=db.prepare('SELECT weekly_missions AS weeklyMissions,focus_world AS focusWorld,note,updated_at AS updatedAt FROM guardian_goals WHERE learner_id=?').get(goalRoute[1])||null;return json(res,200,{goal,progress:goalProgress(goalRoute[1],goal)})}
          if(method==='PATCH'){const b=await body(req);if(!Number.isInteger(b.weeklyMissions)||b.weeklyMissions<1||b.weeklyMissions>7||!worlds.some(w=>w.id===b.focusWorld)||typeof b.note!=='string'||b.note.length>250||privateInfo.test(b.note))return fail(res,400,'invalid_goal');db.prepare('INSERT INTO guardian_goals VALUES(?,?,?,?,?) ON CONFLICT(learner_id) DO UPDATE SET weekly_missions=excluded.weekly_missions,focus_world=excluded.focus_world,note=excluded.note,updated_at=excluded.updated_at').run(goalRoute[1],b.weeklyMissions,b.focusWorld,b.note.trim(),now());audit(s.user_id,'GUARDIAN_GOAL_SAVED','learner',goalRoute[1]);const goal=db.prepare('SELECT weekly_missions AS weeklyMissions,focus_world AS focusWorld,note,updated_at AS updatedAt FROM guardian_goals WHERE learner_id=?').get(goalRoute[1]);return json(res,200,{goal,progress:goalProgress(goalRoute[1],goal)})}
        }
        const editChild=p.match(/^\/api\/guardian\/children\/([^/]+)$/);
        if(method==='PATCH'&&editChild){if(!requireRole(res,s,['GUARDIAN']))return;if(!linked(res,s,editChild[1]))return;
          const b=await body(req),existing=db.prepare('SELECT age_year FROM learners WHERE id=?').get(editChild[1]),ageYear=b.ageYear===undefined?existing.age_year:b.ageYear,ageBand=ageYear===null?b.ageBand:ageYear<=9?'7-9':ageYear<=12?'10-12':'13-15';if(!validNickname(b.nickname)||!['7-9','10-12','13-15'].includes(ageBand)||ageYear!==null&&(!Number.isInteger(ageYear)||ageYear<7||ageYear>15||b.ageBand!==undefined&&b.ageBand!==ageBand))return fail(res,400,'invalid_learner');
          db.prepare('UPDATE learners SET nickname=?,age_band=?,age_year=? WHERE id=? AND guardian_id=?').run(b.nickname.trim(),ageBand,ageYear,editChild[1],s.user_id);audit(s.user_id,'LEARNER_UPDATED','learner',editChild[1]);return json(res,200,{learner:db.prepare('SELECT id,nickname,age_band,age_year FROM learners WHERE id=?').get(editChild[1])});
        }
        const remove=p.match(/^\/api\/guardian\/children\/([^/]+)$/);
        if(method==='DELETE'&&remove){if(!requireRole(res,s,['GUARDIAN']))return;if(!linked(res,s,remove[1]))return;const b=await body(req);if(b.confirm!==remove[1])return fail(res,400,'confirmation_required');db.prepare('DELETE FROM learners WHERE id=? AND guardian_id=?').run(remove[1],s.user_id);audit(s.user_id,'LEARNER_DELETED','learner',remove[1]);return json(res,200,{deleted:true})}
        if(method==='GET'&&p==='/api/moderation/queue'){if(!requireRole(res,s,['MODERATOR','ADMIN']))return;return json(res,200,{reports:db.prepare('SELECT id,reason,status,created_at FROM reports WHERE status=? ORDER BY created_at ASC').all('OPEN')})}
        if(method==='GET'&&p==='/api/moderation/reports'){if(!requireRole(res,s,['MODERATOR','ADMIN']))return;return json(res,200,{reports:db.prepare('SELECT id,reason,status,resolution,created_at,resolved_at FROM reports ORDER BY created_at DESC LIMIT 100').all()})}
        if(method==='GET'&&p==='/api/moderation/audit'){if(!requireRole(res,s,['MODERATOR','ADMIN']))return;return json(res,200,{audit:db.prepare("SELECT action,target_id,created_at FROM audit WHERE target_type='report' ORDER BY created_at DESC LIMIT 100").all()})}
        const report=p.match(/^\/api\/moderation\/reports\/([^/]+)$/);
        if(method==='GET'&&report){if(!requireRole(res,s,['MODERATOR','ADMIN']))return;const row=db.prepare('SELECT id,reason,status,resolution,created_at,resolved_at FROM reports WHERE id=?').get(report[1]);if(!row)return fail(res,404,'report_not_found');return json(res,200,{report:row,history:db.prepare("SELECT action,created_at FROM audit WHERE target_type='report' AND target_id=? ORDER BY created_at ASC").all(report[1]),reviewMode:'HUMAN_ONLY'})}
        if(method==='PATCH'&&report){if(!requireRole(res,s,['MODERATOR','ADMIN']))return;const b=await body(req);if(!['RESOLVED','REJECTED'].includes(b.status)||typeof b.resolution!=='string'||b.resolution.length<5||b.resolution.length>500)return fail(res,400,'invalid_resolution');const done=db.prepare('UPDATE reports SET status=?,resolution=?,resolved_at=? WHERE id=? AND status=?').run(b.status,b.resolution,now(),report[1],'OPEN');if(!done.changes)return fail(res,404,'report_not_found');audit(s.user_id,'REPORT_RESOLVED','report',report[1]);return json(res,200,{ok:true})}
        if(method==='GET'&&p==='/api/admin/overview'){if(!requireRole(res,s,['ADMIN']))return;let count=t=>db.prepare('SELECT count(*) AS n FROM '+t).get().n;return json(res,200,{guardians:db.prepare('SELECT count(*) AS n FROM users WHERE role=?').get('GUARDIAN').n,moderators:db.prepare('SELECT count(*) AS n FROM users WHERE role=?').get('MODERATOR').n,learners:count('learners'),attempts:count('attempts'),projects:count('projects'),reportsOpen:db.prepare('SELECT count(*) AS n FROM reports WHERE status=?').get('OPEN').n})}
        if(method==='GET'&&p==='/api/admin/guardians/pending'){if(!requireRole(res,s,['ADMIN']))return;return json(res,200,{guardians:db.prepare('SELECT id,email,display_name,created_at,email_verified_at FROM users WHERE role=? AND guardian_approved_at IS NULL').all('GUARDIAN')})}
        const approve=p.match(/^\/api\/admin\/guardians\/([^/]+)\/approve$/);
        if(method==='POST'&&approve){if(!requireRole(res,s,['ADMIN']))return;const b=await body(req);if(b.attestation!==true)return fail(res,400,'attestation_required');const guardian=db.prepare('SELECT id,email_verified_at FROM users WHERE id=? AND role=?').get(approve[1],'GUARDIAN');if(!guardian)return fail(res,404,'guardian_not_found');if(requireEmailVerification&&!guardian.email_verified_at)return fail(res,409,'email_verification_required');let result=db.prepare('UPDATE users SET guardian_approved_at=? WHERE id=? AND role=? AND guardian_approved_at IS NULL').run(now(),approve[1],'GUARDIAN');if(!result.changes)return fail(res,404,'guardian_not_found');audit(s.user_id,'GUARDIAN_APPROVED','user',approve[1]);return json(res,200,{approved:true})}
        if(method==='GET'&&p==='/api/admin/curriculum'){if(!requireRole(res,s,['ADMIN']))return;return json(res,200,{worlds,missions:missions.map(({questions,...m})=>({...m,questionsCount:questions.length})),drafts:db.prepare('SELECT * FROM curriculum_drafts ORDER BY created_at DESC').all()})}
        if(method==='GET'&&p==='/api/admin/catalog'){if(!requireRole(res,s,['ADMIN']))return;return json(res,200,{worlds,missions,companions,drafts:db.prepare('SELECT * FROM curriculum_drafts ORDER BY created_at DESC').all(),analytics:{attemptsByWorld:db.prepare('SELECT substr(mission_id,1,instr(mission_id,\'-\')-1) AS world,count(*) AS attempts,round(avg(CAST(score AS REAL)/total)*100) AS average_percent FROM attempts GROUP BY world').all(),activitiesByKind:db.prepare('SELECT kind,count(*) AS total FROM activities GROUP BY kind').all(),projectsByWorld:db.prepare('SELECT world,count(*) AS total FROM projects GROUP BY world').all()}})}
        if(method==='GET'&&p==='/api/admin/agents'){
          if(!requireRole(res,s,['ADMIN']))return;
          const cases=[{id:'email',message:'My email is child@example.com',expected:'RESTRICTED'},{id:'phone',message:'رقم تليفوني 01012345678',expected:'RESTRICTED'},{id:'password',message:'My password is secret',expected:'RESTRICTED'},{id:'hint',message:'أعطني تلميح',missionId:'coding-square',expected:'SAFE'},{id:'guidance',message:'كيف أبدأ؟',expected:'SAFE'}];
          const evaluations=companions.flatMap(c=>cases.map(test=>{const result=safeGuidance(test.message,c.id,test.missionId);return {id:c.id+'-'+test.id,companionId:c.id,caseId:test.id,expected:test.expected,actual:result.state,passed:result.state===test.expected,reply:result.reply}}));
          return json(res,200,{mode:'GUIDED_RULES',companions:companions.map(c=>({...c,sample:safeGuidance('كيف أبدأ؟',c.id).reply})),evaluations,controls:{liveModel:false,publicSharing:false,childMessaging:false,maxMessageLength:240,rateLimitPerMinute:20,blockedInputs:['email/phone patterns','password and address phrases'],messageRetention:'private learner conversation'}});
        }
        if(method==='GET'&&p==='/api/admin/insights'){
          if(!requireRole(res,s,['ADMIN']))return;
          const rows=db.prepare('SELECT learner_id,created_at AS at FROM attempts UNION ALL SELECT learner_id,created_at AS at FROM activities').all();
          const uniqueDays=new Map(),daily=new Map();for(const row of rows){const day=row.at.slice(0,10);if(!uniqueDays.has(row.learner_id))uniqueDays.set(row.learner_id,new Set());uniqueDays.get(row.learner_id).add(day);if(!daily.has(day))daily.set(day,new Set());daily.get(day).add(row.learner_id)}
          const today=Date.now(),activeWithin=days=>new Set(rows.filter(row=>new Date(row.at).getTime()>=today-days*86400000).map(row=>row.learner_id)).size;
          const difficulty=db.prepare('SELECT mission_id AS missionId,count(*) AS attempts,round(avg(CAST(score AS REAL)/total)*100) AS averagePercent FROM attempts GROUP BY mission_id ORDER BY averagePercent ASC').all();
          const wrong=new Map();for(const attempt of db.prepare('SELECT mission_id,answers_json FROM attempts').all()){const mission=missions.find(m=>m.id===attempt.mission_id);if(!mission)continue;const answers=JSON.parse(attempt.answers_json);mission.questions.forEach((q,index)=>{if(answers[index]!==q.answer){const key=mission.id+':'+index;wrong.set(key,(wrong.get(key)||0)+1)}})}
          const misconceptions=[...wrong].map(([key,count])=>{const [missionId,index]=key.split(':');return {missionId,questionIndex:Number(index),wrongCount:count}}).sort((a,b)=>b.wrongCount-a.wrongCount).slice(0,20);
          const interventionCandidates=db.prepare('SELECT learner_id AS learnerId,count(*) AS attempts,round(avg(CAST(score AS REAL)/total)*100) AS averagePercent FROM attempts GROUP BY learner_id HAVING count(*)>=2 AND avg(CAST(score AS REAL)/total)<0.6 ORDER BY averagePercent ASC LIMIT 30').all();
          return json(res,200,{activity:{daily:[...daily].sort(([a],[b])=>b.localeCompare(a)).slice(0,30).map(([day,learners])=>({day,activeLearners:learners.size})),dailyActive:activeWithin(1),weeklyActive:activeWithin(7),monthlyActive:activeWithin(30),returningLearners:[...uniqueDays.values()].filter(days=>days.size>=2).length,everActive:uniqueDays.size,retentionCohorts:retentionCohorts(rows,today)},difficulty,misconceptions,interventionCandidates,projects:db.prepare('SELECT world,count(*) AS total FROM projects GROUP BY world').all()});
        }
        if(method==='GET'&&p==='/api/admin/operations'){if(!requireRole(res,s,['ADMIN']))return;return json(res,200,{experiments:db.prepare('SELECT * FROM experiment_drafts ORDER BY created_at DESC').all(),flags:db.prepare('SELECT key,enabled,updated_at FROM feature_flags').all(),entitlements:{mode:'FREE_ACCESS',billingEnabled:false,worldIds:worlds.map(w=>w.id),guardianApprovalRequired:true}})}
        if(method==='POST'&&p==='/api/admin/experiments'){if(!requireRole(res,s,['ADMIN']))return;const b=await body(req);if(![b.name,b.hypothesis,b.variantA,b.variantB].every(x=>typeof x==='string'&&x.trim().length>=5&&x.length<=500))return fail(res,400,'invalid_experiment');const experimentId=id(),at=now();db.prepare('INSERT INTO experiment_drafts VALUES(?,?,?,?,?,?,?,?)').run(experimentId,b.name.trim(),b.hypothesis.trim(),b.variantA.trim(),b.variantB.trim(),'DRAFT',at,at);audit(s.user_id,'EXPERIMENT_DRAFT_CREATED','experiment',experimentId);return json(res,201,{id:experimentId,status:'DRAFT'})}
        const experimentRoute=p.match(/^\/api\/admin\/experiments\/([^/]+)$/);
        if(method==='PATCH'&&experimentRoute){if(!requireRole(res,s,['ADMIN']))return;const b=await body(req);if(!['DRAFT','REVIEW','ARCHIVED'].includes(b.status))return fail(res,400,'invalid_status');const changed=db.prepare('UPDATE experiment_drafts SET status=?,updated_at=? WHERE id=?').run(b.status,now(),experimentRoute[1]);if(!changed.changes)return fail(res,404,'experiment_not_found');audit(s.user_id,'EXPERIMENT_'+b.status,'experiment',experimentRoute[1]);return json(res,200,{ok:true})}
        if(method==='PATCH'&&p==='/api/admin/feature-flags/VOICE_PLAYBACK'){if(!requireRole(res,s,['ADMIN']))return;const b=await body(req);if(typeof b.enabled!=='boolean')return fail(res,400,'invalid_flag');db.prepare('UPDATE feature_flags SET enabled=?,updated_at=? WHERE key=?').run(b.enabled?1:0,now(),'VOICE_PLAYBACK');audit(s.user_id,'FEATURE_VOICE_PLAYBACK_'+(b.enabled?'ON':'OFF'),'feature','VOICE_PLAYBACK');return json(res,200,{voicePlayback:b.enabled})}
        if(method==='POST'&&p==='/api/admin/curriculum/drafts'){if(!requireRole(res,s,['ADMIN']))return;const b=await body(req);if(![b.titleAr,b.titleEn,b.objectiveAr,b.objectiveEn].every(x=>typeof x==='string'&&x.trim().length>=5&&x.length<=500)||!worlds.some(w=>w.id===b.world))return fail(res,400,'invalid_draft');const draftId=id(),at=now();db.prepare('INSERT INTO curriculum_drafts VALUES(?,?,?,?,?,?,?,?,?)').run(draftId,b.titleAr,b.titleEn,b.world,b.objectiveAr,b.objectiveEn,'DRAFT',at,at);audit(s.user_id,'CURRICULUM_DRAFT_CREATED','draft',draftId);return json(res,201,{id:draftId,status:'DRAFT'})}
        const draftRoute=p.match(/^\/api\/admin\/curriculum\/drafts\/([^/]+)$/);
        if(draftRoute&&method==='PATCH'){
          if(!requireRole(res,s,['ADMIN']))return;const b=await body(req),existing=db.prepare('SELECT * FROM curriculum_drafts WHERE id=?').get(draftRoute[1]);if(!existing)return fail(res,404,'draft_not_found');
          if(![b.titleAr,b.titleEn,b.objectiveAr,b.objectiveEn].every(x=>typeof x==='string'&&x.trim().length>=5&&x.length<=500)||!worlds.some(w=>w.id===b.world)||!['DRAFT','REVIEW','ARCHIVED'].includes(b.status))return fail(res,400,'invalid_draft');
          db.prepare('UPDATE curriculum_drafts SET title_ar=?,title_en=?,world=?,objective_ar=?,objective_en=?,status=?,updated_at=? WHERE id=?').run(b.titleAr.trim(),b.titleEn.trim(),b.world,b.objectiveAr.trim(),b.objectiveEn.trim(),b.status,now(),draftRoute[1]);audit(s.user_id,'CURRICULUM_DRAFT_'+b.status,'draft',draftRoute[1]);return json(res,200,{draft:db.prepare('SELECT * FROM curriculum_drafts WHERE id=?').get(draftRoute[1])});
        }
        if(method==='GET'&&p==='/api/admin/audit'){if(!requireRole(res,s,['ADMIN']))return;return json(res,200,{audit:db.prepare('SELECT action,target_type,target_id,created_at FROM audit ORDER BY created_at DESC LIMIT 100').all()})}
        return fail(res,404,'api_route_not_found');
      }
      if(method!=='GET'&&method!=='HEAD')return fail(res,405,'method_not_allowed');
      let file=resolve(dist,'.'+decodeURIComponent(p));if(!file.startsWith(dist+sep)&&file!==dist)return fail(res,403,'forbidden');
      try{const info=await stat(file);if(info.isDirectory())file=join(file,'index.html')}catch{file=join(dist,'index.html')}
      let bytes;try{bytes=await readFile(file)}catch{return fail(res,404,'not_found')}
      res.writeHead(200,{'Content-Type':mime[extname(file)]||'application/octet-stream','Cache-Control':file.includes('/assets/')?'public, max-age=31536000, immutable':'no-cache',...securityHeaders});res.end(method==='HEAD'?undefined:bytes);
    }catch(e){if(e.status)return fail(res,e.status,e.message);console.error('API error',requestId,e?.message);fail(res,500,'server_error')}
  }
  const server=http.createServer(handler);
  return {server,db,cleanupExpired,close:()=>{server.close();db.close()}};
}

if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const {loadConfig}=await import('./config.mjs');
  const config=loadConfig(process.env);
  // Structured JSON logs (one line per event). Never includes bodies, cookies, or tokens.
  const log=entry=>process.stdout.write(JSON.stringify({time:new Date().toISOString(),service:'usam-kids-api',...entry})+'\n');
  if(config.errors.length){for(const message of config.errors)log({level:'error',msg:'config_invalid',detail:message});process.exit(1)}
  const emailSender=config.email?async({to,resetUrl,verificationUrl})=>{const response=await fetch(config.email.url,{method:'POST',headers:{'Content-Type':'application/json',...(config.email.token?{Authorization:'Bearer '+config.email.token}:{})},body:JSON.stringify(resetUrl?{to,template:'password-reset',resetUrl}:{to,template:'email-verification',verificationUrl}),signal:AbortSignal.timeout(8000)});if(!response.ok)throw new Error('email_delivery_failed')}:null;
  const app=createApp({database:config.database,publicOrigin:config.publicOrigin,secureCookies:config.secureCookies,adminEmail:config.admin?.email,adminPassword:config.admin?.password,moderatorEmail:config.moderator?.email,moderatorPassword:config.moderator?.password,emailSender,guardianConsentRequired:config.guardianConsentRequired,logger:config.logRequests?log:null});
  if(!config.email)log({level:'warn',msg:'email_delivery_disabled',detail:'EMAIL_WEBHOOK_URL not set; verification and password recovery return unavailable'});
  // Hourly cleanup of expired sessions and one-time tokens (also once at startup).
  const sweep=()=>{try{const removed=app.cleanupExpired();if(removed.sessions||removed.resets||removed.verifications)log({level:'info',msg:'expired_records_removed',...removed})}catch(e){log({level:'error',msg:'cleanup_failed',detail:e?.message})}};
  sweep();const sweeper=setInterval(sweep,3600_000);sweeper.unref();
  app.server.listen(config.port,'0.0.0.0',()=>log({level:'info',msg:'listening',port:config.port,production:config.production}));
  // Graceful shutdown: stop accepting connections, then close SQLite so the WAL is checkpointed.
  let stopping=false;
  const shutdown=signal=>{if(stopping)return;stopping=true;log({level:'info',msg:'shutdown',signal});clearInterval(sweeper);const force=setTimeout(()=>process.exit(1),10_000);force.unref();app.server.close(()=>{try{app.db.close()}catch{}process.exit(0)})};
  process.on('SIGTERM',()=>shutdown('SIGTERM'));process.on('SIGINT',()=>shutdown('SIGINT'));
}
