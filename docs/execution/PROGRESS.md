# USAM Kids — Execution Progress Ledger

This is the living record of work on the USAM Kids completion effort. It is updated
after every meaningful change so work can resume without repeating discovery.

**Working tree:** `m:\Kids _New\app` (git initialized)
**Original ZIP (untouched backup):** `m:\Kids _New\Kids-20261102T164213Z-1-001.zip`
**First extraction (untouched):** `m:\Kids _New\extracted\`
**Baseline commit:** `5430d8b` — "Baseline checkpoint: USAM Kids v20 as extracted from ZIP"

## Verified baseline facts (checked, not assumed)
- `npm ci` → installs 65 packages; reports 2 vulns (1 high, 1 moderate) to triage.
- `npm test` → **34/34 pass** (Node's built-in test runner).
- `npm run build` → succeeds; single bundle `dist/assets/index-*.js` ≈ 518 KB (no code splitting).
- `node server/app.mjs` → boots, logs "USAM Kids API listening on 3001".
- Live API smoke test: `/api/health`, `/api/health/ready`, `/api/config` all 200;
  guardian register (201) → session cookie → `/api/auth/me` (authenticated) → login (200).
- Origin-check security control confirmed: mutating requests without a matching
  `Origin` header are rejected `403 origin_mismatch`.
- Runtime here: Node v26.7.0 (project targets Node 24; `node:sqlite` available & working).

## Repository discovery result
- Exactly ONE project. No `.git`, no remotes, no submodules, no `.gitmodules` in the ZIP.
- `tools/site-reconstruction/` is a vendored DEV-ONLY toolkit (own package.json);
  NOT shipped to users. Preserved, out of product scope.

## Project identity (RESOLVED by correction directive)
- USAM_New (= "KidsNew") = THIS project `M:\Kids _New\app`. Its frontend is the source of truth.
- USAM Learning World (`USAM-Learning-Worlds` repo) = REFERENCE ONLY, later phase. Untouched.
- USAM Kids / USAM / USAM Main = EXCLUDED. Not inspected, not used.

## Phase status
- [x] Phase 0 — Discovery & baseline (git init, verified build/test/API; identity resolved)
- [x] Phase 1 — USAM_New frontend audit + feature→backend matrix
      - [x] FRONTEND_INVENTORY.md: all routes, roles, contract notes (full source audit)
      - [x] FEATURE_BACKEND_MATRIX.md: every api() call mapped; ZERO missing endpoints
      - [x] Verified e2e journey (tests/journey.e2e.mjs) 18/18 steps incl. 2 authz guards
- [~] Phase 2 — Core foundation / hardening IN PROGRESS:
      - [x] Versioned SQLite migration framework (server/migrate.mjs) + tests
      - [x] Config module with fail-fast production validation (server/config.mjs) + example.env
      - [x] Structured JSON request logging (no query/body/cookie), requestId per line
      - [x] Graceful shutdown (SIGTERM/SIGINT closes server then SQLite)
      - [x] Expired session/token cleanup (startup + hourly)
      - [x] MODERATOR account provisioning; admin overview guardian-count bug fixed
      - [x] Negative-authorization + boundary coverage: tests/comprehensive.e2e.mjs (50/50)
      - [x] One-command gate `npm run verify` (suite 45/45, e2e 18/18 + 50/50, entrypoint 7/7, build)
      - [ ] Centralize per-endpoint validation into shared helpers (validation itself already
            exists per handler and is now test-covered; refactor is maintainability, not a gap)
- [x] Phase 3 — Provider adapters: email (postmark/sendgrid/webhook), guardian-gated live AI
      (openai/anthropic), signed payment webhooks + entitlements; admin integration status
- [x] Phase 4 — Frontend-driven audit: 36 writes classified, 10 lab kinds parity-proven (457/457),
      every guardian/admin/moderator call verified (75/75); privacy filter defect D7 fixed
- [x] Phase 5 — Docker build+runtime verified (34/34), Nginx header/CSP defect D8 fixed,
      `server/restore.mjs` + tests, DEPLOYMENT_RUNBOOK.md
- [x] Concurrency/abuse tests (duplicate completion, racing answers, rate limits, body abuse)
- [x] Approved frontend changes implemented: companion persistence (`src/main.jsx`), guardian
      live-AI opt-in (`src/operations.jsx`). Verified: unit 69/69, verify all green, docker 38/38.
- [ ] Awaiting accounts: email/AI/payment providers, AWS, legal text
- [x] Phase 6 — USAM Learning World reference review delivered (read-only; ADOPT/ADAPT/DO NOT ADOPT/NEEDS DECISION)
- [x] Live AI in-flight revocation hardening (cf373dc)
- [x] Roadmap Phase A, backend only (0e44907): guardian insights (evidence taxonomy, mastery
      confidence, weekly minutes, world balance), AI coaching modes, fast/strong model routing.
      Deferred: G2 streak bonus (needs frontend XP alignment), C2 content (needs educator review).
      Gates: unit 86/86, journey 18/18, comprehensive 50/50, parity 457/457, roles 75/75,
      entrypoint 7/7, build OK, docker 38/38. No frontend files changed.
- [x] Phase B (approved subset, f8e58f4): guardian learning insights (Progress tab), weekly tracked
      minutes + subject balance (Activity tab). Frontend: src/guardian-details.jsx only, no CSS change.
      Gates: unit 91/91, journey 18/18, comprehensive 50/50, parity 457/457, roles 75/75,
      entrypoint 7/7, build OK, docker 40/40.
- [ ] Remaining Phase B items (achievements, hint tracking, sorting, streak bonus) and Phase C — NOT approved, not started
- [ ] Phase 3 — Core foundation (auth/permissions hardening, API contracts, observability)
- [ ] Phase 4 — Learning engines completion
- [ ] Phase 5 — Product experiences (learner/guardian/moderator/admin/public)
- [ ] Phase 6 — CMS & content publishing
- [ ] Phase 7 — Provider integrations (AI/voice/email/payments) — safely gated
- [ ] Phase 8 — Security & QA
- [ ] Phase 9 — Deployment
- [ ] Phase 10 — Final verification

## Change log
| Date | Commit | What changed |
|---|---|---|
| 2026-11-03 | 5430d8b | Baseline checkpoint committed; .gitignore hardened (data/, *.db, .env). |
| 2026-11-03 | 3632a3e | Versioned migration framework + tests; execution docs. Full suite 37/37. |
| 2026-11-03 | 7f807e9 | Repo discovery: found USAM-Learning-Worlds + related repos. |
| 2026-11-03 | 894a235 | USAM_New frontend audit + API matrix + e2e journey (18/18); suite 37/37. |

## Testing notes / gotchas
- Run tests with a CLEAN environment. Do NOT export PUBLIC_ORIGIN / ADMIN_EMAIL /
  ADMIN_PASSWORD / DB_FILE / REQUIRE_GUARDIAN_CONSENT in the test shell: createApp()
  reads process.env as defaults, and a leaked PUBLIC_ORIGIN makes every in-test
  mutation fail with `origin_mismatch` (false "4 failing tests"). Confirmed: with a
  clean env the suite is 37/37. (If needed: `Remove-Item Env:PUBLIC_ORIGIN,...`)
- Node here is v26; project targets Node 24. `node:sqlite` works on both.

## Open blockers (need user/external input — work continues around them)
- Email provider credentials (verification/reset delivery) — build adapter, leave disabled.
- AI provider credentials — build adapter + keep deterministic safe fallback, leave disabled.
- Payments merchant/provider + market — build entitlement seam, keep FREE_ACCESS.
- EC2 host / domain / TLS / secrets store — prepare scripts & docs; cannot provision AWS.
- Legal/consent copy approval — surface honestly; cannot self-certify.

## Phase B — Hint-usage tracking (approved)

### What was implemented
- Tracks the three real hint reveals the learner uses (all static bilingual hints, no AI):
  mission/practice session player (`session-player.jsx`), age challenges (`age-challenges.jsx`),
  coding challenges (`coding-challenges.jsx`). Not tracked (not hint reveals): evidence review in
  `workshop.jsx`, companion chat "hint" questions (already handled by `/api/assist`).
- Recording happens at the moment the learner presses Hint and the hint is shown; repeat clicks
  while it is visible send nothing; the server de-duplicates retries and parallel submissions.
- Guardian Activity tab shows a compact neutral "Hints used" summary.

### Database (migration v4 `hint_events`)
`id, learner_id (FK learners ON DELETE CASCADE), source (MISSION|AGE_CHALLENGE|CODE_CHALLENGE),
world, item_id, step, session_id, dedupe_key, created_at`; `UNIQUE(learner_id, dedupe_key)`;
index `(learner_id, created_at)`. Idempotency keys: `MISSION:<session>:<question>`,
`AGE_CHALLENGE:<id>:<UTC day>`, `CODE_CHALLENGE:<id>:<UTC day>`. No hint text, answers,
prompts or messages are stored.

### API contract
- `POST /api/hints` (learner session only, rate limit 60/min, Origin-checked like all writes)
  - body `{source:'MISSION', sessionId, step}` | `{source:'AGE_CHALLENGE'|'CODE_CHALLENGE', itemId}`
  - 201 `{recorded:true,duplicate:false}` · 200 `{recorded:false,duplicate:true}`
  - 400 `invalid_hint` (bad source/id/step, step ahead of progress, no hint) · 404 `session_not_found`
    (unknown or another learner's session) · 401 anonymous · 403 non-learner · 429 rate limited
  - world/mission are taken from server data; client-sent world/itemId for missions are ignored.
- `GET /api/guardian/children/:id/overview` (and `/export`, `/api/parents/children/:id/dashboard|progress`)
  gain additive `insights.hints`: `{last7Days, last28Days, byWorld[{worldId,count}],
  bySource{MISSION,AGE_CHALLENGE,CODE_CHALLENGE}, topMissions[{missionId,count}] (max 5),
  windows{shortDays:7,longDays:28,timezone:'UTC'}}` — whole UTC days ending today.
  Never included in learner snapshots or any child-facing response.

### Frontend integration points
- `src/main.jsx`: `recordHint` helper (no-op unless backend + LEARNER; errors ignored so the
  learner experience is unchanged) passed as a prop to the 3 hint components (4 render sites).
- `src/session-player.jsx`, `src/age-challenges.jsx`, `src/coding-challenges.jsx`: accept
  `recordHint`; the existing Hint button calls it before `setHint(true)` when not yet shown.
- `src/guardian-details.jsx`: `HintInsight` in the Activity tab (existing classes, no CSS change).

### Security and privacy
Server-side learner-only recording; session ownership and progress validated; guardian
overview linked-child check (other family 403, child 403, anonymous 401); metadata only;
cascade deletion with the child; included in guardian export; does not touch consent or AI
controls (test confirms liveAiAllowed stays false and companions stay rule-based).

### Test results (all actually executed)
hint-tracking 10/10 · `npm run verify`: unit 101/101, journey 18/18, comprehensive 50/50,
parity 457/457, roles 75/75, entrypoint 7/7, build OK · `npm run verify:docker` 43/43
(3 new hint checks through Nginx).

### Limitations
- The click on the Hint button is not exercised in a real browser (no DOM/browser runtime in
  this environment). The exact payloads the buttons send are tested against the real API, and
  the components are rendered to confirm unchanged learner markup.
- Visual layout of the new guardian section on real devices not checked.

## Real-browser verification (closes the "not visually verified" items)
`npm run verify:browser` (scripts/verify-browser.mjs): headless Chrome driven through the
DevTools Protocol with Node's built-in WebSocket (no new dependency), serving the production
build from the real API server. Result: **45/45**.
- Real clicks on all three Hint buttons (mission session, age challenge, coding challenge):
  hint hidden before click, shown after, exactly one hint_events row per reveal; repeat clicks
  and Reset-then-reveal add nothing.
- Companion card click saves the choice on the server and it survives a reload.
- Guardian Progress (learning insights) and Activity (weekly tracked minutes, subject balance,
  hints) tabs in English and Arabic at 360 / 768 / 1280 px: content present, no horizontal
  overflow, RTL direction in Arabic; screenshots in node_modules/.cache/browser-shots/.
- Guardian Safety tab: Live AI checkbox off + disabled with the honest unavailable message.
Observations (not defects): at 360 px the weekly day labels wrap to three lines (readable, no
overflow); the existing mastery rule labels untouched subjects "Learning" while insights say
"No evidence yet".

## Full frontend ↔ backend integration sweep (autonomous completion pass)

### Gaps found and fixed
| # | Gap (found by inspecting what the frontend actually reads) | Fix |
|---|---|---|
| I1 | Rewards page reads `streak` from `GET /api/gamification/progression`, which never returned it → streak always 0 with the server | progression now returns `streak` (server engine value); regression test in tests/phase-a.test.mjs |
| I2 | Guardian overview "Suggested next step" printed a raw mission id (e.g. `english-evidence`) | `src/operations.jsx` shows the mission title (or subject name) in AR/EN |
| I3 | Weekly chart day labels wrapped to 3 lines on 360 px phones | `src/guardian-details.jsx` label = weekday + day |

### Whole-product verification in real Chrome
- `scripts/verify-routes.mjs` (`npm run verify:routes`): visits EVERY frontend route for every role
  (anonymous 26, learner 104, guardian 13, admin 31, moderator 5) in English and Arabic with rich data
  seeded through the real API, and fails on any failing `/api` request, JS exception, console error,
  `undefined`/`NaN`/`[object Object]`, not-found screen, or redirect to login. Detector self-test:
  controls (unknown mission, unknown project, unknown evidence → API 404) must be flagged.
  Result: **338 route visits, 338 clean**, controls flagged, both content expectations pass
  (rewards streak shown; guardian next step readable).
- `scripts/verify-forms.mjs` (`npm run verify:forms`): types into the real inputs and clicks the
  real buttons; verifies the database. Result **15/15**: full mission run (3 questions → one attempt
  with full marks, session COMPLETE), project create (+ privacy filter blocks a phone number via the
  form), guardian "Add a child", guides toggle (then /api/assist 403 for the child), time limits
  45/200/20, moderator resolves a report (status + reason + audit).
- `scripts/verify-browser.mjs` 45/45 (hint clicks, companion persistence, responsive AR/EN).
- `npm run verify:ui` runs all three.

### Gate results (this pass, all executed)
unit 102/102 · journey 18/18 · comprehensive 50/50 · parity 457/457 · roles 75/75 · entrypoint 7/7 ·
build OK · browser 45/45 · routes 338/338 · forms 15/15 · docker 43/43.
Note: the first Docker run failed because Docker Desktop had stopped on this machine; after starting
it, the Docker gate passed 43/43.

### Backend completeness statement (evidence-based)
Every `api()` call in the frontend has a server handler; every route renders against the real API
for its role with no failing request or broken value; every major form persists through the UI.
Browser-only behaviour remaining in backend mode is by design: theme, language, demo-data delete;
search and notifications are computed in the browser from the server snapshot (authoritative data).
External services remain disabled honestly until credentials exist (email, live AI, payments,
voice scoring); AWS/DNS/TLS and legal approval are owner actions.

## Deploy-readiness pass
- Dependencies: Vite 5.4.21 → **6.4.6** (pinned) and esbuild **0.25.12** pinned as a devDependency
  (tests import it). `npm audit`: **0 vulnerabilities** (was 1 high in vite, 1 moderate in esbuild; both
  affected the dev server only). Vite 8 was not adopted (too large a jump for this release).
- `package.json` `engines.node >=24` (matches `node:24-alpine` images and `node:sqlite` needs).
- `vite.config.js`: `react` and `icons` vendor chunks split from app code (long-lived browser cache);
  the >500 KB chunk warning is gone (largest chunk 421 KB / 127 KB gzip).
- `docker-compose.yml`: json-file log rotation, 10 MB × 5 per service.
- `deploy/backup.sh` + `deploy/usam-backup.{service,timer}`: hourly verified backups with local
  retention and optional SSE-KMS S3 upload. Exercised against the real stack by `verify-docker`.
- `deploy/deploy.sh <ref>|rollback`: .env permission check, pre-deploy backup, build, start,
  readiness check, automatic rollback to the previous release on failure. Syntax-checked
  (`bash -n`); **not executed against a real EC2 host** (none available).
- `.github/workflows/ci.yml`: audit + verify + verify:ui + verify:docker on push/PR.
  **Not run on GitHub yet** (no remote configured).
- `.gitattributes` forces LF on shell scripts, systemd units, Nginx config and Dockerfiles.
- **D11 (fixed)**: `server/backup.mjs` opened the WAL-mode copy read-only for `integrity_check`, which
  left `-wal`/`-shm` sidecar files beside every backup (found by the new `backup.sh` volume check).
  The copy is now switched to `journal_mode=DELETE`, so each backup is a single self-contained file.
### Gate results (deploy-readiness pass, all executed on Vite 6.4.6)
npm audit 0 vulnerabilities · unit 102/102 · journey 18/18 · comprehensive 50/50 · parity 457/457 ·
roles 75/75 · entrypoint 7/7 · build OK (no chunk warning) · browser 45/45 · routes 338/338 ·
forms 15/15 · docker 48/48 (adds 5 `deploy/backup.sh` checks).

## Final production-readiness pass
Defects found and fixed (D13/D14 are covered by the existing auth suites plus the load test, not a
dedicated unit test):
- **D12 (high) shared rate limits behind the proxy**: per-IP limits (login 10/min, register 5,
  recovery 3, reset 8, verify 10, payment webhook 120) keyed on the socket address, which behind Nginx
  is the proxy for every user, so 11 logins site-wide per minute locked everyone out. Fix: container
  Nginx `realip` (trusts only loopback/private hops, `real_ip_recursive`), host proxy sends
  `X-Forwarded-For`, API uses `X-Real-IP` only with `TRUST_PROXY=true` (Compose) and validates it.
  Tests: `tests/client-ip.test.mjs` (3) and 3 `verify-docker` checks through the real proxy chain.
- **D13 (high) login burst blocked the server**: password hashing used `scryptSync` on the request
  path. Now async scrypt (thread pool) for login, register, change and reset; hashing happens before
  any `BEGIN` so no transaction spans an `await`. Register re-checks the email after hashing.
- **D14 (medium) account enumeration by timing**: unknown emails skipped the hash; they now hash
  against a dummy value.
- **D15 (high) silent demo fallback in production**: if `/api/health` failed at page load (deploy
  restart, outage) the production app switched to the browser-only demo, so a child's work looked
  saved but stayed in localStorage. Production builds now retry, show a "short break" notice (existing
  empty-state style) and reconnect automatically; demo remains for dev or `VITE_DEMO_MODE=true` builds.
  5 new real-browser checks (outage server returning Nginx-style 502).
- **D16 (medium) no compression**: Nginx served JS/CSS uncompressed (421 KB app script, 127 KB gzip).
  gzip enabled; `verify-docker` asserts `Content-Encoding: gzip` + `Vary`.
- Rate-limit map is pruned when large (unbounded growth per unique IP).
Capacity: `scripts/load-test.mjs` (`npm run test:load`), results in DEPLOYMENT_RUNBOOK.md section 1.
GitHub: the repository has no remote; the target repository was not identified (see final report).
### Gate results (final production-readiness pass, all executed)
npm audit 0 vulnerabilities · unit 105/105 · journey 18/18 · comprehensive 50/50 · parity 457/457 ·
roles 75/75 · entrypoint 7/7 · build OK · browser 50/50 · routes 338/338 · forms 15/15 ·
docker 52/52 · load PASS (893 req/s, p95 86 ms, 0 errors; workstation hardware).
