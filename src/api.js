export async function api(path,{method='GET',body}={}){
  const response=await fetch('/api'+path,{method,credentials:'same-origin',headers:body?{'Content-Type':'application/json'}:{},body:body?JSON.stringify(body):undefined});
  const type=response.headers.get('content-type')||'';
  if(!type.includes('application/json'))throw new Error('api_unavailable');
  const data=await response.json();
  if(!response.ok)throw new Error(data.error||'request_failed');
  return data;
}
export async function detectApi(){
  try{const h=await api('/health');return h.ok&&h.service==='usam-kids-api'}catch{return false}
}
export function fromSnapshot(snapshot){
  return {
    nickname:snapshot.learner.nickname,ageBand:snapshot.learner.age_band,ageYear:snapshot.learner.age_year,started:true,
    completed:snapshot.completed,evidence:snapshot.evidence,projects:snapshot.projects,attempts:snapshot.attempts,activities:snapshot.activities,sessionRuns:snapshot.sessions||[],mastery:snapshot.mastery,placement:snapshot.placement,preferences:snapshot.preferences,controls:snapshot.controls,timeLimits:snapshot.timeLimits,dailyGoal:snapshot.dailyGoal?.target||2,dailyGoalProgress:snapshot.dailyGoalProgress,gamification:snapshot.gamification,onboarded:!!snapshot.preferences?.completed,activeCompanion:snapshot.preferences?.companion||'azouz'
  };
}
