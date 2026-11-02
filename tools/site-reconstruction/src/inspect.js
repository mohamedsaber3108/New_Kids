import {captureSafeStates} from './states.js';
import path from "node:path";
import {captureDeepPage,saveSafeHTML} from './deep.js';
import {captureTelemetry} from './telemetry.js';
import {probeHoverFocus} from './probe.js';
import {captureMotionFrames} from './motion.js';
import {inspectBrowserSource} from './source-intelligence.js';
import {captureStructuralMap,saveStructuralMap} from './structural-map.js';
import {auditPageA11y,extractPageArticle} from './oss-adapters.js';

const VIEWPORTS = [
  { name: "desktop", width: 1440, height: 1000 },
  { name: "tablet", width: 820, height: 1180 },
  { name: "mobile", width: 390, height: 844 }
];

export async function inspectPage({ context, url, index, shotsDir, timeout = 30000, interactions = false, deep = true, saveHTML = false, motion = false, structuralMap = false, ossIntelligence = false }) {
  const captures = [];
  let desktopEvidence = null;
  const responsive = {};
  let interactionStates = [];
  let deepEvidence = null, htmlCapture = null, stateProbes = [],motionFrames=[],sourceEvidence=null,structuralMaps=[],openSourceEvidence={};
  const telemetry = {};
  for (const vp of VIEWPORTS) {
    const page = await context.newPage();
    page.setDefaultNavigationTimeout(timeout);
    const watcher=captureTelemetry(page);
    try {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto(url, { waitUntil: "domcontentloaded", timeout });
      await page.waitForLoadState("networkidle", { timeout: Math.min(timeout, 2500) }).catch(() => {});
      if(vp.name==='desktop' && motion) motionFrames=await captureMotionFrames(page,shotsDir,String(index).padStart(4,'0'));
      await page.waitForTimeout(350);
      await page.evaluate(async () => {
        const step = Math.max(350, Math.floor(innerHeight * .7));
        for (let y = 0; y < document.documentElement.scrollHeight && y < 25000; y += step) {
          window.scrollTo(0, y);
          await new Promise(resolve => setTimeout(resolve, 75));
        }
        window.scrollTo(0, 0);
      }).catch(() => {});
      await page.waitForTimeout(200);
      const filename = `${String(index).padStart(4, "0")}-${vp.name}.png`;
      const screenshotPath = path.join(shotsDir, filename);
      await page.screenshot({ path: screenshotPath, fullPage: true, animations: "disabled", timeout }).catch(async () => {
        await page.screenshot({ path: screenshotPath, fullPage: false, animations: "disabled", timeout });
      });
      captures.push({ viewport: vp, path: `screenshots/${filename}` });
      if(structuralMap){
        try{const structural=await captureStructuralMap(page);structuralMaps.push(await saveStructuralMap(structural,{outDir:path.dirname(shotsDir),pageIndex:index,viewport:vp.name}));}
        catch(e){structuralMaps.push({viewport:vp.name,status:'error',message:String(e.message||e).slice(0,200)});}
      }
      const viewportEvidence = await extractEvidence(page);
      responsive[vp.name] = {
        viewport:vp,documentSize:viewportEvidence.documentSize,
        frequent:viewportEvidence.frequent,
        elementSamples:viewportEvidence.elementSamples.slice(0,100)
      };
      telemetry[vp.name]=watcher.snapshot();
      if (vp.name === "desktop") {
        if(deep)deepEvidence=await captureDeepPage(page);
        sourceEvidence=await inspectBrowserSource(page).catch(e=>({error:String(e.message||e).slice(0,300)}));
        if(ossIntelligence){
          openSourceEvidence.accessibility=await auditPageA11y(page);
          openSourceEvidence.article=await extractPageArticle(page,url).catch(e=>({status:'error',message:String(e.message||e).slice(0,200)}));
        }
        if(saveHTML)htmlCapture=await saveSafeHTML(page,path.join(path.dirname(shotsDir),'html',`${String(index).padStart(4,'0')}.html`));
        desktopEvidence = viewportEvidence;
        if(interactions){
          stateProbes=await probeHoverFocus(page,shotsDir,String(index).padStart(4,'0'));
          interactionStates=await captureSafeStates(page,shotsDir,String(index).padStart(4,'0'));
        }
      }
    } finally { await page.close().catch(() => {}); }
  }
  return { status: "inspected", evidence: desktopEvidence, responsive, interactionStates, stateProbes, motionFrames, deepEvidence, sourceEvidence, structuralMaps,openSourceEvidence,htmlCapture:htmlCapture?{file:`html/${String(index).padStart(4,'0')}.html`,bytes:htmlCapture.bytes,truncated:htmlCapture.truncated}:null,telemetry, screenshots: captures };
}

