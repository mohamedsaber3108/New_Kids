export async function api(path,{method='GET',body}={}){
  const response=await fetch('/api'+path,{method,credentials:'same-origin',headers:body?{'Content-Type':'application/json'}:{},body:body?JSON.stringify(body):undefined});
  const type=response.headers.get('content-type')||'';
  if(!type.includes('application/json'))throw new Error('api_unavailable');
  const data=await response.json();
  if(!response.ok)throw new Error(data.error||'request_failed');
  return data;
}
// Browser-only demo (progress kept in localStorage) is for local development. Production builds
// never fall back to it silently, because a child's work would look saved but never reach the server.
// A deliberate demo deployment can opt in with VITE_DEMO_MODE=true at build time.
const env=import.meta.env||{};
export const demoAllowed=!env.PROD||env.VITE_DEMO_MODE==='true';
export async function detectApi({attempts=1,delay=1500}={}){
  for(let i=0;i<attempts;i++){
    try{const h=await api('/health');if(h.ok&&h.service==='usam-kids-api')return true}catch{}
    if(i<attempts-1)await new Promise(r=>setTimeout(r,delay*(i+1)));
  }
  return false;
}
export function fromSnapshot(snapshot){
  return {
    nickname:snapshot.learner.nickname,ageBand:snapshot.learner.age_band,ageYear:snapshot.learner.age_year,started:true,
    completed:snapshot.completed,evidence:snapshot.evidence,projects:snapshot.projects,attempts:snapshot.attempts,activities:snapshot.activities,sessionRuns:snapshot.sessions||[],mastery:snapshot.mastery,placement:snapshot.placement,preferences:snapshot.preferences,controls:snapshot.controls,timeLimits:snapshot.timeLimits,dailyGoal:snapshot.dailyGoal?.target||2,dailyGoalProgress:snapshot.dailyGoalProgress,gamification:snapshot.gamification,onboarded:!!snapshot.preferences?.completed,activeCompanion:snapshot.preferences?.companion||'azouz'
  };
}
