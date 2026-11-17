import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createApp} from '../server/app.mjs';

// Per-IP limits must count real clients behind the bundled Nginx, not the proxy's single address.
async function start(opts){
 const app=createApp({database:':memory:',secureCookies:false,publicOrigin:'',...opts});
 await new Promise(r=>app.server.listen(0,'127.0.0.1',r));
 const base='http://127.0.0.1:'+app.server.address().port;
 const login=ip=>fetch(base+'/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json',Origin:base,...(ip?{'X-Real-IP':ip}:{})},body:JSON.stringify({email:'nobody@example.com',password:'Wrong-Password-123'})}).then(r=>r.status);
 return {login,stop:()=>new Promise(r=>app.server.close(()=>{app.db.close();r()}))};
}

test('trustProxy: each client IP gets its own login limit',async()=>{
 const s=await start({trustProxy:true});
 try{
  for(let i=0;i<10;i++)assert.equal(await s.login('203.0.113.7'),401);
  assert.equal(await s.login('203.0.113.7'),429,'11th attempt from the same client is limited');
  assert.equal(await s.login('198.51.100.9'),401,'a different client behind the same proxy is not limited');
  assert.equal(await s.login('2001:db8::1'),401,'IPv6 clients are keyed separately');
 }finally{await s.stop()}
});

test('trustProxy: malformed X-Real-IP falls back to the socket address',async()=>{
 const s=await start({trustProxy:true});
 try{
  for(let i=0;i<10;i++)assert.equal(await s.login('not an ip; drop table'),401);
  assert.equal(await s.login('also<bad>'),429,'garbage headers share the socket bucket instead of minting new ones');
 }finally{await s.stop()}
});

test('without trustProxy a client cannot dodge the limit by spoofing X-Real-IP',async()=>{
 const s=await start({trustProxy:false});
 try{
  for(let i=0;i<10;i++)assert.equal(await s.login('192.0.2.'+i),401);
  assert.equal(await s.login('192.0.2.200'),429);
 }finally{await s.stop()}
});
