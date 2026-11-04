import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync,writeFileSync,readdirSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {openDatabase} from '../server/db.mjs';

const cwd=new URL('..',import.meta.url);
const run=(script,args,env)=>spawnSync(process.execPath,[script,...args],{cwd,env:{...process.env,...env},encoding:'utf8'});
const addGuardian=(db,id)=>db.prepare('INSERT INTO users(id,role,email,password_hash,display_name,created_at) VALUES(?,?,?,?,?,?)').run(id,'GUARDIAN',id+'@example.test','h','Parent','2026-01-01');

test('backup -> restore round trip into an empty location',()=>{
 const dir=mkdtempSync(join(tmpdir(),'usam-restore-'));
 try{
  const live=join(dir,'live.db'),bak=join(dir,'bak.sqlite'),fresh=join(dir,'fresh.db');
  const db=openDatabase(live);addGuardian(db,'g1');addGuardian(db,'g2');db.close();
  assert.equal(run('server/backup.mjs',[bak],{DB_FILE:live}).status,0);
  const r=run('server/restore.mjs',[bak],{DB_FILE:fresh});
  assert.equal(r.status,0,r.stderr);assert.match(r.stdout,/2 users/);
  const restored=openDatabase(fresh);
  assert.equal(restored.prepare('SELECT count(*) AS n FROM users').get().n,2);
  assert.ok(restored.prepare('SELECT max(version) AS v FROM schema_migrations').get().v>=3);
  restored.close();
 }finally{rmSync(dir,{recursive:true,force:true})}
});

test('restore refuses to overwrite without --replace, and --replace keeps a safety copy',()=>{
 const dir=mkdtempSync(join(tmpdir(),'usam-restore-'));
 try{
  const live=join(dir,'live.db'),bak=join(dir,'bak.sqlite');
  const db=openDatabase(live);addGuardian(db,'old');db.close();
  assert.equal(run('server/backup.mjs',[bak],{DB_FILE:live}).status,0);
  const later=openDatabase(live);addGuardian(later,'added-after-backup');later.close();
  const refused=run('server/restore.mjs',[bak],{DB_FILE:live});
  assert.equal(refused.status,1);assert.match(refused.stderr,/--replace/);
  const replaced=run('server/restore.mjs',[bak,'--replace'],{DB_FILE:live});
  assert.equal(replaced.status,0,replaced.stderr);
  const now=openDatabase(live);assert.equal(now.prepare('SELECT count(*) AS n FROM users').get().n,1,'rolled back to backup');now.close();
  const safety=readdirSync(dir).find(f=>f.includes('.pre-restore-'));
  assert.ok(safety,'safety copy created');
  const saved=openDatabase(join(dir,safety));assert.equal(saved.prepare('SELECT count(*) AS n FROM users').get().n,2,'safety copy holds the pre-restore state');saved.close();
 }finally{rmSync(dir,{recursive:true,force:true})}
});

test('restore rejects corrupt or non-USAM files and touches nothing',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'usam-restore-'));
 try{
  const junk=join(dir,'junk.sqlite'),target=join(dir,'target.db');
  writeFileSync(junk,'this is not a database');
  assert.equal(run('server/restore.mjs',[junk],{DB_FILE:target}).status,1);
  assert.equal(run('server/restore.mjs',[join(dir,'missing.sqlite')],{DB_FILE:target}).status,1);
  // A valid SQLite file that is not a USAM database.
  const {DatabaseSync}=await import('node:sqlite');
  const other=join(dir,'other.sqlite');const o=new DatabaseSync(other);o.exec('CREATE TABLE notes(x TEXT)');o.close();
  const r=run('server/restore.mjs',[other],{DB_FILE:target});
  assert.equal(r.status,1);assert.match(r.stderr,/not a USAM database/);
  assert.equal(readdirSync(dir).includes('target.db'),false,'target never created');
 }finally{rmSync(dir,{recursive:true,force:true})}
});
