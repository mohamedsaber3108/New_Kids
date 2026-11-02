import React,{useState} from 'react';
import {worlds,missions} from './data';

const date=(value,lang)=>new Date(value).toLocaleString(lang==='ar'?'ar-EG':'en-US',{dateStyle:'medium',timeStyle:'short'});

export function GuardianProgress({overview,tr,lang}){
 const [world,setWorld]=useState(worlds[0].id);
 const active=worlds.find(x=>x.id===world),tasks=missions.filter(m=>m.world===world);
 const attempts=overview.attempts.filter(a=>tasks.some(m=>m.id===a.missionId));
 return <div className="guardian-insights"><div className="guardian-progress-grid">{worlds.map(w=>{const tried=new Set(overview.attempts.filter(a=>a.missionId.startsWith(w.id+'-')).map(a=>a.missionId)).size;return <button type="button" className={world===w.id?'active':''} key={w.id} onClick={()=>setWorld(w.id)}><span>{w.icon} {tr(w.ar,w.en)}</span><strong>{String(overview.mastery[w.id]||'NOT_STARTED').replaceAll('_',' ')}</strong><small>{tr('مهمات مجربة','Missions tried')} {tried}/{missions.filter(m=>m.world===w.id).length}</small></button>})}</div><section className="guardian-world-detail"><h3>{tr(active.ar,active.en)}</h3><p>{tr('آخر المحاولات ومستويات المهمات؛ الإتقان يحتاج مراجعات ومشروعًا، وليس نتيجة واحدة.','Recent attempts and mission levels; mastery requires reviews and a project, not one result.')}</p>{tasks.map(m=>{const records=attempts.filter(a=>a.missionId===m.id),best=records.length?Math.max(...records.map(x=>x.score)):null;return <div className="guardian-task-row" key={m.id}><span><b>{tr(m.ar,m.en)}</b><small>{tr('مستوى','Level')} {m.level} · {tr(m.skillAr,m.skillEn)}</small></span><strong>{best===null?tr('لم يبدأ','Not started'):`${best}/${m.questions.length}`}</strong><small>{records.length} {tr('محاولات','attempts')}</small></div>})}</section></div>
}

export function GuardianProjects({overview,tr,lang}){
 const [expanded,setExpanded]=useState(null);
 return <div className="guardian-insights"><h3>{tr('مشروعات الطفل الخاصة','Private child projects')}</h3><p>{tr('تظهر النسخ المحفوظة ومراحل البحث والتأمل؛ لا تنشر للآخرين.','Saved work, research, and reflection appear here and are never public.')}</p>{overview.projects.map(p=><article className="guardian-project-card" key={p.id}><button type="button" onClick={()=>setExpanded(expanded===p.id?null:p.id)} aria-expanded={expanded===p.id}><span><strong>{p.title}</strong><small>{p.world} · {date(p.updatedAt||p.at,lang)}</small></span><span>{expanded===p.id?'−':'+'}</span></button>{expanded===p.id&&<div><p>{p.body}</p>{p.notes?.map((n,i)=><section key={i}><b>{n.stage==='research'?tr('بحث','Research'):n.stage==='reflection'?tr('تأمل','Reflection'):n.stage}</b><p>{n.body}</p><small>{date(n.updatedAt,lang)}</small></section>)}</div>}</article>)}{!overview.projects.length&&<p>{tr('لا توجد مشروعات بعد.','No projects yet.')}</p>}</div>
}

export function GuardianActivity({overview,tr,lang}){
 const records=[...overview.attempts.map(a=>({id:a.id,label:missions.find(m=>m.id===a.missionId),kind:'mission',score:a.score,total:a.total,at:a.at})),...overview.activities.map(a=>({id:a.id,label:a.kind,kind:'activity',score:a.score,total:a.total,at:a.at}))].sort((a,b)=>new Date(b.at)-new Date(a.at));
 const days=new Set(records.map(r=>r.at.slice(0,10))).size;
 return <div className="guardian-insights"><div className="guardian-summary"><span>{records.length} {tr('نشاط محفوظ','saved activities')}</span><span>{days} {tr('أيام تعلم','learning days')}</span><span>{overview.sessions?.length||0} {tr('جلسات قابلة للاستئناف','open sessions')}</span></div><h3>{tr('سجل النشاط','Activity timeline')}</h3>{records.slice(0,60).map(r=><div className="guardian-task-row" key={r.kind+r.id}><span><b>{typeof r.label==='string'?r.label:tr(r.label?.ar||'',r.label?.en||'')}</b><small>{date(r.at,lang)}</small></span><strong>{r.score}/{r.total}</strong></div>)}{overview.sessions?.map(s=><div className="guardian-task-row" key={s.id}><span><b>{tr('جلسة لم تكتمل','Unfinished session')} · {s.missionId}</b><small>{date(s.updatedAt,lang)}</small></span><small>{s.answers.length} {tr('إجابات محفوظة','saved answers')}</small></div>)}{!records.length&&!overview.sessions?.length&&<p>{tr('لا يوجد نشاط بعد.','No activity yet.')}</p>}</div>
}
