import path from 'node:path';

// Timed viewport snapshots are evidence of appearance at sampled points, not a recovered animation timeline.
export async function captureMotionFrames(page,shotsDir,prefix,{times=[0,350,1200]}={}){
  const frames=[];let previous=0;
  for(const time of times){
    await page.waitForTimeout(Math.max(0,time-previous));previous=time;
    const filename=`${prefix}-motion-${String(time).padStart(4,'0')}ms.png`;
    const animations=await page.evaluate(()=>document.getAnimations().slice(0,75).map(a=>({
      currentTime:a.currentTime,playState:a.playState,timing:a.effect?.getTiming?.()}))).catch(()=>[]);
    await page.screenshot({path:path.join(shotsDir,filename),fullPage:false,animations:'allow',timeout:12000});
    frames.push({afterNavigationMs:time,screenshot:`screenshots/${filename}`,animations});
  }
  return frames;
}
