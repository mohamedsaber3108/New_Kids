// Read-only audit helper: prints every frontend state write (update(...)) with context and
// whether the same statement is gated on the backend. Does NOT modify any file.
import {readFileSync,readdirSync} from 'node:fs';
const files=readdirSync('src').filter(f=>/\.(jsx|js)$/.test(f));
for(const f of files){
 const text=readFileSync('src/'+f,'utf8');
 let i=0,n=0;
 while((i=text.indexOf('update(',i))!==-1){
  const before=text.slice(Math.max(0,i-220),i).replace(/\s+/g,' ');
  const after=text.slice(i,i+120).replace(/\s+/g,' ');
  console.log(`--- ${f} #${++n}\n  ...${before}\n  >>> ${after}`);
  i+=7;
 }
}
