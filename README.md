# USAM Kids (USAM_New): bilingual learning platform for ages 7–15

Arabic-first (RTL) and English learning platform in USAM's deep green, cream and warm gold.
React 18 + Vite frontend, Node 24 API (built-in `http`, `node:sqlite`), Docker Compose deployment
behind Nginx/TLS on a single EC2 host.

```
app/
├─ src/          React frontend (pages, worlds, labs, guardian/admin/moderator consoles) + shared content
├─ server/       API (app.mjs), config validation, migrations, backup/restore, providers (email/AI/payments)
├─ tests/        unit + HTTP integration (node --test) and end-to-end suites (*.e2e.mjs)
├─ scripts/      real-browser, route, form, Docker, load and smoke verification
├─ deploy/       Nginx configs, example.env, backup.sh + systemd timer, deploy.sh (rollback)
├─ docs/         product spec, blueprint, execution ledger, runbook, test reports
├─ tools/        Kiro site-reconstruction toolkit supplied with the project (dev only, not shipped)
├─ Dockerfile            web image: runs tests, builds, serves dist/ with Nginx
└─ server/Dockerfile     API image: non-root, read-only FS, SQLite on the kids-data volume
```

## Run locally

Requires Node.js 24 or newer.

```bash
npm ci
npm run build
# PowerShell: set the same variables with $env:NAME='value'
ADMIN_EMAIL=admin@local.test ADMIN_PASSWORD='Local-Admin-Password-123' \
MODERATOR_EMAIL=mod@local.test MODERATOR_PASSWORD='Local-Moderator-Password-123' \
DB_FILE=./data/local.db PUBLIC_ORIGIN=http://localhost:3001 REQUIRE_GUARDIAN_CONSENT=true npm run api
```

Open http://localhost:3001. One server serves the built app and `/api` from the same origin.
Staff accounts are created once, when the database is first initialised. To create an approved demo
guardian with one child and check every role end to end:

```bash
SMOKE_SEED=1 ADMIN_EMAIL=admin@local.test ADMIN_PASSWORD='Local-Admin-Password-123' npm run smoke
# guardian: parent@local.test / Local-Parent-Password-123 → open the child "Explorer" → /app
```

`npm run dev` (Vite only, no API) runs the browser-only demo, where progress lives in that browser.
Production builds never fall back to the demo: if the API is unreachable they show a retry notice.

## Verification

| Command | What it proves |
|---|---|
| `npm test` | unit + HTTP integration (auth, roles, isolation, scoring, providers, rate limits, backup/restore) |
| `npm run verify` | `npm test` + journey, comprehensive, content-parity and all-roles e2e + entrypoint + production build |
| `npm run verify:ui` | headless Chrome: interactions, every route for every role (EN/AR), real form submissions |
| `npm run verify:docker` | builds the real images, runs the stack through Nginx, backup/restore, restart, proxy/IP, gzip |
| `npm run test:load` | concurrency and login-burst latency on a file-backed WAL database |
| `npm run smoke` | live check of a running server (local or deployed): APIs per role + real page renders |

CI (`.github/workflows/ci.yml`) runs audit, verify, verify:ui and verify:docker on every push and PR.
Latest results are in `docs/execution/TESTING_AND_QUALITY_REPORT.md` and `docs/execution/PROGRESS.md`.

## Deploy

Follow `docs/execution/DEPLOYMENT_RUNBOOK.md` (EC2, secrets, first deploy, backups, restore, upgrades,
rollback, launch checklist). In short: create `.env` from `deploy/example.env` (`chmod 600`), put the
host TLS proxy from `deploy/ec2-reverse-proxy.example.conf` in front of `127.0.0.1:8080`, then run
`deploy/deploy.sh <commit>` and enable `deploy/usam-backup.timer`.

## What the product includes

- Public landing and information pages; responsive Arabic RTL and English; light/dark themes; six
  illustrated guides; ten-step onboarding and a ten-question starting assessment across five worlds.
- Five learning worlds with 23 bilingual missions across three levels, lessons, hints and explanations,
  coding robot lab, AI-literacy and fact-checking labs, coding routes, thinking challenges, branching
  stories, graded simulations, resumable sessions, 33 English skill lessons, private projects, search,
  portfolio, rewards and progress. An age challenge map (`/app/challenges`) has 100 scored questions
  per age from 7 to 15. These have not had independent educator review.
- Guardians: registration, email verification (when a provider is configured), versioned consent,
  manual approval, linked nickname-only child profiles, isolated child sessions, daily/weekly/bedtime
  limits, goals, recommendations, learning insights, per-child guide/voice/live-AI controls, data export
  and deletion. Admins: approvals, curriculum drafts, operations, integrations status, audit.
  Moderators: report desk with audit.
- Companions give rule-based guidance by default. Live AI replies are used only when an AI provider is
  configured **and** the child's guardian opted in; revocation cancels in-flight calls.

## External services and limits

Email (Postmark, SendGrid or HTTPS webhook), live AI (OpenAI-compatible or Anthropic) and signed payment
webhooks are implemented but stay disabled until credentials are set; the API logs which are live at
startup. Billing remains free access. There are no real purchases, public child profiles, child-to-child
messages, uploaded media or voice recording; English speaking uses output-only speech playback.

This is a working product, not a legal or child-safety certification. Before onboarding real children:
configure and test real email delivery, have counsel approve the consent and privacy text, set backup
retention, connect monitoring, and complete curriculum and accessibility review.
