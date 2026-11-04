# BLOCKERS_AND_DEPENDENCIES.md

## Project identity (resolved)
| Name | Role | Location |
|---|---|---|
| USAM_New (= KidsNew) | PRIMARY product; frontend is the source of truth | `M:\Kids _New\app` |
| USAM Learning World(s) | Reference only, after core completion — not yet analyzed | `M:\USAM Learning Worlds`, `M:\USAM-main` |
| USAM Kids / USAM / USAM Main | Excluded — never inspected or used | — |

## Needs your approval (frontend change)
| Item | File | Change | Why | Impact |
|---|---|---|---|---|
| Companion switch not saved | `src/main.jsx` (CompanionCard, world guide button, "Ask Adam") | after `update({activeCompanion})`, also call a server endpoint to save the learner's chosen companion | today the choice resets on reload in backend mode (onboarding choice is saved; later switches are not) | invisible to the UI; one extra request. Backend endpoint can be added the moment you approve. |
| Guardian live-AI opt-in toggle | guardian child Safety tab (`src/operations.jsx`) | a checkbox that sends `liveAiAllowed` to the existing `PATCH /api/guardian/children/:id/controls` | backend already supports it; without a UI, live AI stays off for every child (safe default) | only needed if you enable live AI |

## Needs your accounts / decisions (integration code is built and tested)
| Dependency | What is ready | What you provide |
|---|---|---|
| Email | postmark / sendgrid / webhook adapters, templates, retries, delivery log | provider account, verified sender domain, `EMAIL_PROVIDER` + `EMAIL_API_TOKEN` + `EMAIL_FROM` |
| Live AI | openai / anthropic adapters with child-safety gates | provider contract (DPA), key, model, approval that live AI may be offered to children |
| Payments | signed webhook, subscriptions, entitlements (FREE_ACCESS kept) | provider choice (Stripe does not onboard Egyptian merchants; e.g. Paymob/Fawry), plans/prices, mapping of that provider's webhook into the verified event format |
| Voice | browser playback + guardian/platform switches | recording/speech scoring is not built: needs a provider and guardian recording consent |
| EC2 / DNS / TLS / CloudWatch | Compose stack verified (34/34), runbook | AWS account, instance, domain, certificate, alarm recipient |
| Legal | consent is versioned and enforced in code | approved privacy/terms/consent text for launch markets |
