import fs from 'node:fs/promises';import {spawnSync} from 'node:child_process';
const folders=['src','test','scripts','extension'];let failed=false;
for(const folder of folders){for(const file of await fs.readdir(folder)){if(!file.endsWith('.js'))continue;
 const relative=`${folder}/${file}`,result=spawnSync(process.execPath,['--check',relative],{encoding:'utf8'});
 if(result.status){failed=true;console.error('FAIL',relative,result.stderr)}else console.log('PASS',relative);
}}
const m=JSON.parse(await fs.readFile('extension/manifest.json','utf8'));
if(m.manifest_version!==3)failed=true;console.log('Manifest:',m.manifest_version===3?'PASS':'FAIL');
if(failed)process.exit(1);
