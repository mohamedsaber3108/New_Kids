import {test} from 'node:test';
import assert from 'node:assert/strict';
import {thinkingCases,scoreThinkingCase} from '../src/thinking-content.js';
import {scoreActivity} from '../src/engine.js';
test('thinking tracks include nine bilingual decisions across three levels',()=>{
 assert.equal(Object.keys(thinkingCases).length,3);
 for(const cases of Object.values(thinkingCases)){assert.deepEqual(cases.map(x=>x.level),[1,2,3]);for(const x of cases){assert.ok(x.ar&&x.en&&x.explainAr&&x.explainEn);assert.equal(scoreActivity('THINKING_CASE',{caseId:x.id,choice:0}).score,1);assert.equal(scoreThinkingCase(x.id,1).score,0)}}
 assert.throws(()=>scoreThinkingCase('unknown',0));assert.throws(()=>scoreThinkingCase('critical-1',9));
});
