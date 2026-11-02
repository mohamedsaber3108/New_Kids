import {test} from 'node:test';
import assert from 'node:assert/strict';
import {aiTopics,scoreAITopic} from '../src/ai-content.js';
import {scoreActivity} from '../src/engine.js';
test('six AI literacy topics cover three increasing levels with safe scored decisions',()=>{
 assert.equal(Object.keys(aiTopics).length,6);
 for(const [topic,levels] of Object.entries(aiTopics)){assert.equal(levels.length,3);for(let i=0;i<3;i++){const x=levels[i];assert.ok(x.ar&&x.en&&x.explainAr&&x.explainEn&&x.reflectAr&&x.reflectEn);assert.equal(x.choicesAr.length,2);assert.equal(x.choicesEn.length,2);assert.equal(scoreActivity('AI_TOPIC',{topic,level:i+1,choice:0}).score,1);assert.equal(scoreAITopic(topic,i+1,1).score,0)}}
 assert.throws(()=>scoreAITopic('unknown',1,0));assert.throws(()=>scoreAITopic('ethics',4,0));assert.throws(()=>scoreAITopic('ethics',1,3));
});
