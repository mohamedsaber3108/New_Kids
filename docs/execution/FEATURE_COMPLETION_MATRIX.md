# FEATURE_COMPLETION_MATRIX.md

Status legend (per directive §16):
- **VERIFIED** — existing, confirmed working by code + runtime/test evidence.
- **TESTED** — implemented in this effort and covered by automated tests.
- **PARTIAL** — present but one or more required capabilities missing.
- **BLOCKED** — needs external credentials/approval; safe integration seam only.
- **MISSING** — no real independent implementation yet.

Dependencies columns: FE=frontend, BE=backend/API, DB=schema, ENG=engine, T=tests, DEP=deploy.

## Identity, accounts, access
| Feature | Status | FE | BE | DB | T | Notes |
|---|---|---|---|---|---|---|
| Guardian register/login/logout/session | VERIFIED | operations.jsx | /api/auth/* | users, sessions | api.test | cookie session, scrypt hash, origin check confirmed live |
| Email verification | PARTIAL/BLOCKED | recovery.jsx | /api/auth/verify-email* | email_verifications | api.test | logic exists; real delivery needs email provider |
| Forgot/reset password | PARTIAL/BLOCKED | recovery.jsx | /api/auth/*-password | password_resets | api.test | one-time token + session invalidation; needs provider |
| Guardian consent (versioned) | VERIFIED | operations.jsx | /api/guardian/consent | guardian_consents | api.test | withdraw revokes sessions |
| Manual guardian approval | VERIFIED | admin-studio.jsx | /api/admin/guardians/* | users | api.test | staff approval gate |
| RBAC (LEARNER/GUARDIAN/MODERATOR/ADMIN) | VERIFIED | — | server guards | users.role | api.test | server-side; negative tests to expand in Phase 3/8 |

## Learner experience (summary; detailed route states in docs/implementation-audit.md)
| Feature | Status | Notes |
|---|---|---|
| Onboarding + placement | VERIFIED | 10 steps + 10-question placement, saved evidence |
| Worlds / missions / scored activities | VERIFIED | 5 worlds, 23 missions, deterministic server scoring |
| Age challenges (7–15, 100 each) | VERIFIED | needs independent educator review (content quality) |
| English skills | PARTIAL | vocab/grammar/listening/writing/etc scored; speaking/pronunciation = playback only |
| Coding | PARTIAL | challenges scored; executable in-project editor MISSING |
| AI literacy / thinking / stories / simulations | VERIFIED (content-limited) | scored, saved; content expansion ongoing |
| Projects / portfolio / evidence | VERIFIED | private, notes/milestones/showcase request |
| Gamification / daily goals | VERIFIED | XP/level/streak/cosmetics; leaderboard + shop PARTIAL |
| Companions | VERIFIED (rule-based) | `safeGuidance()` regex; live AI = BLOCKED by design |
| Search / notifications / settings | VERIFIED | generated on request (no push/email yet) |

## Guardian / moderator / admin
| Feature | Status | Notes |
|---|---|---|
| Guardian child detail/controls/limits/export/delete | VERIFIED | server-enforced time limits & ownership |
| Guardian goals/recommendations | PARTIAL | no history trail/alerts |
| Moderation desk | PARTIAL | report queue + resolution; no taxonomy/priority/pagination/full export |
| Admin read-models / drafts / experiments / 1 flag | PARTIAL | NOT a CMS; no publish→rollback workflow |

## Platform / integrations / ops
| Feature | Status | Notes |
|---|---|---|
| DB migrations (versioned) | PARTIAL | only idempotent ALTER guards in db.mjs; framework MISSING (Phase 2) |
| Structured logging / request tracing | PARTIAL | request IDs present; structured JSON logging to add |
| Email delivery | BLOCKED | webhook contract only |
| Live AI provider | BLOCKED | no SDK/keys by design |
| Payments/entitlements | BLOCKED | billingEnabled:false, FREE_ACCESS |
| Voice recording/assessment | BLOCKED | playback only; consent/retention needed |
| Backups/restore | PARTIAL | backup.mjs verified; scheduling/off-host/restore-drill external |
| Monitoring/error tracking | MISSING | to add (Phase 7/9) |
| EC2 TLS deploy | PARTIAL/BLOCKED | compose/nginx present; real host/DNS/TLS external |

Full 164-route state is maintained in `docs/implementation-audit.md` (78 functional-foundation, 86 partial, 0 unimplemented) and `docs/route-code-matrix.csv`.
