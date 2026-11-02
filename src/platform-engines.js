import {missions,worlds} from './data.js';
import {recommendNext,xpFromActivities,xpFromEvidence} from './engine.js';

const day=value=>new Date(value).toISOString().slice(0,10);

export function learningSignals({attempts=[],activities=[],completed={},projects=[],placement=null},now=new Date()){
  const recent=[...attempts,...activities].filter(x=>now-new Date(x.at)<=7*86400000);
  const scores=recent.filter(x=>Number(x.total)>0).map(x=>Number(x.score)/Number(x.total));
  const accuracy=scores.length?scores.reduce((a,b)=>a+b,0)/scores.length:null;
  const due=attempts.filter(x=>x.nextReviewAt&&new Date(x.nextReviewAt)<=now).length;
  const recommendation=recommendNext({attempts,completed,projects,placement},now);
  const difficulty=accuracy===null?'START':accuracy<.5?'SUPPORT':accuracy>.85?'CHALLENGE':'RIGHT_FIT';
  return {
    engagement:{activeDays:new Set(recent.map(x=>day(x.at))).size,recentEvidence:recent.length},
    cognitiveLoad:{state:due>=4?'HIGH':due>=2?'WATCH':'READY',dueReviews:due},
    interleavedPractice:attempts.filter(x=>x.nextReviewAt&&new Date(x.nextReviewAt)<=now).slice(0,5).map(x=>x.missionId),
    transferOpportunities:worlds.filter(w=>completed[missions.find(m=>m.world===w.id)?.id]&&!projects.some(p=>p.world===w.id)).map(w=>({worldId:w.id,type:'PROJECT'})),
    zpd:{difficulty,accuracy:accuracy===null?null:Math.round(accuracy*100)},
    recommendation,
    growthVelocity:{evidenceLast7Days:recent.length,activeDays:new Set(recent.map(x=>day(x.at))).size},
    shouldLevelUp:accuracy!==null&&accuracy>=.85&&scores.length>=3
  };
}

export function gamificationSummary({completed={},projects=[],activities=[],attempts=[]},now=new Date()){
  const xp=xpFromEvidence({completed,projects})+xpFromActivities(activities);
  const activeDays=[...new Set([...attempts,...activities].map(x=>day(x.at)))].sort().reverse();
  let streak=0,cursor=new Date(Date.UTC(now.getUTCFullYear(),now.getUTCMonth(),now.getUTCDate()));
  if(activeDays[0]!==day(cursor))cursor=new Date(cursor-86400000);
  while(activeDays.includes(day(cursor))){streak++;cursor=new Date(cursor-86400000)}
  const completedCount=Object.keys(completed).length;
  const achievements=[
    {id:'first-step',earned:completedCount>=1,progress:Math.min(completedCount,1),target:1},
    {id:'world-walker',earned:completedCount>=5,progress:Math.min(completedCount,5),target:5},
    {id:'maker',earned:projects.length>=1,progress:Math.min(projects.length,1),target:1},
    {id:'evidence-builder',earned:attempts.length+activities.length>=10,progress:Math.min(attempts.length+activities.length,10),target:10}
  ];
  return {xp,level:Math.floor(xp/250)+1,nextLevelXp:(Math.floor(xp/250)+1)*250,streak,achievements,coins:Math.floor(xp/25)};
}

export function dailyGoalProgress(goal,evidence,now=new Date()){
  const today=day(now),count=new Set(evidence.filter(x=>day(x.at)===today).map(x=>x.missionId||x.id)).size,target=goal?.target||2;
  return {date:today,count,target,remaining:Math.max(0,target-count),met:count>=target};
}
