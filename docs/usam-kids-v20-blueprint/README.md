# USAM Kids v20 — Product & Technical Blueprint

**Purpose:** implementation and release blueprint for the existing USAM Kids React/Node product.  
**Applies to:** the repository root, its child-learning product, guardian/admin flows, and the EC2 Docker deployment.  
**Status:** `CURRENT AUDIT + IMPLEMENTATION PLAN`; this document set distinguishes implemented evidence from release gates.

## Scope and source of truth

This blueprint was generated from the current repository, its test suite, `docs/implementation-audit.md`, `docs/technical-blueprint-implementation.md`, the supplied Universal Project Blueprint Master Prompt, and its companion usage/input files. The prompt is a delivery methodology, not a conflicting product specification. Existing USAM Kids identity, React UI, bilingual Arabic/English experience, learning worlds, and pages are retained.

| Measure | Evidence |
|---|---|
| Product routes audited | 164 — `../route-code-matrix.csv` |
| Working baseline tests | 33 — `npm test` |
| Learning content | 5 worlds, 15 companions, 9 age paths × 100 challenges |
| Runtime | React 18 + Vite 5 frontend; Node 24 + SQLite backend |
| Deployment target | Docker Compose on AWS EC2 behind Nginx |
| Project stage | Working product foundation; not yet legally/certifiably production-approved for children |

## Reading order

1. [Input inventory and safe-change plan](01_INPUT_AND_SAFE_CHANGE_PLAN.md)
2. [Product, requirements, and traceability](02_PRODUCT_REQUIREMENTS_AND_TRACEABILITY.md)
3. [Architecture, data, engines, roles](03_ARCHITECTURE_DATA_ENGINES_AND_ROLES.md)
4. [Routes, APIs, and user journeys](04_ROUTES_APIS_AND_JOURNEYS.md)
5. [Security, privacy, and release controls](05_SECURITY_PRIVACY_AND_RELEASE_GATES.md)
6. [EC2 operations, QA, sources, and backlog](06_OPERATIONS_QA_SOURCES_AND_BACKLOG.md)

## Primary decisions

- **DEC-001 Retain modular monolith:** the Node `http` service and SQLite data model already implement secure ownership checks; a microservice rewrite would add risk without product value.
- **DEC-002 Preserve child-safe defaults:** no public child leaderboard, no open child-to-child messaging, no real-money reward shop, and no public project visibility before moderation.
- **DEC-003 EC2 remains the deployable runtime:** Docker Compose, Nginx, persistent SQLite volume, health endpoints, and a documented backup path are retained.
- **DEC-004 AI remains provider-gated:** 15 rule-guided companions work today; live generative AI requires a reviewed provider, guardian-consent policy, evaluations, and outage/cost controls.
- **DEC-005 Billing is not applicable now:** the product has no commercial checkout, so payment endpoints are intentionally not added. Reconsider only after a confirmed product/package and Egypt-eligible merchant provider.

## Exact completion language

- **Blueprint completed:** this documentation maps the supplied methodology to the product and records requirements, architecture, risks, and evidence.
- **Product implemented:** code paths listed as `Implemented` have source and automated-test evidence.
- **Production verified:** not yet. EC2/DNS/TLS, real email delivery, legal child-data review, operational monitoring, and a real-device accessibility/load run remain release gates.

