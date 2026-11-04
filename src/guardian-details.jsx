import React,{useState} from 'react';
import {worlds,missions} from './data';

const date=(value,lang)=>new Date(value).toLocaleString(lang==='ar'?'ar-EG':'en-US',{dateStyle:'medium',timeStyle:'short'});

// Guardian-only learning insights (approved Phase B). Display-only: every value comes from the
// server's overview.insights (Phase A engine). Mastery status shown is the existing authoritative rule.
const num=(n,lang)=>Number(n).toLocaleString(lang==='ar'?'ar-EG':'en-US');
const masteryLabels={NOT_STARTED:['لم يبدأ','Not started'],LEARNING:['يتعلّم','Learning'],PRACTICING:['يتدرّب','Practising'],GETTING_STRONGER:['يتحسّن','Getting stronger'],ALMOST_MASTERED:['قريب من الإتقان','Almost mastered'],MASTERED:['أتقن','Mastered'],REVIEW_NEEDED:['يحتاج مراجعة','Review needed']};
const kindLabels={knowledge:['معرفة','Knowledge'],application:['تطبيق','Applying it'],problem_solving:['حل مشكلات','Problem solving'],production:['كتابة وإنتاج','Writing'],reflection:['تأمّل','Reflection'],creation:['مشروع','Project work']};
const stepLabels={FIRST_MISSION:['جرّبوا أول مهمة في هذا العالم.','Try a first mission in this world.'],REVIEW:['مرّ وقت على آخر تدريب؛ راجعوا مهمة سابقة.','It has been a while: revisit an earlier mission.'],PRACTISE_LOW_SCORES:['تدرّبوا على المهمات ذات النتائج الأقل قبل الانتقال.','Practise the missions with lower scores before moving on.'],MAKE_PROJECT:['حوّلوا ما تعلّمه الطفل إلى مشروع صغير.','Turn what was learned into a small project.'],ADD_REFLECTION:['أضيفوا تأمّلًا عمّا تعلّمه.','Add a reflection about what was learned.'],SPREAD_PRACTICE:['وزّعوا التدريب على أيام أكثر.','Spread practice over a few more days.'],NEXT_LEVEL:['استمروا مع المستوى التالي.','Keep going with the next level.']};
function strength(confidence){if(confidence===null||confidence===undefined)return ['لا توجد أدلة بعد','No evidence yet'];return confidence<0.35?['أدلة أولية','Early evidence']:confidence<0.55?['أدلة تتكوّن','Building evidence']:confidence<0.75?['أدلة جيدة','Solid evidence']:['أدلة قوية','Strong evidence']}
function Bar({value,label}){const v=Math.max(0,Math.min(100,Math.round(value)));return <div className="progress" role="progressbar" aria-valuenow={v} aria-valuemin="0" aria-valuemax="100" aria-label={label}><div style={{width:v+'%',background:'var(--green)'}}/></div>}

