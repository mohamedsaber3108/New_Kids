import fs from 'node:fs/promises';
import path from 'node:path';
import zlib from 'node:zlib';
import {promisify} from 'node:util';

const gzip=promisify(zlib.gzip);
const niceName=(value)=>String(value||'').replace(/[^a-z0-9_-]/gi,'-').slice(0,60);

// Structured, bounded layout evidence for recreating browser-visible UI. Never records user input values,
// cookies, storage, network bodies, iframe bodies, event listeners, or arbitrary script content.
export async function captureStructuralMap(page,{limit=2800}={}) {
  return page.evaluate(({limit})=>{
    const root=document.body;
    const nodes=[];
    const seen=new Map();
    const skip=new Set(['SCRIPT','STYLE','NOSCRIPT','TEMPLATE','IFRAME','OBJECT','EMBED']);
    const trim=v=>String(v??'').replace(/\s+/g,' ').trim().slice(0,180);
    const cleanUrl=v=>{ try { const u=new URL(v,document.baseURI);if(!['http:','https:'].includes(u.protocol))return null;u.username='';u.password='';u.search='';u.hash='';return u.href; } catch {return null;} };
    const safeCssURL=v=>String(v||'').replace(/url\(([^)]*)\)/g,(_,raw)=>`url(${cleanUrl(raw.replace(/^[\"']|[\"']$/g,''))||'[redacted]'})`).slice(0,300);
    const usefulTags=new Set(['H1','H2','H3','H4','H5','H6','BUTTON','A','LABEL','SUMMARY','P','FIGCAPTION','LI']);
    const queue=[{element:root,parent:null,depth:0}];let skipped=0;
    while(queue.length&&nodes.length<limit){
      const {element:el,parent,depth}=queue.shift();
      if(skip.has(el.tagName))continue;
      const style=getComputedStyle(el),rect=el.getBoundingClientRect();
      const id=nodes.length;seen.set(el,id);
      const classes=typeof el.className==='string'?el.className.trim().split(/\s+/).filter(Boolean).slice(0,5):[];
      const sem=usefulTags.has(el.tagName)||el.hasAttribute('aria-label');
      const label=sem?trim(el.getAttribute('aria-label')||el.textContent):null;
      const before=getComputedStyle(el,'::before'),after=getComputedStyle(el,'::after');
      const pseudo={before:before.content&&before.content!=='none'?{content:trim(before.content),color:before.color,display:before.display}:null,
        after:after.content&&after.content!=='none'?{content:trim(after.content),color:after.color,display:after.display}:null};
      nodes.push({id,parent,depth,tag:el.tagName.toLowerCase(),idAttribute:el.id?.slice(0,90)||null,classes,
        role:el.getAttribute('role'),ariaExpanded:el.getAttribute('aria-expanded'),label,
        url:el.tagName==='A'?cleanUrl(el.href):(['IMG','SOURCE'].includes(el.tagName)?cleanUrl(el.currentSrc||el.src):null),
        box:{x:Math.round(rect.x+scrollX),y:Math.round(rect.y+scrollY),width:Math.round(rect.width),height:Math.round(rect.height)},
        visible:rect.width>0&&rect.height>0&&style.display!=='none'&&style.visibility!=='hidden',
        style:{display:style.display,position:style.position,zIndex:style.zIndex,overflow:style.overflow,
          width:style.width,height:style.height,maxWidth:style.maxWidth,minHeight:style.minHeight,
          gridTemplateColumns:style.gridTemplateColumns,gridTemplateRows:style.gridTemplateRows,
          flexDirection:style.flexDirection,flexWrap:style.flexWrap,justifyContent:style.justifyContent,alignItems:style.alignItems,
          gap:style.gap,padding:style.padding,margin:style.margin,color:style.color,background:style.backgroundColor,
          backgroundImage:safeCssURL(style.backgroundImage)||null,border:style.border,borderRadius:style.borderRadius,
          boxShadow:style.boxShadow,opacity:style.opacity,transform:style.transform,
          fontFamily:style.fontFamily,fontSize:style.fontSize,fontWeight:style.fontWeight,lineHeight:style.lineHeight,
          textAlign:style.textAlign,animation:style.animation,transition:style.transition},pseudo});
      if(depth<30){for(const child of el.children)if(!skip.has(child.tagName))queue.push({element:child,parent:id,depth:depth+1});}
    }
    skipped+=queue.length;
    const layoutCount=nodes.filter(x=>x.visible).length;
    return {schema:'structural-map-v1',url:location.origin+location.pathname,viewport:{width:innerWidth,height:innerHeight},
      totalCaptured:nodes.length,visibleCaptured:layoutCount,skippedDueToLimit:skipped,nodes,
      limitations:['DOM and computed styles describe one rendered state, not the source component tree',
        'No input values, cookies, storage, private API payloads or event listener sources are captured',
        'Third-party iframe contents and shadow roots are not inspected',
        'CSS pseudo-element content may include generated text; review output before sharing']};
  },{limit});
}

export async function saveStructuralMap(map,{outDir,pageIndex,viewport}){
  const name=`${String(pageIndex).padStart(4,'0')}-${niceName(viewport)}.json.gz`;
  const rel=`layout/${name}`;const filename=path.join(outDir,rel);
  await fs.mkdir(path.dirname(filename),{recursive:true});
  const bytes=Buffer.from(JSON.stringify(map));
  await fs.writeFile(filename,await gzip(bytes,{level:6}));
  return {file:rel,uncompressedBytes:bytes.length,totalCaptured:map.totalCaptured,visibleCaptured:map.visibleCaptured,
    skippedDueToLimit:map.skippedDueToLimit,viewport:map.viewport};
}
export function summarizeStructure(pages){
  const items=pages.flatMap(p=>(p.structuralMaps||[]).map(s=>({url:p.url,viewport:s.viewport,
    nodes:s.totalCaptured,visible:s.visibleCaptured,truncated:s.skippedDueToLimit>0,file:s.file})));
  return {pages:pages.length,views:items.length,items,
    note:'This is a bounded per-viewport DOM+computed-style map. It cannot reveal private component source or backend code.'};
}
