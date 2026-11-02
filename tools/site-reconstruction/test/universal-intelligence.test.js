import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {buildUniversalIntelligence,writeUniversalIntelligence} from '../src/universal-intelligence.js';
import {exportKnowledge} from '../src/knowledge.js';

const site='https://test.example';
const fixture={startUrl:site+'/',coverage:{pendingQueue:0,sitemapRoutes:2},pages:[
  {url:site+'/',status:'inspected',title:'A generic shop',depth:0,source:'start',
   evidence:{headings:[{tag:'h1',text:'Browse items'}],links:[{text:'Browse',href:site+'/browse'}],
    forms:[{method:'get',fields:[{type:'search',name:'searchQuery',placeholder:'Find products',required:false}]}],cssVariables:{'--accent':'#ff9900'},assets:[],frequent:{}},
   deepEvidence:{sections:[{tag:'section',label:'Hero',selector:'body>main>section',bounds:{x:0,y:0,width:900,height:400}}],
    controls:[{tag:'button',label:'Show filters',role:'button',selector:'#filter',ariaExpanded:'false'},
      {tag:'a',label:'Browse',href:site+'/browse',selector:'#browse'}]},
   telemetry:{desktop:{requests:[
    {url:site+'/api/products?access_token=SENSITIVE',method:'GET',resourceType:'fetch'},
    {url:site+'/api/products/345678901/detail?user=private',method:'GET',resourceType:'xhr'},
    {url:site+'/auth/refresh/privateSecret?x=1',method:'POST',resourceType:'fetch'},
    {url:site+'/analytics?event=user',method:'GET',resourceType:'image'}
   ],failed:[],errors:[]}},screenshots:[]},
  {url:site+'/browse',status:'inspected',title:'Browse',depth:1,source:'link',
   evidence:{headings:[{tag:'h1',text:'Browse'}],links:[],assets:[],cssVariables:{},frequent:{}},
   deepEvidence:{sections:[],controls:[{tag:'button',label:'Show filters',role:'button',selector:'#filter',ariaExpanded:'false'}]},
   telemetry:{desktop:{requests:[],failed:[],errors:[]}},screenshots:[]}
]};

test('site-agnostic relationship and user journey graph faithfully describe observed evidence',()=>{
 const d=buildUniversalIntelligence(fixture);
 assert.equal(d.capturedPages,2);
 assert.equal(d.pages.length,2);
 assert.ok(d.features.some(f=>f.name==='Show filters'&&f.pages.length===2));
 assert.ok(d.journeys.some(j=>j.from===site+'/'&&j.to===site+'/browse'&&j.clickedAndValidated===false));
 assert.ok(d.relationshipGraph.edges.some(e=>e.relation==='co-observed-on-page'&&e.evidence==='correlation-not-causation'));
 assert.equal(d.forms.length,1);
 assert.ok(d.conceptHints.every(c=>c.confirmedBackendEntity===false));
});

test('API inventory only uses passive request metadata and redacts sensitive paths and queries',()=>{
 const d=buildUniversalIntelligence(fixture);
 assert.equal(d.apiSurface.length,2);
 const out=JSON.stringify(d.apiSurface);
 assert.doesNotMatch(out,/SENSITIVE|privateSecret|access_token|user=private|auth\/refresh|analytics/);
 assert.match(out,/\/api\/products\/:id\/detail/);
 assert.ok(d.apiSurface.every(x=>x.publicContractVerified===false&&x.responseSchema===null));
});

test('generic package writes universal prompt without hardcoded destination; preserves legacy reports',async()=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'srt-universal-'));
 try{
  await fs.writeFile(path.join(dir,'evidence.json'),JSON.stringify(fixture));
  await fs.writeFile(path.join(dir,'DESIGN.md'),'# Keep original design report\n');
  const summary=await exportKnowledge(dir,{targetUrl:'https://newsite.example',brand:'Northern Studio'});
  assert.ok(summary.featureCandidates>=2);
  for(const file of ['FEATURE_INVENTORY.json','API_SURFACE.json','SITE_INTELLIGENCE.json','USER_JOURNEYS.json',
   'DOMAIN_MODEL_HINTS.json','RELATIONSHIP_GRAPH.json','FUNCTIONAL_BLUEPRINT.md','IMPLEMENTATION_BACKLOG.md',
   'TRACEABILITY_MATRIX.md','UNCERTAINTY_REGISTER.md','UNIVERSAL_RECONSTRUCTION_PROMPT.md']){
   assert.ok((await fs.stat(path.join(dir,file))).size>10,file);
  }
  const prompt=await fs.readFile(path.join(dir,'KIRO_IMPLEMENTATION_PROMPT.md'),'utf8');
  assert.match(prompt,/https:\/\/newsite.example/);assert.match(prompt,/Northern Studio/);
  assert.doesNotMatch(prompt,/USAM Kids|kids\.usamif\.com|Prodigy/);
  assert.match(await fs.readFile(path.join(dir,'DESIGN.md'),'utf8'),/Keep original design report/);
  const manifest=JSON.parse(await fs.readFile(path.join(dir,'RECONSTRUCTION_MANIFEST.json'),'utf8'));
  assert.ok(manifest.universalFiles.includes('API_SURFACE.json'));
 }finally{await fs.rm(dir,{recursive:true,force:true});}
});

test('existing captures can be re-analyzed independently for a different destination',async()=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'srt-target-change-'));
 try{
   const first=await writeUniversalIntelligence(dir,fixture,{targetUrl:'https://first.example'});
   assert.equal(first.target.url,'https://first.example');
   const second=await writeUniversalIntelligence(dir,fixture,{targetUrl:'https://second.example'});
   assert.equal(second.target.url,'https://second.example');
   assert.match(await fs.readFile(path.join(dir,'FUNCTIONAL_BLUEPRINT.md'),'utf8'),/second\.example/);
 }finally{await fs.rm(dir,{recursive:true,force:true});}
});
