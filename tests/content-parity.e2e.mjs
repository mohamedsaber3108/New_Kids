// Frontend <-> backend parity for EVERY learning lab.
// For each content item, build the payload exactly as the USAM_New frontend builds it,
// POST it to the real /api/activities, and assert:
//   1. the server accepts it (201),
//   2. the server score equals the frontend's own local scorer (what the child is shown),
//   3. for choice-based labs, the correct choice earns full marks on the server,
//   4. every saved activity appears in the learner's persisted snapshot.
// Run: node tests/content-parity.e2e.mjs
import {createHash,randomBytes,randomUUID} from 'node:crypto';
import {createApp} from '../server/app.mjs';
import {ageChallenges,challengeAges,challengeWorlds,scoreAgeChallenge} from '../src/age-challenges.js';
import {aiTopics,scoreAITopic} from '../src/ai-content.js';
import {codingChallenges,runCodingChallenge} from '../src/coding-content.js';
import {thinkingCases,scoreThinkingCase} from '../src/thinking-content.js';
import {englishTracks,englishLesson,scoreEnglishSkill} from '../src/english-content.js';
import {stories,simulations,scoreNarrative} from '../src/narratives.js';
import {scoreActivity} from '../src/engine.js';

const app=createApp({database:':memory:',secureCookies:false,publicOrigin:''});
await new Promise(r=>app.server.listen(0,'127.0.0.1',r));
const base='http://127.0.0.1:'+app.server.address().port;
const db=app.db;

// --- fixtures: one approved guardian, learners minted directly (avoids login rate limits) ---
const now=new Date().toISOString(),guardianId=randomUUID();
db.prepare('INSERT INTO users(id,role,email,password_hash,display_name,guardian_approved_at,created_at) VALUES(?,?,?,?,?,?,?)').run(guardianId,'GUARDIAN','parity@example.test','x','Parity Parent',now,now);
function newLearner(){
 const learnerId=randomUUID(),token=randomBytes(32).toString('base64url');
 db.prepare('INSERT INTO learners(id,guardian_id,nickname,age_band,age_year,created_at) VALUES(?,?,?,?,?,?)').run(learnerId,guardianId,'Parity Kid','10-12',10,now);
 db.prepare('INSERT INTO sessions VALUES(?,?,?,?,?)').run(createHash('sha256').update(token).digest('hex'),guardianId,learnerId,Date.now()+3600_000,now);
 return {learnerId,cookie:'kids_session='+token,posted:0};
}
let learner=newLearner();const learners=[learner];
async function submit(kind,payload){
 if(learner.posted>=30){learner=newLearner();learners.push(learner)}
 learner.posted++;
 const res=await fetch(base+'/api/activities',{method:'POST',headers:{'Content-Type':'application/json',Origin:base,Cookie:learner.cookie},body:JSON.stringify({kind,payload})});
 return {status:res.status,data:await res.json()};
}

let pass=0,fail=0;const failures=[];
const check=(name,cond,detail)=>{if(cond)pass++;else{fail++;failures.push(name);console.log('  FAIL',name,detail===undefined?'':'-> '+JSON.stringify(detail).slice(0,240))}};
async function parity(label,kind,payload,localScore,{expectFull}={}){
 const r=await submit(kind,payload);
 check(label+' accepted (201)',r.status===201,r.data);
 if(r.status!==201)return;
 check(label+' server score == frontend score',r.data.score===localScore,{server:r.data.score,local:localScore});
 if(expectFull!==undefined)check(label+' correct answer earns full marks',r.data.score===expectFull,{score:r.data.score,expected:expectFull});
}
// find the choice that the frontend's own scorer marks correct
const correctChoice=(score,range)=>{for(let c=0;c<range;c++){try{if(score(c).score>0)return c}catch{}}return null};

