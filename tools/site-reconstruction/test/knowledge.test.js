import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {buildKnowledge,identifyGaps,exportKnowledge} from '../src/knowledge.js';
import {runEnrichment} from '../src/integrations.js';
const fixture={schemaVersion:'2.0',startUrl:'https://example.com/',coverage:{pendingQueue:8,sitemapRoutes:0},
 pages:[{url:'https://example.com/',status:'inspected',title:'Home',source:'start',depth:0,
  evidence:{headings:[{tag:'h1',text:'Play and learn'}],cssVariables:{'--brand':'#123456'},assets:[{url:'https://example.com/hero.png',tag:'img'}],links:[{href:'https://example.com/about',text:'About'}],frequent:{}},
  deepEvidence:{mainText:'Learn through play',sections:[{tag:'section',label:'Hero',selector:'main > section',bounds:{y:20,width:1440,height:500},text:'Play and learn'}],images:[{src:'https://example.com/hero.png',alt:'A character'}]},
  telemetry:{desktop:{failed:[],errors:[]}},screenshots:[]}]};

test('knowledge graph preserves routes, assets and structured tokens',()=>{
 const r=buildKnowledge(fixture.pages,fixture.coverage);
 assert.equal(r.summary.inspected,1);
 assert.equal(r.summary.pagesWithDeepEvidence,1);
 assert.equal(r.assets.length,1);
 assert.equal(r.assets[0].pages[0],fixture.pages[0].url);
 assert.equal(r.tokens[0].name,'--brand');
 assert.equal(r.missingLinks[0].url,'https://example.com/about');
 const gaps=identifyGaps(r,{hasScreenshots:false});
 assert.ok(gaps.some(x=>x.code==='PENDING_ROUTES'));
 assert.ok(gaps.some(x=>x.code==='UNOBSERVED_INTERACTIONS'));
});

test('offline package export adds deep docs without removing original MD',async()=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'srt-knowledge-'));
 try{
   await fs.writeFile(path.join(dir,'evidence.json'),JSON.stringify(fixture));
   await fs.writeFile(path.join(dir,'AGENTS.md'),'# Original agent instructions\n');
   await fs.writeFile(path.join(dir,'DESIGN.md'),'# Original design observations\n');
   const result=await exportKnowledge(dir);
   assert.equal(result.files,1);
   for(const name of ['ROUTE_GRAPH.json','ASSET_MAP.json','DESIGN_TOKENS.json','CONTENT_INDEX.json','COMPONENT_REGISTRY.json','QUALITY_GATES.md','GAPS.md','ARCHITECTURE.md','AGENT_HANDOFF.md','KIRO_IMPLEMENTATION_PROMPT.md','MOTION_AND_STATES.md'])
     assert.ok((await fs.stat(path.join(dir,name))).size>10,name);
   assert.match(await fs.readFile(path.join(dir,'DESIGN.md'),'utf8'),/Original design/);
   assert.match(await fs.readFile(path.join(dir,'AGENTS.md'),'utf8'),/Original agent instructions/);
   const index=JSON.parse(await fs.readFile(path.join(dir,'CONTENT_INDEX.json'),'utf8'));
   assert.ok((await fs.readFile(path.join(dir,index.pages[0].pageFile),'utf8')).includes('Play and learn'));
   assert.match(await fs.readFile(path.join(dir,'QUALITY_GATES.md'),'utf8'),/INCOMPLETE/);
 }finally{await fs.rm(dir,{recursive:true,force:true});}
});

test('designlang adapter imports an existing JSON output with provenance',async()=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'srt-integrations-'));
 try{
  const file=path.join(dir,'designlang.json');await fs.writeFile(file,JSON.stringify({tokens:{color:'green'}}));
  const r=await runEnrichment({reference:dir,provider:'designlang',input:file});
  assert.equal(r.imported,1);
  const obj=JSON.parse(await fs.readFile(path.join(dir,'enrichment/designlang/import.json'),'utf8'));
  assert.equal(obj.data.tokens.color,'green');
 }finally{await fs.rm(dir,{recursive:true,force:true});}
});
