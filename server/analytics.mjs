const DAY=86400000;
const utcDay=value=>new Date(value).toISOString().slice(0,10);

// A cohort is a learner's first recorded UTC day. Only mature, sufficiently
// populated cohorts are shown; rates use distinct learners, not event counts.
export function retentionCohorts(rows,now=Date.now(),minimumSize=5){
 const perLearner=new Map();
 for(const row of rows){
  const instant=Date.parse(row.at);
  if(!Number.isFinite(instant)||instant>now)continue;
  if(!perLearner.has(row.learner_id))perLearner.set(row.learner_id,new Set());
  perLearner.get(row.learner_id).add(utcDay(instant));
 }
 const cohorts=new Map();
 for(const days of perLearner.values()){
  const first=[...days].sort()[0],start=Date.parse(first+'T00:00:00Z');
  if(!cohorts.has(first))cohorts.set(first,{day:first,learners:0,day1:0,day7:0,start});
  const cohort=cohorts.get(first);cohort.learners++;
  if(days.has(utcDay(start+DAY)))cohort.day1++;
  if(days.has(utcDay(start+7*DAY)))cohort.day7++;
 }
 return [...cohorts.values()].filter(x=>x.learners>=minimumSize).sort((a,b)=>b.day.localeCompare(a.day)).slice(0,12).map(({day,learners,day1,day7,start})=>({day,learners,day1Rate:now>=start+2*DAY?Math.round(day1/learners*100):null,day7Rate:now>=start+8*DAY?Math.round(day7/learners*100):null}));
}
