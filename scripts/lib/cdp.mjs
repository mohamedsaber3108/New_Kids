// Minimal headless Chrome driver over the DevTools Protocol, using Node's built-in WebSocket.
// No third-party dependency. Used by verification scripts only (never shipped to users).
import {spawn} from 'node:child_process';
import {existsSync,mkdtempSync,rmSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';

export const sleep=ms=>new Promise(r=>setTimeout(r,ms));

export function findChrome(){
 return [process.env.CHROME_PATH,'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe','C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe','C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe','/usr/bin/google-chrome','/usr/bin/chromium','/usr/bin/chromium-browser'].find(p=>p&&existsSync(p));
}

export async function launch(){
 const chromePath=findChrome();if(!chromePath)throw new Error('No Chrome/Edge found (set CHROME_PATH)');
 const profile=mkdtempSync(join(tmpdir(),'usam-chrome-')),port=9300+Math.floor(Math.random()*600);
 const proc=spawn(chromePath,['--headless=new','--remote-debugging-port='+port,'--user-data-dir='+profile,'--no-first-run','--no-default-browser-check','--disable-gpu','--disable-extensions',...(process.env.CI?['--no-sandbox']:[]),'about:blank'],{stdio:'ignore'});
 let target;for(let i=0;i<80&&!target;i++){try{target=(await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find(t=>t.type==='page')}catch{}if(!target)await sleep(250)}
 if(!target)throw new Error('Chrome did not start');
 const ws=new WebSocket(target.webSocketDebuggerUrl);await new Promise((r,j)=>{ws.onopen=r;ws.onerror=j});
 let seq=0;const pending=new Map(),listeners=new Map();
 ws.onmessage=e=>{const m=JSON.parse(e.data);if(m.id&&pending.has(m.id)){const {resolve,reject}=pending.get(m.id);pending.delete(m.id);m.error?reject(new Error(m.error.message)):resolve(m.result)}else if(m.method){for(const fn of listeners.get(m.method)||[])fn(m.params)}};
 const cdp=(method,params={})=>new Promise((resolve,reject)=>{const id=++seq;pending.set(id,{resolve,reject});ws.send(JSON.stringify({id,method,params}))});
 const on=(method,fn)=>{if(!listeners.has(method))listeners.set(method,[]);listeners.get(method).push(fn)};
 const evaluate=async expr=>(await cdp('Runtime.evaluate',{expression:expr,returnByValue:true,awaitPromise:true})).result?.value;
 const waitFor=async(expr,ms=15000)=>{const end=Date.now()+ms;while(Date.now()<end){try{if(await evaluate(expr))return true}catch{}await sleep(150)}return false};
 const close=async()=>{try{ws.close()}catch{}proc.kill();await sleep(500);try{rmSync(profile,{recursive:true,force:true})}catch{}};
 await cdp('Page.enable');await cdp('Network.enable');await cdp('Runtime.enable');
 return {cdp,on,evaluate,waitFor,close,
  viewport:(width,height=900)=>cdp('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:width<600}),
  async setCookie(base,cookieValue){await cdp('Network.clearBrowserCookies');if(!cookieValue)return;const [name,value]=cookieValue.split('=');await cdp('Network.setCookie',{name,value,url:base,httpOnly:true,sameSite:'Strict'})},
  async screenshot(file){const {cssContentSize:s}=await cdp('Page.getLayoutMetrics');const {data}=await cdp('Page.captureScreenshot',{format:'png',captureBeyondViewport:true,clip:{x:0,y:0,width:Math.ceil(s.width),height:Math.min(6000,Math.ceil(s.height)),scale:1}});writeFileSync(file,Buffer.from(data,'base64'))},
 };
}
