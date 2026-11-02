import {test} from 'node:test';import assert from 'node:assert/strict';
import {mkdtemp,readFile,rm,access} from 'node:fs/promises';import path from 'node:path';import http from 'node:http';import {tmpdir} from 'node:os';import {spawn} from 'node:child_process';import {fileURLToPath} from 'node:url';
const enabled=process.env.SRT_E2E==='1';
test('optional browser end-to-end fixture scan', {skip:!enabled}, async()=>{
  // Requires npm install, working Playwright Chromium, and permission to access local fixtures.
  await import('playwright');
  const app=http.createServer((req,res)=>{
    if(req.url==='/robots.txt'){res.writeHead(200,{'content-type':'text/plain'});res.end('User-agent: *\nAllow: /');return;}
    if(req.url==='/sitemap.xml'){res.writeHead(200,{'content-type':'application/xml'});res.end(`<urlset><url><loc>http://127.0.0.1:${app.address().port}/about</loc></url></urlset>`);return;}
    res.writeHead(200,{'content-type':'text/html'});
    if(req.url==='/about'){res.end('<html><head><title>About fixture</title></head><body><main><section><h2>About content</h2></section></main></body></html>');return;}
    res.end(`<html><head><title>Fixture</title><style>:root{--brand:#124578}h1{color:var(--brand)}</style></head><body><h1>Fixture homepage</h1><a href="/about">About</a></body></html>`);
  });
  await new Promise(resolve=>app.listen(0,'127.0.0.1',resolve));
  const out=await mkdtemp(path.join(tmpdir(),'srt-e2e-'));
  const cwd=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
  try{
    const result=await new Promise((resolve,reject)=>{
      const child=spawn(process.execPath,['src/cli.js','scan','--url',`http://127.0.0.1:${app.address().port}/`,'--allow-local','--max-pages','2','--max-depth','1','--out',out,'--delay','100','--save-html','--motion','--structural-map'],{cwd,env:process.env});
      let stderr='';child.stderr.on('data',b=>stderr+=b);child.on('error',reject);child.on('close',code=>resolve({code,stderr}));
    });
    assert.equal(result.code,0,result.stderr);
    const evidence=JSON.parse(await readFile(path.join(out,'evidence.json'),'utf8'));
    assert.ok(evidence.pages.length>=1);assert.ok(evidence.pages.some(p=>p.evidence));
    await access(path.join(out,'screenshots','0001-desktop.png'));
    await access(path.join(out,'screenshots','0001-motion-0000ms.png'));
    await access(path.join(out,'html','0001.html'));
    await access(path.join(out,'ROUTE_GRAPH.json'));
    await access(path.join(out,'QUALITY_GATES.md'));
    await access(path.join(out,'STRUCTURAL_COVERAGE.json'));
    await access(path.join(out,'layout','0001-desktop.json.gz'));
    assert.ok(evidence.pages[0].deepEvidence?.sections?.length>0,'Missing rendered section evidence');
    assert.equal(evidence.pages[0].deepEvidence.sectionExtractionMode,'inferred-visible-body-blocks');
    assert.ok(evidence.pages[0].deepEvidence.sections.some(s=>s.text.includes('Fixture homepage')));
    const about=evidence.pages.find(p=>new URL(p.url).pathname==='/about');
    assert.ok(about?.deepEvidence?.sections?.length>0,'Missing semantic about section evidence');
    assert.equal(about.deepEvidence.sectionExtractionMode,'semantic-landmarks');
  }finally{await new Promise(resolve=>app.close(resolve));await rm(out,{recursive:true,force:true});}
});
