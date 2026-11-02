import http from 'node:http';import crypto from 'node:crypto';import path from 'node:path';import fs from 'node:fs/promises';
import {spawn} from 'node:child_process';import {fileURLToPath} from 'node:url';
import {validateTarget} from './security.js';import {bound,LIMITS} from './args.js';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
export function createApp({outRoot=path.join(ROOT,'output'),token=crypto.randomBytes(24).toString('hex'),spawnScanner=defaultSpawn}={}){
 const jobs=new Map();let current=null;const queue=[];
 const send=(res,status,data,origin)=>{const h={'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'};
   if(origin?.startsWith('chrome-extension://'))h['access-control-allow-origin']=origin;
   res.writeHead(status,h);res.end(JSON.stringify(data));};
 async function persist(){await fs.mkdir(outRoot,{recursive:true});await fs.writeFile(path.join(outRoot,'jobs.json'),JSON.stringify([...jobs.values()].map(({child,...j})=>j),null,2));}
 function startNext(){if(current||queue.length===0)return;const job=queue.shift();current=job.id;job.status='running';job.startedAt=new Date().toISOString();
   const child=spawnScanner(job);job.child=child;persist().catch(()=>{});
   child.stdout?.on('data',b=>{job.log=(job.log+b.toString()).slice(-25000);});
   child.stderr?.on('data',b=>{job.log=(job.log+b.toString()).slice(-25000);});
   child.on('error',e=>{job.log+=e.message;});
   child.on('close',code=>{job.status=job.cancelled?'cancelled':code===0?'completed':'failed';job.exitCode=code;job.finishedAt=new Date().toISOString();delete job.child;current=null;persist().catch(()=>{});startNext();});
 }
 const server=http.createServer(async(req,res)=>{
   const origin=String(req.headers.origin||'');
   if(origin && !/^chrome-extension:\/\/[a-z]{32}$/.test(origin))return send(res,403,{error:'Origin blocked',code:'ORIGIN_BLOCKED'},'');
   if(req.method==='OPTIONS'){
     if(!origin)return send(res,403,{error:'Origin required'},'');
     res.writeHead(204,{'access-control-allow-origin':origin,'access-control-allow-methods':'GET,POST,OPTIONS','access-control-allow-headers':'content-type,x-srt-token','access-control-max-age':'600'});res.end();return;
   }
   if(req.headers['x-srt-token']!==token)return send(res,403,{error:'Invalid or expired session token: paste the token printed by the currently running npm run server',code:'AUTH_INVALID'},origin);
   const pathname=new URL(req.url,'http://localhost').pathname;
   if(req.method==='GET'&&pathname==='/health')return send(res,200,{ok:true,version:'3.3.1'},origin);
   if(req.method==='GET'&&pathname==='/jobs')return send(res,200,{jobs:[...jobs.values()].map(safeJob)},origin);
   const match=pathname.match(/^\/jobs\/([a-f\d-]{36})(?:\/(cancel))?$/);
   if(match){const job=jobs.get(match[1]);if(!job)return send(res,404,{error:'Not found'},origin);
     if(req.method==='GET'&&!match[2])return send(res,200,safeJob(job),origin);
     if(req.method==='POST'&&match[2]==='cancel'){
       job.cancelled=true;if(job.status==='queued'){const i=queue.indexOf(job);if(i!==-1)queue.splice(i,1);job.status='cancelled';}
       else if(job.status==='running')job.child?.kill('SIGTERM');
       await persist();return send(res,200,safeJob(job),origin);
     }
   }
   if(req.method==='POST'&&['/scan','/capture'].includes(pathname)){
     const chunks=[];let bytes=0;const maximum=pathname==='/capture'?6e6:10000;
     try{for await (const chunk of req){bytes+=chunk.length;if(bytes>maximum)throw Error('Payload too large');chunks.push(chunk);}}catch(e){return send(res,413,{error:e.message},origin);}
     let data;try{data=JSON.parse(Buffer.concat(chunks).toString());}catch{return send(res,400,{error:'Invalid JSON'},origin);}
     if(pathname==='/capture'){
       if(!data?.url||typeof data.snapshot!=='object')return send(res,400,{error:'Invalid capture payload'},origin);
       try{await validateTarget(data.url);}catch(e){return send(res,400,{error:e.message},origin);}
       const id=crypto.randomUUID(),dest=path.join(outRoot,'manual-captures');await fs.mkdir(dest,{recursive:true});
       await fs.writeFile(path.join(dest,id+'.json'),JSON.stringify({url:data.url,at:new Date().toISOString(),snapshot:data.snapshot},null,2));
       if(typeof data.screenshot==='string'&&/^data:image\/png;base64,/.test(data.screenshot)){
         const image=Buffer.from(data.screenshot.split(',')[1]||'','base64');if(image.length<=4e6)await fs.writeFile(path.join(dest,id+'.png'),image);
       }
       return send(res,201,{id,path:dest},origin);
     }
     let validated;try{if(!data||typeof data.url!=='string')throw Error('URL is required');validated=await validateTarget(data.url);}catch(e){return send(res,400,{error:e.message,code:'URL_INVALID'},origin);}
     let maxPages,maxDepth;try{maxPages=bound(data.maxPages,80,1,LIMITS.maxPages,'maxPages');maxDepth=bound(data.maxDepth,4,0,LIMITS.maxDepth,'maxDepth');}
       catch(e){return send(res,400,{error:e.message},origin);}
     if([...jobs.values()].filter(j=>['running','queued'].includes(j.status)).length>=3)return send(res,429,{error:'Maximum 3 active/queued jobs'},origin);
     const id=crypto.randomUUID(),job={id,url:validated.url.href,maxPages,maxDepth,outDir:path.join(outRoot,`${validated.url.hostname.replace(/[^\w.-]/g,'_')}-${id.slice(0,8)}`),interactions:data.interactions===true,saveHTML:data.saveHTML===true,downloadAssets:data.downloadAssets===true,motion:data.motion===true,archivePublicSource:data.archivePublicSource===true,structuralMap:data.structuralMap===true,ossIntelligence:data.ossIntelligence===true,status:'queued',log:'',createdAt:new Date().toISOString(),cancelled:false};
     jobs.set(id,job);queue.push(job);startNext();return send(res,202,safeJob(job),origin);
   }
   return send(res,404,{error:'Not found'},origin);
 });
 return {server,token,jobs,restore:async()=>{try{const arr=JSON.parse(await fs.readFile(path.join(outRoot,'jobs.json'),'utf8'));for(const item of arr){if(['running','queued'].includes(item.status))item.status='interrupted';jobs.set(item.id,item);}}catch(e){if(e.code!=='ENOENT')throw e;}}};
}
function safeJob(job){const {child,...rest}=job;return rest;}
function defaultSpawn(job){return spawn(process.execPath,[path.join(ROOT,'src/cli.js'),'scan','--url',job.url,'--out',job.outDir,'--max-pages',String(job.maxPages),'--max-depth',String(job.maxDepth),...(job.interactions?['--interactions']:[]),...(job.saveHTML?['--save-html']:[]),...(job.downloadAssets?['--download-assets']:[]),...(job.motion?['--motion']:[]),...(job.archivePublicSource?['--archive-public-source']:[]),...(job.structuralMap?['--structural-map']:[]),...(job.ossIntelligence?['--oss-intelligence']:[])],{cwd:ROOT,stdio:['ignore','pipe','pipe']});}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const app=createApp();await app.restore();const port=Number(process.env.SRT_PORT||4319);
 app.server.on('error',error=>{if(error.code==='EADDRINUSE') console.error(`Port ${port} is already in use. Stop the older SRT server (Ctrl+C in its PowerShell window), then restart this server.`);else console.error(error);process.exitCode=1;});
 app.server.listen(port,'127.0.0.1',()=>{console.log(`SRT local API: http://127.0.0.1:${port}`);console.log(`Token: ${app.token}`);console.log('The token is required in the extension; do not share or expose it.');});
}
