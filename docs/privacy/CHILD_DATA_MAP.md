# Child data map (T-23)

Branch `kids/docs-child-data-map`. Every line marked **[V]** was read in code on this branch. Lines marked **[U]** were not verified. This is an engineering map, not legal text.

## 1. Where it lives

- One SQLite file, opened by `server/db.mjs` `openDatabase()`. In the container it sits on the Docker volume `kids-data` (`/data`). [V `deploy/backup.sh:28` copies from `/data`]
- Schema: baseline in `server/db.mjs`, versioned additions in `server/migrate.mjs` (versions 2 to 4). [V]
- Retention today: **none is coded for child data.** The only automatic delete is the hourly sweep of expired sessions, reset tokens and verification tokens (`server/app.mjs` sweep, `cleanupExpired`). [V]
- "Child id" below means `learners.id`. Tables below with FK `ON DELETE CASCADE` are removed when the guardian deletes the child (see section 5). [V]

## 2. Tables and columns

Read access: **G** = linked guardian (`linked()` check), **L** = the child's own session, **M** = moderator or admin, **A** = admin only, **none** = no route reads it.

| Table | Columns that hold child data | Who can read (route, role) | Delete on child removal |
|---|---|---|---|
| `learners` [V] | `id`, `nickname` (child-chosen), `age_band`, `age_year`, `guardian_id`, `created_at` | G `GET /api/guardians/learners`, `/api/parents/children`, `/api/guardian/children/:id/overview`; L `/api/learners/:id/snapshot` | row deleted |
| `sessions` [V] | `learner_id`, `user_id`, `token_hash`, `expires_at` (child login) | none (used for auth only) | cascade |
| `learner_preferences` [V] | `preferences_json` (language, interest, goal, build, companion) | G and L via snapshot | cascade |
| `guardian_goals` [V] | `weekly_missions`, `focus_world`, `note` (guardian free text about the child) | G `GET /api/guardian/children/:id/goal` | cascade |
| `learner_controls` [V] | `guides_enabled`, `voice_enabled`, `live_ai_allowed` | G `.../controls`; L `/api/learner/controls` | cascade |
| `learner_time_limits` [V] | `daily_minutes`, `weekly_minutes`, `bedtime_hour` | G `.../time-limits`; L `/api/usage/status` | cascade |
| `learner_usage_minutes` [V] | `day`, `minute` (when the child was active, per minute) | none directly; used for limits | cascade |
| `daily_goals` [V] | `target` | L `/api/daily-goals/me` | cascade |
| `learner_cosmetics` [V] | `cosmetic_id`, `equipped`, `unlocked_at` | L `/api/gamification/cosmetics` | cascade |
| `streak_freezes` [V] | `available` | L `/api/gamification/streak-freeze/status` | cascade |
| `gamification_wallets` [V] | `spent_coins` | L (through coin balance) | cascade |
| `placements` [V] | `answers_json`, `results_json` | G and L via snapshot (`results` only) | cascade |
| `attempts` [V] | `mission_id`, `score`, `total`, `answers_json`, `next_review_at` | G `.../evidence/:id` (with answers), overview (without answers); L `/api/evidence/:id` | cascade |
| `learning_sessions` [V] | `mission_id`, `mode`, `status`, `answers_json`, `attempt_id` | L `/api/learning-sessions/:id`; G via snapshot (IN_PROGRESS only) | cascade |
| `activities` [V] | `kind`, `world`, `score`, `total`, `detail_json` (may hold the child's reflection text) | G and L via snapshot; `/api/evidence/:id` | cascade |
| `hint_events` [V] | `source`, `world`, `item_id`, `step`, `session_id`, `dedupe_key` | G insights (summary through `hintSummary`) | cascade |
| `projects` [V] | `title`, `body` (child free text), `world`, `visibility` (always PRIVATE) | L `/api/projects*`; G overview/export | cascade |
| `project_notes` [V] | `stage`, `body` (child free text) | L; G `.../reflections` | cascade through `projects` |
| `project_milestones` [V] | `title` (child free text), `complete` | L `/api/projects/:id/milestones` | cascade through `projects` |
| `project_showcase_requests` [V] | `status`, `requested_at` | none by route found | cascade through `projects` |
| `conversations` [V] | `companion_id`, timestamps | L `/api/conversations`; G export | cascade |
| `conversation_messages` [V] | `message` (child text), `reply` | L `/api/conversations/:id`; G export | cascade through `conversations` |
| `reports` [V] | `learner_id`, `reason` (child free text), `status`, `resolution` | M `/api/moderation/queue` and `/reports` (no `learner_id` shown) | **row stays**, `learner_id` set to NULL (`ON DELETE SET NULL`) |
| `ai_usage` [V] | `learner_id`, `provider`, `model`, token counts, `status`, `latency_ms`. No message text. | A `GET /api/admin/integrations` (counts, `server/app.mjs:491`) | cascade |
| `audit` [V] | `actor_id`, `action`, `target_type`, `target_id` (= child id for learner actions) | A `GET /api/admin/audit`; M for `target_type='report'` | **row stays** |

Not child data, but linked to the guardian (and so to the child): `users` (email, `display_name`), `password_resets`, `email_verifications`, `guardian_consents`, `subscriptions` (provider reference, no card data per `server/migrate.mjs` v3), `email_deliveries` (hash of the recipient only), `payment_events`, `feature_flags`. [V]

## 3. Who can receive child data outside the app

| Third party | What can leave | When | Evidence |
|---|---|---|---|
| Email provider (Postmark, SendGrid or a generic URL) | Guardian email and link text. No child field is sent. | When an email provider is configured (verify, reset). | [V] `server/providers/email.mjs` |
| Live AI provider (OpenAI-style or Anthropic-style URL) | The child's chat message text, companion name, mission title, age band. Not the child id or nickname. | Only when a provider is configured **and** the guardian turned on `live_ai_allowed`. Off by default. | [V] `server/providers/ai.mjs:54-63`, `server/app.mjs` assist route |
| Payment provider | Guardian id and subscription reference arrive by webhook. Nothing about the child is sent out. | Billing is off. | [V] webhook in `server/app.mjs`, `server/migrate.mjs` v3 |
| Google Fonts | The visitor's IP and browser data, on every page load, children included. | Until T-06 removes it. | [V] `index.html:1`, `deploy/nginx-container.conf:34` |
| S3 backup bucket | A full copy of the database file (all child tables above) with SSE-KMS. | Only if `S3_URI` is set. | [V] `deploy/backup.sh:32-34` |

## 4. Backups hold the same data

- `deploy/backup.sh` copies the SQLite file out of the container into `$BACKUP_DIR` (default `./backups`), mode 600. [V]
- Local retention is the newest `KEEP` copies (default 48). Off-host retention is an S3 lifecycle rule that is not defined in this repo. [V `backup.sh:37`; U for the bucket rule]
- So a child deleted in the app stays in every older backup until that backup is rotated out.

### Deletion after restore

Restoring an older backup brings deleted children back. Nothing today records which children were deleted. The planned fix is a **deletion log** kept outside the database file and replayed after every restore (T-10). Until it exists, a restore must be followed by a manual check against the guardians' deletion requests. [V: no such log in code; `audit` is inside the same file]

## 5. Rights flows as coded

- **Export:** `GET /api/guardian/children/:id/export` (role G). It returns `snapshot()` plus `conversations` with messages. [V `server/app.mjs:422-423`]
- **Delete:** `DELETE /api/guardian/children/:id` with body `{"confirm":"<child id>"}` (role G). It runs `DELETE FROM learners`, so FK cascades remove the child's rows, then writes an `audit` row. [V `server/app.mjs:446`, `PRAGMA foreign_keys=ON` in `server/db.mjs`]
- Both are checked by `tests/child-data-rights.test.mjs`.

### Known gaps (found by that test, not fixed here)

Export does **not** return: `learner_usage_minutes`, `learner_cosmetics`, `streak_freezes`, `gamification_wallets`, COMPLETE rows of `learning_sessions`, `project_milestones`, `project_showcase_requests`, `reports`, `hint_events`, `ai_usage`, `sessions`. The `attempts` list in the export omits `answers_json`.

Delete leaves: `audit` rows that hold the child id, and `reports` rows with the child's written reason (learner id set to NULL). Whether to keep them is an owner decision (moderation evidence against the right to erase). [V]

## 6. Consent text placeholders for counsel (list only)

No legal text is written here. Places where text or a version is needed:

1. Policy version string `2026-10-child-service-v1` (`server/app.mjs`, `/api/guardian/consent`). The text it points to is not in the repo. [V]
2. Guardian consent card, Arabic and English: "Guardian consent is required" and the button "I consent as the guardian" (`src/operations.jsx:37`). [V]
3. Staff attestation when an admin approves a guardian (`/api/admin/guardians/:id/approve`, `attestation:true`, `src/operations.jsx:44`). [V]
4. Live AI opt-in per child (`liveAiAllowed` control). No consent wording sits next to it. [V]
5. Privacy notice and terms pages: content owner not set (Q-09). [U]
6. Data retention period and deletion promise (D4, Q-03). [U]
7. Notice about third parties in section 3. [U]

## 7. Age bands hard-coded (7-9, 10-12, 13-15)

Q-02 wants these as settings. Today they are code:

| Place | What |
|---|---|
| `server/db.mjs:18` | `CHECK(age_band IN ('7-9','10-12','13-15'))` on `learners` |
| `server/db.mjs:19, 166` | `age_year` limited to 7 to 15 |
| `server/app.mjs:227` | create child: year to band (`<=9`, `<=12`) and allowed list |
| `server/app.mjs:442` | edit child: same rules |
| `server/app.mjs` `/api/placement` | `scorePlacement(answers, age_band)` |
| `src/main.jsx:93, 133` | band choice lists |
| `src/data.js:78` | default band `10-12` |
| `src/placement.js:18` | placement content per band |
