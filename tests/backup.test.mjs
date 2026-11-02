import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {openDatabase} from '../server/db.mjs';

test('online SQLite backup is consistent and refuses to overwrite',()=>{
 const dir=mkdtempSync(join(tmpdir(),'usam-backup-')),source=join(dir,'source.db'),copy=join(dir,'copy.db');
 try{
  const db=openDatabase(source);
  db.prepare('INSERT INTO users(id,role,email,password_hash,display_name,created_at) VALUES(?,?,?,?,?,?)').run('g','GUARDIAN','guardian@example.test','hash','Parent','2025-01-01');
  const run=()=>spawnSync(process.execPath,['server/backup.mjs',copy],{cwd:new URL('..',import.meta.url),env:{...process.env,DB_FILE:source},encoding:'utf8'});
  assert.equal(run().status,0);
  assert.equal(run().status,1);
  const saved=openDatabase(copy);
  assert.equal(saved.prepare('SELECT email FROM users WHERE id=?').get('g').email,'guardian@example.test');
  saved.close();db.close();
 }finally{rmSync(dir,{recursive:true,force:true})}
});
