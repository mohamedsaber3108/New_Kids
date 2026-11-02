import {DatabaseSync} from 'node:sqlite';
import {mkdirSync} from 'node:fs';
import {dirname} from 'node:path';
import {runMigrations} from './migrate.mjs';

export function openDatabase(filename){
  if(filename!==':memory:')mkdirSync(dirname(filename),{recursive:true,mode:0o700});
  const db=new DatabaseSync(filename,{timeout:5000});
  db.exec('PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL;');
  db.exec(`
    CREATE TABLE IF NOT EXISTS users(
      id TEXT PRIMARY KEY, role TEXT NOT NULL CHECK(role IN ('GUARDIAN','MODERATOR','ADMIN')),
      email TEXT NOT NULL UNIQUE, password_hash TEXT NOT NULL, display_name TEXT NOT NULL,
      guardian_approved_at TEXT, created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS learners(
      id TEXT PRIMARY KEY, guardian_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      nickname TEXT NOT NULL, age_band TEXT NOT NULL CHECK(age_band IN ('7-9','10-12','13-15')),
      age_year INTEGER CHECK(age_year BETWEEN 7 AND 15),
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS sessions(
      token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      learner_id TEXT REFERENCES learners(id) ON DELETE CASCADE,
      expires_at INTEGER NOT NULL, created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS password_resets(
      token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires_at INTEGER NOT NULL, created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS email_verifications(
      token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires_at INTEGER NOT NULL, created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS learner_preferences(
      learner_id TEXT PRIMARY KEY REFERENCES learners(id) ON DELETE CASCADE,
      preferences_json TEXT NOT NULL, updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS guardian_goals(
      learner_id TEXT PRIMARY KEY REFERENCES learners(id) ON DELETE CASCADE,
      weekly_missions INTEGER NOT NULL CHECK(weekly_missions BETWEEN 1 AND 7),
      focus_world TEXT NOT NULL, note TEXT NOT NULL, updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS learner_controls(
      learner_id TEXT PRIMARY KEY REFERENCES learners(id) ON DELETE CASCADE,
      guides_enabled INTEGER NOT NULL DEFAULT 1 CHECK(guides_enabled IN (0,1)),
      voice_enabled INTEGER NOT NULL DEFAULT 1 CHECK(voice_enabled IN (0,1)),
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS guardian_consents(
      guardian_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      policy_version TEXT NOT NULL, attested_at TEXT NOT NULL, withdrawn_at TEXT,
      PRIMARY KEY(guardian_id,policy_version)
    );
    CREATE TABLE IF NOT EXISTS learner_time_limits(
      learner_id TEXT PRIMARY KEY REFERENCES learners(id) ON DELETE CASCADE,
      daily_minutes INTEGER NOT NULL DEFAULT 60 CHECK(daily_minutes BETWEEN 10 AND 240),
      weekly_minutes INTEGER NOT NULL DEFAULT 300 CHECK(weekly_minutes BETWEEN 30 AND 1200),
      bedtime_hour INTEGER NOT NULL DEFAULT 21 CHECK(bedtime_hour BETWEEN 0 AND 23),
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS learner_usage_minutes(
      learner_id TEXT NOT NULL REFERENCES learners(id) ON DELETE CASCADE,
      day TEXT NOT NULL, minute TEXT NOT NULL, created_at TEXT NOT NULL,
      PRIMARY KEY(learner_id,minute)
    );
    CREATE INDEX IF NOT EXISTS learner_usage_day ON learner_usage_minutes(learner_id,day);
    CREATE TABLE IF NOT EXISTS daily_goals(
      learner_id TEXT PRIMARY KEY REFERENCES learners(id) ON DELETE CASCADE,
      target INTEGER NOT NULL DEFAULT 2 CHECK(target BETWEEN 1 AND 5), updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS learner_cosmetics(
      learner_id TEXT NOT NULL REFERENCES learners(id) ON DELETE CASCADE,
      cosmetic_id TEXT NOT NULL, equipped INTEGER NOT NULL DEFAULT 0 CHECK(equipped IN (0,1)), unlocked_at TEXT NOT NULL,
      PRIMARY KEY(learner_id,cosmetic_id)
    );
    CREATE TABLE IF NOT EXISTS streak_freezes(
      learner_id TEXT PRIMARY KEY REFERENCES learners(id) ON DELETE CASCADE,
      available INTEGER NOT NULL DEFAULT 0 CHECK(available BETWEEN 0 AND 3), updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS gamification_wallets(
      learner_id TEXT PRIMARY KEY REFERENCES learners(id) ON DELETE CASCADE,
      spent_coins INTEGER NOT NULL DEFAULT 0 CHECK(spent_coins>=0), updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS placements(
      learner_id TEXT PRIMARY KEY REFERENCES learners(id) ON DELETE CASCADE,
      answers_json TEXT NOT NULL, results_json TEXT NOT NULL, created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS attempts(
      id TEXT PRIMARY KEY, learner_id TEXT NOT NULL REFERENCES learners(id) ON DELETE CASCADE,
      mission_id TEXT NOT NULL, score INTEGER NOT NULL, total INTEGER NOT NULL,
      answers_json TEXT NOT NULL, created_at TEXT NOT NULL, next_review_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS attempts_learner ON attempts(learner_id,created_at);
    CREATE TABLE IF NOT EXISTS learning_sessions(
      id TEXT PRIMARY KEY, learner_id TEXT NOT NULL REFERENCES learners(id) ON DELETE CASCADE,
      mission_id TEXT NOT NULL, mode TEXT NOT NULL CHECK(mode IN ('MISSION','PRACTICE')),
      status TEXT NOT NULL CHECK(status IN ('IN_PROGRESS','COMPLETE')),
      answers_json TEXT NOT NULL, attempt_id TEXT REFERENCES attempts(id) ON DELETE SET NULL,
      created_at TEXT NOT NULL, updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS learning_sessions_learner ON learning_sessions(learner_id,status,updated_at);
    CREATE TABLE IF NOT EXISTS activities(
      id TEXT PRIMARY KEY, learner_id TEXT NOT NULL REFERENCES learners(id) ON DELETE CASCADE,
      kind TEXT NOT NULL, world TEXT NOT NULL, score INTEGER NOT NULL, total INTEGER NOT NULL,
      detail_json TEXT NOT NULL, created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS activities_learner ON activities(learner_id,created_at);
    CREATE TABLE IF NOT EXISTS projects(
      id TEXT PRIMARY KEY, learner_id TEXT NOT NULL REFERENCES learners(id) ON DELETE CASCADE,
      title TEXT NOT NULL, body TEXT NOT NULL, world TEXT,
      visibility TEXT NOT NULL DEFAULT 'PRIVATE' CHECK(visibility='PRIVATE'),
      created_at TEXT NOT NULL, updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS project_notes(
      project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      stage TEXT NOT NULL CHECK(stage IN ('RESEARCH','REFLECTION')),
      body TEXT NOT NULL, updated_at TEXT NOT NULL,
      PRIMARY KEY(project_id,stage)
    );
    CREATE TABLE IF NOT EXISTS project_milestones(
      id TEXT PRIMARY KEY, project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      title TEXT NOT NULL, complete INTEGER NOT NULL DEFAULT 0 CHECK(complete IN (0,1)),
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS project_showcase_requests(
      project_id TEXT PRIMARY KEY REFERENCES projects(id) ON DELETE CASCADE,
      status TEXT NOT NULL CHECK(status IN ('PENDING','APPROVED','REJECTED')),
      requested_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS conversations(
      id TEXT PRIMARY KEY, learner_id TEXT NOT NULL REFERENCES learners(id) ON DELETE CASCADE,
      companion_id TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS conversation_messages(
      id TEXT PRIMARY KEY, conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
      message TEXT NOT NULL, reply TEXT NOT NULL, created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS conversation_messages_parent ON conversation_messages(conversation_id,created_at);
    CREATE TABLE IF NOT EXISTS reports(
      id TEXT PRIMARY KEY, learner_id TEXT REFERENCES learners(id) ON DELETE SET NULL,
      reason TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'OPEN' CHECK(status IN ('OPEN','RESOLVED','REJECTED')),
      resolution TEXT, created_at TEXT NOT NULL, resolved_at TEXT
    );
    CREATE TABLE IF NOT EXISTS curriculum_drafts(
      id TEXT PRIMARY KEY, title_ar TEXT NOT NULL, title_en TEXT NOT NULL,
      world TEXT NOT NULL, objective_ar TEXT NOT NULL, objective_en TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'DRAFT' CHECK(status IN ('DRAFT','REVIEW','ARCHIVED')),
      created_at TEXT NOT NULL, updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS experiment_drafts(
      id TEXT PRIMARY KEY, name TEXT NOT NULL, hypothesis TEXT NOT NULL,
      variant_a TEXT NOT NULL, variant_b TEXT NOT NULL,
      status TEXT NOT NULL CHECK(status IN ('DRAFT','REVIEW','ARCHIVED')),
      created_at TEXT NOT NULL, updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS feature_flags(
      key TEXT PRIMARY KEY, enabled INTEGER NOT NULL CHECK(enabled IN (0,1)), updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS audit(
      id TEXT PRIMARY KEY, actor_id TEXT NOT NULL, action TEXT NOT NULL,
      target_type TEXT NOT NULL, target_id TEXT NOT NULL, created_at TEXT NOT NULL
    );
  `);
  if(!db.prepare('PRAGMA table_info(users)').all().some(column=>column.name==='email_verified_at'))db.exec('ALTER TABLE users ADD COLUMN email_verified_at TEXT');
  if(!db.prepare('PRAGMA table_info(learners)').all().some(column=>column.name==='age_year'))db.exec('ALTER TABLE learners ADD COLUMN age_year INTEGER CHECK(age_year BETWEEN 7 AND 15)');
  // Apply versioned migrations on top of the baseline schema. Safe and idempotent:
  // already-applied migrations are skipped and the baseline marker performs no change.
  runMigrations(db);
  return db;
}
