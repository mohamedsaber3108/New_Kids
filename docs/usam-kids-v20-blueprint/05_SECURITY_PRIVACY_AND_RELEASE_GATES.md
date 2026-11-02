# Security, Privacy, and Release Gates

**Purpose:** threat model and non-negotiable release controls.  
**Status:** `TECHNICAL CONTROLS IMPLEMENTED IN PART; legal/operational verification required`.

## Threat model

| Risk | Asset/boundary | Current control | Release evidence needed |
|---|---|---|---|
| Child data exposure / IDOR | learner/project/evidence API | linked-child and learner ownership enforcement; private defaults | negative API tests; manual penetration review |
| Session theft/CSRF | cookie/session boundary | HttpOnly, SameSite=Strict, origin check, secure production cookie | HTTPS test on real domain |
| Script/frame abuse | browser response boundary | CSP, `DENY` framing, nosniff, Referrer and Permissions policies | browser compatibility smoke test |
| Guessing/brute force | auth/reset/report endpoints | bounded in-memory rate limits and one-time tokens | shared-rate-limit strategy at scale |
| Unsafe companion use | child chat input | privacy pattern block, guardian guide control, rules guidance, reporting | reviewed policy/evaluation before live AI |
| Data loss | SQLite volume | online backup tooling and persistent Docker volume | scheduled encrypted off-host backup + restore drill |
| Misleading readiness | marketing/release claim | explicit static-preview and external-gate disclosure | sign-off checklist |

## Personal-data lifecycle

- Child profile stores a nickname and exact age/year, not a required real name.
- Learning evidence, projects, conversations, controls, and usage exist only in the linked child scope.
- Guardian export and deletion routes exist; deletion is permanent after confirmation.
- Logs must never contain session tokens, passwords, reset tokens, or message bodies unnecessarily.
- Consent is versioned and can be withdrawn; withdrawal revokes child sessions.

## No-Go release gates

| Gate | Current | Owner | Exit evidence |
|---|---|---|---|
| EC2 HTTPS + restricted security group | Partial | Infrastructure owner | domain/TLS/health-check evidence |
| Mail delivery | Blocked | Operations owner | provider webhook + verification/reset receipt test |
| Guardian identity/consent process | Partial | Product/legal owner | reviewed policy text and human verification process |
| Backup restore | Partial | Infrastructure owner | dated restore-drill result |
| Monitoring/incident response | Partial | Operations owner | alert route, on-call owner, test incident |
| Accessibility/device QA | Partial | QA owner | keyboard/screen-reader/mobile test record |
| Live AI | Disabled intentionally | AI safety owner | provider DPA, evaluation, consent, red-team approval |

