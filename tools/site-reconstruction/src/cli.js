import path from 'node:path';import fs from 'node:fs/promises';import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';
import {parseArgs,bound,LIMITS} from './args.js';
import {validateTarget,installRequestGuard} from './security.js';
import {crawlSite} from './discovery.js';import {inspectPage} from './inspect.js';
import {collectAssets} from './assets.js';import {writePackage} from './report.js';
import {exportKnowledge} from './knowledge.js';
import {archivePublicSources,exportSourceIntelligence} from './source-intelligence.js';
import {summarizeStructure} from './structural-map.js';
import {analyzeCSSAst,summarizeOSS} from './oss-adapters.js';import {runEnrichment} from './integrations.js';import {compareSites} from './compare.js';
const args=parseArgs(process.argv.slice(3));const action=process.argv[2]||'scan';
try {
 if(action==='scan')await scan(args);
 else if(action==='analyze'){
   if(!args.reference)throw Error('analyze requires --reference ./output/site');
   const dest=path.resolve(args.reference);
   try {await fs.access(path.join(dest,'evidence.json'));}
   catch {throw Error(`Cannot analyze ${dest}: evidence.json not found. Confirm the scan folder has evidence.json; in PowerShell run: Get-ChildItem -Path ".\output" -Filter evidence.json -Recurse -File | Select-Object FullName`);}
   const report=await exportKnowledge(dest,{targetUrl:args['target-url']||null,brand:args.brand||null});
   const evidence=JSON.parse(await fs.readFile(path.join(dest,'evidence.json'),'utf8'));
   const intelligence=await exportSourceIntelligence(dest,evidence.pages||[]);
   console.log('Source evidence:',JSON.stringify(intelligence.evidenceFlags));
   console.log('Knowledge package:',JSON.stringify(report.summary));
 }
 else if(action==='enrich'){
   if(!args.reference)throw Error('enrich requires --reference ./output/site');
   const result=await runEnrichment({reference:path.resolve(args.reference),provider:String(args.provider||'scrapling'),limit:bound(args.limit,3,1,100,'limit'),python:String(args.python||'python'),input:args.input});
   console.log('Enrichment:',JSON.stringify(result));if(result.failed)process.exitCode=2;
 }
 else if(action==='compare'){
   if(!args.reference||!args.url)throw Error('compare needs --reference output-folder --url rebuilt-website');
   const allowLocal=args['allow-local']===true;
   const rows=await compareSites({reference:path.resolve(args.reference),url:args.url,outDir:path.resolve(args.out||'./comparison'),allowLocal,threshold:Number(args.threshold||0.08)});
   console.log(`Compared ${rows.length} screenshots, failed ${rows.filter(r=>!r.passed).length}`);
   if(rows.some(r=>!r.passed))process.exitCode=2;
 } else throw Error('Use scan, compare, analyze or enrich');
}catch(e){console.error(e.stack||e.message);process.exitCode=1;}
export async function scan(args) {
 if(!args.url)throw Error('scan requires --url https://example.com');
 const allowLocal=args['allow-local']===true;
 const target=await validateTarget(args.url,{allowLocal});
 const maxPages=bound(args['max-pages'],80,1,LIMITS.maxPages,'max-pages');
 const maxDepth=bound(args['max-depth'],4,0,LIMITS.maxDepth,'max-depth');
 const timeout=bound(args.timeout,30000,1000,LIMITS.maxTimeout,'timeout');
 const delay=bound(args.delay,LIMITS.delay,100,10000,'delay');
 const maxAssets=bound(args['max-assets'],50,1,LIMITS.maxAssets,'max-assets');
 const outDir=path.resolve(args.out||`./output/${target.url.hostname}`),shotsDir=path.join(outDir,'screenshots');
 await fs.mkdir(shotsDir,{recursive:true});const notes=[];const onNote=s=>{notes.push(s);console.log('NOTE:',s)};
 const manualRoutes=args['routes-file']?(await fs.readFile(path.resolve(args['routes-file']),'utf8')).split(/\r?\n/).map(s=>s.trim()).filter(s=>s&&!s.startsWith('#')):[];
 const browser=await chromium.launch({headless:true,executablePath:process.env.SRT_CHROMIUM_PATH||undefined});
 const context=await browser.newContext({ignoreHTTPSErrors:false,serviceWorkers:'block'});await installRequestGuard(context,{allowLocal});
 try{
  const discovered=await crawlSite({context,startUrl:target.url.href,maxPages,maxDepth,timeout,delay,allowLocal,manualRoutes,onNote});
  await fs.writeFile(path.join(outDir,'pending-routes.txt'),discovered.pendingRoutes.join('\n')+(discovered.pendingRoutes.length?'\n':''));
  const pages=[];
  for(let i=0;i<discovered.pages.length;i++){
    const p=discovered.pages[i];console.log(`[${i+1}/${discovered.pages.length}] ${p.url}`);
    if(p.status==='crawl_failed'){pages.push(p);continue;}
    try{const v=await inspectPage({context,url:p.url,index:i+1,shotsDir,timeout,interactions:args.interactions===true,deep:true,saveHTML:args['save-html']===true,motion:args.motion===true,structuralMap:args['structural-map']===true,ossIntelligence:args['oss-intelligence']===true});pages.push({...p,...v});}
    catch(e){const error=e.message;onNote(`Inspection ${p.url}: ${error}`);pages.push({...p,status:'inspection_failed',error});}
  }
  const assets=args['download-assets']===true?await collectAssets({pages,outDir,startUrl:target.url.href,allowLocal,limit:maxAssets}):[];
  await writePackage({outDir,startUrl:target.url.href,pages,errors:notes.map(error=>({error})),limits:{maxPages,maxDepth,timeout,delay},coverage:discovered.coverage,assets});
  await fs.writeFile(path.join(outDir,'download-manifest.json'),JSON.stringify(assets,null,2));
  const archive=args['archive-public-source']===true?await archivePublicSources({pages,outDir,startUrl:target.url.href,allowLocal,allowedSourceOrigins:String(args['source-origins']||'').split(',').map(x=>x.trim()).filter(Boolean),limit:bound(args['max-source-files'],60,1,150,'max-source-files')}):{files:[],downloaded:0,reason:'Off by default; use --archive-public-source with authorization'};
  await fs.writeFile(path.join(outDir,'SOURCE_ARCHIVE_MANIFEST.json'),JSON.stringify(archive,null,2));
  const intelligence=await exportSourceIntelligence(outDir,pages,{archive});
  const structure=summarizeStructure(pages);
  await fs.writeFile(path.join(outDir,'STRUCTURAL_COVERAGE.json'),JSON.stringify(structure,null,2));
  const cssAst=args['oss-intelligence']===true?await analyzeCSSAst({outDir,archive}):{status:'off',files:[]};
  await fs.writeFile(path.join(outDir,'CSS_AST_EVIDENCE.json'),JSON.stringify(cssAst,null,2));
  const oss=summarizeOSS(pages,cssAst);
  await fs.writeFile(path.join(outDir,'OSS_INTEGRATIONS.json'),JSON.stringify(oss,null,2));
  await fs.writeFile(path.join(outDir,'RECONSTRUCTION_EVIDENCE_V3_2.md'),`# Reconstruction intelligence v3.2\n\n- Structural views captured: ${structure.views}\n- Pages with axe accessibility scans: ${oss.totals.axeAnalyzed}\n- Accessibility rules with findings: ${oss.totals.violations}\n- Articles extracted: ${oss.totals.articlesExtracted}\n- CSS archive files parsed with PostCSS: ${oss.cssAst.analyzedFiles}\n\n## Constraints\n- Missing optional libraries are reported as unavailable, not silently replaced with invented analysis.\n- Structural maps cover bounded rendered DOM states. No original component source, server code or private assets are obtained.\n- Use npm run compare against your own implemented candidate to measure visual differences.\n`);
  console.log(`Reconstruction structural capture: ${structure.views} structural views; axe scans ${oss.totals.axeAnalyzed}; CSS AST ${oss.cssAst.analyzedFiles}`);
  const knowledge=await exportKnowledge(outDir,{targetUrl:args['target-url']||null,brand:args.brand||null});
  console.log(`Browser source evidence: ${intelligence.evidenceFlags.browserSourceEvidence} pages; CSS URLs: ${intelligence.sourceFileCounts.css}; JS URLs: ${intelligence.sourceFileCounts.javascript}; archived: ${archive.downloaded||0}`);
  console.log(`Universal intelligence: features ${knowledge.featureCandidates}; passive endpoint templates ${knowledge.observedApiEndpoints}`);
  console.log(`Knowledge index: ${knowledge.files} pages; gaps: ${knowledge.gaps.length}`);
  console.log(`Wrote ${outDir}; pages ${pages.length}; inspected ${pages.filter(p=>p.evidence).length}; notes ${notes.length}`);
 }finally{await context.close();await browser.close();}
}
