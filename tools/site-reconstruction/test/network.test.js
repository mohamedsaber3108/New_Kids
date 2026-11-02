import {test} from 'node:test';import assert from 'node:assert/strict';import http from 'node:http';
import {safeGet,createPinnedLookup} from '../src/security.js';import {loadDiscovery} from '../src/discovery.js';
test('safe HTTP client checks redirects and size limits',async()=>{
 const server=http.createServer((req,res)=>{
  if(req.url==='/redirect'){res.writeHead(302,{location:'http://169.254.169.254/latest/meta-data/'});res.end();return;}
  if(req.url==='/robots.txt'){res.writeHead(200,{'content-type':'text/plain'});res.end('User-agent: *\nDisallow: /secret\nSitemap: http://127.0.0.1:'+server.address().port+'/sitemap.xml');return;}
  if(req.url==='/sitemap.xml'){res.writeHead(200,{'content-type':'application/xml'});res.end('<urlset><url><loc>http://127.0.0.1:'+server.address().port+'/about</loc></url></urlset>');return;}
  res.end('hello');
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const origin='http://127.0.0.1:'+server.address().port;
 try{
  assert.equal((await safeGet(origin+'/',{allowLocal:true})).body.toString(),'hello');
  await assert.rejects(safeGet(origin+'/redirect',{allowLocal:false}),/Non-public/);
  const d=await loadDiscovery(origin+'/',{allowLocal:true});assert.equal(d.canCrawl,true);assert.equal(d.robots.allowed('/secret'),false);assert.ok(d.urls.includes(origin+'/about'));
  await assert.rejects(safeGet(origin+'/',{allowLocal:true,maxBytes:2}),/size limit/);
 }finally{await new Promise(resolve=>server.close(resolve));}
});

// Regression for the Windows/Node.js failure seen with example.com/robots.txt.
// Modern Node sometimes calls a custom lookup with {all:true} to support
// autoSelectFamily. Before v2.1, safeGet returned a string in this case,
// making node:net report `Invalid IP address: undefined`.
test('pinned DNS lookup supports both single-address and all-address Node callback contracts',async()=>{
 const lookup=createPinnedLookup({address:'93.184.215.14',family:4});
 await new Promise((resolve,reject)=>lookup('example.com',{all:true},(err,values)=>{
   try{assert.ifError(err);assert.deepEqual(values,[{address:'93.184.215.14',family:4}]);resolve();}catch(e){reject(e);}
 }));
 await new Promise((resolve,reject)=>lookup('example.com',{all:false},(err,address,family)=>{
   try{assert.ifError(err);assert.equal(address,'93.184.215.14');assert.equal(family,4);resolve();}catch(e){reject(e);}
 }));
 assert.throws(()=>createPinnedLookup({address:undefined,family:4}),/Invalid pinned/);
});

test('safeGet accepts a custom DNS lookup for a named host with Node auto-family selection',async()=>{
 const server=http.createServer((_req,res)=>{res.writeHead(200,{'content-type':'text/plain'});res.end('network-ok');});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 try{
   // .test is reserved; allowLocal:true is test-only.  There is no external DNS/network traffic.
   // Add a resolver hook below so we can exercise the same path used for public sites.
   const result=await safeGet(`http://fixture.test:${server.address().port}/robots.txt`,{
     allowLocal:true,resolver:async()=>[{address:'127.0.0.1',family:4}]
   });
   assert.equal(result.status,200);
   assert.equal(result.body.toString(),'network-ok');
 }finally{await new Promise(resolve=>server.close(resolve));}
});
