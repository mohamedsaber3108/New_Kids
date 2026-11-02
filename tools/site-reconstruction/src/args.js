export const LIMITS = Object.freeze({maxPages:200,maxDepth:8,maxTimeout:60000,maxAssets:200,delay:500});
export function parseArgs(tokens) {
  const out={};
  for (let i=0;i<tokens.length;i++) if(tokens[i].startsWith('--')) {
    const k=tokens[i].slice(2); out[k] = tokens[i+1] && !tokens[i+1].startsWith('--') ? tokens[++i] : true;
  }
  return out;
}
export function bound(value, fallback, min, max, label) {
  const n=value===undefined?fallback:Number(value);
  if(!Number.isInteger(n)||n<min||n>max) throw Error(`${label} must be an integer ${min}–${max}`);
  return n;
}
export function parseHttpUrl(value){
  let url; try { url = new URL(value); } catch { throw Error('Invalid absolute URL'); }
  if(!['http:','https:'].includes(url.protocol)) throw Error('Only HTTP(S) is supported');
  if(url.username||url.password) throw Error('URL credentials are forbidden');
  return url;
}
