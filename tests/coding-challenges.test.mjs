import {test} from 'node:test';
import assert from 'node:assert/strict';
import {codingChallenges,runCodingChallenge} from '../src/coding-content.js';
import {scoreActivity} from '../src/engine.js';
test('coding challenges simulate bounded programs and grade three routes',()=>{
 assert.equal(codingChallenges.length,3);
 const solutions={ 'straight-path':['move','move'], 'corner-turn':['move','move','left','move','move'], 'route-plan':['move','move','move','left','move','move','move']};
 for(const c of codingChallenges){const result=scoreActivity('CODE_CHALLENGE',{challengeId:c.id,steps:solutions[c.id]});assert.equal(result.score,1);assert.deepEqual(result.position.x,c.goal.x);assert.deepEqual(result.position.y,c.goal.y)}
 assert.equal(runCodingChallenge('straight-path',['move']).score,0);
 assert.throws(()=>runCodingChallenge('route-plan',['move','move','move','left','move','move','move','move']));
 assert.throws(()=>runCodingChallenge('straight-path',['eval']));
});
