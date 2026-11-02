import {DatabaseSync,backup} from 'node:sqlite';
import {existsSync,mkdirSync} from 'node:fs';
import {dirname,resolve} from 'node:path';

const source=resolve(process.env.DB_FILE||'/data/kids.db');
const destination=process.argv[2]&&resolve(process.argv[2]);
if(!destination||source===destination||!existsSync(source)||existsSync(destination)){
  console.error('Usage: DB_FILE=/data/kids.db node server/backup.mjs /path/to/new-backup.sqlite (source must exist; destination must not)');
  process.exitCode=1;
}else{
  mkdirSync(dirname(destination),{recursive:true,mode:0o700});
  const db=new DatabaseSync(source,{readOnly:true});
  try{
    await backup(db,destination);
    const copy=new DatabaseSync(destination,{readOnly:true});
    try{if(copy.prepare('PRAGMA integrity_check').get().integrity_check!=='ok')throw new Error('Backup integrity check failed')}
    finally{copy.close()}
    console.log('Verified SQLite backup:',destination);
  }finally{db.close()}
}
