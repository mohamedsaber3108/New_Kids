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
- [ ] Roadmap Phase B (frontend approvals) and Phase C (business decisions) — awaiting decision
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
