import path from 'node:path';

// State probes never click forms, purchase buttons or destructive elements.
export async function probeHoverFocus(page,shotsDir,prefix,{limit=6}={}){
  const candidates=page.locator('a[href],button:not([type="submit"]),[role="tab"]');
  const result=[];const count=Math.min(await candidates.count(),80);
  for(let i=0;i<count&&result.length<limit;i++){
    const item=candidates.nth(i);
    try{
      if(!await item.isVisible()||!await item.isEnabled())continue;
      const label=(await item.innerText().catch(()=>''))?.trim().slice(0,100)||`control-${i}`;
      if(/(buy|pay|submit|delete|purchase|checkout|logout)/i.test(label))continue;
      await item.scrollIntoViewIfNeeded({timeout:1500});
      const read=()=>item.evaluate(el=>{const s=getComputedStyle(el);return {color:s.color,background:s.backgroundColor,
        border:s.border,shadow:s.boxShadow,transform:s.transform,outline:s.outline,opacity:s.opacity,transition:s.transition};});
      const normal=await read();await item.hover({timeout:1600});await page.waitForTimeout(150);const hover=await read();
      const image=`${prefix}-probe-${String(result.length+1).padStart(2,'0')}-hover.png`;
      await page.screenshot({path:path.join(shotsDir,image),fullPage:false,animations:'disabled',timeout:7000});
      await item.focus({timeout:1500});const focus=await read();
      result.push({label,normal,hover,focus,screenshot:`screenshots/${image}`,stateChanged:JSON.stringify(normal)!==JSON.stringify(hover)||JSON.stringify(normal)!==JSON.stringify(focus)});
    }catch(e){result.push({status:'failed',error:String(e.message).slice(0,120)});}
  }
  return result;
}
