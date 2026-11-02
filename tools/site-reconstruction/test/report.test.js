import {test} from 'node:test';import assert from 'node:assert/strict';import {mkdtemp,readFile,rm} from 'node:fs/promises';import {tmpdir} from 'node:os';import path from 'node:path';
import {writePackage} from '../src/report.js';
test('generates full reconstruction package from deterministic fixture',async()=>{
 const outDir=await mkdtemp(path.join(tmpdir(),'srt-report-'));
 try{
  const pages=[{url:'https://example.com/',title:'Home',depth:0,source:'start',status:'inspected',httpStatus:200,screenshots:[{viewport:{name:'desktop',width:1440,height:1000},path:'screenshots/0001-desktop.png'}],evidence:{cssVariables:{'--accent':'#115588'},mediaQueries:['(max-width: 768px)'],frequent:{textColors:[{value:'rgb(1, 2, 3)',count:1}]},headings:[{tag:'h1',text:'Hello'}],tagCounts:{h1:1},elementSamples:[],forms:[],links:[],detectedLibraries:{}},responsive:{desktop:{}}}];
  await writePackage({outDir,startUrl:'https://example.com/',pages,coverage:{robotsSkipped:0},assets:[]});
  for(const file of ['DESIGN.md','SITE_MAP.md','COMPONENTS.md','INTERACTIONS.md','RESPONSIVE.md','ASSETS.md','AGENTS.md','SCAN_REPORT.md','README.md','evidence.json']) assert.ok((await readFile(path.join(outDir,file),'utf8')).length>20,file);
  assert.match(await readFile(path.join(outDir,'DESIGN.md'),'utf8'),/#115588/);
  assert.equal(JSON.parse(await readFile(path.join(outDir,'evidence.json'),'utf8')).pages.length,1);
 }finally{await rm(outDir,{recursive:true,force:true});}
});
