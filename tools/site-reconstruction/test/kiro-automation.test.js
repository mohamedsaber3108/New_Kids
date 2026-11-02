import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
async function fixture(){
  const base=await fs.mkdtemp(path.join(os.tmpdir(),'srt-kiro-'));
  const scan=path.join(base,'scan');await fs.mkdir(scan);
  await fs.writeFile(path.join(scan,'CONTENT_INDEX.json'),JSON.stringify({pages:[
    {url:'https://example.org/',pageFile:'pages/0001-home.md',title:'Home',status:'discovered',sectionCount:3,mainTextPreview:'Sample',imageCount:1,headingCount:2},
    {url:'https://example.org/math',pageFile:'pages/0002-math.md',title:'Math',status:'discovered',sectionCount:5}
  ]}));
  await fs.writeFile(path.join(scan,'ROUTE_GRAPH.json'),JSON.stringify({routes:[{url:'https://example.org/',states:2},{url:'https://example.org/math',states:3}],uninspectedLinks:[{url:'https://example.org/faq'},{url:'https://example.org/blog'},{url:'https://wrong.org/offsite'}]}));
  await fs.writeFile(path.join(scan,'RECONSTRUCTION_MANIFEST.json'),JSON.stringify({source:'https://example.org/'}));
  await fs.writeFile(path.join(scan,'pending-routes.txt'),'https://example.org/privacy\nhttps://example.org/faq\n');
  await fs.writeFile(path.join(scan,'followup-routes.txt'),'https://example.org/faq\nhttps://wrong.org/offsite\n');
  return {base,scan};
}
test('generates one brief per recorded reference page plus a route matrix',async t=>{
  const {base,scan}=await fixture();t.after(()=>fs.rm(base,{recursive:true,force:true}));
  const dest=path.join(base,'briefs');
  const result=spawnSync(process.execPath,[path.join(root,'scripts/kiro-build-page-briefs.mjs'),'--reference',scan,'--out',dest],{encoding:'utf8'});
  assert.equal(result.status,0,result.stderr);
  const files=await fs.readdir(dest);
  assert.equal(files.filter(f=>f.endsWith('.md')&&!f.startsWith('README')).length,2);
  const csv=await fs.readFile(path.join(dest,'ROUTE_IMPLEMENTATION_MATRIX.csv'),'utf8');
  assert.match(csv,/https:\/\/example.org\/math/);
  assert.match(csv,/UNMAPPED/);
});
test('deduplicates and bounds followups to the actual scanned origin',async t=>{
  const {base,scan}=await fixture();t.after(()=>fs.rm(base,{recursive:true,force:true}));
  const dest=path.join(base,'batches');
  const result=spawnSync(process.execPath,[path.join(root,'scripts/kiro-build-followup-batches.mjs'),'--reference',scan,'--out',dest,'--batch-size','2'],{encoding:'utf8'});
  assert.equal(result.status,0,result.stderr);
  const manifest=JSON.parse(await fs.readFile(path.join(dest,'BATCH_INDEX.json'),'utf8'));
  assert.equal(manifest.uniqueFollowupRoutes,3);
  assert.equal(manifest.batchFiles.length,2);
  assert.equal(manifest.rejectedOutOfScopeOrMalformed,2);
  const first=await fs.readFile(path.join(dest,'routes-001.txt'),'utf8');
  assert.equal(first.trim().split('\n').length,2);
});
