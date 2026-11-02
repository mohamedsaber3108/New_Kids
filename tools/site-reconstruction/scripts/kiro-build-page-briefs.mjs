import fs from 'node:fs/promises';
import path from 'node:path';
function arg(name,fallback=null){const i=process.argv.indexOf('--'+name);return i<0?fallback:process.argv[i+1];}
const ref=arg('reference'),out=arg('out');
if(!ref||!out){console.error('Usage: node scripts/kiro-build-page-briefs.mjs --reference <scan-dir> --out <briefs-dir>');process.exit(1);}
const reference=path.resolve(ref),destination=path.resolve(out);
async function json(file){return JSON.parse(await fs.readFile(path.join(reference,file),'utf8'));}
const {pages=[]}=await json('CONTENT_INDEX.json');
const routeGraph=await json('ROUTE_GRAPH.json').catch(()=>({routes:[]}));
const rows=[];await fs.mkdir(destination,{recursive:true});
const clean=(s)=>String(s||'page').replace(/[^a-z0-9-]/gi,'-').replace(/^-+|-+$/g,'').slice(0,55)||'page';
const safeText=(s)=>String(s||'').replace(/\r/g,'').slice(0,2500);
const csv=(s)=>'"'+String(s??'').replace(/"/g,'""')+'"';
for(let i=0;i<pages.length;i++){
  const pg=pages[i];let pathname='page';try{pathname=new URL(pg.url).pathname;}catch{}
  const filename=`${String(i+1).padStart(4,'0')}-${clean(pathname)}.md`;
  const info=routeGraph.routes?.find(x=>x.url===pg.url)||{};
  const notes=`# USAM page implementation brief ${i+1}\n\nReference URL: ${pg.url}\nTitle: ${safeText(pg.title)}\nRecorded status: ${pg.status||'unknown'}\nReference sections: ${pg.sectionCount??'unknown'}\nReference headings: ${pg.headingCount??'unknown'}\nImages observed: ${pg.imageCount??'unknown'}\nInteraction state samples: ${info.states??'unknown'}\n\n## Evidence you MUST inspect before coding\n\n- Reference package: ${reference}\n- Per-page markup/section outline: ${pg.pageFile?path.join(reference,pg.pageFile):'not supplied'}\n- Full browser evidence: ${path.join(reference,'evidence.json')} -> pages[${i}] (read only targeted entry with a streaming parser if large)\n- Responsive screenshots: locate file names inside the page outline or matching evidence entry\n- Global design: DESIGN.md, DESIGN_TOKENS.json, DESIGN_FAMILIES.json, RESPONSIVE.md\n- Components and layout: COMPONENT_REGISTRY.json, FRONTEND_BLUEPRINT.json, STRUCTURAL_COVERAGE.json\n- Features, journeys, motion: FEATURE_INVENTORY.json, USER_JOURNEYS.json, INTERACTIONS.md, ANIMATION_CATALOG.json\n- Assets/API: ASSET_MAP.json, SOURCE_INVENTORY.json, API_SURFACE.json\n- Limitations: QUALITY_GATES.md, GAPS.md\n\n## Reference page content preview (not a substitute for the page file)\n\n${safeText(pg.mainTextPreview)||'No text preview observed.'}\n\n## Required implementation work\n\n1. Decide which USAM route/template/role corresponds to this reference page. Record an explicit exclusion reason if not applicable.\n2. Implement all approved visible sections and states with reusable components, original USAM assets and validated responsive styling.\n3. Preserve real USAM backend contracts, learning engines and authorization. Never invent server responses.\n4. Test relevant interactions, accessibility, loading/error states and screenshot comparison.\n5. Update route mapping, Git diff/commit evidence and verified acceptance status.\n\nDo not claim this reference page is implemented until the actual USAM page has been coded and tested.\n`;
  await fs.writeFile(path.join(destination,filename),notes);
  rows.push({ref:pg.url,title:pg.title||'',evidence:pg.pageFile||'',brief:filename,status:'UNMAPPED',usamRoute:'',implementationFile:'',tests:'',exclusionReason:''});
}
const headers=['Reference URL','Reference Title','Page Evidence File','Generated Brief','Status','USAM Destination Route','Actual Code Files','Verification','Exclusion Reason'];
const csvRows=[headers.map(csv).join(',')];
for(const r of rows)csvRows.push([r.ref,r.title,r.evidence,r.brief,r.status,r.usamRoute,r.implementationFile,r.tests,r.exclusionReason].map(csv).join(','));
await fs.writeFile(path.join(destination,'ROUTE_IMPLEMENTATION_MATRIX.csv'),csvRows.join('\n')+'\n');
await fs.writeFile(path.join(destination,'README.md'),`# Generated per-page briefs\n\nGenerated from actual CONTENT_INDEX.json: ${pages.length} recorded page entries. These are evidence-linked instructions, not completed code.\n\nThe agent must map pages to USAM routes and verify every implementation. Unscanned URLs and private page states are not available in these prompts.\n`);
console.log(`Created ${rows.length} page briefs and ROUTE_IMPLEMENTATION_MATRIX.csv in ${destination}`);
