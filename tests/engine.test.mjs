import {test} from 'node:test';
import assert from 'node:assert/strict';
import {missions} from '../src/data.js';
import {scoreMission,reviewIntervalDays,nextReviewAt,masteryStatus,recommendNext,xpFromEvidence,xpFromActivities,scoreActivity} from '../src/engine.js';

test('mission scoring is deterministic and rejects forged answer indices',()=>{
  assert.equal(scoreMission('coding-square',[0,1,0]).score,2);
  assert.throws(()=>scoreMission('coding-square',[0,0]),/invalid_attempt/);
  assert.throws(()=>scoreMission('coding-square',[0,0,99]),/invalid_attempt/);
});
test('incorrect answers trigger earlier review',()=>{
  assert.equal(reviewIntervalDays(2,3,3),1);
  assert.equal(reviewIntervalDays(3,3,2),3);
  assert.equal(nextReviewAt('2026-10-24T00:00:00.000Z',3,3,2),'2026-10-27T00:00:00.000Z');
});
test('mastery never follows from a single quiz or conversation',()=>{
  const one={attempts:[{missionId:'english-hello',score:3,total:3}],projects:[]};
  assert.equal(masteryStatus(one,'english'),'PRACTICING');
  assert.equal(masteryStatus({attempts:[...one.attempts,{missionId:'english-story',score:3,total:3}],projects:[]},'english'),'PRACTICING');
  assert.equal(masteryStatus({attempts:[...one.attempts,{missionId:'english-story',score:3,total:3}],projects:[{world:'english'}]},'english'),'PRACTICING');
});
test('due review wins over a new mission and rewards are bounded by best scores',()=>{
  assert.deepEqual(recommendNext({attempts:[{missionId:'coding-square',nextReviewAt:'2026-10-23T00:00:00Z'}]},new Date('2026-10-24T00:00:00Z')).type,'REVIEW');
  assert.equal(xpFromEvidence({completed:{'english-hello':3},projects:[{}]}),55);
});

test('mastery needs spaced perfect reviews and a project',()=>{
  const start='2026-01-01T00:00:00.000Z';
  const later='2026-01-03T00:00:00.000Z';
  const ids=missions.filter(m=>m.world==='english').map(m=>m.id);
  const attempts=ids.flatMap(missionId=>[
    {missionId,score:3,total:3,at:start,nextReviewAt:'2026-01-02T00:00:00.000Z'},
    {missionId,score:3,total:3,at:later,nextReviewAt:'2026-01-06T00:00:00.000Z'}
  ]);
  assert.equal(masteryStatus({attempts,projects:[]},'english',new Date(later)),'GETTING_STRONGER');
  assert.equal(masteryStatus({attempts,projects:[{world:'english'}]},'english',new Date(later)),'MASTERED');
  assert.equal(masteryStatus({attempts,projects:[{world:'english'}]},'english',new Date('2026-01-07T00:00:00.000Z')),'REVIEW_NEEDED');
});

test('activity scoring rejects invalid evidence and evaluates code route',()=>{
  assert.throws(()=>scoreActivity('CODE_LAB',{steps:['teleport']}));
  assert.deepEqual(scoreActivity('AI_TRUTH',{choices:[0,1,0]}),{score:2,total:3,world:'ai'});
  assert.deepEqual(scoreActivity('SIMULATION',{choices:[0,1,0]}),{score:2,total:3,world:'thinking'});
});

test('placement recommendation selects the assessed world and level',()=>{
 const next=recommendNext({placement:{recommendedWorld:'coding',byWorld:{coding:{level:3}}}});
 assert.equal(next.type,'PLACEMENT_START');
 assert.equal(missions.find(m=>m.id===next.missionId).level,3);
 assert.equal(missions.find(m=>m.id===next.missionId).world,'coding');
 const following=recommendNext({placement:{recommendedWorld:'coding',byWorld:{coding:{level:3}}},completed:{[next.missionId]:3}});
 assert.equal(following.type,'NEXT_IN_WORLD');
 assert.equal(missions.find(m=>m.id===following.missionId).world,'coding');
});

test('activity points follow verified scores, not just submissions',()=>{
 assert.equal(xpFromActivities([{score:0,total:3},{score:2,total:3},{score:3,total:3}]),25);
});
