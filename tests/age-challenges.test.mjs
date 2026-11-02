import {test} from 'node:test';
import assert from 'node:assert/strict';
import {ageChallenges,challengeAges,challengeWorlds,getAgeChallenge,scoreAgeChallenge} from '../src/age-challenges.js';
import {scoreActivity} from '../src/engine.js';
test('nine single-year paths each contain 100 distinct scored bilingual challenges',()=>{
 assert.equal(ageChallenges.length,900);
 assert.equal(new Set(ageChallenges.map(c=>c.id)).size,900);
 assert.equal(new Set(ageChallenges.map(c=>c.questionAr)).size,900);
 assert.equal(new Set(ageChallenges.map(c=>c.questionEn)).size,900);
 for(const age of challengeAges){const ageSet=ageChallenges.filter(c=>c.age===age);assert.equal(ageSet.length,100);for(const world of challengeWorlds)assert.equal(ageSet.filter(c=>c.world===world).length,20)}
 for(const c of ageChallenges){assert.ok(c.questionAr&&c.questionEn&&c.hintAr&&c.hintEn&&c.explainAr&&c.explainEn);assert.equal(c.optionsAr.length,3);assert.equal(c.optionsEn.length,3);assert.ok(c.optionsAr.every(Boolean)&&c.optionsEn.every(Boolean));assert.ok(c.answer>=0&&c.answer<3);assert.equal(getAgeChallenge(c.id),c);assert.equal(scoreActivity('AGE_CHALLENGE',{id:c.id,choice:c.answer}).score,1);assert.equal(scoreAgeChallenge({id:c.id,choice:(c.answer+1)%3}).score,0)}
 assert.throws(()=>scoreAgeChallenge({id:'fake',choice:0}));assert.throws(()=>scoreAgeChallenge({id:ageChallenges[0].id,choice:4}));
});
