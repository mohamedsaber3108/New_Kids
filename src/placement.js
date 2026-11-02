import {worlds} from './data.js';
export const placementQuestions=[
 {world:'english',ar:'أي كلمة تعني «كتاب»؟',en:'Which word means book?',optionsAr:['house','book','rain'],optionsEn:['house','book','rain'],answer:1},
 {world:'english',ar:'“She reads every day.” ماذا تفعل هي؟',en:'“She reads every day.” What does she do?',optionsAr:['تنام','ترسم','تقرأ'],optionsEn:['She sleeps','She draws','She reads'],answer:2},
 {world:'coding',ar:'تريد أن يتحرك روبوت ٣ خطوات متشابهة. ماذا تستخدم؟',en:'A robot repeats the same move 3 times. What helps?',optionsAr:['التكرار','لون جديد','حذف الخطوات'],optionsEn:['A loop','A new color','Delete the steps'],answer:0},
 {world:'coding',ar:'score = 2، ثم score = score + 1. ما القيمة؟',en:'score = 2, then score = score + 1. Value?',optionsAr:['١','٣','٥'],optionsEn:['1','3','5'],answer:1},
 {world:'ai',ar:'أخبرك AI بمعلومة غريبة. ما أول خطوة؟',en:'AI gives an odd fact. What is your first step?',optionsAr:['أنشرها','أصدقها','أتحقق من مصدر موثوق'],optionsEn:['Share it','Believe it','Check a trusted source'],answer:2},
 {world:'ai',ar:'أي معلومة لا ترسلها إلى مساعد؟',en:'Which information must stay private?',optionsAr:['كلمة المرور','سؤال عام','عنوان كتاب'],optionsEn:['A password','A general question','A book title'],answer:0},
 {world:'creativity',ar:'ما الذي يجعل القصة ممتعة أكثر؟',en:'What can make a story more engaging?',optionsAr:['إنهاؤها قبل البداية','سؤال يفتح احتمالًا','نسخ قصة أخرى'],optionsEn:['End before the start','A question that opens a possibility','Copy another story'],answer:1},
 {world:'creativity',ar:'جرّبت نموذج لعبة ولم يفهم صديقك الزر. ماذا تفعل؟',en:'A friend cannot understand a game button. What next?',optionsAr:['أتجاهله','ألغي الفكرة','أعدّل الوصف وأختبر ثانية'],optionsEn:['Ignore it','Cancel the idea','Revise the label and test again'],answer:2},
 {world:'thinking',ar:'رأيت الأرض مبللة. أي عبارة ملاحظة؟',en:'The ground is wet. Which statement is observation?',optionsAr:['الأرض مبللة','أمطرت بالتأكيد','شخص سكب الماء بالتأكيد'],optionsEn:['The ground is wet','It certainly rained','Someone certainly poured water'],answer:0},
 {world:'thinking',ar:'حل أرخص لكنه يحتاج وقتًا أطول. أيهما أفضل؟',en:'A cheaper solution takes more time. Which is better?',optionsAr:['الأرخص دائمًا','يعتمد على هدفنا','الأسرع دائمًا'],optionsEn:['Always the cheaper','It depends on our goal','Always the faster'],answer:1}
];
export function scorePlacement(answers,ageBand){
 if(!Array.isArray(answers)||answers.length!==placementQuestions.length||answers.some((n,i)=>!Number.isInteger(n)||n<0||n>=placementQuestions[i].optionsEn.length))throw new Error('invalid_placement');
 const byWorld=Object.fromEntries(worlds.map(w=>[w.id,{score:0,total:2,level:1}]));
 placementQuestions.forEach((q,i)=>{if(answers[i]===q.answer)byWorld[q.world].score++});
 const ceiling=ageBand==='7-9'?2:3;
 for(const result of Object.values(byWorld))result.level=Math.min(ceiling,result.score+1);
 const top=worlds.map(w=>({id:w.id,...byWorld[w.id]})).sort((a,b)=>b.score-a.score)[0];
 return {byWorld,recommendedWorld:top.id,totalCorrect:Object.values(byWorld).reduce((n,r)=>n+r.score,0),total:placementQuestions.length};
}
