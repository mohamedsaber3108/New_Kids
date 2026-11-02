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

## Phase status
- [x] Phase 1 — Discovery & baseline (git init, verified build/test/API, docs started)
- [ ] Phase 2 — Architecture & integration map + core foundation (migrations, validation, logging, config)
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

## Open blockers (need user/external input — work continues around them)
- Email provider credentials (verification/reset delivery) — build adapter, leave disabled.
- AI provider credentials — build adapter + keep deterministic safe fallback, leave disabled.
- Payments merchant/provider + market — build entitlement seam, keep FREE_ACCESS.
- EC2 host / domain / TLS / secrets store — prepare scripts & docs; cannot provision AWS.
- Legal/consent copy approval — surface honestly; cannot self-certify.
