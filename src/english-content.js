// Authored bilingual practice prompts. Each skill has three progressively harder lessons.
const lesson=(ar,en,items,audio='')=>({ar,en,items:items.map(([cueAr,cueEn,target])=>({cueAr,cueEn,target})),audio});
export const englishSkillContent={
 vocabulary:[
  lesson('أشياء حولي','Things around me',[['كتاب','book','book'],['قلم','pen','pen'],['حقيبة','bag','bag']]),
  lesson('مكان واتجاه','Places and directions',[['مكتبة','library','library'],['حديقة','garden','garden'],['يمين','right','right']]),
  lesson('أفكار ومشاعر','Ideas and feelings',[['فضولي','curious','curious'],['صبور','patient','patient'],['مبدع','creative','creative']])],
 grammar:[
  lesson('فاعل وفعل','Subject and verb',[['أنا أقرأ كل يوم','I read every day','I read every day.'],['هي ترسم نجمة','She draws a star','She draws a star.'],['نحن نلعب بعد المدرسة','We play after school','We play after school.']]),
  lesson('الماضي البسيط','Simple past',[['زرت الحديقة أمس','I visited the park yesterday','I visited the park yesterday.'],['صنعنا نموذجًا','We made a model','We made a model.'],['كتب قصة قصيرة','He wrote a short story','He wrote a short story.']]),
  lesson('الشرط والسبب','Condition and reason',[['إذا أمطرت، سأبقى بالداخل','If it rains, I will stay inside','If it rains, I will stay inside.'],['أراجع لأنني أريد أن أتعلم','I review because I want to learn','I review because I want to learn.'],['لو تدربنا، سنتحسن','If we practice, we will improve','If we practice, we will improve.']])],
 reading:[
  lesson('اقرأ جملة قصيرة','Read a short sentence',[['القط تحت الشجرة','The cat is under the tree','The cat is under the tree.'],['الولد يحمل كتابًا','A child carries a book','A child carries a book.'],['الطائر فوق البيت','The bird is above the house','The bird is above the house.']]),
  lesson('افهم حدثًا','Understand an event',[['سارة زرعت بذرة وانتظرت','Sara planted a seed and waited','Sara planted a seed and waited.'],['أحمد قارن خطتين قبل الاختيار','Ahmed compared two plans before choosing','Ahmed compared two plans before choosing.'],['جمع الفريق الورق لإعادة تدويره','The team collected paper for recycling','The team collected paper for recycling.']]),
  lesson('استنتج من الدليل','Infer from evidence',[['التربة جافة فالنبتة تحتاج ماء','The soil is dry so the plant needs water','The soil is dry, so the plant needs water.'],['تكررت التجربة فزادت الثقة في النتيجة','The experiment was repeated, so the result is more reliable','The experiment was repeated, so the result is more reliable.'],['تغيرت الغيوم فحملوا مظلة','The clouds changed, so they brought an umbrella','The clouds changed, so they brought an umbrella.']])],
 listening:[
  lesson('اسمع كلمات يومية','Hear everyday words',[['صباح الخير','Good morning','Good morning.'],['شكرًا لك','Thank you','Thank you.'],['إلى اللقاء','See you later','See you later.']]),
  lesson('اسمع تعليمات','Hear instructions',[['افتح الكتاب','Open the book','Open the book.'],['ارسم دائرة','Draw a circle','Draw a circle.'],['عد الخطوات','Count the steps','Count the steps.']]),
  lesson('اسمع المعنى الكامل','Hear the whole meaning',[['لنقارن النتيجتين','Let us compare the two results','Let us compare the two results.'],['اسأل عن مصدر هذه المعلومة','Ask for the source of this information','Ask for the source of this information.'],['اختبر الفكرة مرة أخرى','Test the idea one more time','Test the idea one more time.']])],
 speaking:[
  lesson('قدّم نفسك باسم مستعار','Introduce yourself with a nickname',[['مرحبًا، أنا مستكشف','Hello, I am an explorer','Hello, I am an explorer.'],['أحب القراءة','I like reading','I like reading.'],['يسعدني لقاؤك','Nice to meet you','Nice to meet you.']]),
  lesson('اشرح فكرة','Explain an idea',[['فكرتي هي تقليل الهدر','My idea is to reduce waste','My idea is to reduce waste.'],['سأجرب خطة بسيطة','I will try a simple plan','I will try a simple plan.'],['هذه النتيجة فاجأتني','This result surprised me','This result surprised me.']]),
  lesson('ادعم رأيك','Support an opinion',[['أعتقد ذلك لأن لدي دليلًا','I think so because I have evidence','I think so because I have evidence.'],['يمكننا تجربة طريقة أخرى','We could try another method','We could try another method.'],['ما رأيك في هذه النتيجة؟','What do you think of this result?','What do you think of this result?']])],
 pronunciation:[
  lesson('أصوات البداية','Starting sounds',[['كتاب: صوت b','Book begins with b','book'],['قلم: صوت p','Pen begins with p','pen'],['حديقة: صوت g','Garden begins with g','garden']]),
  lesson('مقاطع أوضح','Clearer syllables',[['كلمة جميلة','The word beautiful','beautiful'],['كلمة حاسوب','The word computer','computer'],['كلمة مغامرة','The word adventure','adventure']]),
  lesson('نبرة الجملة','Sentence rhythm',[['سؤال قصير بنبرة صاعدة','A short question with rising intonation','Are you ready?'],['جملة خبرية هادئة','A calm statement','I am ready.'],['طلب مؤدب','A polite request','Could you help me?']])],
 writing:[
  lesson('اكتب جملة قصيرة','Write a short sentence',[['أنا أحب الكتب','I like books','I like books.'],['نحن نصنع لعبة','We make a game','We make a game.'],['هذه فكرتي','This is my idea','This is my idea.']]),
  lesson('اكتب عن تجربة','Write about an experiment',[['جربت فكرة جديدة','I tried a new idea','I tried a new idea.'],['فشلت المحاولة الأولى','The first attempt failed','The first attempt failed.'],['غيرت الخطة ثم نجحت','I changed the plan and succeeded','I changed the plan and succeeded.']]),
  lesson('اكتب رأيًا مع دليل','Write an evidence-based opinion',[['أرى أن الحل مفيد لأنه يوفر الورق','I think the solution is useful because it saves paper','I think the solution is useful because it saves paper.'],['أظهرت تجربتي نتيجة مختلفة','My experiment showed a different result','My experiment showed a different result.'],['سأتحقق من المصدر قبل المشاركة','I will check the source before sharing','I will check the source before sharing.']])],
 conversation:[
  lesson('ابدأ حوارًا','Start a conversation',[['سلّم على صديق','Greet a friend','Hello, how are you?'],['أجب عن سؤال الحال','Answer how you are','I am fine, thank you.'],['اختم بلطف','End politely','See you later!']]),
  lesson('اسأل وتابع','Ask and follow up',[['اطلب رأيًا','Ask for an opinion','What do you think?'],['اطلب تفسيرًا','Ask for an explanation','Can you explain why?'],['عبّر عن موافقتك','Agree politely','That is a good idea.']]),
  lesson('ناقش فكرة','Discuss an idea',[['قدّم اقتراحًا','Make a suggestion','We could test this together.'],['اسأل عن دليل','Ask for evidence','What evidence supports it?'],['اقترح تعديلًا','Suggest an improvement','Let us improve the first step.']])],
 dictation:[
  lesson('إملاء كلمات','Dictate short words',[['شمس','sun','sun'],['نجمة','star','star'],['كتاب','book','book']]),
  lesson('إملاء جمل قصيرة','Dictate short sentences',[['أنا أقرأ قصة','I read a story','I read a story.'],['لدينا فكرة جيدة','We have a good idea','We have a good idea.'],['اسأل سؤالًا جديدًا','Ask a new question','Ask a new question.']]),
  lesson('إملاء أفكار','Dictate longer ideas',[['نستطيع مقارنة النتائج معًا','We can compare the results together','We can compare the results together.'],['جرّب خطوة صغيرة ثم راجعها','Try one small step and then review it','Try one small step and then review it.'],['تعلمت من الخطأ وعدلت خطتي','I learned from my mistake and changed my plan','I learned from my mistake and changed my plan.']])],
 shadowing:[
  lesson('ردد ببطء','Repeat slowly',[['صباح الخير','Good morning','Good morning.'],['شكرًا على المساعدة','Thank you for helping','Thank you for helping.'],['لنجرب مرة أخرى','Let us try again','Let us try again.']]),
  lesson('ردد مع الوقفات','Repeat with pauses',[['أولًا نلاحظ ثم نجرب','First, we observe; then, we test','First, we observe; then, we test.'],['أسأل ثم أبحث عن دليل','I ask, then I look for evidence','I ask, then I look for evidence.'],['سأبدأ بخطوة صغيرة','I will start with a small step','I will start with a small step.']]),
  lesson('ردد نبرة الحوار','Repeat conversation rhythm',[['ما رأيك في الفكرة؟','What do you think of the idea?','What do you think of the idea?'],['يمكننا أن نتحقق معًا','We can check it together','We can check it together.'],['أخبرني بما اكتشفت','Tell me what you discovered','Tell me what you discovered.']])],
 stories:[
  lesson('قصة في الحديقة','A story in the garden',[['عثر الطفل على بذرة','The child found a seed','The child found a seed.'],['وضع البذرة في التربة','The child put the seed in the soil','The child put the seed in the soil.'],['سقاها كل صباح','The child watered it every morning','The child watered it every morning.']]),
  lesson('قصة فريق صغير','A small team story',[['وجد الفريق مشكلة في الحديقة','The team found a problem in the garden','The team found a problem in the garden.'],['اختبروا حلين مختلفين','They tested two different solutions','They tested two different solutions.'],['اختاروا الحل الأقل هدرًا','They chose the solution with less waste','They chose the solution with less waste.']]),
  lesson('قصة دليل وتغيير','A story about evidence and change',[['ظنت البطلة أن الخريطة صحيحة','The hero thought the map was correct','The hero thought the map was correct.'],['وجدت دليلًا يناقضها','She found evidence that contradicted it','She found evidence that contradicted it.'],['عدلت طريقها بعد المراجعة','She changed her route after reviewing the evidence','She changed her route after reviewing the evidence.']])]
};
export const englishTracks=Object.keys(englishSkillContent);
export function englishLesson(track,level){return englishSkillContent[track]?.[level-1]||null}
export function scoreEnglishSkill(track,level,answers){
 const lesson=englishLesson(track,level);if(!lesson||!Array.isArray(answers)||answers.length!==3)throw new Error('invalid_english_activity');
 const written=['writing','dictation'].includes(track);
 if(written){if(answers.some(a=>typeof a!=='string'||a.length>150))throw new Error('invalid_english_activity');const normalize=s=>s.toLowerCase().replace(/[^a-z0-9 ]/g,'').replace(/\s+/g,' ').trim();return {world:'english',score:answers.filter((a,i)=>normalize(a)===normalize(lesson.items[i].target)).length,total:3}}
 if(answers.some(a=>!Number.isInteger(a)||a<0||a>=3))throw new Error('invalid_english_activity');return {world:'english',score:answers.filter((a,i)=>a===i).length,total:3};
}
