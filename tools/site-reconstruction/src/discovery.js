import {safeGet,normalizedPage} from './security.js';

export function parseRobots(text,userAgent='SRT') {
  const groups=[];let group=null;
  for(const raw of text.split(/\r?\n/)){
    const line=raw.replace(/#.*/,'').trim();if(!line)continue;
    const idx=line.indexOf(':');if(idx<0)continue;
    const k=line.slice(0,idx).trim().toLowerCase(),v=line.slice(idx+1).trim();
    if(k==='user-agent') {if(!group||group.rules.length||group.delay!==null){group={agents:[],rules:[],delay:null};groups.push(group);}group.agents.push(v.toLowerCase());}
    else if(k==='sitemap') continue;
    else if(group) {
      if(['allow','disallow'].includes(k)&&v)group.rules.push({allow:k==='allow',path:v});
      if(k==='crawl-delay'&&Number.isFinite(Number(v)))group.delay=Math.min(10000,Math.max(0,Number(v)*1000));
    }
  }
  const matches=groups.filter(g=>g.agents.some(a=>a!=='*'&&userAgent.toLowerCase().includes(a)));
  const active=matches.length?matches:groups.filter(g=>g.agents.includes('*'));
  return {groups:active,allowed(path){
    const candidates=active.flatMap(g=>g.rules).filter(r=>{
      const pattern=r.path.replace(/[.*+?^${}()|[\]\\]/g,'\\$&').replace(/\\\*/g,'.*').replace(/\\\$$/,'$');
      try{return new RegExp('^'+pattern).test(path);}catch{return path.startsWith(r.path);}
    }).sort((a,b)=>b.path.length-a.path.length||(a.allow?-1:1));
    return candidates.length?candidates[0].allow:true;
  },delay:Math.max(0,...active.map(g=>g.delay||0))};
}
function decodeXML(s){return s.replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&#39;/g,"'");}
export function parseSitemap(xml){const paths=[...xml.matchAll(/<loc\b[^>]*>([\s\S]*?)<\/loc>/gi)].map(m=>decodeXML(m[1].trim().replace(/^<!\[CDATA\[|\]\]>$/g,'')));return {urls:paths,isIndex:/<sitemapindex[\s>]/i.test(xml)};}
export async function loadDiscovery(startUrl,{allowLocal=false,onNote=()=>{}}={}){
  const origin=new URL(startUrl).origin;
  let robots=parseRobots('');let robotsText='';const urls=[];
  try {const res=await safeGet(origin+'/robots.txt',{allowLocal,origin,maxBytes:250000});
    if(res.status===200){robotsText=res.body.toString();robots=parseRobots(robotsText);}
    else if(res.status!==404){onNote(`robots.txt returned ${res.status}; crawl disabled by policy`);return {robots,urls:[],canCrawl:false,delay:500};}
  }catch(e){onNote(`robots.txt unavailable (${e.message}); crawl disabled by policy`);return {robots,urls:[],canCrawl:false,delay:500};}
  const declared=[...robotsText.matchAll(/^sitemap:\s*(.+)$/gim)].map(m=>m[1].trim());
  const toVisit=[...new Set([...declared,origin+'/sitemap.xml'])];const seen=new Set();
  while(toVisit.length&&seen.size<6&&urls.length<5000){
    const raw=toVisit.shift();if(seen.has(raw))continue;seen.add(raw);
    try {const r=await safeGet(raw,{allowLocal,origin,maxBytes:2e6,contentTypes:['application/xml','text/xml','text/plain','application/octet-stream']});
      if(r.status!==200)continue;const parsed=parseSitemap(r.body.toString());
      if(parsed.isIndex){for(const u of parsed.urls)if(!seen.has(u))toVisit.push(u);}
      else for(const u of parsed.urls){const normalized=normalizedPage(u,origin);if(normalized&&!urls.includes(normalized))urls.push(normalized);}
    }catch(e){onNote(`Sitemap skipped ${raw}: ${e.message}`);}
  }
  return {robots,urls,canCrawl:true,delay:Math.max(500,robots.delay)};
}
export async function crawlSite({context,startUrl,maxPages=80,maxDepth=4,timeout=30000,delay=500,allowLocal=false,manualRoutes=[],onNote=()=>{}}){
  const origin=new URL(startUrl).origin;const discovery=await loadDiscovery(startUrl,{allowLocal,onNote});
  if(!discovery.canCrawl)throw Error('robots.txt policy could not be established; refusing crawl');
  const queue=[{url:startUrl,depth:0,source:'start'},...manualRoutes.map(url=>({url,depth:0,source:'manual'})),...discovery.urls.map(url=>({url,depth:0,source:'sitemap'}))];
  const seen=new Set();const pages=[];let skippedRobots=0;
  while(queue.length&&pages.length<maxPages){
    const item=queue.shift();const url=normalizedPage(item.url,origin);
    if(!url||seen.has(url)||item.depth>maxDepth)continue;
    seen.add(url);const parsed=new URL(url);
    if(!discovery.robots.allowed(parsed.pathname+parsed.search)){skippedRobots++;continue;}
    const page=await context.newPage();try{
      const response=await page.goto(url,{waitUntil:'domcontentloaded',timeout});
      await page.waitForTimeout(250);
      const final=normalizedPage(page.url(),origin);
      if(!final||!discovery.robots.allowed(new URL(final).pathname)){onNote(`Redirect out of scope: ${url}`);continue;}
      const row={url:final,depth:item.depth,source:item.source,title:await page.title(),httpStatus:response?.status()??null,status:'discovered'};pages.push(row);
      if(item.depth<maxDepth){const links=await page.locator('a[href]').evaluateAll(els=>els.map(a=>a.href)).catch(()=>[]);
        for(const href of links){const next=normalizedPage(href,origin);if(next&&!seen.has(next))queue.push({url:next,depth:item.depth+1,source:final});}
      }
    }catch(e){pages.push({url,depth:item.depth,source:item.source,status:'crawl_failed',error:String(e.message)});onNote(`Crawl error ${url}: ${e.message}`);}
    finally{await page.close();}
    await new Promise(r=>setTimeout(r,Math.max(discovery.delay,delay)));
  }
  // Persist usable unresolved URLs so subsequent bounded scans can continue beyond the 200-page limit.
  // Robots policy and same-origin normalization are rechecked on every subsequent scan.
  const pendingRoutes=[...new Set(queue.map(item=>normalizedPage(item.url,origin)).filter(url=>{
    if(!url||seen.has(url))return false;
    const parsed=new URL(url);
    return discovery.robots.allowed(parsed.pathname+parsed.search);
  }))];
  return {pages,pendingRoutes,coverage:{sitemapRoutes:discovery.urls.length,robotsSkipped:skippedRobots,pendingQueue:queue.length,pendingUniqueRoutes:pendingRoutes.length,delayMs:Math.max(discovery.delay,delay)}};
}
