import React,{useEffect,useState} from 'react';
import {Search,ArrowLeft,ArrowRight,Star,BookOpen,Volume2,Flame,Gift,ShieldCheck,CheckCircle2,FolderOpen,Brain,Code2,Palette,Compass,Bell,RotateCcw,Lightbulb} from 'lucide-react';
import {worlds,missions,companions} from './data.js';
import {recommendNext,masteryStatus,xpFromEvidence,xpFromActivities} from './engine.js';
import {api} from './api.js';

const localized=(x,lang)=>x?.[lang==='ar'?'ar':'en']||'';
export function SearchPage({tr,lang,state,nav}){
 const[q,setQ]=useState('');let needle=q.trim().toLocaleLowerCase();
 let results=[
  ...worlds.map(w=>({key:'world'+w.id,title:localized(w,lang),description:tr(w.textAr,w.textEn),path:'/app/worlds/'+w.id,kind:tr('عالم','World')})),
  ...missions.map(m=>({key:m.id,title:localized(m,lang),description:tr(m.objectiveAr,m.objectiveEn),path:'/app/missions/'+m.id,kind:tr('مهمة','Mission')})),
  ...state.projects.map(p=>({key:'project'+p.id,title:p.title,description:p.body,path:'/app/projects/'+p.id,kind:tr('مشروع','Project')}))
 ].filter(item=>!needle||(item.title+' '+item.description).toLocaleLowerCase().includes(needle));
 return <div className="app-content"><span className="kicker">{tr('البحث داخل عالمك','SEARCH YOUR UNIVERSE')}</span><h1>{tr('تبحث عن فكرة؟','Looking for an idea?')}</h1><label className="search-box"><Search/><input autoFocus value={q} onChange={e=>setQ(e.target.value)} placeholder={tr('ابحث عن عالم، مهمة، أو مشروع…','Search worlds, missions, or projects…')}/></label><div className="list-cards">{results.map(x=><button key={x.key} className="list-card" onClick={()=>nav(x.path)}><span className="list-icon"><Compass size={21}/></span><span><small>{x.kind}</small><strong>{x.title}</strong><em>{x.description.slice(0,105)}</em></span><ArrowLeft size={18}/></button>)}</div>{!results.length&&<div className="empty"><Search size={40}/><h2>{tr('لم نجد نتيجة','No results found')}</h2><p>{tr('جرّب كلمة أخرى أو ارجع للعوالم.','Try another word or explore worlds.')}</p></div>}</div>
}

export function RewardsPage({tr,state,update,nav,backend}){
 const [serverRewards,setServerRewards]=useState(state.gamification||null);
 useEffect(()=>{if(backend===true)api('/gamification/progression').then(x=>{setServerRewards(x);update({gamification:x})}).catch(()=>{})},[backend]);
 const done=Object.keys(state.completed).length,xp=serverRewards?.xp??xpFromEvidence(state)+xpFromActivities(state.activities||[]);
 const badges=[{id:'first',title:tr('أول خطوة','First step'),symbol:'✦',earned:done>=1,reason:tr('أنهِ مهمة واحدة','Complete one mission')},{id:'curious',title:tr('عقل فضولي','Curious mind'),symbol:'✳',earned:done>=3,reason:tr('أنهِ ٣ مهمات','Complete 3 missions')},{id:'maker',title:tr('صانع أفكار','Idea maker'),symbol:'✿',earned:state.projects.length>=1,reason:tr('احفظ مشروعًا','Save a project')},{id:'explorer',title:tr('مستكشف العوالم','World explorer'),symbol:'◈',earned:new Set(Object.keys(state.completed).map(id=>missions.find(m=>m.id===id)?.world).filter(Boolean)).size>=3,reason:tr('جرّب ٣ عوالم','Try 3 worlds')}];
 return <div className="app-content rewards-page"><span className="kicker">{tr('إنجازات تستحق الاحتفال','CELEBRATE YOUR GROWTH')}</span><h1>{tr('كل خطوة لها أثر.','Every step counts.')}</h1><p>{tr('الشارات تشجعك على الاستمرار، والإتقان يحتاج أدلة متنوعة ومراجعة.','Badges celebrate progress. Mastery still needs varied evidence and review.')}</p><div className="rewards-hero"><Star size={42}/><div><strong>{xp} XP</strong><span>{tr('المستوى','Level')} {serverRewards?.level||Math.floor(xp/250)+1} · {serverRewards?.coins??Math.floor(xp/25)} {tr('عملة تعلم','learning coins')}</span></div><Flame size={36}/><strong>{serverRewards?.streak||0} {tr('يوم','day streak')}</strong></div><div className="badge-grid">{badges.map(b=><div className={'badge-card '+(b.earned?'earned':'locked')} key={b.id}><div>{b.symbol}</div><strong>{b.title}</strong><small>{b.earned?tr('حصلت عليها','Earned'):b.reason}</small></div>)}</div><div className="onboard-note"><ShieldCheck size={18}/>{tr('لا توجد قائمة ترتيب عامة للأطفال أو شراء بمبالغ حقيقية.','There is no public child leaderboard or real-money reward shop.')}</div><button className="btn primary" onClick={()=>nav('/app/worlds')}>{tr('اكتشف مهمتك التالية','Find your next mission')} <ArrowLeft size={17}/></button></div>
}

