// Versioned, ordered, idempotent SQLite migration runner for USAM Kids.
//
// Design goals (see docs/execution/PROGRESS.md, directive §7):
//  - NEVER destructive. Migrations only add/extend; they must be safe to run on an
//    existing production database that already contains the full v20 schema.
//  - Ordered and recorded. Each migration has an integer `version` and runs exactly
//    once; applied versions are recorded in `schema_migrations`.
//  - Transactional per migration. A failing migration rolls back and aborts the run
//    so the database is never left half-migrated.
//
// The initial schema created by server/db.mjs (openDatabase) remains the source of
// truth for the baseline tables. This runner layers versioned changes on top and,
// going forward, is the ONLY place new schema changes should be added.

/**
 * Ordered list of migrations. To add a schema change, append a new object with the
 * next integer version. Keep `up` idempotent where practical (IF NOT EXISTS, guards)
 * so re-running against partially-migrated databases is safe.
 *
 * Each `up` receives the open DatabaseSync handle and runs inside a transaction.
 */
export const migrations = [
  {
    version: 1,
    name: 'baseline_marker',
    // The baseline schema is created by openDatabase() with CREATE TABLE IF NOT EXISTS.
    // This migration intentionally performs no schema change; it only marks that the
    // baseline has been accounted for by the versioned system, so fresh and existing
    // databases converge on the same migration state.
    up() { /* no-op: baseline is owned by server/db.mjs */ },
  },
];

function ensureMigrationsTable(db) {
  db.exec(`CREATE TABLE IF NOT EXISTS schema_migrations(
    version INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    applied_at TEXT NOT NULL
  );`);
}

function appliedVersions(db) {
  ensureMigrationsTable(db);
  return new Set(db.prepare('SELECT version FROM schema_migrations').all().map(r => r.version));
}

/**
 * Apply all pending migrations in order. Returns the list of versions applied in
 * this run. Safe to call on every boot; already-applied migrations are skipped.
 */
export function runMigrations(db, { log = () => {} } = {}) {
  ensureMigrationsTable(db);
  const done = appliedVersions(db);
  const ordered = [...migrations].sort((a, b) => a.version - b.version);
  const applied = [];
  for (const migration of ordered) {
    if (done.has(migration.version)) continue;
    db.exec('BEGIN');
    try {
      migration.up(db);
      db.prepare('INSERT INTO schema_migrations(version,name,applied_at) VALUES(?,?,?)')
        .run(migration.version, migration.name, new Date().toISOString());
      db.exec('COMMIT');
      applied.push(migration.version);
      log(`migration ${migration.version} (${migration.name}) applied`);
    } catch (err) {
      db.exec('ROLLBACK');
      throw new Error(`migration ${migration.version} (${migration.name}) failed: ${err.message}`);
    }
  }
  return applied;
}

/** Report current migration state without changing anything. */
export function migrationStatus(db) {
  const done = appliedVersions(db);
  return migrations
    .slice()
    .sort((a, b) => a.version - b.version)
    .map(m => ({ version: m.version, name: m.name, applied: done.has(m.version) }));
}
