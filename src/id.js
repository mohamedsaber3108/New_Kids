// Local preview identifiers are not authentication tokens.
export function localId(){
 if(globalThis.crypto?.randomUUID)return globalThis.crypto.randomUUID();
 if(globalThis.crypto?.getRandomValues){const bytes=new Uint8Array(16);globalThis.crypto.getRandomValues(bytes);return [...bytes].map(x=>x.toString(16).padStart(2,'0')).join('')}
 return Date.now().toString(36)+'-'+Math.random().toString(36).slice(2);
}