async function extractEvidence(page) {
  return page.evaluate(() => {
    const clean = value => (value || "").replace(/\s+/g, " ").trim();
    const count = map => Object.entries(map).sort((a,b) => b[1]-a[1]).slice(0, 50).map(([value,n]) => ({ value, count:n }));
    const maps = { textColors:{}, backgroundColors:{}, fonts:{}, typeStyles:{}, spacing:{}, radii:{}, shadows:{}, transitions:{}, borders:{} };
    const bump = (map, key) => { if (key && key !== "none" && key !== "normal" && key !== "rgba(0, 0, 0, 0)") map[key] = (map[key] || 0) + 1; };
    const cssVariables = {};
    for (const sheet of [...document.styleSheets]) {
      try {
        for (const rule of [...sheet.cssRules]) {
          if (rule.selectorText?.includes(":root") || rule.selectorText === "html") {
            for (const prop of [...rule.style]) if (prop.startsWith("--")) cssVariables[prop] = rule.style.getPropertyValue(prop).trim();
          }
        }
      } catch { /* cross-origin CSSOM restrictions are expected */ }
    }
    const mediaQueries=[];
    const walkRules=(rules)=>{for(const rule of [...rules]){
      if(rule.conditionText && rule.cssText?.startsWith('@media'))mediaQueries.push(rule.conditionText);
      if(rule.cssRules)try{walkRules(rule.cssRules)}catch{}
    }};
    for(const sheet of [...document.styleSheets])try{walkRules(sheet.cssRules)}catch{}
    const tagCounts = {};
    const samples = [];
    for (const el of [...document.querySelectorAll("body *")].slice(0, 4000)) {
      const s = getComputedStyle(el), tag = el.tagName.toLowerCase();
      tagCounts[tag] = (tagCounts[tag] || 0) + 1;
      bump(maps.textColors, s.color); bump(maps.backgroundColors, s.backgroundColor); bump(maps.fonts, s.fontFamily);
      bump(maps.typeStyles, `${s.fontSize}; line-height ${s.lineHeight}; weight ${s.fontWeight}`);
      bump(maps.spacing, `padding ${s.padding}`); bump(maps.spacing, `margin ${s.margin}`); bump(maps.spacing, `gap ${s.gap}`);
      bump(maps.radii, s.borderRadius); bump(maps.shadows, s.boxShadow);
      bump(maps.transitions, `${s.transitionProperty} ${s.transitionDuration} ${s.transitionTimingFunction}`);
      bump(maps.borders, `${s.borderWidth} ${s.borderStyle} ${s.borderColor}`);
      if (samples.length < 250 && (["header","nav","main","section","footer","button","a","form","input","img","svg","video","canvas","dialog","select","textarea"].includes(tag) || el.getAttribute("role"))) {
        const r = el.getBoundingClientRect();
        samples.push({
          tag, role:el.getAttribute("role"), id:el.id||null, classes:[...el.classList].slice(0,10),
          text:clean(el.innerText).slice(0,180), ariaLabel:el.getAttribute("aria-label"),
          href:tag==="a" ? el.href : null, src:["img","video","source"].includes(tag) ? (el.currentSrc||el.src||el.getAttribute("src")) : null,
          rect:{x:Math.round(r.x),y:Math.round(r.y),width:Math.round(r.width),height:Math.round(r.height)},
          style:{display:s.display,position:s.position,color:s.color,backgroundColor:s.backgroundColor,fontFamily:s.fontFamily,fontSize:s.fontSize,fontWeight:s.fontWeight,lineHeight:s.lineHeight,padding:s.padding,margin:s.margin,gap:s.gap,borderRadius:s.borderRadius,boxShadow:s.boxShadow,border:s.border,transition:s.transition,animation:s.animation,transform:s.transform}
        });
      }
    }
    const assets = [...document.querySelectorAll("img,source,video,script[src],link[rel='stylesheet'],link[rel='icon'],audio,iframe")].map(el => ({
      tag:el.tagName.toLowerCase(), url:el.currentSrc||el.src||el.href||el.getAttribute("src")||el.getAttribute("href"),
      alt:el.getAttribute("alt"), type:el.getAttribute("type"), rel:el.getAttribute("rel"), loading:el.getAttribute("loading")
    })).filter(x=>x.url).slice(0,4000);
    const links = [...document.querySelectorAll("a[href]")].map(a=>({text:clean(a.innerText||a.getAttribute("aria-label")),href:a.href,target:a.target||null,rel:a.rel||null})).slice(0,3000);
    const headings = [...document.querySelectorAll("h1,h2,h3,h4,h5,h6")].map(h=>({tag:h.tagName.toLowerCase(),text:clean(h.innerText)})).slice(0,500);
    const forms = [...document.forms].map(f=>({action:f.action,method:f.method,fields:[...f.querySelectorAll("input,select,textarea,button")].map(x=>({tag:x.tagName.toLowerCase(),type:x.type||null,name:x.name||null,placeholder:x.placeholder||null,required:x.required||false,ariaLabel:x.getAttribute("aria-label"),text:clean(x.innerText).slice(0,100)}))}));
    const animations = [...document.querySelectorAll("*")].filter(el=>{try{return el.getAnimations().length>0}catch{return false}}).slice(0,250).map(el=>({tag:el.tagName.toLowerCase(),id:el.id||null,classes:[...el.classList].slice(0,5),animations:el.getAnimations().map(a=>({playState:a.playState,currentTime:a.currentTime,effect:a.effect?.getTiming?.()}))}));
    return {
      title:document.title,description:document.querySelector('meta[name="description"]')?.content||null,
      lang:document.documentElement.lang||null,direction:getComputedStyle(document.documentElement).direction,
      viewport:{width:innerWidth,height:innerHeight},documentSize:{width:document.documentElement.scrollWidth,height:document.documentElement.scrollHeight},
      cssVariables,mediaQueries:[...new Set(mediaQueries)].slice(0,150),tagCounts,frequent:Object.fromEntries(Object.entries(maps).map(([k,v])=>[k,count(v)])),
      headings,links,assets,forms,elementSamples:samples,animations,
      metadata:{canonical:document.querySelector('link[rel="canonical"]')?.href||null,robots:document.querySelector('meta[name="robots"]')?.content||null,themeColor:document.querySelector('meta[name="theme-color"]')?.content||null},
      detectedLibraries:{gsap:!!window.gsap,aos:!!document.querySelector("[data-aos]"),lottie:!!document.querySelector("lottie-player,dotlottie-player"),framerMotionHints:!!document.querySelector("[data-framer-appear-id]"),canvasCount:document.querySelectorAll("canvas").length,videoCount:document.querySelectorAll("video").length,svgCount:document.querySelectorAll("svg").length},
      reducedMotion:matchMedia('(prefers-reduced-motion: reduce)').matches,
      notes:["Computed style aggregation is a frequency-based heuristic, not the original source design-token definition.","Cross-origin stylesheets may be inaccessible to CSSOM inspection."]
    };
  });
}
