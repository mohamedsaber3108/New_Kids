import fs from 'node:fs/promises';
import path from 'node:path';

// Observations are deliberately bounded and redact inputs, credentials and script payloads.
export async function captureDeepPage(page,{maxSections=150,maxText=250000}={}) {
  return page.evaluate(({maxSections,maxText}) => {
    const txt = x => (x||'').replace(/\s+/g,' ').trim();
    const visible = el => {const r=el.getBoundingClientRect(),s=getComputedStyle(el);return r.width>0&&r.height>0&&s.visibility!=='hidden'&&s.display!=='none'};
    const selector = el => {
      if(el===document.body)return 'body';
      if(el.id && /^[A-Za-z][\w-]{0,70}$/.test(el.id))return '#'+el.id;
      const parts=[];let cur=el;
      for(let i=0;cur&&cur!==document.body&&i<5;i++,cur=cur.parentElement){
        const tag=cur.tagName.toLowerCase();const siblings=cur.parentElement?[...cur.parentElement.children].filter(c=>c.tagName===cur.tagName):[];
        parts.unshift(tag+(siblings.length>1?`:nth-of-type(${siblings.indexOf(cur)+1})`:''));
      }
      return 'body > '+parts.join(' > ');
    };
    const landmarks=[...document.querySelectorAll('header,main,nav,section,article,aside,footer,[role="dialog"],[role="region"]')].filter(visible);
    // A valid rendered page may contain no semantic landmarks (e.g. a simple
    // <body><h1>Title</h1><a>Link</a></body>). Preserve visible evidence
    // rather than returning zero sections. These are *inferred layout blocks*,
    // never claim that they were original semantic sections or components.
    const fallback=[...document.body.children]
      .filter(el=>!['SCRIPT','STYLE','LINK','META','NOSCRIPT','TEMPLATE'].includes(el.tagName) && visible(el));
    const inferredSections=landmarks.length===0;
    const candidateSections=landmarks.length?landmarks:(fallback.length?fallback:[document.body]);
    const sections=candidateSections.slice(0,maxSections).map((el,index)=>{
      const s=getComputedStyle(el),r=el.getBoundingClientRect();
      const bounds={x:Math.round(r.x+scrollX),y:Math.round(r.y+scrollY),width:Math.round(r.width),height:Math.round(r.height)};
      return {index,tag:el.tagName.toLowerCase(),role:el.getAttribute('role'),selector:selector(el),id:el.id||null,
        inferredLayoutBlock:inferredSections,
        label:txt(el.getAttribute('aria-label')||el.querySelector('h1,h2,h3,h4,h5,h6')?.textContent||'').slice(0,170),
        text:txt(el.innerText||'').slice(0,2400),bounds,
        hierarchy:{parentSection:el.parentElement?.closest('header,main,nav,section,article,aside,footer')?.id||null},
        childTags:[...el.children].slice(0,35).map(c=>c.tagName.toLowerCase()),
        style:{display:s.display,gridTemplateColumns:s.gridTemplateColumns,flexDirection:s.flexDirection,position:s.position,
          background:s.backgroundColor,borderRadius:s.borderRadius,padding:s.padding,gap:s.gap}};
    });
    const controls=[...document.querySelectorAll('button,a[href],input,select,textarea,[role="button"],[role="tab"],[role="switch"],[aria-expanded]')].filter(visible).slice(0,750).map(el=>{
      const s=getComputedStyle(el),r=el.getBoundingClientRect();
      return {tag:el.tagName.toLowerCase(),selector:selector(el),type:el.getAttribute('type'),
        label:txt(el.getAttribute('aria-label')||el.innerText||el.getAttribute('placeholder')||'').slice(0,160),
        href:el.tagName==='A'?el.href:null,role:el.getAttribute('role'),ariaExpanded:el.getAttribute('aria-expanded'),
        ariaControls:el.getAttribute('aria-controls'),disabled:!!el.disabled,required:!!el.required,
        bounds:{x:Math.round(r.x),y:Math.round(r.y),width:Math.round(r.width),height:Math.round(r.height)},
        style:{color:s.color,background:s.backgroundColor,border:s.border,borderRadius:s.borderRadius,
        transition:s.transition,animation:s.animation,outline:s.outline}};
    });
    const images=[...document.images].slice(0,1800).map(img=>({src:img.currentSrc||img.src,srcset:img.srcset||null,
      alt:img.alt||'',width:img.naturalWidth,height:img.naturalHeight,loading:img.loading||null,
      selector:selector(img),section:img.closest('section,article,main,header,footer')?.tagName.toLowerCase()||null}));
    const inlineSvgs=[...document.querySelectorAll('svg')].slice(0,50).map((el,i)=>{
      const clone=el.cloneNode(true);clone.querySelectorAll('script,foreignObject').forEach(x=>x.remove());
      clone.querySelectorAll('*').forEach(x=>{for(const a of [...x.attributes])if(/^on/i.test(a.name)||/javascript:/i.test(a.value))x.removeAttribute(a.name);});
      const markup=clone.outerHTML;return {index:i,selector:selector(el),label:el.getAttribute('aria-label')||null,
        markup:markup.length<=18000?markup:null,truncated:markup.length>18000};
    });
    const backgroundAssets=[];
    for(const el of [...document.querySelectorAll('body *')].slice(0,3500)){
      const s=getComputedStyle(el);for(const property of ['backgroundImage','maskImage']){
        const val=s[property]||'';if(val==='none'||!val.includes('url('))continue;
        const matches=[...val.matchAll(/url\([\"']?(.*?)[\"']?\)/g)].slice(0,6);
        for(const m of matches){try{backgroundAssets.push({src:new URL(m[1].replace(/[\"']$/,''),document.baseURI).href,selector:selector(el),property});}catch{}}
      }
    }
    const schemas=[...document.querySelectorAll('script[type="application/ld+json"]')].slice(0,25).map(el=>{
      try{const obj=JSON.parse(el.textContent);return {type:obj['@type']||null,keys:Object.keys(obj).slice(0,25)};}
      catch{return {invalid:true};}
    });
    const fonts=[];
    for(const sheet of document.styleSheets)try{for(const rule of sheet.cssRules){if(rule.type===CSSRule.FONT_FACE_RULE)fonts.push({family:rule.style.fontFamily,src:rule.style.src,weight:rule.style.fontWeight});}}
    catch{}
    const copy=txt(document.querySelector('main')?.innerText||document.body.innerText).slice(0,maxText);
    const landmarkTree=[...document.querySelectorAll('h1,h2,h3,h4,h5,h6')].slice(0,400).map(h=>({level:Number(h.tagName.slice(1)),text:txt(h.textContent).slice(0,250),selector:selector(h)}));
    return {sections,sectionExtractionMode:inferredSections?'inferred-visible-body-blocks':'semantic-landmarks',controls,images,inlineSvgs,backgroundAssets:backgroundAssets.slice(0,600),schemas,fonts,landmarkTree,mainText:copy,
      scroll:{scrollHeight:document.documentElement.scrollHeight,scrollWidth:document.documentElement.scrollWidth},
      description:document.querySelector('meta[name="description"]')?.content||null,
      source:{kind:'rendered-dom',url:location.href,viewport:{width:innerWidth,height:innerHeight},capturedAt:new Date().toISOString()},
      limitations:['Text is bounded; hidden content and untriggered states are not inferred','No input values, cookies or API response bodies are collected',...(inferredSections?['No semantic landmarks detected; section candidates are inferred visible body blocks, not original components']:[])]};
  },{maxSections,maxText});
}

export async function saveSafeHTML(page,outputFile) {
  const html=await page.evaluate(()=>{
    const copy=document.documentElement.cloneNode(true);
    copy.querySelectorAll('script,iframe,object,embed,form,template,meta[http-equiv="refresh"]').forEach(el=>el.remove());
    copy.querySelectorAll('*').forEach(el=>{for(const attr of [...el.attributes]){
      if(/^on/i.test(attr.name)||['value','srcdoc','nonce','integrity','data-token','data-secret','data-key'].includes(attr.name.toLowerCase()))el.removeAttribute(attr.name);
    }});
    copy.querySelectorAll('input,textarea').forEach(el=>{el.value='';el.textContent='';});
    return '<!doctype html>\n'+copy.outerHTML;
  });
  await fs.mkdir(path.dirname(outputFile),{recursive:true});
  await fs.writeFile(outputFile,html.slice(0,3_000_000));
  return {file:outputFile,bytes:Math.min(html.length,3_000_000),truncated:html.length>3_000_000,warning:'Sanitized DOM is not a security-grade anonymizer. Review before sharing.'};
}
