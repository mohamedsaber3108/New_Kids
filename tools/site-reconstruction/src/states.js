import path from 'node:path';

const UNSAFE=/(delete|remove|submit|pay|buy|checkout|purchase|order|send|logout|sign out|unsubscribe|cancel account|erase|confirm)/i;
// Only explicit disclosure/tab controls are candidates; never forms or ordinary action buttons.
export async function captureSafeStates(page,shotsDir,prefix,{limit=8}={}){
  const results=[];
  const handles=await page.locator('button[aria-expanded][aria-controls], [role="tab"][aria-controls]').all();
  for(let i=0;i<Math.min(handles.length,limit);i++){
    const el=handles[i];
    try{
      const info=await el.evaluate(node=>({tag:node.tagName.toLowerCase(),text:(node.innerText||node.getAttribute('aria-label')||'').trim().slice(0,120),controls:node.getAttribute('aria-controls'),role:node.getAttribute('role'),expanded:node.getAttribute('aria-expanded')}));
      if(!info.controls||UNSAFE.test(info.text))continue;
      await el.scrollIntoViewIfNeeded({timeout:2500});
      const before=await page.locator(`#${CSSescape(info.controls)}`).first().isVisible().catch(()=>false);
      await el.click({timeout:2500,noWaitAfter:true});await page.waitForTimeout(240);
      const after=await page.locator(`#${CSSescape(info.controls)}`).first().isVisible().catch(()=>false);
      const filename=`${prefix}-state-${String(results.length+1).padStart(2,'0')}.png`;
      await page.screenshot({path:path.join(shotsDir,filename),animations:'disabled',timeout:10000});
      results.push({...info,beforeVisible:before,afterVisible:after,screenshot:`screenshots/${filename}`});
    }catch(e){results.push({status:'failed',error:String(e.message).slice(0,180)});}
  }
  return results;
}
function CSSescape(s){return s.replace(/[^a-zA-Z0-9_-]/g,ch=>'\\'+ch.codePointAt(0).toString(16)+' ');}
