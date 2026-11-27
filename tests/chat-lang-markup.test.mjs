// Judge b58 (UX): chat bubbles and the refusal line carry dir="auto" and a lang attribute in the markup,
// and the refusal line uses the API's lang value when it is present.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {textLang} from '../src/text-lang.js';

const read=file=>readFileSync(new URL('../src/'+file,import.meta.url),'utf8');

test('textLang: Arabic letters give ar, anything else en',()=>{
 assert.equal(textLang('خلينا نحافظ على أسرارك.'),'ar');
 assert.equal(textLang("Let's keep private things private."),'en');
 assert.equal(textLang(''),'en');
 assert.equal(textLang(undefined),'en');
});

test('guide page: bubbles and refusal line have dir=auto and lang in the markup',()=>{
 const src=read('companions.jsx');
 assert.ok(src.includes('<div className="chat-message mine" dir="auto" lang={textLang(m.message)}>'),'child bubble');
 assert.ok(src.includes('<div className="chat-message guide" dir="auto" lang={textLang(m.reply)}>'),'guide bubble');
 assert.ok(src.includes('<p className="form-error" role="alert" dir="auto" lang={errorLang||textLang(error)}>'),'refusal line');
 assert.ok(src.includes('setErrorLang(r.lang||textLang(reply))'),'refusal lang comes from the API value');
});

test('floating chat: bubbles have dir=auto and lang; reply lang comes from the API value',()=>{
 const src=read('main.jsx');
 assert.ok(src.includes('<div className="chat-message mine" dir="auto" lang={textLang(query)}>'),'child bubble');
 assert.ok(src.includes('dir="auto" lang={chatLang||textLang(chatReply||helperResponse(query))}'),'guide bubble');
 assert.ok(src.includes('setChatLang(result.lang||null)'),'reply lang from the API');
});
