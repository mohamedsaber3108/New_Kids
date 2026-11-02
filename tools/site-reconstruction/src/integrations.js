import fs from 'node:fs/promises';
import path from 'node:path';
import {spawn} from 'node:child_process';
import crypto from 'node:crypto';

function safeName(s){return String(s).replace(/[^a-z0-9_.-]/gi,'_').slice(0,80);}
export async function runEnrichment({reference,provider='scrapling',limit=3,python='python',input=null}){
  const out=path.join(reference,'enrichment',provider);await fs.mkdir(out,{recursive:true});
  if(provider==='designlang'){
    if(!input)throw Error('--input <existing exported JSON> required for designlang import');
    const text=await fs.readFile(path.resolve(input),'utf8');
    const obj=JSON.parse(text);const hash=crypto.createHash('sha256').update(text).digest('hex');
    await fs.writeFile(path.join(out,'import.json'),JSON.stringify({provider:'designlang',source:path.basename(input),sha256:hash,
      warning:'Imported evidence is distinct from SRT observations; resolve conflicts manually.',data:obj},null,2));
    return {provider,imported:1,failed:0};
  }
  if(!['scrapling','scrapegraph'].includes(provider))throw Error('Choose scrapling, scrapegraph or designlang');
  const folder=path.join(reference,'html');
  const files=(await fs.readdir(folder).catch(()=>[])).filter(f=>/^\d{4}\.html$/.test(f)).sort().slice(0,Math.min(limit,100));
  if(!files.length)throw Error('No saved HTML. Run scan with --save-html on authorized pages first.');
  const results=[];
  for(const file of files){
    const target=path.join(out,safeName(file)+'.json');
    const args=['integrations/offline_enrich.py',provider,path.join(folder,file),target];
    const outcome=await new Promise(resolve=>{
      const child=spawn(python,args,{cwd:path.resolve('.'),stdio:['ignore','pipe','pipe']});
      let err='';let settled=false;
      const timer=setTimeout(()=>{child.kill('SIGTERM');if(!settled){settled=true;resolve({ok:false,error:'Timeout (90 seconds)'})}},90000);
      child.stderr.on('data',x=>{err=(err+x.toString()).slice(-1500)});
      child.on('error',e=>{if(!settled){settled=true;clearTimeout(timer);resolve({ok:false,error:e.message})}});
      child.on('close',code=>{if(!settled){settled=true;clearTimeout(timer);resolve({ok:code===0,error:err})}});
    });
    results.push({file,...outcome});
  }
  await fs.writeFile(path.join(out,'RUN_REPORT.json'),JSON.stringify({provider,results,notes:[
    'Scrapling parses an HTML copy already collected through SRT; no independent network access.',
    'ScrapeGraphAI runs only with locally configured Ollama and its output is inference, not evidence.',
    'Captured HTML may contain third-party content or residual sensitive data; review before sharing.']},null,2));
  return {provider,imported:results.filter(r=>r.ok).length,failed:results.filter(r=>!r.ok).length,details:results};
}
