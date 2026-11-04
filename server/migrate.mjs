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
  {
    version: 2,
    name: 'provider_delivery_and_usage_logs',
    // Additive only. email_deliveries stores a SHA-256 of the recipient, never the address,
    // and never the verification/reset link. ai_usage records provider calls for cost and
    // abuse control without storing the child's message text.
    up(db) {
      db.exec(`
        CREATE TABLE IF NOT EXISTS email_deliveries(
          id TEXT PRIMARY KEY, template TEXT NOT NULL, recipient_hash TEXT NOT NULL,
          provider TEXT NOT NULL, status TEXT NOT NULL CHECK(status IN ('SENT','FAILED')),
          attempts INTEGER NOT NULL, error TEXT, provider_message_id TEXT, created_at TEXT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS email_deliveries_created ON email_deliveries(created_at);
        CREATE TABLE IF NOT EXISTS ai_usage(
          id TEXT PRIMARY KEY, learner_id TEXT REFERENCES learners(id) ON DELETE CASCADE,
          provider TEXT NOT NULL, model TEXT, status TEXT NOT NULL CHECK(status IN ('OK','BLOCKED_INPUT','BLOCKED_OUTPUT','ERROR','LIMITED')),
          input_tokens INTEGER NOT NULL DEFAULT 0, output_tokens INTEGER NOT NULL DEFAULT 0,
          latency_ms INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS ai_usage_learner_day ON ai_usage(learner_id,created_at);
      `);
      // Guardian opt-in for live AI, default OFF. Guarded so re-runs are safe.
      if (!db.prepare('PRAGMA table_info(learner_controls)').all().some(c => c.name === 'live_ai_allowed'))
        db.exec('ALTER TABLE learner_controls ADD COLUMN live_ai_allowed INTEGER NOT NULL DEFAULT 0 CHECK(live_ai_allowed IN (0,1))');
    },
  },
  {
    version: 3,
    name: 'subscriptions_and_payment_events',
    // Provider-neutral. No card data is ever stored; only the provider's subscription reference.
    up(db) {
      db.exec(`
        CREATE TABLE IF NOT EXISTS subscriptions(
          id TEXT PRIMARY KEY, guardian_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          provider TEXT NOT NULL, provider_ref TEXT NOT NULL, plan TEXT NOT NULL CHECK(plan IN ('FAMILY_MONTHLY','FAMILY_YEARLY')),
          status TEXT NOT NULL CHECK(status IN ('ACTIVE','PAST_DUE','CANCELED','EXPIRED')),
          current_period_end TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
          UNIQUE(provider, provider_ref)
        );
        CREATE INDEX IF NOT EXISTS subscriptions_guardian ON subscriptions(guardian_id,updated_at);
        CREATE TABLE IF NOT EXISTS payment_events(
          id TEXT PRIMARY KEY, provider TEXT NOT NULL, type TEXT NOT NULL,
          outcome TEXT NOT NULL, received_at TEXT NOT NULL
        );
      `);
    },
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
