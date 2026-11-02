import {test} from 'node:test';
import assert from 'node:assert/strict';
import {retentionCohorts} from '../server/analytics.mjs';

test('retention cohorts count unique learners, wait for complete days and hide small groups',()=>{
 const rows=[];
 for(let i=0;i<5;i++){
  rows.push({learner_id:'child'+i,at:'2026-01-01T12:00:00Z'});
  rows.push({learner_id:'child'+i,at:'2026-01-01T13:00:00Z'});
  if(i<3)rows.push({learner_id:'child'+i,at:'2026-01-02T09:00:00Z'});
  if(i<2)rows.push({learner_id:'child'+i,at:'2026-01-08T09:00:00Z'});
 }
 rows.push({learner_id:'alone',at:'2026-01-03T10:00:00Z'});
 assert.deepEqual(retentionCohorts(rows,Date.parse('2026-01-10T00:00:00Z')),[{day:'2026-01-01',learners:5,day1Rate:60,day7Rate:40}]);
 assert.deepEqual(retentionCohorts(rows,Date.parse('2026-01-02T12:00:00Z')),[{day:'2026-01-01',learners:5,day1Rate:null,day7Rate:null}]);
});
