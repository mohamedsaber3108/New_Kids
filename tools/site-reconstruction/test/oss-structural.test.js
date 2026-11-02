import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import zlib from 'node:zlib';
import {saveStructuralMap,summarizeStructure} from '../src/structural-map.js';
import {auditPageA11y,parseArticleOffline,analyzeCSSAst,summarizeOSS,extractPageArticle} from '../src/oss-adapters.js';

const tmp=()=>fs.mkdtemp(path.join(os.tmpdir(),'srt-v32-'));

test('structural layout views are compressed and preserve parent IDs, not secrets', async()=>{
  const out=await tmp();
  try{
    const map={totalCaptured:2,visibleCaptured:2,skippedDueToLimit:0,viewport:{width:390,height:844},nodes:[
      {id:0,parent:null,tag:'body',label:null},{id:1,parent:0,tag:'h1',label:'Hello'}]};
    const info=await saveStructuralMap(map,{outDir:out,pageIndex:8,viewport:'mobile'});
    assert.equal(info.file,'layout/0008-mobile.json.gz');
    const saved=JSON.parse(zlib.gunzipSync(await fs.readFile(path.join(out,info.file))));
    assert.equal(saved.nodes[1].parent,0);
    const sum=summarizeStructure([{url:'https://example.com/',structuralMaps:[info]}]);
    assert.equal(sum.views,1);assert.equal(sum.items[0].visible,2);
  }finally{await fs.rm(out,{recursive:true,force:true});}
});

test('axe adapter returns a safe summarized report without node HTML',async()=>{
  let added=false;
  const p={addScriptTag:async({path})=>{added=path==='fixture-axe';},evaluate:async()=>({violations:[{id:'color-contrast',impact:'serious',nodes:2,selectors:['.intro']}],passes:5,incomplete:0,notApplicable:2})};
  const x=await auditPageA11y(p,{axePath:'fixture-axe'});
  assert.equal(x.status,'analyzed');assert.ok(added);assert.equal(x.violations[0].id,'color-contrast');
  assert.equal(x.violations[0].html,undefined);
});

test('article reader uses injected open source implementations and non-editorial pages are skipped',async()=>{
  class MockDOM{constructor(html){this.window={document:{querySelectorAll:()=>[],text:html},close:()=>{}};}}
  class MockReader{constructor(doc){this.doc=doc;}parse(){return{title:'Example',textContent:'Article',length:7,excerpt:'Lead',byline:'Author'};}}
  const result=await parseArticleOffline('<article>Article</article>','https://example.com/blog/test',{Readability:MockReader,JSDOM:MockDOM});
  assert.equal(result.status,'extracted');assert.equal(result.text,'Article');
  const skip=await extractPageArticle({evaluate:()=>{throw Error('should not execute');}},'https://example.com/home');
  assert.equal(skip.status,'skipped-non-editorial');
});

test('PostCSS integration only reads already archived CSS and reports failures per file',async()=>{
  const out=await tmp();
  try{
    await fs.mkdir(path.join(out,'public-source'));
    await fs.writeFile(path.join(out,'public-source','style.css'),'body{color:red}');
    const mock={parse:()=>({walkRules:f=>f({selector:'body',selectors:['body']}),
      walkAtRules:f=>{f({name:'media',params:'(max-width: 600px)'});f({name:'keyframes',params:'spin'});},
      walkDecls:f=>{f({prop:'--brand',value:'#12aabb'});f({prop:'color',value:'red'});}})};
    const a=await analyzeCSSAst({outDir:out,archive:{files:[{type:'css',status:'downloaded',url:'https://example.com/style.css',file:'public-source/style.css'},
      {type:'javascript',status:'downloaded',file:'public-source/app.js'}]},postcss:mock});
    assert.equal(a.files.length,1);assert.equal(a.files[0].declarations,2);
    assert.equal(a.files[0].variables['--brand'],'#12aabb');
  }finally{await fs.rm(out,{recursive:true,force:true});}
});

test('OSS coverage never confuses missing packages or private backend with scanned evidence',()=>{
 const p=[{url:'https://example.org/',openSourceEvidence:{accessibility:{status:'unavailable'},article:{status:'not-article'}}}];
 const r=summarizeOSS(p,{status:'off',files:[]});
 assert.equal(r.totals.axeUnavailable,1);assert.equal(r.totals.axeAnalyzed,0);
 assert.equal(r.cssAst.analyzedFiles,0);
});
