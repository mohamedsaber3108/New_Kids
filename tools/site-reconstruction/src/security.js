import dns from 'node:dns/promises';
import http from 'node:http';
import https from 'node:https';
import {BlockList, isIP} from 'node:net';
import {parseHttpUrl} from './args.js';

const denied4 = new BlockList();
const denied6 = new BlockList();
for(const [ip,bits] of [['0.0.0.0',8],['10.0.0.0',8],['100.64.0.0',10],['127.0.0.0',8],['169.254.0.0',16],['172.16.0.0',12],['192.0.0.0',24],['192.0.2.0',24],['192.168.0.0',16],['198.18.0.0',15],['198.51.100.0',24],['203.0.113.0',24],['224.0.0.0',4],['240.0.0.0',4]]) denied4.addSubnet(ip,bits,'ipv4');
for(const [ip,bits] of [['::',128],['::1',128],['::ffff:0:0',96],['fc00::',7],['fe80::',10],['ff00::',8],['2001:db8::',32],['2001::',32],['2002::',16],['64:ff9b::',96],['64:ff9b:1::',48]]) denied6.addSubnet(ip,bits,'ipv6');
export function isUnsafeIP(ip){const t=isIP(ip);return !t || (t===4?denied4.check(ip,'ipv4'):denied6.check(ip,'ipv6'));}
export function isLocalHost(host){const h=host.replace(/^\[|\]$/g,'').replace(/\.$/,'').toLowerCase();
  return h==='localhost'||h.endsWith('.localhost')||h.endsWith('.local')||h.endsWith('.internal')||h.endsWith('.lan')||h.endsWith('.home.arpa')||h.endsWith('.test')||h.endsWith('.invalid')||h.endsWith('.onion');
}
export async function validateTarget(raw,{allowLocal=false,resolver=dns.lookup}={}){
  const u=parseHttpUrl(raw);
  const host=u.hostname.replace(/^\[|\]$/g,'').replace(/\.$/,'');
  if(!allowLocal && isLocalHost(host)) throw Error(`Internal hostname blocked: ${host}`);
  let addresses;
  if(isIP(host)) addresses=[{address:host,family:isIP(host)}];
  else addresses=await resolver(host,{all:true,verbatim:true});
  if(!addresses.length) throw Error('DNS returned no addresses');
  if(!allowLocal && addresses.some(v=>isUnsafeIP(v.address))) throw Error(`Non-public target blocked: ${host}`);
  return {url:u,addresses};
}
export function normalizedPage(raw,origin) {
  try {const u=parseHttpUrl(new URL(raw,origin).href);if(u.origin!==origin)return null;u.hash='';
    if(/\.(?:png|jpe?g|webp|gif|avif|pdf|zip|mp4|webm|mp3|woff2?|ttf|otf|ico)$/i.test(u.pathname))return null;
    for(const key of [...u.searchParams.keys()]) if(/^(utm_.+|gclid|fbclid)$/i.test(key))u.searchParams.delete(key);
    u.searchParams.sort();return u.href;
  }catch{return null;}
}
// Node.js may request DNS results with { all: true } when autoSelectFamily is enabled.
// In that mode its lookup callback MUST receive an array of {address,family}
// objects. Returning a single string causes node:net to throw
// `Invalid IP address: undefined` before the HTTPS request can begin.
// This adapter never performs another DNS lookup; it only provides the
// previously validated destination in the shape Node expects.
export function createPinnedLookup(chosen) {
  if (!chosen || !isIP(chosen.address) || chosen.family !== isIP(chosen.address)) {
    throw new Error('Invalid pinned DNS answer');
  }
  return (_host, options, callback) => {
    if (typeof options === 'function') { callback = options; options = {}; }
    if (options?.all) callback(null, [{address: chosen.address, family: chosen.family}]);
    else callback(null, chosen.address, chosen.family);
  };
}
// Resource fetches pin the HTTP socket's resolved destination. Redirects are checked on each hop.
export async function safeGet(raw,{allowLocal=false,origin=null,maxBytes=2e6,timeout=10000,maxRedirects=4,contentTypes=null,resolver=dns.lookup}={}) {
  let address=raw;
  for(let hop=0;hop<=maxRedirects;hop++) {
    const {url,addresses}=await validateTarget(address,{allowLocal,resolver});
    if(origin&&url.origin!==origin) throw Error('Cross-origin fetch blocked');
    const chosen=addresses[0];
    const answer=await new Promise((resolve,reject)=>{
      const lib=url.protocol==='https:'?https:http;
      const req=lib.get(url,{timeout,lookup:createPinnedLookup(chosen),headers:{'user-agent':'SRT/3.1 (authorized website analysis)','accept':'text/plain,application/xml,text/xml,image/*,font/*,*/*'}},res=>{
        if([301,302,303,307,308].includes(res.statusCode)&&res.headers.location) {res.resume();resolve({redirect:new URL(res.headers.location,url).href});return;}
        const type=String(res.headers['content-type']||'').split(';')[0].trim().toLowerCase();
        if(contentTypes && !contentTypes.some(x=>type.startsWith(x))){res.resume();reject(Error(`Disallowed content-type ${type}`));return;}
        const parts=[];let size=0;
        res.on('error',reject);res.on('data',chunk=>{size+=chunk.length;if(size>maxBytes){reject(Error('Response exceeds size limit'));req.destroy();return;}parts.push(chunk);});
        res.on('end',()=>resolve({status:res.statusCode,type,body:Buffer.concat(parts),url:url.href}));
      });
      req.on('timeout',()=>req.destroy(Error('Request timed out')));req.on('error',reject);
    });
    if(!answer.redirect)return answer;
    address=answer.redirect;
  }
  throw Error('Too many redirects');
}
export async function installRequestGuard(context,{allowLocal=false,origin=null}={}) {
  await context.route('**/*',async route=>{
    const req=route.request();
    try {
      const {url}=await validateTarget(req.url(),{allowLocal});
      if(!['http:','https:'].includes(url.protocol))throw Error('Protocol blocked');
      // Public third-party CDN requests are allowed, but private destinations are never allowed by default.
      await route.continue();
    } catch { await route.abort('blockedbyclient').catch(()=>{}); }
  });
}
