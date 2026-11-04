# TESTING_AND_QUALITY_REPORT.md — USAM_New

All results below were produced by actually running the commands in a clean environment
(no PUBLIC_ORIGIN/ADMIN_*/MODERATOR_*/DB_FILE/NODE_ENV exported in the shell).

## One-command gate
`npm run verify` = `npm test` → `npm run test:e2e` → `npm run verify:entrypoint` → `npm run build`

| Gate | Command | Result (latest run) |
|---|---|---|
| Unit + integration suite | `npm test` | **45 / 45 pass** |
| Happy-path journey | `node tests/journey.e2e.mjs` | **18 / 18 pass** |
| Comprehensive feature verification | `node tests/comprehensive.e2e.mjs` | **50 / 50 pass** |
| Real process entrypoint | `node scripts/verify-entrypoint.mjs` | **7 / 7 pass** |
| Production frontend build | `npm run build` | **succeeds** |
| Frontend unchanged | `git diff 5430d8b -- src index.html vite.config.js` | **empty (no changes)** |

## What the comprehensive suite proves (beyond "endpoint exists")
- **Auth:** invalid email, short password (<12), 1-char display name, duplicate email (409),
  wrong password (401), garbage session cookie → 401 (no crash), unauthenticated `/auth/me`.
- **Guardian gates (order enforced server-side):** child creation blocked before approval,
  blocked after approval but before consent; double-approve is not a silent second success;
  out-of-range age and ageYear/ageBand mismatch rejected.
- **Learning:** placement accepted once then 409; session lifecycle; forged out-of-range choice
  rejected; double-complete is idempotent (no duplicate attempt/reward); cross-learner session
  read blocked.
- **Projects:** title/body/world boundaries; embedded email rejected by privacy filter; research
  note + milestone create/toggle; cross-account read AND edit blocked; delete then 404.
- **Guardian controls / time limits:** disabling guides makes `/assist` return 403 server-side;
  invalid limits (weekly < daily) rejected; another guardian blocked from the child's controls;
  **guardian session is revoked when entering the child space** (child-safety behaviour).
- **Companions:** private-info message → RESTRICTED; >240 chars rejected; unknown companion rejected.
- **Moderation:** short reason rejected; learner forbidden from queue; resolve once, second
  resolve rejected.
- **Persistence after restart:** project + admin survive closing and reopening the same DB file.

## New hardening tests (`tests/hardening.test.mjs`)
- Config validation: production needs https `PUBLIC_ORIGIN`; rejects path-bearing origins,
  half-set credential pairs, weak passwords, http webhooks, invalid ports.
- Moderator provisioning: real MODERATOR login → moderation desk works, admin APIs 403;
  provisioning never overwrites an existing account (verified on a shared DB file, 2nd boot).
- Admin overview counts guardians by role (regression test for the `count(users)-1` bug).
- Expired session/token cleanup removes only expired rows; live session keeps working.
- Request logger: logs method/path/status/requestId/ms, never query-string tokens.

## Defects found and fixed in this cycle
| # | Defect | Fix | Test |
|---|---|---|---|
| D1 | No way to provision a MODERATOR → `/moderator` desk unreachable by real moderators | `MODERATOR_EMAIL`/`MODERATOR_PASSWORD` idempotent seeding | hardening.test |
| D2 | `/admin/overview` guardians = `count(users)-1` (wrong with moderators/no admin) | count `role='GUARDIAN'`; add `moderators` | hardening.test |
| D3 | No graceful shutdown (SQLite not closed on SIGTERM) | SIGTERM/SIGINT → close server then DB, 10 s force-exit | entrypoint (start path) |
| D4 | No request logging (only 500s printed) | structured JSON request logs, no query/body/cookie | hardening.test, entrypoint |
| D5 | Production could boot without https PUBLIC_ORIGIN (origin check silently weaker) | `server/config.mjs` fail-fast validation | hardening.test, entrypoint |
| D6 | Expired sessions/reset/verification tokens never removed | `cleanupExpired()` at startup + hourly | hardening.test |

Test-only issues found and fixed (not backend defects): 1-char display names in test data;
reuse of a guardian cookie that the backend correctly revokes on "enter child"; a stale output
snapshot in the entrypoint script.

## Not verified here (requires external access)
- Real email delivery, Docker image build/run, EC2/TLS, browser E2E on real devices,
  load testing at production scale. See BLOCKERS_AND_DEPENDENCIES.md.