export function NotificationsPage({tr,state,nav}){
 const due=(state.attempts||[]).filter(a=>a.nextReviewAt&&new Date(a.nextReviewAt)<=new Date());
 const items=[
  ...due.map((a,i)=>({key:'review'+i,icon:RotateCcw,title:tr('وقت مراجعة فكرة','Time to review an idea'),text:missions.find(m=>m.id===a.missionId)?.[tr('ar','en')]||'',path:'/app/missions/'+a.missionId})),
  ...state.projects.slice(0,3).map(p=>({key:'project'+p.id,icon:FolderOpen,title:tr('مشروع محفوظ','Project saved'),text:p.title,path:'/app/projects/'+p.id})),
  ...state.evidence.slice(0,3).filter(e=>e.missionId).map((e,i)=>({key:'mission'+i,icon:CheckCircle2,title:tr('مهمة مكتملة','Mission completed'),text:missions.find(m=>m.id===e.missionId)?.[tr('ar','en')]||'',path:'/app/progress'}))
 ];
 return <div className="app-content"><span className="kicker">{tr('جديد في رحلتك','YOUR UPDATES')}</span><h1>{tr('آخر ما حدث.','What’s new.')}</h1><p>{tr('تنبيهات محلية مرتبطة بتقدمك، بدون رسائل من مستخدمين آخرين.','Local learning updates with no messages from other users.')}</p>{items.length?<div className="list-cards">{items.map(n=><button className="list-card" key={n.key} onClick={()=>nav(n.path)}><span className="list-icon"><n.icon size={20}/></span><span><strong>{n.title}</strong><em>{n.text}</em></span><ArrowLeft size={16}/></button>)}</div>:<div className="empty big"><Bell size={39}/><h2>{tr('لا جديد بعد','Nothing new yet')}</h2><p>{tr('أكمل مهمة وسنحتفل بخطوتك هنا.','Complete a mission to see an update here.')}</p></div>}</div>
}

const englishTracks=[
 ['vocabulary','مفردات','Vocabulary','احفظ الكلمات داخل موقف قصير.','Learn words in a short situation.','english-colors'],
 ['grammar','قواعد','Grammar','رتّب جملة واضحة واستخدمها.','Build a clear sentence.','english-daily'],
 ['reading','قراءة','Reading','اقرأ قصة قصيرة وابحث عن المعنى.','Read a short story and find meaning.','english-evidence'],
 ['listening','استماع','Listening','استمع إلى الجملة ثم اختر معناها.','Listen to a sentence and choose its meaning.','english-story'],
 ['speaking','تحدث','Speaking','قل جملة بسيطة بثقة.','Say a simple sentence with confidence.','english-hello'],
 ['pronunciation','نطق','Pronunciation','اسمع الكلمة ورددها على راحتك.','Listen and repeat at your pace.','english-hello'],
 ['writing','كتابة','Writing','اكتب جملة تعبّر عن فكرتك.','Write a sentence to express an idea.','english-story'],
 ['conversation','محادثة','Conversation','تبادل تحية وسؤالًا بسيطًا.','Exchange a greeting and a simple question.','english-hello'],
 ['dictation','إملاء','Dictation','استمع واكتب ما فهمته.','Listen and write what you heard.','english-story'],
 ['shadowing','ترديد','Shadowing','استمع وردد الإيقاع.','Listen and repeat the rhythm.','english-hello'],
 ['stories','حكايات إنجليزية','English stories','ادخل قصة وتعلم كلماتها.','Step into a story and learn its words.','english-story']
];
export function EnglishPage({tr,lang,nav,path,speak}){
 const segment=path.split('/')[3],track=englishTracks.find(x=>x[0]===segment);
 if(!track)return <div className="app-content"><span className="kicker">WORD HARBOR</span><h1>{tr('الإنجليزية بالممارسة.','English through doing.')}</h1><p>{tr('اختار مهارة، اسمع مثالًا، ثم جرّب مهمة كاملة.','Choose a skill, hear an example, then try a full mission.')}</p><div className="track-grid">{englishTracks.map(([id,ar,en,descAr,descEn])=><button className="track-card" key={id} onClick={()=>nav('/app/english/'+id)}><span>Aa</span><h3>{tr(ar,en)}</h3><p>{tr(descAr,descEn)}</p><ArrowLeft size={18}/></button>)}</div></div>;
 const mission=missions.find(m=>m.id===track[5]),sample=mission.questions[0],isListening=['listening','speaking','pronunciation','dictation','shadowing'].includes(track[0]);
 return <div className="app-content"><button className="back-link" onClick={()=>nav('/app/english')}><ArrowRight size={17}/>{tr('مدينة الكلمات','Word Harbor')}</button><span className="kicker">WORD HARBOR / {segment.toUpperCase()}</span><h1>{tr(track[1],track[2])}</h1><p>{tr(track[3],track[4])}</p><div className="english-lesson"><div className="english-example"><span>{tr('جرّب مثالًا','TRY AN EXAMPLE')}</span><h2>{isListening?'Good morning!':tr(sample.ar,sample.en)}</h2><button className="btn outline" onClick={()=>speak(isListening?'Good morning!':tr(sample.ar,sample.en))}><Volume2 size={18}/>{tr('استمع','Listen')}</button></div><div><BookOpen size={38}/><h2>{tr('جاهز للتجربة؟','Ready to try?')}</h2><p>{tr(mission.objectiveAr,mission.objectiveEn)}</p><button className="btn primary" onClick={()=>nav('/app/missions/'+mission.id+'/run')}>{tr('ابدأ مهمة','Start mission')} <ArrowLeft size={16}/></button></div></div><div className="onboard-note"><ShieldCheck size={18}/>{tr('الصوت هنا للقراءة فقط. لا نسجل صوت الطفل في هذه المرحلة.','Voice here is playback only. This version does not record a child’s voice.')}</div></div>
}

