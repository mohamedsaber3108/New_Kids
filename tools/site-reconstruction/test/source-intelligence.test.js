import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {mkdtemp,readFile,rm,access} from 'node:fs/promises';
import path from 'node:path';
import {tmpdir} from 'node:os';
import {buildSourceIndex,cleanPublicURL,archivePublicSources,exportSourceIntelligence} from '../src/source-intelligence.js';

test('public source index is page-linked and removes query strings',()=>{
  const index=buildSourceIndex([{url:'https://example.org/',sourceEvidence:{scripts:[{url:'https://example.org/app.js',type:'module'}],sheets:[{href:'https://example.org/app.css'}]}},{url:'https://example.org/about',sourceEvidence:{scripts:[{url:'https://example.org/app.js'}]}}]);
  assert.equal(index.total,2);
  assert.equal(index.files.find(x=>x.type==='javascript').pages.length,2);
  assert.equal(cleanPublicURL('https://example.org/app.js?session=private#x'),'https://example.org/app.js');
  assert.equal(cleanPublicURL('file:///etc/passwd'),null);
});

test('optional archive enforces robots, same-origin, query exclusions and creates derived graph',async()=>{
  const server=http.createServer((req,res)=>{
    if(req.url==='/robots.txt'){res.setHeader('content-type','text/plain');res.end('User-agent: *\nDisallow: /private.js\n');return;}
    if(req.url==='/app.css'){res.setHeader('content-type','text/css');res.end('@import "./child.css"; @keyframes float {0%{opacity:0}100%{opacity:1}}');return;}
    if(req.url==='/child.css'){res.setHeader('content-type','text/css');res.end(':root{--blue:#124578}');return;}
    if(req.url==='/app.js'){res.setHeader('content-type','text/javascript');res.end('import "./runtime.js";export const one=1;');return;}
    if(req.url==='/runtime.js'){res.setHeader('content-type','text/javascript');res.end('export const child=2');return;}
    res.statusCode=404;res.end('not found');
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const url=`http://127.0.0.1:${server.address().port}`;
  const out=await mkdtemp(path.join(tmpdir(),'srt-sources-'));
  try{
    const pages=[{url:url+'/',sourceEvidence:{scripts:[{url:url+'/app.js'},{url:url+'/runtime.js'},{url:url+'/private.js'},{url:url+'/app.js',hasQuery:true}],
      sheets:[{href:url+'/app.css'},{href:url+'/child.css'}]}}];
    // Replace the query candidate with an unrelated URL so it doesn't block app.js itself.
    pages[0].sourceEvidence.scripts[3].url=url+'/query.js';
    const archive=await archivePublicSources({pages,outDir:out,startUrl:url,allowLocal:true});
    assert.equal(archive.downloaded,4,JSON.stringify(archive));
    assert.ok(archive.files.some(f=>f.reason==='robots excluded'));
    assert.ok(archive.files.some(f=>f.reason?.includes('query-based')));
    await access(path.join(out,archive.files.find(f=>f.type==='javascript'&&f.status==='downloaded').file));
    const analysis=await exportSourceIntelligence(out,pages,{archive});
    assert.equal(analysis.sourceFileCounts.css,2);
    const dep=JSON.parse(await readFile(path.join(out,'DEPENDENCY_GRAPH.json'),'utf8'));
    assert.ok(dep.edges.some(e=>e.from.endsWith('app.js')&&e.to.endsWith('runtime.js')));
    assert.ok(dep.edges.some(e=>e.from.endsWith('app.css')&&e.to.endsWith('child.css')));
    const coverage=await readFile(path.join(out,'CAPTURE_COVERAGE.md'),'utf8');
    assert.match(coverage,/browserSourceEvidence: 1/);
    assert.match(coverage,/archivedPublicFiles: 4/);
  }finally{await new Promise(resolve=>server.close(resolve));await rm(out,{recursive:true,force:true});}
});
