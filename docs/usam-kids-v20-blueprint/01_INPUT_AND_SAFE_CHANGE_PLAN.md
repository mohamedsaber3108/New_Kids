# Input Inventory and Safe Change Plan

**Purpose:** prove what was inspected and protect established USAM Kids work.  
**Sources:** repository root; supplied master MD and ZIP; existing audit documents.  
**Status:** `VERIFIED` for local files; `REQUIRES LIVE VERIFICATION` for external services.

## Input inventory

| ID | Source | Evidence | Classification |
|---|---|---|---|
| IN-001 | `src/` | React application shell, bilingual content, missions, labs, companions, guardian/admin views | Existing & works |
| IN-002 | `server/app.mjs`, `server/db.mjs` | Node API, SQLite schema, session, authorization, activity/project engines | Existing & works |
| IN-003 | `tests/*.test.mjs` | 33 automated tests for content, authorization, time limits, consent, backup and engines | Existing & works |
| IN-004 | Dockerfiles, Compose, Nginx examples | Node 24 API and static frontend deployment shape | Existing & works locally |
| IN-005 | `docs/implementation-audit.md` | 164-route state audit | Existing & works/partial evidence |
| IN-006 | Universal master MD + ZIP kit | audit, traceability, security, operations, and packaging methodology | User requirement |

The two supplied copies of the Master Prompt are byte-identical. The ZIP also contains `HOW_TO_USE.md` and `PROJECT_INPUT_BRIEF_TEMPLATE.md`; neither contains a conflicting product or visual requirement.

## Preserve / enhance / exclude

| Decision | Scope | Reason |
|---|---|---|
| Preserve | USAM colors, layout system, Arabic RTL/LTR toggle, learning worlds, existing routes | Explicit user constraint and existing working experience |
| Enhance | security headers/request IDs/readiness, traceability, EC2 runbooks, API contracts | Required by the supplied delivery methodology and does not change UI identity |
| Enhance | guardian consent, time limits, adaptive/gamification/project APIs | Already integrated in v19; documented here as current evidence |
| Exclude for now | payments, public child galleries, unreviewed live AI, voice recording, child collaboration | Child safety, merchant/provider, or legal approval gates; no deceptive mock implementation |

## Safe-change protocol

1. Change only additive documentation, backend headers/readiness, or isolated feature modules.
2. Run `npm test`, `npm run build`, and `git diff --check` after each release group.
3. Preserve the private audience of the existing Sites deployment.
4. Package the exact committed source for EC2; never place secrets in the archive.
5. Treat a production preview as static unless the EC2 API, persistent database, and email delivery have actually been configured.

