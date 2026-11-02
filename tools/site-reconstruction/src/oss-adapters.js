import fs from 'node:fs/promises';
import path from 'node:path';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const max=(s,n=300)=>String(s??'').slice(0,n);

export function discoverOSSModules(){
  const mods={'axe-core':'axe-core/axe.min.js','@mozilla/readability':'@mozilla/readability','jsdom':'jsdom','postcss':'postcss'};
  return Object.fromEntries(Object.entries(mods).map(([k,v])=>{try{return [k,{available:true}]}catch{return[k,{available:false}]}}));
}

// axe-core: https://github.com/dequelabs/axe-core MPL-2.0.
// Collect only rule descriptions, IDs, impact, counts and selectors, not element HTML or error text containing user data.
export async function auditPageA11y(page,{axePath=null}={}){
  if(!axePath){try{axePath=require.resolve('axe-core/axe.min.js');}catch{return{status:'unavailable',dependency:'axe-core'};}}
  try{
    await page.addScriptTag({path:axePath});
    const summary=await page.evaluate(async()=>{
      const result=await window.axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21a','wcag21aa']}});
      return {violations:result.violations.slice(0,60).map(v=>({id:v.id,impact:v.impact,
        description:String(v.description||'').slice(0,240),helpUrl:v.helpUrl,
        nodes:v.nodes.length,selectors:v.nodes.slice(0,8).map(n=>String(n.target?.[0]||'').slice(0,180))})),
        passes:result.passes.length,incomplete:result.incomplete.length,notApplicable:result.inapplicable.length};
    });
    return {status:'analyzed',...summary};
  }catch(e){return{status:'error',message:max(e.message,180)};}
}

// Mozilla Readability + jsdom: article-level editorial content extraction. No remote resources or JS execution.
export async function parseArticleOffline(html,url,{Readability=null,JSDOM=null}={}){
  try{
    if(!Readability)({Readability}=await import('@mozilla/readability'));
    if(!JSDOM)({JSDOM}=await import('jsdom'));
  }catch{return{status:'unavailable',dependencies:['@mozilla/readability','jsdom']};}
  try{
    const doc=new JSDOM(String(html).slice(0,2_000_000),{url});
    doc.window.document.querySelectorAll('input,textarea,script,form,iframe,object,embed').forEach(el=>el.remove());
    const article=new Readability(doc.window.document,{maxElemsToParse:12000}).parse();
    doc.window.close();
    if(!article)return {status:'not-article'};
    return {status:'extracted',title:max(article.title,240),excerpt:max(article.excerpt,650),
      text:max(article.textContent,45000),length:article.length,byline:max(article.byline,120)};
  }catch(e){return{status:'error',message:max(e.message,180)};}
}

export async function extractPageArticle(page,url,{readability=undefined}={}){
  // Minimize personal-data collection. Article parse is intended for publicly accessible editorial pages.
  if(!/\/(blog|news|article|resources|guides|posts)\//i.test(new URL(url).pathname))return{status:'skipped-non-editorial'};
  const html=await page.evaluate(()=>{
    const clone=document.documentElement.cloneNode(true);
    clone.querySelectorAll('input,textarea,script,form,iframe,object,embed,template').forEach(el=>el.remove());
    clone.querySelectorAll('*').forEach(el=>{for(const a of [...el.attributes])if(/^on/i.test(a.name)||/^(data-|value|srcdoc|nonce|integrity)/i.test(a.name))el.removeAttribute(a.name);});
    return '<!doctype html>'+clone.outerHTML.slice(0,2_000_000);
  });
  return parseArticleOffline(html,url,readability);
}

// PostCSS: https://github.com/postcss/postcss MIT. Parse only already archived approved CSS files.
export async function analyzeCSSAst({outDir,archive,postcss=null}={}){
  try{if(!postcss)({default:postcss}=await import('postcss'));}
  catch{return{status:'unavailable',dependency:'postcss',files:[]};}
  const output=[];
  const cssEntries=(archive?.files||[]).filter(f=>f.status==='downloaded'&&f.type==='css');
  if(!cssEntries.length)return {status:'no-archived-css',files:[],note:'Enable --archive-public-source on an authorized site to archive CSS for PostCSS parsing.'};
  for(const rec of cssEntries.slice(0,120)){
    try{
      const content=(await fs.readFile(path.join(outDir,rec.file),'utf8')).slice(0,4_000_000);
      const ast=postcss.parse(content,{from:rec.url});
      const selectors=new Map(),media=new Set(),variables=new Map(),keyframes=[];let declarations=0;
      ast.walkRules(rule=>{if(rule.selector){for(const selector of rule.selectors||[rule.selector]){
        if(selectors.size>=1600)break;selectors.set(selector,(selectors.get(selector)||0)+1);
      }}});
      ast.walkAtRules(rule=>{if(rule.name==='media'&&media.size<200)media.add(rule.params.slice(0,300));
        if(rule.name.endsWith('keyframes')&&keyframes.length<160)keyframes.push(rule.params.slice(0,150));});
      ast.walkDecls(d=>{declarations++;if(d.prop.startsWith('--')&&variables.size<2000)variables.set(d.prop,d.value.slice(0,200));});
      output.push({source:rec.url,archiveFile:rec.file,status:'analyzed',ruleCount:selectors.size,declarations,
        selectors:[...selectors.entries()].slice(0,1600).map(([selector,count])=>({selector,count})),
        media:[...media],keyframes,variables:Object.fromEntries(variables)});
    }catch(e){output.push({source:rec.url,status:'error',message:max(e.message,150)});}
  }
  return {status:'analyzed',files:output,note:'PostCSS AST analyzes only already-permitted, archived CSS. No network access.'};
}

export function summarizeOSS(pages,cssAst=null){
  const totals={axeAnalyzed:0,axeUnavailable:0,violations:0,articlesExtracted:0,articlesUnavailable:0};
  const byPage=pages.map(p=>{
    const a=p.openSourceEvidence||{};
    if(a.accessibility?.status==='analyzed'){totals.axeAnalyzed++;totals.violations+=a.accessibility.violations.length;}
    if(a.accessibility?.status==='unavailable')totals.axeUnavailable++;
    if(a.article?.status==='extracted')totals.articlesExtracted++;
    if(a.article?.status==='unavailable')totals.articlesUnavailable++;
    return{url:p.url,accessibility:a.accessibility||null,article:a.article||null};
  });
  return {modules:discoverOSSModules(),totals,cssAst:{status:cssAst?.status||'not-run',analyzedFiles:cssAst?.files?.filter(x=>x.status==='analyzed').length||0},byPage};
}