export function SubjectInsight({insight,mastery,tr,lang}){
 if(!insight)return null;
 const [sAr,sEn]=strength(insight.confidence),status=masteryLabels[mastery]||masteryLabels.NOT_STARTED,step=stepLabels[insight.nextStepCode]||stepLabels.FIRST_MISSION;
 return <div className="guardian-world-detail"><h3>{tr('رؤى التعلّم','Learning insights')}</h3>
  <div className="guardian-task-row"><span><b>{tr('حالة الإتقان','Mastery status')}</b><small>{tr('حسب قواعد الإتقان في المنصة','From the platform mastery rules')}</small></span><strong>{tr(...status)}</strong></div>
  <div className="guardian-task-row"><span><b>{tr('قوة الأدلة','Evidence strength')}</b><small>{tr(sAr,sEn)}</small></span><span style={{flex:'1 1 120px',maxWidth:220}}>{insight.confidence!==null&&insight.confidence!==undefined&&<Bar value={insight.confidence*100} label={tr('قوة الأدلة','Evidence strength')}/>}</span></div>
  <div className="guardian-task-row"><span><b>{tr('الأدلة المسجّلة','Recorded evidence')}</b><small>{insight.kinds.length?insight.kinds.map(k=>tr(...(kindLabels[k]||[k,k]))).join(' · '):tr('لا يوجد نشاط في هذا العالم بعد','No activity in this world yet')}</small></span><small>{num(insight.evidenceCount,lang)} {tr('نشاط','activities')} · {num(insight.learningDays,lang)} {tr('أيام','days')}{insight.lastActivityAt?' · '+tr('آخر نشاط','last')+' '+date(insight.lastActivityAt,lang):''}</small></div>
  <div className="guardian-task-row"><span><b>{tr('الخطوة التالية المقترحة','Suggested next step')}</b><small>{tr(...step)}</small></span></div>
  <p className="onboard-note">{tr('قوة الأدلة تقدير مبني فقط على الأنشطة المسجّلة في هذا العالم: النتائج (٦٠٪)، وتنوّع أنواع الأنشطة (٢٠٪)، وتوزيع التدريب على أيام مختلفة (٢٠٪)، ويقل عند غياب التدريب لفترة. هي ليست اختبارًا ولا تقييمًا نفسيًا، ولا حكمًا على قدرات طفلك.','Evidence strength is an estimate based only on the activities recorded in this world: results (60%), the variety of activity types (20%), and practice spread across different days (20%). It drops when there has been no practice for a while. It is not a test score, a psychological assessment, or a judgment of your child\u2019s ability.')}</p>
 </div>;
}

export function HintInsight({hints,tr,lang}){
 if(!hints)return null;
 const used=hints.byWorld.filter(w=>w.count>0);
 return <><h3>{tr('التلميحات المستخدمة','Hints used')}</h3>
  <div className="guardian-summary"><span>{num(hints.last7Days,lang)} {tr('في آخر ٧ أيام','in the last 7 days')}</span><span>{num(hints.last28Days,lang)} {tr('في آخر ٢٨ يومًا','in the last 28 days')}</span></div>
  {hints.last28Days===0?<p>{tr('لم تُستخدم تلميحات في آخر ٢٨ يومًا.','No hints used in the last 28 days.')}</p>:<>
   {used.map(w=>{const world=worlds.find(x=>x.id===w.worldId);return <div className="guardian-task-row" key={w.worldId}><span><b>{world?.icon} {world?tr(world.ar,world.en):w.worldId}</b></span><strong>{num(w.count,lang)}</strong></div>})}
   <div className="guardian-task-row"><span><b>{tr('حسب النوع','By type')}</b><small>{tr('مهمات','Missions')} {num(hints.bySource.MISSION,lang)} · {tr('تحديات العمر','Age challenges')} {num(hints.bySource.AGE_CHALLENGE,lang)} · {tr('تحديات البرمجة','Coding challenges')} {num(hints.bySource.CODE_CHALLENGE,lang)}</small></span></div>
   {hints.topMissions.map(t=>{const m=missions.find(x=>x.id===t.missionId);return <div className="guardian-task-row" key={t.missionId}><span><b>{m?tr(m.ar,m.en):t.missionId}</b><small>{tr('مهمة','Mission')}</small></span><strong>{num(t.count,lang)}</strong></div>})}
  </>}
  <p className="onboard-note">{tr('التلميحات جزء من التعلّم، وطلب المساعدة عادة جيدة. هذه الأرقام توضح أين اختار طفلك رؤية تلميح، وليست درجة ولا تعني أن طفلك يواجه صعوبة. تُحسب الأيام بتوقيت UTC.','Hints are part of learning, and asking for help is a healthy habit. These counts show where your child chose to see a hint; they are not a score and do not mean your child is struggling. Days are counted in UTC.')}</p></>;
}

