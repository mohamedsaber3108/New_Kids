import {test} from 'node:test';
import assert from 'node:assert/strict';
import {placementQuestions,scorePlacement} from '../src/placement.js';

test('placement covers five worlds and respects age guidance without locking content',()=>{
 assert.equal(placementQuestions.length,10);
 const correct=placementQuestions.map(q=>q.answer);
 const young=scorePlacement(correct,'7-9');
 assert.equal(young.totalCorrect,10);
 assert.ok(Object.values(young.byWorld).every(r=>r.level===2));
 const older=scorePlacement(correct,'13-15');
 assert.ok(Object.values(older.byWorld).every(r=>r.level===3));
 assert.equal(scorePlacement(correct.map((n,i)=>i===0?(n+1)%3:n),'10-12').byWorld.english.level,2);
 assert.throws(()=>scorePlacement([1,2],'10-12'));
 assert.throws(()=>scorePlacement(correct.map((n,i)=>i===0?99:n),'10-12'));
});
