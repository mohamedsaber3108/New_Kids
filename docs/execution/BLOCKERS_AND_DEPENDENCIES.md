# BLOCKERS_AND_DEPENDENCIES.md

## Project identity (resolved)
| Name | Role | Location |
|---|---|---|
| USAM_New (= KidsNew) | PRIMARY product; frontend is the source of truth | `M:\Kids _New\app` |
| USAM Learning World(s) | Reference only, after core completion — not yet analyzed | `M:\USAM Learning Worlds`, `M:\USAM-main` |
| USAM Kids / USAM / USAM Main | Excluded — never inspected or used | — |

## Approved frontend changes — DONE (only these two; rest of frontend unchanged vs baseline)
| Item | Files | Change | Evidence |
|---|---|---|---|
| Companion choice persisted | `src/main.jsx` | `chooseCompanion` helper + 3 call sites → `PUT /api/learner/companion`; restore via existing snapshot hydration | tests/approved-changes.test.mjs; verify-docker |
| Guardian live-AI opt-in | `src/operations.jsx` | checkbox in existing "Child experience controls" form; sends `liveAiAllowed`; honest unavailable text when no provider | tests/approved-changes.test.mjs; verify-docker |

## Needs your accounts / decisions (integration code is built and tested)
| Dependency | What is ready | What you provide |
|---|---|---|
| Email | postmark / sendgrid / webhook adapters, templates, retries, delivery log | provider account, verified sender domain, `EMAIL_PROVIDER` + `EMAIL_API_TOKEN` + `EMAIL_FROM` |
| Live AI | openai / anthropic adapters with child-safety gates | provider contract (DPA), key, model, approval that live AI may be offered to children |
| Payments | signed webhook, subscriptions, entitlements (FREE_ACCESS kept) | provider choice (Stripe does not onboard Egyptian merchants; e.g. Paymob/Fawry), plans/prices, mapping of that provider's webhook into the verified event format |
| Voice | browser playback + guardian/platform switches | recording/speech scoring is not built: needs a provider and guardian recording consent |
| EC2 / DNS / TLS / CloudWatch | Compose stack verified (34/34), runbook | AWS account, instance, domain, certificate, alarm recipient |
| Legal | consent is versioned and enforced in code | approved privacy/terms/consent text for launch markets |
