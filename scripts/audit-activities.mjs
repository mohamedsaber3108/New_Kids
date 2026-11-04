// Read-only: list every recordActivity(kind, payload, ...) call in the frontend with the
// payload expression, so each can be checked against server-side scoreActivity().
import {readFileSync,readdirSync} from 'node:fs';
for(const f of readdirSync('src').filter(x=>/\.(jsx|js)$/.test(x))){
 const t=readFileSync('src/'+f,'utf8');let i=0;
 while((i=t.indexOf('recordActivity(',i))!==-1){
  console.log(`--- ${f}\n  ${t.slice(i,i+260).replace(/\s+/g,' ')}`);i+=15;
 }
}