export function WeeklyInsight({weekly,tr,lang}){
 if(!weekly)return null;
 const max=Math.max(30,...weekly.days.map(d=>d.minutes)),hasEvidence=weekly.worldBalance.some(w=>w.activities>0);
 return <><h3>{tr('النشاط المتتبَّع خلال آخر ٧ أيام','Tracked activity, last 7 days')}</h3>
  <div className="guardian-summary"><span>{num(weekly.totalMinutes,lang)} {tr('دقيقة متتبَّعة','tracked minutes')}</span><span>{num(weekly.activeDays,lang)}/{num(7,lang)} {tr('أيام نشطة','active days')}</span></div>
  {weekly.totalMinutes===0?<p>{tr('لا توجد دقائق متتبَّعة في آخر ٧ أيام.','No tracked minutes in the last 7 days.')}</p>:weekly.days.map(d=><div className="guardian-task-row" key={d.day}><span><b>{new Date(d.day+'T00:00:00Z').toLocaleDateString(lang==='ar'?'ar-EG':'en-US',{weekday:'short',day:'numeric',month:'short',timeZone:'UTC'})}</b></span><span style={{flex:'1 1 120px',maxWidth:260}}><Bar value={d.minutes/max*100} label={tr('دقائق','minutes')}/></span><strong>{num(d.minutes,lang)} {tr('د','min')}</strong></div>)}
  <h3>{tr('توزيع النشاط على العوالم (آخر ٢٨ يومًا)','Activity by subject (last 28 days)')}</h3>
  {hasEvidence?weekly.worldBalance.map(w=>{const world=worlds.find(x=>x.id===w.worldId);return <div className="guardian-task-row" key={w.worldId}><span><b>{world?.icon} {world?tr(world.ar,world.en):w.worldId}</b><small>{num(w.activities,lang)} {tr('نشاط','activities')}</small></span><span style={{flex:'1 1 120px',maxWidth:260}}><Bar value={w.share*100} label={world?tr(world.ar,world.en):w.worldId}/></span><strong>{num(Math.round(w.share*100),lang)}%</strong></div>}):<p>{tr('لا توجد أنشطة مسجّلة في آخر ٢٨ يومًا بعد.','No recorded activities in the last 28 days yet.')}</p>}
  <p className="onboard-note">{tr('الدقائق المتتبَّعة هي الدقائق التي كانت فيها صفحة التعلّم مفتوحة وظاهرة على جهاز الطفل (تُسجَّل كل دقيقة). هي تقريب للنشاط، وليست قياسًا مضمونًا للتعلّم المركّز.','Tracked minutes are minutes when the learning page was open and visible on your child\u2019s device (recorded once a minute). They approximate activity; they are not a guaranteed measure of focused learning.')}</p></>;
}

export function GuardianProgress({overview,tr,lang}){
 const [world,setWorld]=useState(worlds[0].id);
 const active=worlds.find(x=>x.id===world),tasks=missions.filter(m=>m.world===world);
 const attempts=overview.attempts.filter(a=>tasks.some(m=>m.id===a.missionId));
 return <div className="guardian-insights"><div className="guardian-progress-grid">{worlds.map(w=>{const tried=new Set(overview.attempts.filter(a=>a.missionId.startsWith(w.id+'-')).map(a=>a.missionId)).size;return <button type="button" className={world===w.id?'active':''} key={w.id} onClick={()=>setWorld(w.id)}><span>{w.icon} {tr(w.ar,w.en)}</span><strong>{String(overview.mastery[w.id]||'NOT_STARTED').replaceAll('_',' ')}</strong><small>{tr('مهمات مجربة','Missions tried')} {tried}/{missions.filter(m=>m.world===w.id).length}</small></button>})}</div><SubjectInsight insight={overview.insights?.worlds?.[world]} mastery={overview.mastery?.[world]} tr={tr} lang={lang}/><section className="guardian-world-detail"><h3>{tr(active.ar,active.en)}</h3><p>{tr('آخر المحاولات ومستويات المهمات؛ الإتقان يحتاج مراجعات ومشروعًا، وليس نتيجة واحدة.','Recent attempts and mission levels; mastery requires reviews and a project, not one result.')}</p>{tasks.map(m=>{const records=attempts.filter(a=>a.missionId===m.id),best=records.length?Math.max(...records.map(x=>x.score)):null;return <div className="guardian-task-row" key={m.id}><span><b>{tr(m.ar,m.en)}</b><small>{tr('مستوى','Level')} {m.level} · {tr(m.skillAr,m.skillEn)}</small></span><strong>{best===null?tr('لم يبدأ','Not started'):`${best}/${m.questions.length}`}</strong><small>{records.length} {tr('محاولات','attempts')}</small></div>})}</section></div>
}

