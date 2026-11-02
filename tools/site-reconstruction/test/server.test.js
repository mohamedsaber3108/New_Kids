import {test} from 'node:test';import assert from 'node:assert/strict';import {mkdtemp,rm} from 'node:fs/promises';import {tmpdir} from 'node:os';import path from 'node:path';
import {createApp} from '../src/server.js';
test('server enforces token, origin and rejects internal targets',async()=>{
 const root=await mkdtemp(path.join(tmpdir(),'srt-server-'));
 const app=createApp({outRoot:root,token:'test-secret'});
 await new Promise(r=>app.server.listen(0,'127.0.0.1',r));
 const base=`http://127.0.0.1:${app.server.address().port}`;
 try{
  let r=await fetch(base+'/health');assert.equal(r.status,403);assert.equal((await r.json()).code,'AUTH_INVALID');
  r=await fetch(base+'/health',{headers:{'x-srt-token':'test-secret'}});assert.equal(r.status,200);assert.equal((await r.json()).version,'3.3.1');
  r=await fetch(base+'/health',{headers:{'x-srt-token':'wrong-token',origin:'chrome-extension://abcdefghijklmnopabcdefghijklmnop'}});assert.equal(r.status,403);assert.equal((await r.json()).code,'AUTH_INVALID');
  r=await fetch(base+'/health',{headers:{'x-srt-token':'test-secret',origin:'chrome-extension://abcdefghijklmnopabcdefghijklmnop'}});assert.equal(r.status,200);assert.equal(r.headers.get('access-control-allow-origin'),'chrome-extension://abcdefghijklmnopabcdefghijklmnop');
  r=await fetch(base+'/scan',{method:'POST',headers:{'x-srt-token':'test-secret','content-type':'application/json'},body:JSON.stringify({url:'not-a-url'})});assert.equal(r.status,400);assert.equal((await r.json()).code,'URL_INVALID');
  r=await fetch(base+'/health',{headers:{'x-srt-token':'test-secret',origin:'https://evil.example'}});assert.equal(r.status,403);
  for(const url of ['http://[::1]/','http://0.0.0.0/','http://192.168.1.1/','http://169.254.169.254/','http://localhost./']){
    r=await fetch(base+'/scan',{method:'POST',headers:{'x-srt-token':'test-secret','content-type':'application/json'},body:JSON.stringify({url})});assert.equal(r.status,400,url);
  }
 }finally{await new Promise(r=>app.server.close(r));await rm(root,{recursive:true,force:true});}
});
