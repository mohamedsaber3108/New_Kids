import fs from 'node:fs/promises';import path from 'node:path';
import {PNG} from 'pngjs';import pixelmatch from 'pixelmatch';
import {chromium} from 'playwright';
import {installRequestGuard,validateTarget} from './security.js';
import {bound} from './args.js';
export async function compareSites({reference,url,outDir,allowLocal=false,threshold=0.08}){
  const manifest=JSON.parse(await fs.readFile(path.join(reference,'evidence.json'),'utf8'));
  const target=await validateTarget(url,{allowLocal});const original=new URL(manifest.startUrl);const base=target.url;
  const browser=await chromium.launch({headless:true,executablePath:process.env.SRT_CHROMIUM_PATH||undefined});
  const context=await browser.newContext();await installRequestGuard(context,{allowLocal});
  const rows=[];await fs.mkdir(outDir,{recursive:true});
  try{for(const [i,p] of manifest.pages.entries()){
    if(!p.screenshots?.length)continue;
    const src=new URL(p.url);const destination=new URL(src.pathname+src.search,base).href;
    for(const shot of p.screenshots){const viewport=shot.viewport;const name=`${String(i+1).padStart(4,'0')}-${viewport.name}`;
      try{
        const ref=PNG.sync.read(await fs.readFile(path.join(reference,shot.path)));
        const page=await context.newPage();await page.setViewportSize({width:viewport.width,height:viewport.height});
        await page.goto(destination,{waitUntil:'domcontentloaded',timeout:25000});await page.waitForTimeout(400);
        const actual=PNG.sync.read(await page.screenshot({fullPage:true,animations:'disabled'}));await page.close();
        const width=Math.max(ref.width,actual.width),height=Math.max(ref.height,actual.height);
        if(width*height>30e6)throw Error('Image exceeds 30 megapixels; compare manually');
        const refFilled=canvas(ref,width,height),actualFilled=canvas(actual,width,height),diff=new PNG({width,height});
        const changed=pixelmatch(refFilled.data,actualFilled.data,diff.data,width,height,{threshold:0.1});
        const ratio=changed/(width*height);
        await fs.writeFile(path.join(outDir,name+'-diff.png'),PNG.sync.write(diff));
        rows.push({route:src.pathname,viewport:viewport.name,difference:Number(ratio.toFixed(5)),passed:ratio<=threshold,reference:shot.path,diff:name+'-diff.png'});
      }catch(e){rows.push({route:src.pathname,viewport:viewport.name,error:e.message,passed:false});}
    }
  }}finally{await context.close();await browser.close();}
  await fs.writeFile(path.join(outDir,'comparison.json'),JSON.stringify({threshold,rows},null,2));
  await fs.writeFile(path.join(outDir,'COMPARISON.md'),`# Visual comparison\n\nThreshold: ${(threshold*100).toFixed(2)}% changed pixels. Pixel differences are affected by fonts, anti-aliasing, dynamic content and browser setup.\n\n| Route | Viewport | Changed | Pass |\n|---|---|---:|---|\n${rows.map(r=>`| ${r.route} | ${r.viewport} | ${r.error||((r.difference*100).toFixed(2)+'%')} | ${r.passed?'Yes':'No'} |`).join('\n')}\n`);
  return rows;
}
function canvas(p,width,height){const o=new PNG({width,height,fill:true});o.data.fill(255);PNG.bitblt(p,o,0,0,p.width,p.height,0,0);return o;}