// 1. Age challenges: one item per age x world (all 9 ages, all 5 worlds), correct + wrong.
for(const age of challengeAges)for(const world of challengeWorlds){
 const item=ageChallenges.find(c=>c.age===age&&c.world===world);
 const right=correctChoice(choice=>scoreAgeChallenge({id:item.id,choice}),3),wrong=(right+1)%3;
 await parity(`AGE ${item.id} correct`,'AGE_CHALLENGE',{id:item.id,choice:right},1,{expectFull:1});
 await parity(`AGE ${item.id} wrong`,'AGE_CHALLENGE',{id:item.id,choice:wrong},0);
}
// 2. AI literacy topics: every topic, every level.
for(const [topic,levels] of Object.entries(aiTopics))for(let level=1;level<=levels.length;level++){
 const right=correctChoice(choice=>scoreAITopic(topic,level,choice),2);
 await parity(`AI ${topic} L${level}`,'AI_TOPIC',{topic,level,choice:right},1,{expectFull:1});
}
// 3. Thinking cases: every case.
for(const item of Object.values(thinkingCases).flat()){
 const right=correctChoice(choice=>scoreThinkingCase(item.id,choice),2);
 await parity(`THINKING ${item.id}`,'THINKING_CASE',{caseId:item.id,choice:right},1,{expectFull:1});
}
// 4. English: every track, every level. Written tracks send typed strings; others send indexes.
for(const track of englishTracks)for(let level=1;level<=3;level++){
 const lesson=englishLesson(track,level);if(!lesson)continue;
 const written=['writing','dictation'].includes(track);
 const answers=written?lesson.items.map(i=>i.target):[0,1,2];
 await parity(`EN ${track} L${level}`,'ENGLISH_SKILL',{track,level,answers},scoreEnglishSkill(track,level,answers).score,{expectFull:3});
}
// 5. Coding challenges: replay the documented hint routes and compare scores.
for(const c of codingChallenges){
 // Brute-force a valid shortest route with the frontend's own simulator (bounded by maxSteps).
 const cmds=['move','turn','left'];let found=null;
 const search=(path)=>{if(found)return;if(path.length){try{if(runCodingChallenge(c.id,path).score===1){found=path;return}}catch{}}if(path.length>=c.maxSteps)return;for(const s of cmds)search([...path,s])};
 search([]);
 check(`CODE ${c.id} solvable within maxSteps`,!!found,c.maxSteps);
 if(found)await parity(`CODE ${c.id}`,'CODE_CHALLENGE',{challengeId:c.id,steps:found},1,{expectFull:1});
}
// 6. Stories and simulations: every item, best path + comprehension.
for(const item of stories){
 const comprehension=item.answer;
 const payload={id:item.id,choices:item.scenes.map(()=>0),reflection:'I learned to check before I act.',comprehension};
 await parity(`STORY ${item.id}`,'STORY_PATH',payload,scoreNarrative('STORY_PATH',payload).score,{expectFull:1});
}
for(const item of simulations){
 const payload={id:item.id,choices:item.scenes.map(s=>s.right),reflection:'Next time I will compare the evidence.'};
 await parity(`SIM ${item.id}`,'SIMULATION_CASE',payload,scoreNarrative('SIMULATION_CASE',payload).score,{expectFull:item.scenes.length});
}
// 7. Legacy labs (labs.jsx / extra.jsx): exact frontend payload shapes.
await parity('LAB CODE_LAB','CODE_LAB',{steps:['move','move','left','move']},scoreActivity('CODE_LAB',{steps:['move','move','left','move']}).score);
await parity('LAB AI_TRUTH','AI_TRUTH',{choices:[0,0,0]},3,{expectFull:3});
await parity('LAB STORY','STORY',{choices:[0,1,0]},scoreActivity('STORY',{choices:[0,1,0]}).score);
await parity('LAB SIMULATION','SIMULATION',{choices:[0,0,0]},3,{expectFull:3});

// 8. Persistence: every accepted activity is in that learner's saved snapshot.
for(const l of learners){
 const res=await fetch(base+'/api/learners/'+l.learnerId+'/snapshot',{headers:{Cookie:l.cookie}});const snap=await res.json();
 check(`learner ${l.learnerId.slice(0,8)} snapshot has all ${l.posted} activities`,Array.isArray(snap.activities)&&snap.activities.length===l.posted,{saved:snap.activities?.length,posted:l.posted});
}
// 9. Invalid payloads are rejected, never stored.
const before=db.prepare('SELECT count(*) AS n FROM activities').get().n;
for(const [kind,payload] of [['AGE_CHALLENGE',{id:'nope',choice:0}],['AI_TOPIC',{topic:'nope',level:1,choice:0}],['ENGLISH_SKILL',{track:'writing',level:9,answers:['a','b','c']}],['STORY_PATH',{id:stories[0].id,choices:[0],reflection:'short'}],['NOT_A_KIND',{}]]){
 const r=await submit(kind,payload);check(`invalid ${kind} rejected 400`,r.status===400,r.data);
}
check('rejected payloads were not stored',db.prepare('SELECT count(*) AS n FROM activities').get().n===before);

await new Promise(r=>app.server.close(r));db.close();
console.log(`\nCONTENT PARITY RESULT: ${pass} passed, ${fail} failed (${learners.length} learner fixtures)`);
if(failures.length)console.log('Failed:',failures.slice(0,30).join(' | '));
process.exit(fail?1:0);
