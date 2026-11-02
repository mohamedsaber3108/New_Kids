// A deterministic bilingual bank. Each age has 20 tasks in each of five worlds.
export const challengeAges=Array.from({length:9},(_,i)=>i+7);
export const challengeWorlds=['english','coding','ai','creativity','thinking'];
const contexts=[
 {ar:'حديقة المدرسة',en:'school garden',thingAr:'زهرة',thingEn:'flower'},
 {ar:'مكتبة الحي',en:'community library',thingAr:'كتاب',thingEn:'book'},
 {ar:'محطة الفضاء',en:'space station',thingAr:'نجمة',thingEn:'star'},
 {ar:'معمل الروبوت',en:'robot lab',thingAr:'روبوت',thingEn:'robot'},
 {ar:'شاطئ المدينة',en:'city beach',thingAr:'صدفة',thingEn:'shell'}
];
const words=[['seed','بذرة'],['bridge','جسر'],['planet','كوكب'],['pattern','نمط'],['evidence','دليل']];
const ageFocus=[
 ['لاحظ الفكرة واختر إجابة واحدة.','Notice the idea and choose one answer.'],
 ['سمّ السبب الذي جعلك تختار.','Name one reason for your choice.'],
 ['قارن بين إجابتين قبل أن تختار.','Compare two answers before choosing.'],
 ['ابحث عن دليل من السؤال يدعم اختيارك.','Find a clue in the question that supports your choice.'],
 ['اشرح لماذا البديل الآخر أضعف.','Explain why another option is weaker.'],
 ['اختبر ما إذا كانت إجابتك ستنجح في موقف مشابه.','Test whether your answer works in a similar case.'],
 ['اقترح تحسينًا للفكرة بعد أن تجيب.','Suggest an improvement after answering.'],
 ['دافع عن اختيارك بدليل، ثم راجع اعتراضًا محتملًا.','Defend your choice with evidence, then consider a counterargument.'],
 ['قيّم أثر إجابتك على الآخرين، وحدد حدودها.','Evaluate its impact on others and identify its limits.']
];
const take=(choices,correct,offset)=>{const shift=offset%3;return {optionsAr:[...choices.map(x=>x[0].ar)].slice(shift).concat(choices.map(x=>x[0].ar).slice(0,shift)),optionsEn:[...choices.map(x=>x[0].en)].slice(shift).concat(choices.map(x=>x[0].en).slice(0,shift)),answer:(correct-shift+3)%3}};
function item(age,world,contextIndex,mode){
 const c=contexts[contextIndex],n=age-5+contextIndex*2+mode,stage=age<=9?1:age<=12?2:3;
 const base={id:`age-${age}-${world}-${contextIndex*4+mode+1}`,age,world,level:stage,sequence:contextIndex*4+mode+1};
 let questionAr,questionEn,answers,explainAr,explainEn,hintAr,hintEn;
 if(world==='english'){
  const w=words[(contextIndex+mode)%5],v=mode===0?'word':mode===1?'sentence':mode===2?'context':'meaning';
  if(mode===0){questionAr=`في ${c.ar}، ما معنى كلمة ${w[0]}؟`;questionEn=`At the ${c.en}, what does ${w[0]} mean?`;answers=[[{ar:w[1],en:w[0]}],[{ar:'سريع',en:'fast'}],[{ar:'أزرق',en:'blue'}]]}
  else if(mode===1){questionAr=`أكمل الجملة عن ${c.thingAr}: I can see a ___.`;questionEn=`Complete the sentence about a ${c.thingEn}: I can see a ___.`;answers=[[{ar:c.thingEn,en:c.thingEn}],[{ar:'see',en:'see'}],[{ar:'can',en:'can'}]]}
  else if(mode===2){questionAr=`تصف ${c.thingAr} واحدًا في ${c.ar}. اختر التعبير الإنجليزي السليم.`;questionEn=`Describe one ${c.thingEn} at the ${c.en}. Choose the correct phrase.`;answers=[[{ar:`one ${c.thingEn}`,en:`one ${c.thingEn}`}],[{ar:`many ${c.thingEn}`,en:`many ${c.thingEn}`}],[{ar:`two ${c.thingEn}`,en:`two ${c.thingEn}`}]]}
  else{questionAr=`اقرأ: We found a ${w[0]} at the ${c.en}. أي كلمة تعني ${w[1]}؟`;questionEn=`Read: We found a ${w[0]} at the ${c.en}. Which word means ${w[1]}?`;answers=[[{ar:w[0],en:w[0]}],[{ar:'found',en:'found'}],[{ar:'at',en:'at'}]]}
  explainAr='اربط الكلمة بسياق الجملة وعدد الأشياء قبل الاختيار.';explainEn='Use the sentence context and the number of things to choose.';hintAr='اقرأ الجملة بصوت بطيء.';hintEn='Read the sentence slowly.';
 }else if(world==='coding'){
  if(mode===0){questionAr=`الروبوت في ${c.ar} يتحرك ${n} خطوات ثم خطوتين. كم خطوة نفّذ؟`;questionEn=`At the ${c.en}, a robot moves ${n} steps then two more. How many steps?`;answers=[[{ar:String(n+2),en:String(n+2)}],[{ar:String(n+1),en:String(n+1)}],[{ar:String(n+3),en:String(n+3)}]]}
  else if(mode===1){questionAr=`برنامج يكرر خطوة ${n} مرات، ثم يكررها مرة أخرى. كم حركة؟`;questionEn=`A program repeats a move ${n} times, then once more. How many moves?`;answers=[[{ar:String(n+1),en:String(n+1)}],[{ar:String(n),en:String(n)}],[{ar:String(n*2),en:String(n*2)}]]}
  else if(mode===2){questionAr=`في ${c.ar}، الشرط هو: إذا وُجدت ${c.thingAr} فالتقطها، وإلا فتقدم. وُجدت ${c.thingAr}. ماذا يفعل؟`;questionEn=`At the ${c.en}: if a ${c.thingEn} is found, pick it up; otherwise move. It was found. What happens?`;answers=[[{ar:'يلتقطها',en:'Pick it up'}],[{ar:'يتقدم',en:'Move forward'}],[{ar:'يتوقف بلا سبب',en:'Stop for no reason'}]]}
  else{questionAr=`خطوات الروبوت: تقدم، تقدم، استدر. يريد ${n} خطوات تقدم قبل الاستدارة. ما التعديل الأنسب؟`;questionEn=`Robot steps: move, move, turn. It needs ${n} moves before turning. Which edit helps?`;answers=[[{ar:`كرر «تقدم» ${n} مرات ثم استدر`,en:`Repeat move ${n} times, then turn`}],[{ar:'احذف كل الحركة',en:'Delete all moves'}],[{ar:'استدر أولًا',en:'Turn first'}]]}
  explainAr='تتبّع الأوامر واحدًا واحدًا، واختبر الشرط قبل تنفيذ الفرع.';explainEn='Trace each instruction and test the condition before taking a branch.';hintAr='جرّب تمثيل الأوامر بإصبعك.';hintEn='Act out each command with your finger.';
 }else if(world==='ai'){
  const claim=`${c.thingAr} في ${c.ar}`,claimEn=`a ${c.thingEn} at the ${c.en}`;
  if(mode===0){questionAr=`أخبرك مساعد AI بمعلومة عن ${claim}. ما أول خطوة قبل مشاركتها؟`;questionEn=`An AI helper made a claim about ${claimEn}. What should you do before sharing it?`;answers=[[{ar:'أتحقق من مصدر مناسب مع شخص بالغ',en:'Check a suitable source with a trusted adult'}],[{ar:'أنشرها فورًا',en:'Share it immediately'}],[{ar:'أعتبرها مؤكدة لأن AI قالها',en:'Assume AI is always right'}]]}
  else if(mode===1){questionAr=`طلب تطبيق AI اسم صديقك وعنوانه لكي يرسم ${c.thingAr}. ماذا تفعل؟`;questionEn=`An AI app asks for a friend’s name and address to draw a ${c.thingEn}. What do you do?`;answers=[[{ar:'لا أشارك بياناته وأسأل ولي أمري',en:'Do not share it; ask my guardian'}],[{ar:'أعطيه العنوان',en:'Give the address'}],[{ar:'أنشره في تعليق',en:'Post it in a comment'}]]}
  else if(mode===2){questionAr=`اقترح AI اختيار شخص واحد فقط للعمل في ${c.ar} دون سبب. ما السؤال العادل؟`;questionEn=`AI picks only one person for work at the ${c.en} without a reason. What is a fair question?`;answers=[[{ar:'ما معايير الاختيار وهل عومل الجميع بإنصاف؟',en:'What criteria were used, and was everyone treated fairly?'}],[{ar:'من فاز فقط؟',en:'Who won only?'}],[{ar:'هل AI لا يخطئ أبدًا؟',en:'Is AI always right?'}]]}
  else{questionAr=`استخدمت AI لاقتراح فكرة عن ${claim}. من صاحب القرار النهائي؟`;questionEn=`You used AI to suggest an idea about ${claimEn}. Who makes the final decision?`;answers=[[{ar:'الإنسان بعد مراجعة الدليل',en:'A person after reviewing evidence'}],[{ar:'النموذج وحده',en:'The model alone'}],[{ar:'أول إجابة تظهر',en:'The first answer'}]]}
  explainAr='الذكاء الاصطناعي أداة: تحقق، احمِ الخصوصية، راجع الإنصاف، واترك القرار للإنسان.';explainEn='AI is a tool: verify, protect privacy, check fairness, and keep people in charge.';hintAr='فكر في المصدر والخصوصية ومن يتحمل القرار.';hintEn='Think about sources, privacy, and who is responsible.';
 }else if(world==='creativity'){
  if(mode===0){questionAr=`تريد قصة عن ${c.thingAr} في ${c.ar}. ما بداية تفتح سؤالًا للقارئ؟`;questionEn=`You are writing about a ${c.thingEn} at the ${c.en}. Which opening creates curiosity?`;answers=[[{ar:`اختفت ${c.thingAr} قبل أن يعرف أحد السبب.`,en:`The ${c.thingEn} vanished before anyone knew why.`}],[{ar:'حدث شيء.',en:'Something happened.'}],[{ar:'هذه نهاية القصة.',en:'This is the end.'}]]}
  else if(mode===1){questionAr=`شخصية في ${c.ar} تواجه مشكلة. ما الخطوة التي تطور الحكاية؟`;questionEn=`A character faces a problem at the ${c.en}. Which step develops the story?`;answers=[[{ar:'تجرب حلًا ثم ترى نتيجته',en:'Try a solution and see its result'}],[{ar:'تنتهي القصة دون فعل',en:'End the story without action'}],[{ar:'تنسخ نهاية قصة أخرى',en:'Copy another story’s ending'}]]}
  else if(mode===2){questionAr=`صممت مشروعًا عن ${c.thingAr}. صديقك لم يفهم الفكرة. ما التحسين؟`;questionEn=`You made a project about a ${c.thingEn}, but a friend did not understand. What can improve it?`;answers=[[{ar:'أشرح الفكرة ثم أجرب نسخة أوضح',en:'Explain it and test a clearer version'}],[{ar:'أمسح كل شيء',en:'Delete everything'}],[{ar:'أتجاهل الملاحظة',en:'Ignore the feedback'}]]}
  else{questionAr=`بعد تجربة قصة ${c.ar}، ما تأمل يساعد النسخة التالية؟`;questionEn=`After trying the ${c.en} story, which reflection helps the next version?`;answers=[[{ar:'ما الذي نجح وما الذي سأعدله؟',en:'What worked, and what will I change?'}],[{ar:'لا أراجع عملي أبدًا',en:'I never review my work'}],[{ar:'كل فكرة أولى مثالية',en:'Every first idea is perfect'}]]}
  explainAr='الفكرة القوية تبدأ بسؤال، تتطور بتجربة، وتتحسن بملاحظة وتأمل.';explainEn='A strong idea starts with a question, grows through trying, and improves with feedback.';hintAr='اختر خطوة تسمح بالتجربة والتحسين.';hintEn='Choose a step that allows trying and improving.';
 }else{
  if(mode===0){questionAr=`في ${c.ar} يوجد ${n} من ${c.thingAr}، وأضيف ٣. كم أصبح العدد؟`;questionEn=`There are ${n} ${c.thingEn}s at the ${c.en}, and 3 are added. How many now?`;answers=[[{ar:String(n+3),en:String(n+3)}],[{ar:String(n-3),en:String(n-3)}],[{ar:String(n+2),en:String(n+2)}]]}
  else if(mode===1){questionAr=`النمط: ${n}، ${n+2}، ${n+4}. ما التالي؟`;questionEn=`Pattern: ${n}, ${n+2}, ${n+4}. What comes next?`;answers=[[{ar:String(n+6),en:String(n+6)}],[{ar:String(n+5),en:String(n+5)}],[{ar:String(n+8),en:String(n+8)}]]}
  else if(mode===2){questionAr=`شخصان يختلفان بشأن عدد ${c.thingAr} في ${c.ar}. ما الدليل الأفضل؟`;questionEn=`Two people disagree about the number of ${c.thingEn}s at the ${c.en}. What is the best evidence?`;answers=[[{ar:'نعدّ الأشياء ونسجل النتيجة',en:'Count them and record the result'}],[{ar:'نختار رأي الأعلى صوتًا',en:'Choose the loudest opinion'}],[{ar:'نخمّن بلا فحص',en:'Guess without checking'}]]}
  else{questionAr=`تريد حل مشكلة ازدحام ${c.ar}. ما أول تجربة صغيرة؟`;questionEn=`You want to reduce crowding at the ${c.en}. What is a useful first experiment?`;answers=[[{ar:'أحدد السبب وأجرب تغييرًا واحدًا ثم أقيس',en:'Identify a cause, change one thing, then measure'}],[{ar:'أغير كل شيء دفعة واحدة',en:'Change everything at once'}],[{ar:'لا أسأل عن السبب',en:'Never ask why'}]]}
  explainAr='افحص المعطيات وحدد النمط أو السبب ثم اختبر إجابتك.';explainEn='Check the facts, find the pattern or cause, then test your answer.';hintAr='اكتب المعطيات أولًا.';hintEn='Write down the given facts first.';
 }
 const rotated=take(answers,0,age+contextIndex+mode);
 return {...base,titleAr:`${c.ar} · ${['اكتشف','طبّق','تحقق','حسّن'][mode]}`,titleEn:`${c.en} · ${['Explore','Apply','Check','Improve'][mode]}`,questionAr:`${ageFocus[age-7][0]} ${questionAr}`,questionEn:`${ageFocus[age-7][1]} ${questionEn}`,...rotated,explainAr,explainEn,hintAr,hintEn,extensionAr:ageFocus[age-7][0],extensionEn:ageFocus[age-7][1]};
}
export const ageChallenges=challengeAges.flatMap(age=>challengeWorlds.flatMap(world=>contexts.flatMap((_,c)=>[0,1,2,3].map(mode=>item(age,world,c,mode)))));
export const getAgeChallenge=id=>ageChallenges.find(x=>x.id===id);
export function scoreAgeChallenge(payload){const c=getAgeChallenge(payload?.id);if(!c||!Number.isInteger(payload?.choice)||payload.choice<0||payload.choice>=3)throw new Error('invalid_age_challenge');return {score:Number(payload.choice===c.answer),total:1,world:c.world,age:c.age};}
