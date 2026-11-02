import {test} from 'node:test';
import assert from 'node:assert/strict';
import {stories,simulations} from '../src/narratives.js';
import {scoreActivity} from '../src/engine.js';

test('authored stories branch in three bilingual scenes and grade comprehension alone',()=>{
 assert.equal(stories.length,3);
 for(const story of stories){assert.equal(story.scenes.length,3);assert.ok(story.introAr&&story.introEn&&story.questionAr&&story.questionEn);for(const scene of story.scenes){assert.equal(scene.choices.length,2);assert.ok(scene.choices.every(c=>c.every(x=>typeof x==='string'&&x.length>4)))}
 const correct=scoreActivity('STORY_PATH',{id:story.id,choices:[1,0,1],comprehension:story.answer,reflection:'I learned to check the clues.'});assert.deepEqual(correct,{score:1,total:1,world:story.world});
 assert.equal(scoreActivity('STORY_PATH',{id:story.id,choices:[0,1,0],comprehension:1-story.answer,reflection:'I chose a different ending.'}).score,0)}
 assert.throws(()=>scoreActivity('STORY_PATH',{id:stories[0].id,choices:[0],comprehension:0,reflection:'I learned something.'}),/invalid_activity/);
});
test('simulations score decisions and reject forged IDs or answers',()=>{
 assert.equal(simulations.length,3);
 for(const item of simulations){assert.equal(item.scenes.length,3);assert.ok(item.scenes.every(s=>s.choices.length===2&&s.consequenceAr.length===2&&s.consequenceEn.length===2));assert.equal(scoreActivity('SIMULATION_CASE',{id:item.id,choices:[0,0,0],reflection:'I will test a small change first.'}).score,3)}
 assert.throws(()=>scoreActivity('SIMULATION_CASE',{id:'not-real',choices:[0,0,0],reflection:'A careful thought.'}),/invalid_activity/);
 assert.throws(()=>scoreActivity('SIMULATION_CASE',{id:simulations[0].id,choices:[0,2,0],reflection:'A careful thought.'}),/invalid_activity/);
});
