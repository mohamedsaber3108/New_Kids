# TESTING_AND_QUALITY_REPORT.md — USAM_New

All results were produced by running the commands in a clean environment (no PUBLIC_ORIGIN /
ADMIN_* / MODERATOR_* / DB_FILE / NODE_ENV exported). Latest run on the current commit.

## Gates
| Gate | Command | Result |
|---|---|---|
| Unit + integration | `npm test` | **69 / 69** (incl. 6 tests for the two approved frontend changes) |
| Happy-path journey | `node tests/journey.e2e.mjs` | **18 / 18** |
| Feature-by-feature (invalid input, roles, cross-account, boundaries, restart) | `node tests/comprehensive.e2e.mjs` | **50 / 50** |
| Every learning lab: frontend-built payload == server score, persisted | `node tests/content-parity.e2e.mjs` | **457 / 457** |
| Every guardian/admin/moderator frontend call + cascades + denials | `node tests/roles.e2e.mjs` | **75 / 75** |
| Real process entrypoint (config gate, logs, health, DB file) | `node scripts/verify-entrypoint.mjs` | **7 / 7** |
| Production frontend build | `npm run build` | **succeeds** |
| **Real Docker images through Nginx** (build, run, journey, headers/CSP, backup+restore, restart, non-root, read-only, prod config gate, companion persistence, live-AI opt-in state) | `node scripts/verify-docker.mjs` | **38 / 38** |
| Frontend vs baseline | `git diff 5430d8b -- src index.html vite.config.js` | **only the 2 approved files**: `src/main.jsx` (+3/−3), `src/operations.jsx` (+2/−2) |

`npm run verify` runs every gate except Docker; `npm run verify:docker` runs the Docker gate.

## Frontend audit results (scripts/audit-writes.mjs, scripts/audit-activities.mjs)
- 36 frontend state writes classified. All learning/project/session/onboarding/placement/goal/
  chat writes go to the server when the API is up. Browser-only by design: theme, language,
  demo-data delete (demo mode only); nickname/age are guardian-managed (disabled in backend mode).
- 10 activity kinds submitted by the labs; all have server scorers; parity proven per item.
- No empty handlers, alerts, TODO/"coming soon", or fake-success code in `src/`.
- One frontend-only persistence gap needs approval to fix (see BLOCKERS: companion switch).

## Defects found and fixed (all with regression tests)
| # | Defect | Fix |
|---|---|---|
| D1 | No MODERATOR provisioning (moderator desk unreachable) | idempotent `MODERATOR_*` seeding |
| D2 | Admin overview guardians = `count(users)-1` | count by role |
| D3 | No graceful shutdown | SIGTERM/SIGINT → close server then SQLite |
| D4 | No request logging | structured JSON logs, no query/body/cookie |
| D5 | Production could boot without https PUBLIC_ORIGIN | fail-fast `server/config.mjs` |
| D6 | Expired sessions/tokens never removed | `cleanupExpired()` startup + hourly |
| D7 | **Privacy filter missed Egyptian/Arabic-Indic/formatted phone numbers** in projects, notes, milestones, goals, reflections | normalize digits, join groups, flag 9+ digit runs |
| D8 | **Nginx dropped all security headers on SPA pages and assets, no page CSP** (add_header inheritance) | headers repeated per location + strict page CSP |
| D9 | `.dockerignore` did not exclude `.env`/databases (secret leak into build context) | excluded |
| D10 | No restore tool (manual WAL file copies) | `server/restore.mjs` with integrity/schema checks + safety copy |

## Security and abuse coverage
Cross-account (IDOR) reads/edits for snapshots, sessions, projects, controls, evidence, export;
every role denial pair; anonymous access; Origin enforcement (incl. through Nginx); 413/400/415
body handling; path traversal; login brute-force and attempt-flood rate limits; concurrent
"complete" taps → exactly one attempt; racing answers → optimistic lock; privacy filter on all
free text; consent withdrawal revokes child sessions; child deletion cascades every table;
password change revokes other sessions; payment webhook forged/stale/replayed; no secrets in
admin integration status.

## Provider integrations (tests/providers.test.mjs, 10 tests, fake fetch — no network)
- Email (postmark / sendgrid / webhook): documented request shapes, bilingual templates, retry on
  5xx/network only, delivery log with recipient hash, real verify + reset flows, outage → 503.
- Live AI (openai / anthropic): guardian opt-in required, private input never sent, unsafe output
  blocked, outage and daily cap fall back to rules, mode reported honestly, usage log without text.
- Payments: HMAC webhook verification, idempotent events, subscriptions + entitlement, 503 when
  unconfigured. Billing stays FREE_ACCESS.

## Not verified here (needs your accounts/infrastructure)
Real email delivery to an inbox, a real AI provider call, a real payment provider, EC2/DNS/TLS,
CloudWatch alarms, browser E2E on real devices, load testing at production scale.

## Latest gate run (final production-readiness pass)
unit 105/105 (adds tests/client-ip.test.mjs) | journey 18 | comprehensive 50 | parity 457 | roles 75 | entrypoint 7 | build OK | browser 50/50 (adds API-outage checks) | routes 338/338 | forms 15/15 | docker 52/52 (adds proxy client-IP + gzip checks) | npm run test:load PASS. See PROGRESS.md for D12-D16.
