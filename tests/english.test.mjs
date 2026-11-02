import {test} from 'node:test';
import assert from 'node:assert/strict';
import {englishSkillContent,englishLesson,scoreEnglishSkill} from '../src/english-content.js';
import {scoreActivity} from '../src/engine.js';
test('eleven English skills have three distinct levels and server-scored activities',()=>{
 const skills=Object.keys(englishSkillContent);assert.equal(skills.length,11);
 for(const skill of skills){assert.equal(englishSkillContent[skill].length,3);
  for(let level=1;level<=3;level++){const lesson=englishLesson(skill,level);assert.equal(lesson.items.length,3);assert.ok(lesson.ar&&lesson.en);assert.equal(new Set(lesson.items.map(x=>x.target)).size,3);
   const answers=['writing','dictation'].includes(skill)?lesson.items.map(x=>x.target):[0,1,2];
   assert.equal(scoreActivity('ENGLISH_SKILL',{track:skill,level,answers}).score,3);
  }
 }
 assert.throws(()=>scoreEnglishSkill('speaking',2,[99,99,99]));
 assert.throws(()=>scoreEnglishSkill('dictation',1,['word']));
 assert.equal(scoreEnglishSkill('writing',1,['i LIKE BOOKS','We make a game!','This is my idea']).score,3);
});