export function GuardianProjects({overview,tr,lang}){
 const [expanded,setExpanded]=useState(null);
 return <div className="guardian-insights"><h3>{tr('مشروعات الطفل الخاصة','Private child projects')}</h3><p>{tr('تظهر النسخ المحفوظة ومراحل البحث والتأمل؛ لا تنشر للآخرين.','Saved work, research, and reflection appear here and are never public.')}</p>{overview.projects.map(p=><article className="guardian-project-card" key={p.id}><button type="button" onClick={()=>setExpanded(expanded===p.id?null:p.id)} aria-expanded={expanded===p.id}><span><strong>{p.title}</strong><small>{p.world} · {date(p.updatedAt||p.at,lang)}</small></span><span>{expanded===p.id?'−':'+'}</span></button>{expanded===p.id&&<div><p>{p.body}</p>{p.notes?.map((n,i)=><section key={i}><b>{n.stage==='research'?tr('بحث','Research'):n.stage==='reflection'?tr('تأمل','Reflection'):n.stage}</b><p>{n.body}</p><small>{date(n.updatedAt,lang)}</small></section>)}</div>}</article>)}{!overview.projects.length&&<p>{tr('لا توجد مشروعات بعد.','No projects yet.')}</p>}</div>
}

export function GuardianActivity({overview,tr,lang}){
 const records=[...overview.attempts.map(a=>({id:a.id,label:missions.find(m=>m.id===a.missionId),kind:'mission',score:a.score,total:a.total,at:a.at})),...overview.activities.map(a=>({id:a.id,label:a.kind,kind:'activity',score:a.score,total:a.total,at:a.at}))].sort((a,b)=>new Date(b.at)-new Date(a.at));
 const days=new Set(records.map(r=>r.at.slice(0,10))).size;
 return <div className="guardian-insights"><WeeklyInsight weekly={overview.insights?.weekly} tr={tr} lang={lang}/><HintInsight hints={overview.insights?.hints} tr={tr} lang={lang}/><div className="guardian-summary"><span>{records.length} {tr('نشاط محفوظ','saved activities')}</span><span>{days} {tr('أيام تعلم','learning days')}</span><span>{overview.sessions?.length||0} {tr('جلسات قابلة للاستئناف','open sessions')}</span></div><h3>{tr('سجل النشاط','Activity timeline')}</h3>{records.slice(0,60).map(r=><div className="guardian-task-row" key={r.kind+r.id}><span><b>{typeof r.label==='string'?r.label:tr(r.label?.ar||'',r.label?.en||'')}</b><small>{date(r.at,lang)}</small></span><strong>{r.score}/{r.total}</strong></div>)}{overview.sessions?.map(s=><div className="guardian-task-row" key={s.id}><span><b>{tr('جلسة لم تكتمل','Unfinished session')} · {s.missionId}</b><small>{date(s.updatedAt,lang)}</small></span><small>{s.answers.length} {tr('إجابات محفوظة','saved answers')}</small></div>)}{!records.length&&!overview.sessions?.length&&<p>{tr('لا يوجد نشاط بعد.','No activity yet.')}</p>}</div>
}
