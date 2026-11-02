import fs from 'node:fs/promises';
import path from 'node:path';

function arg(name, fallback=null) { const i=process.argv.indexOf('--'+name);return i<0?fallback:process.argv[i+1]; }
const reference=arg('reference'), destination=arg('out');
const batchSize=Number(arg('batch-size','199'));
if(!reference||!destination||!Number.isInteger(batchSize)||batchSize<1||batchSize>199){
  console.error('Usage: node scripts/kiro-build-followup-batches.mjs --reference <scan-dir> --out <batch-dir> [--batch-size 199]');process.exit(1);
}
const source=path.resolve(reference),output=path.resolve(destination);
async function readJson(file){try{return JSON.parse(await fs.readFile(path.join(source,file),'utf8'));}catch{return null;}}
const graph=await readJson('ROUTE_GRAPH.json');
const manifest=await readJson('RECONSTRUCTION_MANIFEST.json');
const originals=new Set((graph?.routes||[]).map(x=>x.url).filter(Boolean));
let base;
try {base=new URL(manifest?.source||'');}catch{
  try {base=new URL((graph?.routes||[]).find(x=>x.url)?.url||'');}catch{throw Error('Could not establish source URL/origin');}
}
const candidates=[];
for(const filename of ['pending-routes.txt','followup-routes.txt']){
  try{const raw=await fs.readFile(path.join(source,filename),'utf8');candidates.push(...raw.split(/\r?\n/).map(x=>x.trim()).filter(Boolean));}catch{}
}
for(const x of graph?.uninspectedLinks||[])if(x.url)candidates.push(x.url);
const safe=[],rejected=[];
const seen=new Set();
for(const c of candidates){
  try{
    const u=new URL(c,base.href);
    u.hash='';
    if(u.origin!==base.origin||!['http:','https:'].includes(u.protocol)){rejected.push(c);continue;}
    const url=u.href;
    if(originals.has(url)||seen.has(url))continue;
    seen.add(url);safe.push(url);
  }catch{rejected.push(c);}
}
await fs.mkdir(output,{recursive:true});
const files=[];
for(let i=0;i<safe.length;i+=batchSize){
  const name=`routes-${String(Math.floor(i/batchSize)+1).padStart(3,'0')}.txt`;
  await fs.writeFile(path.join(output,name),safe.slice(i,i+batchSize).join('\n')+'\n');files.push(name);
}
const summary={source:source,origin:base.origin,scannedRoutes:originals.size,candidateLines:candidates.length,uniqueFollowupRoutes:safe.length,rejectedOutOfScopeOrMalformed:rejected.length,batchSize,batchFiles:files,limitations:'Only URLs actually recorded in this reference output can be batched. The crawler will recheck robots rules and current permissions.'};
await fs.writeFile(path.join(output,'BATCH_INDEX.json'),JSON.stringify(summary,null,2)+'\n');
console.log(JSON.stringify(summary,null,2));
