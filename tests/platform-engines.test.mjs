import {test} from 'node:test';
import assert from 'node:assert/strict';
import {dailyGoalProgress,gamificationSummary,learningSignals} from '../src/platform-engines.js';
import {scoreActivity} from '../src/engine.js';

test('creative branch choices are completion evidence and never forged mastery scores',()=>{
  assert.deepEqual(scoreActivity('STORY',{choices:[0,1,0]}),{score:0,total:0,world:'creativity',completionOnly:true});
  assert.throws(()=>scoreActivity('STORY',{choices:[0,7,0]}),/invalid_activity/);
});

test('adaptive signals use recent evidence, due reviews and transfer opportunities',()=>{
  const now=new Date('2026-10-26T12:00:00Z');
  const state={attempts:[{missionId:'english-hello',score:3,total:3,at:'2026-10-25T12:00:00Z',nextReviewAt:'2026-10-26T10:00:00Z'}],activities:[],completed:{'english-hello':3},projects:[],placement:null};
  const signals=learningSignals(state,now);
  assert.equal(signals.cognitiveLoad.dueReviews,1);
  assert.equal(signals.recommendation.type,'REVIEW');
  assert.equal(signals.growthVelocity.activeDays,1);
});

test('gamification is deterministic and daily goal counts distinct evidence',()=>{
  const now=new Date('2026-10-26T12:00:00Z'),evidence=[{id:'a',missionId:'m1',at:'2026-10-26T08:00:00Z'},{id:'b',missionId:'m1',at:'2026-10-26T09:00:00Z'},{id:'c',missionId:'m2',at:'2026-10-26T10:00:00Z'}];
  assert.deepEqual(dailyGoalProgress({target:2},evidence,now),{date:'2026-10-26',count:2,target:2,remaining:0,met:true});
  const summary=gamificationSummary({completed:{m1:3},projects:[],activities:[],attempts:evidence},now);
  assert.equal(summary.xp,30);
  assert.equal(summary.coins,1);
});
