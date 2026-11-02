# FEATURE_BACKEND_MATRIX.md — frontend API → backend status

Every `api()` call the USAM_New frontend makes, mapped to the backend handler in
`server/app.mjs`. Status: **SERVED** = handler verified present; **GAP** = frontend calls it
but no handler found (must implement); **VERIFY** = present, confirm response shape/behavior.

Legend for auth: P=public, G=guardian, L=learner, M=moderator, A=admin.

## Platform
| Method Path | Auth | Backend | Status |
|---|---|---|---|
| GET /health | P | returns {ok,service} | SERVED |
| GET /config | P | {voicePlayback,guardianConsentRequired} | SERVED |

## Auth / recovery
| Method Path | Auth | Status |
|---|---|---|
| POST /auth/register {email,password,displayName} | P | SERVED |
| POST /auth/login {email,password} | P | SERVED |
| GET /auth/me | any | SERVED |
| POST /auth/logout | any | SERVED |
| POST /auth/forgot-password {email} | P | SERVED (delivery BLOCKED: no email provider) |
| GET /auth/reset-password/validate?token | P | SERVED |
| POST /auth/reset-password {token,password} | P | SERVED |
| GET /auth/verify-email/validate?token | P | SERVED |
| POST /auth/verify-email {token} | P | SERVED |
| POST /auth/verify-email/resend | G | SERVED (delivery BLOCKED) |

## Learner
| Method Path | Auth | Status |
|---|---|---|
| GET /learners/:id/snapshot | L/G-linked | SERVED |
| POST /learner/preferences | L | SERVED |
| POST /placement {answers} | L | SERVED |
| GET /learner/controls | L | SERVED |
| POST /usage/heartbeat | L | SERVED |
| GET /usage/status | L | SERVED |
| POST /attempts {missionId,answers} | L | SERVED |
| POST /activities {kind,payload} | L | SERVED |
| PUT /daily-goals/me {target} | L | VERIFY (confirm GET/PUT shape) |
| POST /reports {reason} | L | SERVED |
| POST /learning-sessions {missionId,mode} | L | SERVED |
| GET /learning-sessions/:id | L | SERVED |
| PATCH /learning-sessions/:id {choice} | L | SERVED |
| POST /learning-sessions/:id/complete | L | SERVED |
| GET /evidence/:id | L | SERVED |
| GET /projects/:id | L | SERVED |
| POST /projects {title,body,world} | L | SERVED (app.mjs: validation title 3–80, body 20–2500, world check, private-info block) |
| PATCH /projects/:id | L | SERVED |
| PATCH /projects/:id/:stage {body} | L | SERVED |
| GET /gamification/progression | L | SERVED (returns {xp,level,nextLevelXp,coins} — matches RewardsPage) |

## Companions
| Method Path | Auth | Status |
|---|---|---|
| POST /assist {message,companionId,...} | L | SERVED (rule-based; live AI = REFERENCE-phase/BLOCKED) |
| GET /conversations | L | SERVED |
| GET /conversations/:id | L | SERVED |

## Guardian
| Method Path | Auth | Status |
|---|---|---|
| GET /guardians/learners | G | SERVED |
| POST /guardians/learners {nickname,ageYear} | G | SERVED |
| POST /guardians/learners/:id/enter | G | SERVED |
| PATCH /guardian/children/:id | G | SERVED |
| DELETE /guardian/children/:id | G | SERVED |
| GET/PATCH /guardian/children/:id/(overview|controls|time-limits|goal|evidence/:eid|export) | G | SERVED |
| GET/POST/DELETE /guardian/consent | G | SERVED |
| PATCH /guardian/account | G | SERVED |
| POST /guardian/change-password | G | SERVED |

## Admin / moderation
| Method Path | Auth | Status |
|---|---|---|
| GET /admin/(overview|guardians/pending|curriculum|catalog|audit|insights|agents|operations) | A | SERVED |
| POST /admin/guardians/:id/approve | A | SERVED |
| POST/PATCH /admin/curriculum/drafts[/:id] | A | SERVED |
| POST/PATCH /admin/experiments[/:id] | A | SERVED |
| PATCH /admin/feature-flags/VOICE_PLAYBACK | A | SERVED |
| GET /moderation/(queue|reports|audit) | M/A | SERVED |
| GET/PATCH /moderation/reports/:id | M/A | SERVED |

## Summary (verified against app.mjs source)
- **Zero missing endpoints.** Every `api()` call the USAM_New frontend makes has a matching
  backend handler. The initial "GAP"/"VERIFY" flags were resolved by reading the code:
  `POST /projects`, `GET/PUT /daily-goals/me`, and `GET /gamification/progression` are all served
  with shapes matching the frontend's consumption.
- Therefore the completion work is NOT "build missing APIs." It is:
  1. End-to-end integration verification (run server; prove each journey works + persists).
  2. Hardening: centralized validation, structured logging, negative-authorization tests.
  3. Provider seams (email/AI/payments/voice) kept safely disabled + documented.
  4. Then Stage-2 expansion and Stage-3 USAM Learning World reference analysis.
