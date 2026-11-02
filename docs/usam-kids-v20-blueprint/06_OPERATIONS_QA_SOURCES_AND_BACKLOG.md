# Operations, QA, Sources, and Implementation Backlog

**Purpose:** exact verification commands, EC2 runbooks, research ledger, and dependency-aware work.  
**Status:** `IMPLEMENTABLE`; external credentials are deliberately not embedded.

## Verified commands

```bash
npm test
npm run build
docker compose config
```

The current automated suite covers content invariants, age paths, placement, deterministic scoring, authorization, consent, time limits, adaptive signals, gamification, recovery, learning sessions, and backup behavior. Browser E2E, load, and assistive-technology tests remain manual/release-gated work.

## EC2 runbook

1. Provision a patched Linux EC2 host with least-privilege security groups: public `80/443` only; administrative access through the approved secure path.
2. Install Docker/Compose, copy the versioned EC2 archive, and create a protected `.env` from `deploy/example.env` with real values only on the server.
3. Set `PUBLIC_ORIGIN`, admin credentials, and `REQUIRE_GUARDIAN_CONSENT=true`; configure an HTTPS email webhook before child-account onboarding.
4. Start `docker compose up -d --build`, then check `/healthz` and `/api/health/ready` through the intended HTTPS host.
5. Schedule an encrypted off-host copy of the SQLite backup; rehearse a restore into an isolated environment before public launch.
6. Roll back by deploying the previous immutable archive and restoring only a validated compatible backup; never overwrite the live database without a restore plan.

## Research and OSS ledger

| Source ID | Source | Verified finding | Project implication |
|---|---|---|---|
| SRC-001 | React official versions — https://react.dev/versions | React 19 is current; React 18 documentation remains available | Keep current React 18 until a dedicated compatibility upgrade task; do not mix upgrade with this release |
| SRC-002 | Node SQLite documentation — https://github.com/nodejs/node/blob/main/doc/api/sqlite.md | Node documents built-in SQLite APIs; current docs describe `DatabaseSync` as a compatibility alias | Node 24 container is intentional; test before any Node major upgrade |
| SRC-003 | AWS EC2 best practices — https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ec2-best-practices.html | Least privilege, patching, encrypted backups, monitoring, and recovery testing are advised | EC2 release gates above |
| SRC-004 | OWASP ASVS — https://asvs.owasp.org/ | ASVS 5.0.0 is a security verification framework | Use as security test checklist; it is not a compliance certification |

## Priority backlog

| TASK | Priority | Dependencies | Acceptance |
|---|---|---|---|
| TASK-001 EC2 release rehearsal | P0 | real domain, server access | HTTPS, readiness, rollback drill recorded |
| TASK-002 Email webhook delivery | P0 | provider account, templates | verification/reset delivered once, failure handling tested |
| TASK-003 Central monitoring | P0 | chosen log/alert service | API error and disk/backup alerts have an owner |
| TASK-004 Playwright + a11y regression suite | P1 | test environment | critical guardian/learner flows run in CI |
| TASK-005 Live AI adapter | P1 | provider, DPA, safety approval | safety evals, consent gate, timeout/cost guard pass |
| TASK-006 Speech evaluation | P2 | approved provider/consent | no raw recording retention without defined policy |

