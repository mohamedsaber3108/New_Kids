import {test} from 'node:test';
import assert from 'node:assert/strict';
import {companions,worlds,missions,projectPrompts,masteryForWorld} from '../src/data.js';

test('every learning world has a guide and playable missions',()=>{
  assert.equal(worlds.length,5);
  assert.equal(companions.length,15);
  for(const world of worlds){
    assert.ok(companions.some(c=>c.id===world.companion),world.id);
    assert.ok(missions.some(m=>m.world===world.id),world.id);
  }
});
test('mission content is bilingual and every answer has a valid index',()=>{
  assert.equal(new Set(missions.map(m=>m.id)).size,missions.length);
  for(const mission of missions){
    assert.ok(mission.ar&&mission.en&&mission.objectiveAr&&mission.objectiveEn);
    assert.ok(mission.questions.length>=3,mission.id);
    assert.ok([1,2,3].includes(mission.level),mission.id);
    for(const q of mission.questions){
      assert.equal(q.optionsAr.length,q.optionsEn.length);
      assert.ok(q.answer>=0&&q.answer<q.optionsAr.length);
      assert.ok(q.hintAr&&q.hintEn&&q.explainAr&&q.explainEn);
    }
  }
});
test('world completion reflects recorded evidence without claiming mastery',()=>{
  const total=missions.filter(m=>m.world==='english').length;
  assert.deepEqual(masteryForWorld('english',{}),{done:0,total,percent:0});
  assert.deepEqual(masteryForWorld('english',{'english-hello':3}),{done:1,total,percent:Math.round(100/total)});
  const all=Object.fromEntries(missions.filter(m=>m.world==='english').map(m=>[m.id,3]));
  assert.deepEqual(masteryForWorld('english',all),{done:total,total,percent:100});
});
test('project prompts refer to real worlds',()=>{
  for(const prompt of projectPrompts)assert.ok(worlds.some(w=>w.id===prompt.world));
});

test('each world offers every level and authored lesson content',()=>{
 for(const world of worlds)for(const level of [1,2,3]){
  const lessons=missions.filter(m=>m.world===world.id&&m.level===level);
  assert.ok(lessons.length,world.id+' level '+level);
  assert.ok(lessons.some(m=>m.lessonAr&&m.lessonEn&&m.exampleAr&&m.exampleEn&&m.challengeAr&&m.challengeEn),world.id+' level '+level);
 }
});
