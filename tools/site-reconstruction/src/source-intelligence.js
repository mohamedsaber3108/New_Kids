import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import {safeGet} from './security.js';
import {parseRobots} from './discovery.js';

// Everything in this module is evidence of browser-delivered files, NOT the author's private repository.
export function cleanPublicURL(value) {
  try {
    const u = new URL(value);
    if (!['http:', 'https:'].includes(u.protocol) || u.username || u.password) return null;
    u.search = ''; u.hash = '';
    return u.href;
  } catch { return null; }
}
export async function inspectBrowserSource(page) {
  return page.evaluate(() => {
    const publicURL = value => {
      try { const u = new URL(value, location.href); if (!['http:', 'https:'].includes(u.protocol)) return null; u.search='';u.hash='';return u.href; }
      catch { return null; }
    };
    const selectors = [];
    const animations = [];
    const fonts = [];
    const stylesheets = [];
    const errors = [];
    let inaccessibleStylesheets = 0;
    let rulesInspected = 0;
    const seenSheets = new Set();
    function walk(sheet, depth=0) {
      if (!sheet || seenSheets.has(sheet) || depth > 4 || rulesInspected >= 10000) return;
      seenSheets.add(sheet);
      let rules; try { rules = [...sheet.cssRules]; } catch {inaccessibleStylesheets++;return;}
      for (const rule of rules.slice(0, 6000)) {
        if(rulesInspected++ >= 10000)break;
        if (rule.type === CSSRule.KEYFRAMES_RULE && animations.length < 300) {
          animations.push({name:rule.name,frames:[...rule.cssRules].slice(0,70).map(r=>({key:r.keyText,
            declarations:[...r.style].slice(0,24).map(name=>({property:name,value:r.style.getPropertyValue(name).slice(0,180)}))}))});
        } else if (rule.type===CSSRule.FONT_FACE_RULE && fonts.length < 250) {
          fonts.push({family:rule.style.fontFamily,weight:rule.style.fontWeight,style:rule.style.fontStyle,
            source:rule.style.src?.slice(0,450)||null});
        } else if (rule.selectorText && selectors.length < 2200) {
          selectors.push({selector:rule.selectorText.slice(0,260),specificityHint:(rule.selectorText.match(/#/g)||[]).length,
            properties:[...rule.style].slice(0,35)});
        }
        if (rule.styleSheet) walk(rule.styleSheet,depth+1);
        if (rule.cssRules) { try { for(const nested of [...rule.cssRules].slice(0,150)) {
          if(nested.type===CSSRule.KEYFRAMES_RULE && animations.length < 300)
            animations.push({name:nested.name,condition:rule.conditionText||null,
              frames:[...nested.cssRules].slice(0,70).map(r=>({key:r.keyText,
                declarations:[...r.style].slice(0,24).map(name=>({property:name,value:r.style.getPropertyValue(name).slice(0,180)}))}))});
        }} catch { errors.push('Nested stylesheet not accessible'); } }
      }
    }
    for (const sheet of [...document.styleSheets]) {
      stylesheets.push({href:sheet.href?publicURL(sheet.href):null,media:sheet.media?.mediaText||null,disabled:!!sheet.disabled});
      walk(sheet);
    }
    const scripts=[...document.querySelectorAll('script[src]')].slice(0,2500).map(s=>({
      url:publicURL(s.src),hasQuery:!!new URL(s.src).search,type:s.type||'classic',async:s.async,defer:s.defer,crossOrigin:s.crossOrigin||null
    })).filter(s=>s.url);
    const sheets=[...document.querySelectorAll('link[rel~="stylesheet"][href]')].slice(0,1500).map(l=>({
      href:publicURL(l.href),hasQuery:!!new URL(l.href).search,media:l.media||null
    })).filter(s=>s.href);
    const preload=[...document.querySelectorAll('link[rel="modulepreload"],link[rel="preload"]')].slice(0,1000).map(l=>({
      href:publicURL(l.href),as:l.as||null,rel:l.rel
    })).filter(s=>s.href);
    const resources=performance.getEntriesByType('resource').slice(0,5000).map(r=>({url:publicURL(r.name),type:r.initiatorType||'',duration:Math.round(r.duration),transferSize:r.transferSize||0})).filter(r=>r.url);
    const waapi=[...document.getAnimations()].slice(0,120).map(a=>({
      playState:a.playState,
      effectTiming:a.effect?.getTiming?.()||null,
      keyframes:a.effect?.getKeyframes?.().slice(0,30).map(f=>Object.fromEntries(Object.entries(f).filter(([k])=>!['composite','computedOffset'].includes(k)).map(([k,v])=>[k,String(v).slice(0,180)])))||[]
    }));
    const customProperties={};
    for(const prop of getComputedStyle(document.documentElement))if(prop.startsWith('--')&&Object.keys(customProperties).length<1000){
      customProperties[prop]=getComputedStyle(document.documentElement).getPropertyValue(prop).trim().slice(0,200);
    }
    const cssAnimations=[...document.querySelectorAll('body *')].slice(0,6000).map(el=>{
      const s=getComputedStyle(el);if(!s.animationName||s.animationName==='none')return null;
      return {tag:el.tagName.toLowerCase(),id:el.id||null,className:typeof el.className==='string'?el.className.slice(0,160):null,
        name:s.animationName,duration:s.animationDuration,delay:s.animationDelay,iterationCount:s.animationIterationCount,
        timingFunction:s.animationTimingFunction};
    }).filter(Boolean).slice(0,150);
    return {kind:'public-browser-runtime-evidence',scripts,sheets,stylesheets,preload,resources,
      css:{keyframes:animations,fontFaces:fonts,selectors,rootComputedVariables:customProperties,
        accessibleRules:rulesInspected,inaccessibleStylesheets,errors},
      waapi,cssAnimations,
      limitations:['Script URLs and CSS rule lists are public browser evidence, not original unminified source',
        'Cross-origin CSSOM rules may be inaccessible; do not treat missing CSS as proof it does not exist',
        'Scripts, headers, cookies, response bodies, input values and private API data are not captured in this runtime summary']};
  });
}
export function buildSourceIndex(pages, archives=[]) {
  const byURL=new Map();
  for(const page of pages) {
    const evidence=page.sourceEvidence||{};
    const candidates=[...(evidence.scripts||[]).map(x=>({url:x.url,type:'javascript',hasQuery:x.hasQuery})),
      ...(evidence.sheets||[]).map(x=>({url:x.href,type:'css',hasQuery:x.hasQuery})),
      ...(evidence.preload||[]).filter(x=>['script','style'].includes(x.as)).map(x=>({url:x.href,type:x.as==='style'?'css':'javascript'}))];
    for(const candidate of candidates) {
      const u=cleanPublicURL(candidate.url);if(!u)continue;
      const record=byURL.get(u)||{url:u,type:candidate.type,pages:[]};
      if(!record.pages.includes(page.url))record.pages.push(page.url);
      if(candidate.hasQuery)record.queryObserved=true;
      byURL.set(u,record);
    }
  }
  for(const a of archives) if(byURL.has(a.url)) Object.assign(byURL.get(a.url),a);
  return {files:[...byURL.values()],total:[...byURL.values()].length,downloaded:archives.filter(a=>a.status==='downloaded').length,
    note:'URLs are normalized without query strings. Archive is opt-in, same-origin and governed by robots and size limits.'};
}
function cssFeatures(content){
  return {imports:[...new Set([...content.matchAll(/@import\s+(?:url\()?['"]?([^\s\)\;'"]{1,200})/g)].slice(0,120).map(m=>m[1]))],
    keyframes:[...content.matchAll(/@(?:-webkit-)?keyframes\s+([\w-]+)/g)].slice(0,300).map(x=>x[1]),
    media:[...content.matchAll(/@media\s*([^\{]{1,180})\s*\{/g)].slice(0,300).map(x=>x[1].trim()),
    customProperties:[...new Set([...content.matchAll(/--[\w-]+\s*:/g)].slice(0,1500).map(x=>x[0].slice(0,-1).trim()))],
    fontFaces:(content.match(/@font-face\s*\{/g)||[]).length};
}
function scriptFeatures(content) {
  return {frameworkHints:[...new Set([
      /__webpack_require__|webpackChunk/.test(content)?'webpack':null,
      /__NEXT_DATA__|next\/static/.test(content)?'nextjs':null,
      /react-dom|ReactDOM/.test(content)?'react-dom':null,
      /createApp\(/.test(content)?'vue-or-generic':null
    ].filter(Boolean))],
    importSpecifiers:[...new Set([
      ...[...content.matchAll(/\b(?:import|export)\s*(?:[^'"`]*?\s+from\s*)?['"]([^'"`]{1,180})['"]/g)].slice(0,70).map(m=>m[1]),
      ...[...content.matchAll(/\bimport\s*\(\s*['"]([^'"`]{1,180})['"]\s*\)/g)].slice(0,70).map(m=>m[1])
    ])].slice(0,100),
    ecmascriptImports:(content.match(/\bimport\s*\(/g)||[]).length,
    moduleExports:(content.match(/\bexport\s+(?:default|const|function|class|\{)/g)||[]).length,
    urlPatterns:[...new Set([...content.matchAll(/https?:\/\/[^\s"'`<>]{3,180}/g)].slice(0,80).map(m=>{
      try {const u=new URL(m[0]);u.search='';u.hash='';return u.origin;}catch{return null;}
    }).filter(Boolean))].slice(0,25),
    note:'Heuristics only. URL patterns may reference APIs but do not reveal endpoints or contracts.'};
}
export async function archivePublicSources({pages,outDir,startUrl,allowLocal=false,allowedSourceOrigins=[],limit=60,maxFileBytes=4_000_000,maxTotalBytes=40_000_000}={}) {
  const origin=new URL(startUrl).origin;
  const index=buildSourceIndex(pages);
  const authorized = new Set([origin]);
  for (const raw of allowedSourceOrigins) {
    try {const u=new URL(raw);if(!['http:','https:'].includes(u.protocol)||u.username||u.password||u.origin!==raw.replace(/\/$/,''))throw Error('Expected exact HTTP(S) origin with no path, query, credentials or hash');
      authorized.add(u.origin);}
    catch {throw Error(`Invalid authorized source origin: ${raw}`);}
  }
  const robotPolicies=new Map();
  for(const siteOrigin of authorized){
    try{
      const res=await safeGet(siteOrigin+'/robots.txt',{allowLocal,origin:siteOrigin,maxBytes:250_000,contentTypes:['text/plain']});
      if(res.status===200)robotPolicies.set(siteOrigin,parseRobots(res.body.toString()));
      else if(res.status===404)robotPolicies.set(siteOrigin,parseRobots(''));
      else robotPolicies.set(siteOrigin,null);
    }catch{robotPolicies.set(siteOrigin,null);}
  }
  if(!robotPolicies.get(origin))return {files:[],error:'Archiving refused: cannot establish robots.txt policy for the start origin'};
  const files=[];let total=0;
  await fs.mkdir(path.join(outDir,'public-source'),{recursive:true});
  for(const candidate of index.files.slice(0,limit)) {
    const u=new URL(candidate.url);
    if(!authorized.has(u.origin)){files.push({...candidate,status:'not-archived',reason:'origin not expressly authorized'});continue;}
    const robots=robotPolicies.get(u.origin);
    if(!robots){files.push({...candidate,status:'not-archived',reason:'robots policy unavailable'});continue;}
    if(candidate.queryObserved){files.push({...candidate,status:'not-archived',reason:'query-based URL not replayed to avoid token leakage or incorrect content'});continue;}
    if(!robots.allowed(u.pathname)){files.push({...candidate,status:'not-archived',reason:'robots excluded'});continue;}
    if(total>=maxTotalBytes){files.push({...candidate,status:'not-archived',reason:'total byte limit'});continue;}
    const ext=candidate.type==='css'?'.css':'.js';
    const types=candidate.type==='css'?['text/css']:['text/javascript','application/javascript','application/x-javascript','text/plain','application/octet-stream'];
    try {
      const res=await safeGet(candidate.url,{allowLocal,origin:u.origin,maxBytes:Math.min(maxFileBytes,maxTotalBytes-total),contentTypes:types});
      if(res.status!==200)throw Error(`HTTP ${res.status}`);
      const hash=crypto.createHash('sha256').update(res.body).digest('hex');
      const file=`public-source/${hash.slice(0,22)}${ext}`;
      await fs.writeFile(path.join(outDir,file),res.body,{flag:'wx'}).catch(e=>{if(e.code!=='EEXIST')throw e;});
      total+=res.body.length;
      const content=res.body.toString('utf8');
      files.push({...candidate,status:'downloaded',file,sha256:hash,bytes:res.body.length,contentType:res.type,
        signals:candidate.type==='css'?cssFeatures(content):scriptFeatures(content)});
    }catch(e){files.push({...candidate,status:'not-archived',reason:String(e.message).slice(0,200)});}
  }
  return {files,totalBytes:total,downloaded:files.filter(x=>x.status==='downloaded').length,
    note:'Only browser-delivered CSS/JS on explicit user opt-in. Same-origin by default; additional origins must be individually permitted via CLI and robots-checked. Review rights before reuse.'};
}

export async function exportSourceIntelligence(outDir,pages,{archive=null}={}) {
  const existingArchive=archive||await fs.readFile(path.join(outDir,'SOURCE_ARCHIVE_MANIFEST.json'),'utf8').then(JSON.parse).catch(()=>({files:[]}));
  const index=buildSourceIndex(pages,existingArchive.files||[]);
  const motion=pages.filter(p=>p.sourceEvidence).map(p=>({url:p.url,
    keyframes:p.sourceEvidence.css?.keyframes||[],cssAnimations:p.sourceEvidence.cssAnimations||[],
    webAnimations:p.sourceEvidence.waapi||[],inaccessibleStylesheets:p.sourceEvidence.css?.inaccessibleStylesheets||0,
    observations:p.motionFrames?.length||0}));
  const sourceFileCounts={css:index.files.filter(f=>f.type==='css').length,javascript:index.files.filter(f=>f.type==='javascript').length};
  const evidenceFlags={browserSourceEvidence:pages.filter(p=>p.sourceEvidence&&!p.sourceEvidence.error).length,
    deepDOM:pages.filter(p=>p.deepEvidence).length,
    interactions:pages.filter(p=>(p.stateProbes?.length||0)+(p.interactionStates?.length||0)>0).length,
    motion:pages.filter(p=>(p.motionFrames||[]).length>0).length,
    archivedPublicFiles:existingArchive.downloaded||0};
  const put=async(file,obj)=>fs.writeFile(path.join(outDir,file),JSON.stringify(obj,null,2)+'\n');
  await put('SOURCE_INVENTORY.json',{...index,sourceFileCounts,archive:existingArchive,note:'Delivered bundles are not original editable source or private backends.'});
  const urlMap=new Set(index.files.map(f=>f.url));
  const depEdges=[];
  for(const f of index.files)for(const specifier of f.signals?.importSpecifiers||f.signals?.imports||[]){
    try{const dest=cleanPublicURL(new URL(specifier,f.url).href);if(dest && urlMap.has(dest))depEdges.push({from:f.url,to:dest,kind:'statically-referenced'})}catch{}
  }
  await put('DEPENDENCY_GRAPH.json',{edges:depEdges,files:index.files.map(f=>({url:f.url,type:f.type,archived:f.status==='downloaded'})),
    limitations:'Static import hints only; bundled modules, runtime imports and server dependencies are not fully observable.'});
  await put('ANIMATION_CATALOG.json',{pages:motion,warning:'Observed CSS keyframes / WAAPI only; motion may be event-triggered, WebGL or gated.'});
  const blueprint=pages.filter(p=>p.deepEvidence).map(p=>({url:p.url,title:p.title||p.evidence?.title,
    screenshots:p.screenshots||[],sections:(p.deepEvidence?.sections||[]).map(s=>({selector:s.selector,label:s.label,tag:s.tag,bounds:s.bounds,
      style:s.style,childTags:s.childTags,textPreview:String(s.text||'').slice(0,400)})),
    controls:(p.deepEvidence?.controls||[]).map(c=>({selector:c.selector,role:c.role,label:c.label,bounds:c.bounds,style:c.style})),
    interactiveStates:(p.interactionStates||[]).length+(p.stateProbes||[]).length}));
  await put('FRONTEND_BLUEPRINT.json',{evidenceType:'observed-rendered-structure',pages:blueprint,
    note:'Selectors, bounding boxes, typography and states from observed renderings are implementation references, not original component boundaries.'});
  const lines=[
    '# Frontend source and animation evidence', '',
    `- Pages with browser source evidence: ${evidenceFlags.browserSourceEvidence}`,
    `- Public CSS URLs: ${sourceFileCounts.css}`,
    `- Public JavaScript URLs: ${sourceFileCounts.javascript}`,
    `- Public files archived with explicit opt-in: ${existingArchive.downloaded||0}`,
    `- Pages with motion frames: ${evidenceFlags.motion}`,
    `- Pages with interaction probes/states: ${evidenceFlags.interactions}`, '',
    '## How to interpret results',
    '- SOURCE_INVENTORY.json lists loaded public stylesheets and scripts and maps them to observed pages.',
    '- SOURCE_ARCHIVE_MANIFEST.json records permitted origin(s), robots-allowed, opt-in archived CSS/JS files and hashes.',
    '- ANIMATION_CATALOG.json records accessible CSS keyframes and Web Animations API samples, which are incomplete for WebGL and gated behavior.',
    '- DEPENDENCY_GRAPH.json contains static references found in optionally archived CSS/JS; it cannot recover an original dependency tree.',
    '- FRONTEND_BLUEPRINT.json maps each observed page section and control to style/layout evidence.',
    '- No tool can infer private backend logic, secret server source, original component architecture or every hidden state from publicly delivered assets.',
    '- Archive rights must be checked separately. Public downloadability is not a reproduction license.',
    ''
  ];
  await fs.writeFile(path.join(outDir,'CODE_EVIDENCE.md'),lines.join('\n'));
  await fs.writeFile(path.join(outDir,'CAPTURE_COVERAGE.md'),[
    '# Evidence coverage', '',
    `- Inspected pages in evidence.json: ${pages.filter(p=>p.evidence).length}`,
    ...Object.entries(evidenceFlags).map(([k,v])=>`- ${k}: ${v}`), '',
    '- Evidence flags show what was captured, not proof of complete coverage.',
    '- Outstanding proof: source authorization/licensing, gated pages, private logic, missing assets and visual comparison.',
    '- To improve capture, use --interactions --motion --save-html on authorized routes and --archive-public-source only where copying those files is permitted.',
    '' ].join('\n'));
  return {evidenceFlags,sourceFileCounts};
}
