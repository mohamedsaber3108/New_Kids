// Passive public network and console metadata. Never persist headers, credentials, request bodies or response bodies.
export function captureTelemetry(page,{limit=500}={}) {
  const requests=[];const errors=[];const failed=[];
  const record=(entry,list)=>{if(list.length<limit)list.push(entry);};
  const cleanURL=raw=>{try {const u=new URL(raw);u.search='';u.hash='';return u.href;}catch{return '[invalid-url]';}};
  page.on('request',r=>record({url:cleanURL(r.url()),method:r.method(),resourceType:r.resourceType()},requests));
  page.on('requestfailed',r=>record({url:cleanURL(r.url()),failure:r.failure()?.errorText||'unknown'},failed));
  page.on('response',r=>{if(r.status()>=400)record({url:cleanURL(r.url()),httpStatus:r.status()},failed);});
  page.on('console',m=>{if(m.type()==='error')record({message:m.text().slice(0,500)},errors);});
  page.on('pageerror',e=>record({message:e.message.slice(0,500)},errors));
  return {snapshot:()=>({requests,failed,errors,notes:['Query strings, network headers, request bodies and response bodies deliberately excluded.']})};
}
