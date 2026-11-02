import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {openDatabase} from '../server/db.mjs';

test('existing learner records migrate without guessing a single-year age',()=>{
  const dir=mkdtempSync(join(tmpdir(),'usam-age-migration-'));
  const file=join(dir,'children.sqlite');
  try{
    const old=new DatabaseSync(file);
    old.exec("CREATE TABLE learners(id TEXT PRIMARY KEY,guardian_id TEXT NOT NULL,nickname TEXT NOT NULL,age_band TEXT NOT NULL,created_at TEXT NOT NULL); INSERT INTO learners VALUES('child','guardian','Explorer','10-12','2025-01-01')");
    old.close();
    const db=openDatabase(file);
    assert.deepEqual({...db.prepare('SELECT nickname,age_band,age_year FROM learners WHERE id=?').get('child')},{nickname:'Explorer',age_band:'10-12',age_year:null});
    db.close();
    const reopened=openDatabase(file);
    assert.equal(reopened.prepare('SELECT age_year FROM learners WHERE id=?').get('child').age_year,null);
    reopened.close();
  }finally{rmSync(dir,{recursive:true,force:true})}
});