export function StoriesPage({tr,nav}){
 return <div className="app-content"><span className="kicker">{tr('حكايات تختار طريقها','STORIES WITH CHOICES')}</span><h1>{tr('ادخل الحكاية وغيّر مسارها.','Step into a story and shape it.')}</h1><div className="story-list"><div><span>✦ ✿ ✧</span><h2>{tr('الصندوق والنجمة','The box and the star')}</h2><p>{tr('قصة قصيرة بثلاثة اختيارات تقودك إلى مشروع كتابة.','A short story with three choices leading into a writing project.')}</p><button className="btn primary" onClick={()=>nav('/app/stories/box-and-star')}>{tr('ابدأ الحكاية','Begin story')} <ArrowLeft size={16}/></button></div></div></div>
}

export function SimulationsPage({tr,nav,recordActivity}){
 const[step,setStep]=useState(0),[choice,setChoice]=useState(null),[choices,setChoices]=useState([]),[error,setError]=useState('');
 const scenarios=[
  {ar:'فريقك يريد حل مشكلة إهدار الورق في الفصل. ما البداية؟',en:'Your team wants to reduce paper waste in class. Where do you begin?',optionsAr:['نلاحظ كمية الورق المستهلك','نشتري جهازًا غاليًا فورًا'],optionsEn:['Observe how much paper is used','Buy an expensive device immediately']},
  {ar:'وجدت أن معظم الورق يخرج من طباعة مسودات. ما التجربة الصغيرة؟',en:'Most waste comes from printed drafts. What small test can you try?',optionsAr:['نجرب مراجعة المسودة رقميًا أسبوعًا','نمنع الجميع من الكتابة'],optionsEn:['Try digital draft review for a week','Ban all writing']},
  {ar:'بعد أسبوع انخفض الاستهلاك. كيف تعرض النتيجة؟',en:'After a week, use drops. How do you show the result?',optionsAr:['أقارن أرقام قبل وبعد','أقول إن الفكرة نجحت بلا دليل'],optionsEn:['Compare before-and-after numbers','Claim success without evidence']}
 ];
 async function next(){const updated=[...choices,choice];setError('');if(step===2){try{await recordActivity('SIMULATION',{choices:updated},{kind:'simulation',skill:tr('حل المشكلات','Problem solving'),score:updated.filter(x=>x===0).length,total:3,at:new Date().toISOString()});setChoices(updated);setStep(3)}catch(e){setError(e.message)}}else{setChoices(updated);setStep(step+1);setChoice(null)}}
 return <div className="app-content"><span className="kicker">{tr('محاكاة من الواقع','REAL-WORLD SIMULATION')}</span><h1>{tr('فكرة صغيرة، أثر حقيقي.','A small idea, a real impact.')}</h1><div className="simulation-card">{step<3?<><span>{step+1}/3</span><h2>{tr(scenarios[step].ar,scenarios[step].en)}</h2><div className="ai-options">{(tr(scenarios[step].optionsAr,scenarios[step].optionsEn)).map((x,i)=><button key={i} className={choice===i?'selected':''} onClick={()=>setChoice(i)}>{x}</button>)}</div>{choice!==null&&<p className="lab-result">{choice===0?tr('قرار جيد: تبدأ بالدليل ثم تجرب وتحلل.','Good choice: observe, test, then analyze.'):tr('جرّب أن تبدأ بملاحظة ودليل وتجربة بسيطة.','Try starting with observation, evidence, and a small test.')}</p>}{error&&<div className="form-error" role="alert">{error}</div>}<button className="btn primary" disabled={choice===null} onClick={next}>{tr('تابع','Continue')} <ArrowLeft size={16}/></button></>:<><CheckCircle2 size={46}/><h2>{tr('أصبحت لديك فكرة مشروع!','You have a project idea!')}</h2><p>{tr('حوّل تجربة تقليل الهدر إلى مشروع تشرح فيه المشكلة، التجربة، وما تغير.','Turn the paper-waste experiment into a project with the problem, test, and result.')}</p><button className="btn primary" onClick={()=>nav('/app/projects/new')}>{tr('ابدأ المشروع','Start a project')}</button></>}</div></div>
}
