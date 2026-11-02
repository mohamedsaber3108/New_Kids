import {missions,worlds} from './data.js';
import {scoreEnglishSkill} from './english-content.js';
import {scoreAITopic} from './ai-content.js';
import {runCodingChallenge} from './coding-content.js';
import {scoreThinkingCase} from './thinking-content.js';
import {scoreNarrative} from './narratives.js';
import {scoreAgeChallenge} from './age-challenges.js';

export const DAY=86_400_000;
export function scoreMission(missionId,answers){
  const mission=missions.find(m=>m.id===missionId);
  if(!mission||!Array.isArray(answers)||answers.length!==mission.questions.length||answers.some((a,i)=>!Number.isInteger(a)||a<0||a>=mission.questions[i].optionsEn.length))throw new Error('invalid_attempt');
  const detail=answers.map((choice,i)=>({question:i,choice,correct:choice===mission.questions[i].answer}));
  return {missionId,score:detail.filter(d=>d.correct).length,total:detail.length,detail,world:mission.world,skill:mission.skillEn};
}

export function reviewIntervalDays(score,total,attemptNumber){
  if(score<total)return 1;
  return [1,3,7,14][Math.min(Math.max(attemptNumber-1,0),3)];
}

export function nextReviewAt(at,score,total,attemptNumber){
  return new Date(new Date(at).getTime()+reviewIntervalDays(score,total,attemptNumber)*DAY).toISOString();
}

export function masteryStatus({attempts=[],projects=[]},worldId,now=new Date()){
  const ms=missions.filter(m=>m.world===worldId);
  if(!ms.length)return 'LEARNING';
  const relevant=attempts.filter(a=>ms.some(m=>m.id===a.missionId));
  if(!relevant.length)return 'LEARNING';
  const completed=new Set(relevant.filter(a=>a.score===a.total).map(a=>a.missionId));
  const latest=ms.map(m=>relevant.filter(a=>a.missionId===m.id).sort((a,b)=>new Date(b.at)-new Date(a.at))[0]).filter(Boolean);
  const due=latest.some(a=>a.nextReviewAt&&new Date(a.nextReviewAt)<=now);
  const hasProject=projects.some(p=>p.world===worldId);
  const hasVariety=completed.size===ms.length&&hasProject;
  const reviewed=ms.every(m=>{const tries=relevant.filter(a=>a.missionId===m.id&&a.score===a.total).sort((a,b)=>new Date(a.at)-new Date(b.at));return tries.length>=2&&new Date(tries.at(-1).at)-new Date(tries[0].at)>=DAY});
  if(hasVariety&&due)return 'REVIEW_NEEDED';
  if(hasVariety&&reviewed)return 'MASTERED';
  if(hasVariety)return 'ALMOST_MASTERED';
  if(completed.size===ms.length)return 'GETTING_STRONGER';
  return 'PRACTICING';
}

export function recommendNext({attempts=[],completed={},projects=[],placement=null},now=new Date()){
  const latest=Object.values(Object.groupBy([...attempts].sort((a,b)=>new Date(b.at)-new Date(a.at)),a=>a.missionId)).map(group=>group[0]);
  const due=latest.filter(a=>a.nextReviewAt&&new Date(a.nextReviewAt)<=now).sort((a,b)=>new Date(a.nextReviewAt)-new Date(b.nextReviewAt))[0];
  if(due)return {type:'REVIEW',missionId:due.missionId,reason:'Review is due to keep the skill strong'};
  if(placement){const world=placement.recommendedWorld,level=placement.byWorld?.[world]?.level||1;const ordered=[level,...[1,2,3].filter(n=>n>level),...[1,2,3].filter(n=>n<level).reverse()];const recommended=ordered.flatMap(n=>missions.filter(m=>m.world===world&&m.level===n)).find(m=>!completed[m.id]);if(recommended)return {type:Object.keys(completed).length===0?'PLACEMENT_START':'NEXT_IN_WORLD',missionId:recommended.id,reason:'Continue the world suggested by your starting assessment'}}
  const incomplete=missions.find(m=>!completed[m.id]);
  if(incomplete)return {type:'NEW_MISSION',missionId:incomplete.id,reason:'A new step in your learning path'};
  const withoutProject=worlds.find(w=>!projects.some(p=>p.world===w.id));
  if(withoutProject)return {type:'PROJECT',worldId:withoutProject.id,reason:'Show what you learned by making something'};
  return {type:'EXPLORE',worldId:worlds[0].id,reason:'Choose a new challenge'};
}

export function xpFromEvidence({completed={},projects=[]}){
  return Object.values(completed).reduce((sum,n)=>sum+Math.max(0,Number(n)||0)*10,0)+projects.length*25;
}

export function xpFromActivities(activities=[]){return activities.reduce((sum,a)=>sum+Math.round(15*Math.max(0,Number(a.score)||0)/Math.max(1,Number(a.total)||1)),0)}

export function scoreActivity(kind,payload){
  if(kind==='AGE_CHALLENGE')return scoreAgeChallenge(payload);
  if(kind==='STORY_PATH'||kind==='SIMULATION_CASE')return scoreNarrative(kind,payload);
  if(kind==='ENGLISH_SKILL')return scoreEnglishSkill(payload?.track,payload?.level,payload?.answers);
  if(kind==='AI_TOPIC')return scoreAITopic(payload?.topic,payload?.level,payload?.choice);
  if(kind==='CODE_CHALLENGE')return runCodingChallenge(payload?.challengeId,payload?.steps);
  if(kind==='THINKING_CASE')return scoreThinkingCase(payload?.caseId,payload?.choice);
  if(kind==='CODE_LAB'){
    const steps=payload?.steps;
    if(!Array.isArray(steps)||steps.length<1||steps.length>9||steps.some(s=>!['move','turn','left'].includes(s)))throw new Error('invalid_activity');
    let x=0,y=2,d=1;
    for(const step of steps){if(step==='turn')d=(d+1)%4;else if(step==='left')d=(d+3)%4;else if(d===0)y=Math.max(0,y-1);else if(d===1)x=Math.min(3,x+1);else if(d===2)y=Math.min(3,y+1);else x=Math.max(0,x-1)}
    return {score:x===2&&y===1?1:0,total:1,world:'coding'};
  }
  if(kind==='AI_TRUTH'){
    const choices=payload?.choices;
    if(!Array.isArray(choices)||choices.length!==3||choices.some(c=>!Number.isInteger(c)||c<0||c>1))throw new Error('invalid_activity');
    return {score:choices.filter(c=>c===0).length,total:3,world:'ai'};
  }
  if(kind==='SIMULATION'){
    const choices=payload?.choices;
    if(!Array.isArray(choices)||choices.length!==3||choices.some(c=>!Number.isInteger(c)||c<0||c>1))throw new Error('invalid_activity');
    return {score:choices.filter(c=>c===0).length,total:3,world:'thinking'};
  }
  if(kind==='STORY'){
    const choices=payload?.choices;
    if(!Array.isArray(choices)||choices.length!==3||choices.some(c=>!Number.isInteger(c)||c<0||c>1))throw new Error('invalid_activity');
    // Branch choices are creative decisions, not correct answers. Keep the
    // completion as evidence without turning it into a mastery score.
    return {score:0,total:0,world:'creativity',completionOnly:true};
  }
  throw new Error('invalid_activity');
}
