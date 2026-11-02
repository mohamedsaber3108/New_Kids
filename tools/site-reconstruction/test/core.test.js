import {test} from 'node:test';import assert from 'node:assert/strict';
import {validateTarget,isUnsafeIP,normalizedPage} from '../src/security.js';
import {parseRobots,parseSitemap} from '../src/discovery.js';
import {bound,LIMITS} from '../src/args.js';
const reject=async u=>assert.rejects(validateTarget(u),/blocked|Non-public|Internal/);
test('rejects internal addresses and IPv6 alternate formats',async()=>{
 for(const url of ['http://[::1]/','http://0.0.0.0:4319/','http://10.0.0.5/','http://192.168.1.1/','http://169.254.169.254/latest/meta-data/','http://localhost./','http://[::ffff:127.0.0.1]/'])await reject(url);
});
test('rejects private DNS answers including mixed public/private',async()=>{
 await assert.rejects(validateTarget('https://public.example',{resolver:async()=>[{address:'1.1.1.1',family:4},{address:'10.1.1.1',family:4}]}),/Non-public/);
 const passed=await validateTarget('https://public.example',{resolver:async()=>[{address:'1.1.1.1',family:4}]});assert.equal(passed.addresses[0].address,'1.1.1.1');
});
test('recognizes IP ranges',()=>{assert.equal(isUnsafeIP('127.1.2.3'),true);assert.equal(isUnsafeIP('8.8.8.8'),false);assert.equal(isUnsafeIP('::1'),true);assert.equal(isUnsafeIP('fd12::1'),true);});
test('preserves meaningful trailing slashes',()=>assert.equal(normalizedPage('https://example.com/a/','https://example.com'),'https://example.com/a/'));
test('robots allow precedence and delays',()=>{const r=parseRobots('User-agent: *\nDisallow: /private\nAllow: /private/public\nCrawl-delay: 2');assert.equal(r.allowed('/private/user'),false);assert.equal(r.allowed('/private/public'),true);assert.equal(r.delay,2000);});
test('sitemap parsing',()=>assert.deepEqual(parseSitemap('<urlset><url><loc>https://example.org/a&amp;b</loc></url></urlset>').urls,['https://example.org/a&b']));
test('unified limits',()=>{assert.equal(bound(80,80,1,LIMITS.maxPages,'pages'),80);assert.throws(()=>bound(501,80,1,LIMITS.maxPages,'pages'));});
