import {test} from 'node:test';
import assert from 'node:assert/strict';
import {openDatabase} from '../server/db.mjs';
import {runMigrations,migrationStatus,migrations} from '../server/migrate.mjs';

test('openDatabase records migration state and is idempotent',()=>{
 const db=openDatabase(':memory:');
 // schema_migrations table exists and every declared migration is applied after open.
 const status=migrationStatus(db);
 assert.equal(status.length,migrations.length);
 assert.ok(status.every(m=>m.applied),'all migrations applied on fresh open');
 // Re-running applies nothing new (idempotent) and does not throw.
 const again=runMigrations(db);
 assert.deepEqual(again,[],'no migrations re-applied on second run');
 db.close();
});

test('migrations are uniquely and sequentially versioned',()=>{
 const versions=migrations.map(m=>m.version);
 assert.equal(new Set(versions).size,versions.length,'versions are unique');
 const sorted=[...versions].sort((a,b)=>a-b);
 for(let i=0;i<sorted.length;i++)assert.equal(sorted[i],i+1,'versions are 1..N with no gaps');
});

test('baseline schema is preserved alongside the migration table',()=>{
 const db=openDatabase(':memory:');
 // A core baseline table still works (proves migrations did not disturb the schema).
 db.prepare('INSERT INTO users(id,role,email,password_hash,display_name,created_at) VALUES(?,?,?,?,?,?)')
   .run('u1','ADMIN','a@example.test','h','Admin','2025-01-01');
 assert.equal(db.prepare('SELECT email FROM users WHERE id=?').get('u1').email,'a@example.test');
 assert.ok(db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='schema_migrations'").get());
 db.close();
});
