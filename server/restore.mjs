// Restore a verified USAM_New SQLite backup into DB_FILE.
//   DB_FILE=/data/kids.db node server/restore.mjs /data/backup-2026-11-04.sqlite [--replace]
// Safety rules:
//  - The backup must pass PRAGMA integrity_check and contain the USAM schema (users, learners,
//    schema_migrations). Nothing is touched otherwise.
//  - If DB_FILE already exists, --replace is required, and the current database is first saved
//    to DB_FILE.pre-restore-<timestamp>.sqlite (also integrity-checked) so a restore is reversible.
//  - Stop the API before restoring (docker compose stop usam-kids-api); restore uses SQLite's
//    online backup API, never a raw file copy of a WAL database.
import {DatabaseSync,backup} from 'node:sqlite';
import {existsSync,rmSync} from 'node:fs';
import {resolve} from 'node:path';

const target=resolve(process.env.DB_FILE||'/data/kids.db');
const args=process.argv.slice(2),replace=args.includes('--replace'),source=args.find(a=>!a.startsWith('--'));
const fail=message=>{console.error('Restore refused: '+message);process.exit(1)};

function verify(file,label){
 const db=new DatabaseSync(file,{readOnly:true});
 try{
  if(db.prepare('PRAGMA integrity_check').get().integrity_check!=='ok')fail(label+' failed integrity_check');
  const tables=new Set(db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map(r=>r.name));
  for(const t of ['users','learners','schema_migrations'])if(!tables.has(t))fail(label+' is not a USAM database (missing table '+t+')');
  return {version:db.prepare('SELECT max(version) AS v FROM schema_migrations').get().v||0,users:db.prepare('SELECT count(*) AS n FROM users').get().n,learners:db.prepare('SELECT count(*) AS n FROM learners').get().n};
 }finally{db.close()}
}

if(!source)fail('usage: DB_FILE=/data/kids.db node server/restore.mjs /path/backup.sqlite [--replace]');
const src=resolve(source);
if(!existsSync(src))fail('backup file not found: '+src);
if(src===target)fail('backup and target are the same file');
const info=verify(src,'backup');
if(existsSync(target)){
 if(!replace)fail(target+' already exists; pass --replace (the current database will be saved first)');
 const safety=target+'.pre-restore-'+new Date().toISOString().replace(/[:.]/g,'-')+'.sqlite';
 const current=new DatabaseSync(target,{readOnly:true});
 try{await backup(current,safety)}finally{current.close()}
 verify(safety,'pre-restore safety copy');
 console.log('Saved current database to',safety);
 for(const f of [target,target+'-wal',target+'-shm'])rmSync(f,{force:true});
}
const from=new DatabaseSync(src,{readOnly:true});
try{await backup(from,target)}finally{from.close()}
const after=verify(target,'restored database');
console.log(`Restored ${src} -> ${target} (schema v${after.version}, ${after.users} users, ${after.learners} learners)`);
if(after.users!==info.users||after.learners!==info.learners)fail('row counts differ after restore');
