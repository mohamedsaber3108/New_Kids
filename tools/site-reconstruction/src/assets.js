import fs from 'node:fs/promises';import path from 'node:path';import crypto from 'node:crypto';
import {safeGet} from './security.js';
const allowed=['image/','font/','application/font','application/octet-stream'];
export async function collectAssets({pages,outDir,startUrl,limit=50,allowLocal=false}){
  const origin=new URL(startUrl).origin;
  const candidates=[...new Set(pages.flatMap(p=>(p.evidence?.assets||[]).map(a=>a.url)).filter(Boolean))].filter(s=>{try{const u=new URL(s);return u.origin===origin&&/\.(png|webp|gif|jpg|jpeg|svg|woff2?|ttf|otf|ico)$/i.test(u.pathname)}catch{return false}}).slice(0,limit);
  const dest=path.join(outDir,'assets');await fs.mkdir(dest,{recursive:true});const results=[];
  for(const url of candidates){try{
    const response=await safeGet(url,{allowLocal,origin,maxBytes:8e6,contentTypes:allowed});
    if(response.status!==200)throw Error(`HTTP ${response.status}`);
    const ext=path.extname(new URL(url).pathname).toLowerCase()||'.bin';
    const hash=crypto.createHash('sha256').update(response.body).digest('hex');
    const file=hash.slice(0,18)+ext;await fs.writeFile(path.join(dest,file),response.body);
    results.push({url,file:`assets/${file}`,sha256:hash,bytes:response.body.length,contentType:response.type,status:'downloaded'});
  }catch(e){results.push({url,status:'failed',error:e.message});}}
  return results;
}
