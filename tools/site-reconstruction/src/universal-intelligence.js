// Site-agnostic reconstruction intelligence: evidence-driven observations, not recovered source logic.
// Only already-collected metadata is used. No new requests, secret capture or behavioral automation.
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

const trunc=(v,n=140)=>String(v??'').replace(/[\r\n\t]+/g,' ').replace(/\s+/g,' ').trim().slice(0,n);
const id=(kind,key)=>kind+'-'+crypto.createHash('sha256').update(String(key)).digest('hex').slice(0,12);
const dedup=arr=>[...new Set(arr)];
const put=async(out,name,value)=>fs.writeFile(path.join(out,name),typeof value==='string'?value:JSON.stringify(value,null,2)+'\n','utf8');
const md=v=>trunc(v,300).replaceAll('|','\\|').replaceAll('`','\\`');
const safeUrl=s=>{try{const u=new URL(s);return ['https:','http:'].includes(u.protocol)&&!u.username&&!u.password?u:null;}catch{return null;}};
// Path segment filtering is best-effort: URL paths can still contain personal information. Review before sharing.
const secretPath=/(^|\/)(?:oauth|callback|token|secret|password|reset-password|verify-email|session-key|api-key|auth\/refresh)(\/|$)/i;
function safeApiEndpoint(raw){
  const u=safeUrl(raw);if(!u||secretPath.test(u.pathname))return null;
  const segments=u.pathname.split('/').map(part=>{
    if (!part) return '';
    const decoded=(()=>{try{return decodeURIComponent(part)}catch{return part}})();
    if(decoded.includes('@')||/[?&#=]/.test(decoded)||part.length>44)return ':redacted';
    if(/^\d{2,}$/.test(part)||/^[0-9a-f-]{16,}$/i.test(part)||/^[A-Za-z0-9_-]{28,}$/.test(part))return ':id';
    return part.replace(/[^a-z0-9._~%-]/gi,'').slice(0,40)||':redacted';
  });
  const pathname=segments.join('/').slice(0,250)||'/';
  return {origin:u.origin,path:pathname,template:u.origin+pathname};
}
function groupControl(c){
  const role=(c.role||'').toLowerCase(),tag=(c.tag||'').toLowerCase(),type=(c.type||'').toLowerCase();
  const label=trunc(c.label,90);
  if(role==='tab')return 'tab';
  if(role==='switch'||c.ariaExpanded!==null&&c.ariaExpanded!==undefined)return 'disclosure';
  if(tag==='input'||tag==='select'||tag==='textarea')return type==='search'?'search':'input';
  if(tag==='a')return 'navigation';
  if(tag==='button')return type==='submit'?'form-action':'action';
  return 'interactive-control';
}
const sectionKey=(p,s,i)=>p.url+'#section-'+(s.selector||i);
function markdownList(items,max=35){return items.slice(0,max).map(x=>`- ${x}`).join('\n')||'- Not observed';}

export function buildUniversalIntelligence(raw,{targetUrl=null,brand=null}={}){
  const pages=(raw.pages||[]).filter(p=>p?.evidence);
  const first=safeUrl(raw.startUrl);
  const pagesOut=[],features=[],apiMap=new Map(),forms=[],entityMap=new Map(),journeys=[],nodes=[],edges=[];
  const featureMap=new Map();
  const known=new Set(pages.map(p=>p.url));
  const normalizedToPage=new Map(pages.map(p=>{const u=safeUrl(p.url);return [u?u.origin+u.pathname:p.url,p];}));
  const addNode=(v)=>nodes.push(v);
  const edge=(from,to,relation,evidence='observed',note)=>edges.push({from,to,relation,evidence,...(note?{note}:{})});
  for(const p of pages){
    const e=p.evidence||{},deep=p.deepEvidence||{},pageId=id('page',p.url), pageMeta={id:pageId,url:p.url,title:trunc(p.title||e.title,180),sections:[],features:[],forms:[],apiEndpoints:[],outgoing:[]};
    addNode({id:pageId,kind:'page',label:pageMeta.title,url:p.url});
    const knownSections=(deep.sections||[]).slice(0,180);
    for(const [index,s] of knownSections.entries()){
      const sid=id('section',sectionKey(p,s,index));
      addNode({id:sid,kind:'section',label:trunc(s.label||s.tag,130),selector:trunc(s.selector,160),page:p.url,
        layout:s.bounds||null,style:s.style||{}});
      edge(pageId,sid,'contains-section');
      pageMeta.sections.push(sid);
    }
    const controls=(deep.controls||[]).slice(0,800);
    const seenControl=new Set();
    for(const c of controls){
      const type=groupControl(c),label=trunc(c.label,100)||type;
      const key=type+'|'+label.toLowerCase()+'|'+(c.selector||'');
      if(seenControl.has(key))continue;seenControl.add(key);
      const fid=id('feature',type+'|'+label.toLowerCase());
      let f=featureMap.get(fid);
      if(!f){f={id:fid,name:label,category:type,evidenceLevel:'observed-ui-control',behaviorVerified:false,
        description:'An interactive control is present. Its complete business behavior is not established by DOM evidence.',
        pages:[],controls:[],coObservedApiIds:[],limitations:['No backend contract or server behavior inferred']};
        featureMap.set(fid,f);addNode({id:fid,kind:'feature',label,category:type});}
      if(!f.pages.includes(p.url))f.pages.push(p.url);
      if(f.controls.length<80)f.controls.push({page:p.url,selector:trunc(c.selector,160),role:c.role||null,tag:c.tag||null,href:safeUrl(c.href)?(()=>{const u=safeUrl(c.href);return u.origin+u.pathname})():null,ariaExpanded:c.ariaExpanded??null,required:!!c.required,disabled:!!c.disabled,observedStyle:c.style||{}});
      if(!pageMeta.features.includes(fid))pageMeta.features.push(fid);
      edge(pageId,fid,'exposes-feature');
    }
    for(const [i,f] of (e.forms||[]).entries()){
      const formId=id('form',p.url+'|'+i),fieldNames=(f.fields||[]).slice(0,80).map(x=>({
        type:trunc(x.type||x.tag,35),label:trunc(x.ariaLabel||x.placeholder||x.text,85),name:trunc(x.name,65),required:!!x.required
      }));
      const method=['GET','POST'].includes(String(f.method||'').toUpperCase())?String(f.method).toUpperCase():'unknown';
      forms.push({id:formId,page:p.url,method,actionKind:'browser-form-observed',fields:fieldNames,submitted:false,
        schemaVerified:false,behaviorVerified:false});
      addNode({id:formId,kind:'form',label:'Form '+(i+1),page:p.url});edge(pageId,formId,'contains-form');
      pageMeta.forms.push(formId);
      // Only derive a *possible* data concept from labels; never claim knowledge of database schema.
      const concept=trunc((e.headings||[]).find(x=>x.tag==='h1')?.text||p.title||'form',95);
      const entityId=id('concept',concept.toLowerCase());
      const entity=entityMap.get(entityId)||{id:entityId,label:concept,basis:'form-field grouping, possible domain concept only',fields:[],pages:[],confirmedBackendEntity:false};
      entity.fields=dedup([...entity.fields,...fieldNames.map(x=>x.name||x.label).filter(Boolean)]).slice(0,85);
      entity.pages=dedup([...entity.pages,p.url]);entityMap.set(entityId,entity);
      edge(formId,entityId,'suggests-concept','hypothesis','Form metadata does not reveal database schemas');
    }
    for(const [i,s] of (deep.schemas||[]).entries()){
      if(typeof s?.type!=='string'||!s.type)continue;
      const cId=id('concept','schema:'+s.type),v=entityMap.get(cId)||{id:cId,label:trunc(s.type,85),basis:'structured-data @type observed in DOM',fields:[],pages:[],confirmedBackendEntity:false};
      v.fields=dedup([...v.fields,...(s.keys||[]).map(k=>trunc(k,80))]);v.pages=dedup([...v.pages,p.url]);entityMap.set(cId,v);
    }
    // Passive requests only: no headers, bodies, query strings, tokens, response data or active API probing.
    for(const r of (p.telemetry?.desktop?.requests||[]).slice(0,1000)){
      if(!['fetch','xhr'].includes(String(r.resourceType).toLowerCase()))continue;
      const clean=safeApiEndpoint(r.url);if(!clean)continue;
      const method=['GET','POST','PUT','PATCH','DELETE','HEAD','OPTIONS'].includes(r.method)?r.method:'UNKNOWN';
      const key=method+' '+clean.template,apiId=id('api',key);
      const entry=apiMap.get(key)||{id:apiId,method,origin:clean.origin,pathTemplate:clean.path,
        nature:'observed-browser-network-request',publicContractVerified:false,requestSchema:null,responseSchema:null,authentication:null,
        observedOnPages:[],resourceType:'fetch/xhr',notes:['Request metadata only; co-occurrence does not prove feature causality','Dynamic path segments best-effort redacted']};
      if(!entry.observedOnPages.includes(p.url))entry.observedOnPages.push(p.url);
      apiMap.set(key,entry);
      if(!pageMeta.apiEndpoints.includes(apiId))pageMeta.apiEndpoints.push(apiId);
      edge(pageId,apiId,'observed-network-request');
    }
    const outbound=(e.links||[]).slice(0,3500);
    for(const l of outbound){
      const dest=safeUrl(l.href);if(!dest)continue;
      const cleaned=dest.origin+dest.pathname;
      // Keep only observed links to inspected routes (or their query-stripped normalized form).
      const inScope=known.has(l.href)||normalizedToPage.has(cleaned);
      if(!inScope)continue;
      const toPage=pages.find(other=>other.url===l.href)||normalizedToPage.get(cleaned);
      if(!toPage)continue;
      const jid=id('journey',p.url+'->'+toPage.url+'|'+trunc(l.text,60));
      if(!journeys.some(j=>j.id===jid))journeys.push({id:jid,name:trunc(l.text,100)||'Navigation',from:p.url,to:toPage.url,
        evidenceLevel:'observed-link',clickedAndValidated:false,steps:[{type:'link',label:trunc(l.text,100),href:cleaned}],unknowns:['Destination state beyond captured page is not guaranteed']});
      pageMeta.outgoing.push(jid);
      edge(pageId,id('page',toPage.url),'links-to-page');
    }
    pagesOut.push(pageMeta);
  }
  for(const [_,a] of apiMap){addNode({id:a.id,kind:'network-endpoint',label:a.method+' '+a.origin+a.pathTemplate});}
  for(const f of featureMap.values()){
    const pagesSet=new Set(f.pages);
    f.coObservedApiIds=dedup([...apiMap.values()].filter(a=>a.observedOnPages.some(p=>pagesSet.has(p))).map(a=>a.id)).slice(0,20);
    // Co-observation is not a claim the control triggers the endpoint.
    for(const apiId of f.coObservedApiIds)edge(f.id,apiId,'co-observed-on-page','correlation-not-causation');
    features.push(f);
  }
  for(const concept of entityMap.values())addNode({id:concept.id,kind:'domain-concept-hint',label:concept.label,basis:concept.basis});
  const uncertainties=[
    {priority:'critical',code:'BACKEND_NOT_OBSERVABLE',detail:'Private source, database entities, business rules, private API schemas and authorized flows are not recovered by public inspection.'},
    {priority:'high',code:'FEATURE_BEHAVIOR_UNVERIFIED',detail:'DOM controls and links reveal possible features, not complete workflows or state transitions.'},
    {priority:'high',code:'NETWORK_CONTRACT_UNVERIFIED',detail:'Endpoint routes/methods are passive metadata; requests/responses/auth schemas are deliberately absent.'},
    {priority:'high',code:'CONTENT_AND_ROUTES_INCOMPLETE',detail:'Only scanned/accessible pages and bounded DOM/telemetry evidence are represented.'},
    {priority:'medium',code:'DATA_MODEL_IS_HINT_ONLY',detail:'Observed form fields and JSON-LD types cannot establish tables, relationships or validations.'},
    {priority:'high',code:'UNVALIDATED_REBUILD',detail:'Implementation correctness and visual/functional parity require tests against a lawful rebuild.'}
  ];
  return {schemaVersion:'1.0',sourceSite:first?first.origin:null,target:{url:targetUrl||null,brand:brand||null},capturedPages:pagesOut.length,
    pages:pagesOut,features,forms,conceptHints:[...entityMap.values()],apiSurface:[...apiMap.values()],journeys,
    relationshipGraph:{nodes,edges},uncertainties,
    methodology:{observed:['DOM controls and forms','Links between inspected pages','Passive fetch/xhr metadata without queries or bodies','JSON-LD @types'],
      inferred:['Cross-page recurring control names','Form-based domain concepts'],
      notCollected:['Tokens/cookies','Request/response bodies','Private APIs','User-specific records','Server source','Database schemas'],
      caveats:['Browser-provided metadata is not an original full-stack architecture','Route path redaction is best-effort','Feature-to-API edges are correlation only']}};
}

export async function writeUniversalIntelligence(out,raw,{targetUrl=null,brand=null}={}){
  const d=buildUniversalIntelligence(raw,{targetUrl,brand});
  const base={source:d.sourceSite,scannedPages:d.capturedPages,methodology:d.methodology};
  await put(out,'SITE_INTELLIGENCE.json',{...base,counts:{features:d.features.length,forms:d.forms.length,apiEndpoints:d.apiSurface.length,journeys:d.journeys.length,domainHints:d.conceptHints.length},pages:d.pages});
  await put(out,'FEATURE_INVENTORY.json',{...base,features:d.features,forms:d.forms});
  await put(out,'API_SURFACE.json',{...base,endpoints:d.apiSurface,warning:'Observation only; never use these endpoints as validated backend contracts.'});
  await put(out,'USER_JOURNEYS.json',{...base,journeys:d.journeys,warning:'Navigation links are not tested end-to-end user flows.'});
  await put(out,'DOMAIN_MODEL_HINTS.json',{...base,conceptHints:d.conceptHints,warning:'Hints, not database models or original schema.'});
  await put(out,'RELATIONSHIP_GRAPH.json',{...base,...d.relationshipGraph});
  const categorySummary=Object.entries(Object.groupBy(d.features,f=>f.category)).map(([category,list])=>({category,controlCount:list.length,pages:dedup(list.flatMap(f=>f.pages)).length}));
  const experience=d.pages.map(p=>({page:p.url,title:p.title,sections:p.sections.map(k=>d.relationshipGraph.nodes.find(n=>n.id===k)?.label||'unknown'),
    controls:p.features.map(k=>d.features.find(f=>f.id===k)).filter(Boolean).slice(0,70).map(f=>({label:f.name,category:f.category,evidence:'observed-control-only'})),
    possiblePagePurpose:p.title,evidenceLevel:'page-title-heuristic'}));
  await put(out,'UX_PATTERN_MAP.json',{...base,summary:categorySummary,pages:experience,warning:'Page purpose is a title-based hypothesis; these are not original product strategy documents.'});
  await put(out,'EXPERIENCE_MAP.md',`# Website experience and feature organization\n\nSource: ${d.sourceSite||'unknown'}\n\nThis is a map of observable UI patterns and section labels. It does **not** claim to know the original product team’s ideas, priorities or strategy.\n\n## Interaction patterns\n${markdownList(categorySummary.map(x=>`${x.category}: ${x.controlCount} feature candidates across ${x.pages} pages`),30)}\n\n## Page-by-page purpose hints\n${markdownList(experience.map(x=>`**${md(x.title)}** — ${md(x.page)}; sections: ${x.sections.slice(0,8).map(md).join(', ')||'none observed'}; controls: ${x.controls.length}`),120)}\n\n**Use with:** FEATURE_INVENTORY.json, RELATIONSHIP_GRAPH.json, DESIGN_TOKENS.json and screenshots. Any business goals or hypotheses require human verification.\n`);
  const topFeatures=d.features.slice(0,65).map(f=>`| ${md(f.name)} | ${md(f.category)} | ${f.pages.length} | observed control, behavior unverified |`).join('\n');
  const apiLines=d.apiSurface.slice(0,85).map(x=>`| ${x.method} | ${md(x.origin+x.pathTemplate)} | ${x.observedOnPages.length} | body/schema unknown |`).join('\n');
  await put(out,'FUNCTIONAL_BLUEPRINT.md',`# Universal functional reconstruction blueprint\n\nSource: ${d.sourceSite||'unknown'}\nTarget: ${targetUrl||'[select destination project or new app]'}\nBrand identity: ${brand||'[select original identity or authorized brand]'}\n\nThis document covers **observed interface affordances and passive network metadata**, not recovered backend behavior or a working clone. It can be used for any authorized site and is not tied to any particular product.\n\n## Site-wide scope\n- Inspected pages: ${d.capturedPages}\n- Distinct observed UI feature candidates: ${d.features.length}\n- Observed forms: ${d.forms.length}\n- Passive fetch/xhr endpoint templates: ${d.apiSurface.length}\n- Link-only journey candidates: ${d.journeys.length}\n- Domain concept hints: ${d.conceptHints.length}\n\n## Feature inventory (first 65)\n| Feature label | Kind | Pages | Certainty |\n|---|---|---:|---|\n${topFeatures||'| None | - | - | Not observed |'}\n\n## Network evidence (first 85)\n| Method | URL template (query removed) | Pages seen on | Contract |\n|---|---|---:|---|\n${apiLines||'| - | No fetch/xhr recorded | - | Not observable |'}\n\n## Architecture reconstruction workflow\n1. Inventory all required routes and template families (ROUTE_GRAPH.json, FRONTEND_BLUEPRINT.json, SITE_INTELLIGENCE.json).\n2. Group UI controls and shared components, verify behavior manually against the original with authorization.\n3. Use USER_JOURNEYS.json to plan navigation tests. Link existence is **not** proof of complete workflow.\n4. Use API_SURFACE.json to identify observed traffic. Inspect your own backend/approved API docs to create actual request, response, auth, validation and error contracts.\n5. Translate DOMAIN_MODEL_HINTS.json to a proposed model only after domain review; never copy guessed tables into production.\n6. Specify responsive layouts, animations, accessibility, localization and edge cases from verified evidence.\n7. Implement, test and compare a legally permitted destination app; record discrepancies and missing states.\n\n## Uncertainties\n${markdownList(d.uncertainties.map(x=>`**${x.code}** — ${x.detail}`),25)}\n\n## Evidence separation\n- **Observed:** browser DOM/links/style, captured states, fetch/xhr URL and method.\n- **Heuristic:** grouping common features, domain concept hints, page/API co-occurrence.\n- **Unknown:** backend/business rules, original project files, hidden content, private APIs, animation engines.\n\nSee TRACEABILITY_MATRIX.md to connect observed facts to actual implementation tests.\n`);
  await put(out,'TRACEABILITY_MATRIX.md',`# Requirement traceability matrix\n\nEvery target feature needs: requirement, evidence link, implementation module, test, permission and verified status.\n\n| Feature ID | Feature | Captured pages | Evidence level | Implementation | Test | Status |\n|---|---|---|---|---|---|---|\n${d.features.slice(0,200).map(f=>`| ${f.id} | ${md(f.name)} | ${f.pages.length} | ${f.evidenceLevel} | TBD | TBD | UNVERIFIED |`).join('\n')||'| - | No controls observed | - | - | TBD | TBD | UNVERIFIED |'}\n\nA traceability row is not completed until a human-approved requirement and a passing implementation test are attached.\n`);
  await put(out,'UNCERTAINTY_REGISTER.md',`# Evidence and implementation uncertainty register\n\n${d.uncertainties.map((x,i)=>`${i+1}. **${x.priority.toUpperCase()} — ${x.code}**: ${x.detail}`).join('\n\n')}\n\n## Scan-specific checks\n- Inspect QUALITY_GATES.md / GAPS.md for pages excluded by robots, timeouts, missing assets or missing state probes.\n- Inspect API_SURFACE.json: absence of request metadata is **not** proof an API does not exist.\n- Do not infer payments, authentication or private data contracts from a marketing website.\n- Verify licensing before redistributing any source assets or copy.\n`);
  await put(out,'IMPLEMENTATION_BACKLOG.md',`# Reconstruction implementation backlog — site-agnostic\n\n- [ ] Agree scope, destination URL, branding and authorization/rights to content and assets.\n- [ ] Establish a route-by-route inventory and choose reusable templates.\n- [ ] Validate feature descriptions and missing UI states with real users/manual inspection.\n- [ ] Specify domain models with evidence and source-of-truth backend docs.\n- [ ] Specify API contracts including auth, permissions, error and loading states (not from passive metadata alone).\n- [ ] Implement shared design tokens, responsive layout, typography and components.\n- [ ] Implement approved features and safe navigation flows.\n- [ ] Test security, accessibility, performance and data privacy.\n- [ ] Run screenshot and functional parity comparisons against approved reference states.\n- [ ] Verify all requirements in TRACEABILITY_MATRIX.md and resolve uncertainties explicitly.\n`);
  return d;
}
