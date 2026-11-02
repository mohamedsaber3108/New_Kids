# USAM Kids — React learning platform

Arabic-first, bilingual learning experience based on `docs/master-spec.md` and `docs/page-checklist.md`. Colors follow USAM's deep green, cream, and warm gold. This repository contains a React/Vite frontend, a Node 24 SQLite API, tests, and an EC2 Docker Compose deployment.

## Run locally

Requires Node.js 24. The server serves the built React app and `/api` from the same origin.

```bash
npm ci
npm test
npm run build
ADMIN_EMAIL=admin@example.com ADMIN_PASSWORD='a-long-unique-password' DB_FILE=./data/kids.db PUBLIC_ORIGIN=http://localhost:3001 npm run api
```

Open `http://localhost:3001`. The admin account is created only when the database is initialized. Choose a unique password of at least 12 characters. Do not commit credentials. During frontend-only development, `npm run dev` serves a local demo without accounts; progress lives only in that browser.

## What works

- Public landing and information pages, responsive Arabic RTL and English, light/dark themes, six illustrated guides and ten-step onboarding in both demo and server modes, followed by a ten-question starting assessment across five worlds.
- Five learning worlds, 23 bilingual three-question missions across three levels, authored lessons, examples, challenges, hints and explanations, coding robot lab, AI fact-checking lab, 18 scored AI-literacy decisions across six topics, three scored coding routes, nine thinking decisions, three branching stories, three graded simulations, resumable mission and practice sessions, 33 English skill lessons with 99 practice steps, simulation, private projects, search, portfolio, rewards, and progress.
- An additional single-year challenge map at `/app/challenges`: ages 7–15 each have 100 distinct bilingual scored questions (20 per world), with age-specific reasoning prompts, hints, explanations, server-validated results, and saved learner evidence. These are generated from 100 scenario structures with age-specific changes; they have not undergone independent educator review and do not replace the deeper mission curriculum.
- Server-side guardian registration/login, one-time email verification when delivery is configured, versioned guardian consent, manual guardian approval, account settings and password changes with other-session revocation, linked child profiles, isolated child sessions, daily/weekly/bedtime limits, scored placement and activities, adaptive signals, daily goals, private gamification, private projects with research/reflection/milestones/moderated-showcase requests, item-level evidence, guardian goals and weekly measurement, recommendations, per-child guide/voice controls, data export/deletion, a report case desk with audit, editable curriculum drafts, and authorization checks.
- Six distinct rule-based companion personalities, including Azouz, with private learner-scoped conversation histories. The assistant gives predefined learning prompts and contextual hints; it does **not** connect to a language model.

## EC2 deployment

1. Put this source tree on the EC2 host with Docker Engine and Compose installed. Keep it behind your existing TLS reverse proxy. Use `deploy/ec2-reverse-proxy.example.conf` as an example for the `kids.usamif.com` virtual host.
2. Create a protected `.env` beside `docker-compose.yml` (see `deploy/example.env`) with `PUBLIC_ORIGIN=https://kids.usamif.com`, `REQUIRE_GUARDIAN_CONSENT=true`, a private `ADMIN_EMAIL`, and a long unique `ADMIN_PASSWORD`. Restrict permissions, for example `chmod 600 .env`.
3. Run:

```bash
docker compose up -d --build
curl -f http://127.0.0.1:8080/healthz
curl -f http://127.0.0.1:8080/api/health
```

The frontend is bound to `127.0.0.1:8080`; only the TLS reverse proxy should face the internet. The API has no host port and its SQLite data lives in the `kids-data` Docker volume. Back up this volume regularly. Validate Nginx with `nginx -t` and test the exact HTTPS origin before switching DNS. `PUBLIC_ORIGIN` must match the browser origin exactly. The public Site preview is a static demo and does not host the SQLite API.

For a consistent backup while the API is running, create a fresh destination inside the volume, then copy it off the EC2 host to a protected backup store. Use a unique timestamp for each run:

```bash
docker compose exec -T usam-kids-api node server/backup.mjs /data/backup-2026-10-25.sqlite
docker cp "$(docker compose ps -q usam-kids-api):/data/backup-2026-10-25.sqlite" ./backup-2026-10-25.sqlite
chmod 600 ./backup-2026-10-25.sqlite
```

The backup command verifies SQLite integrity and refuses to overwrite an existing file. Schedule it, encrypt and retain copies off-host, and practice restoring a copy on a separate test instance before relying on it. Do not copy only the live `.db` file while SQLite is in WAL mode.

Email delivery requires an HTTPS endpoint configured through `EMAIL_WEBHOOK_URL` and optionally `EMAIL_WEBHOOK_TOKEN` (`RESET_WEBHOOK_URL` and `RESET_WEBHOOK_TOKEN` remain compatible). The server posts `{to, template: "email-verification", verificationUrl}` or `{to, template: "password-reset", resetUrl}` with a Bearer token if configured. The endpoint must actually send email, protect the link, and acknowledge delivery with a successful HTTP status. `PUBLIC_ORIGIN` must also be set. Verification links expire after one day and are single-use; the server requires verified email before staff approval or child creation when this delivery is configured. Password reset links expire after 15 minutes, are single-use, and invalidate sessions. Without delivery, recovery returns unavailable and the app does not pretend to have verified an email.

## Guardian and learner flow

A guardian registers, confirms the email link when delivery is configured, then an authorized administrator checks guardian status outside this application and approves the account in `/admin`. Only then can that guardian create a nickname-only child profile with an exact age from 7 through 15. Legacy profiles retain their age band without guessing a year; the guardian can set the exact year in child settings. Entering the child space replaces the guardian session with a learner-scoped session. A new child completes ten onboarding steps and a ten-question starting assessment before reaching the dashboard. Results suggest a world and level without locking other content. The guardian signs back in to see progress, export, or delete the child's data, and can manage the account in `/guardian/settings`. Administrators can review reports and draft content; drafts are not published to children automatically.

## Security and product limits

This is a substantial working product foundation, not a legal or child-safety certification. Before onboarding real children, configure and verify actual email delivery, independently validate the consent language and guardian-verification process, complete privacy/legal review by relevant counsel, approve retention and backup policies, connect operational monitoring, finish expert curriculum/accessibility/load audits, and rehearse incident procedures. The app intentionally does not offer real purchases, public child profiles, child-to-child messages, user-uploaded media, voice recording, or an unreviewed live generative AI service. English speaking/pronunciation currently use output-only browser speech playback without speech scoring.

For a live AI assistant, integrate a contracted provider server-side with age-aware safety, guardian controls, moderation, evaluations, and audit. Do not place AI keys in the React bundle. The original `kids.usamif.com` deployment and DNS have not been changed by this repository.

## Quality checks

`npm test` runs curriculum validation, English/AI/coding/thinking engine checks, placement checks, and HTTP integration scenarios covering guardian approval, child isolation, mission/activity scoring, projects, data export/deletion, and role protections. `npm run build` produces `dist/`. Docker build cannot be run in this workspace, so validate Compose and image startup on the EC2 host before launch.

The route-by-route acceptance audit is in `docs/implementation-audit.md`. It deliberately marks shared shells and incomplete modules as partial rather than treating a matching URL as finished.

The optional Kiro reconstruction toolkit supplied with this project is preserved under `tools/site-reconstruction/`. It is development tooling only and is not shipped to child browsers. `docs/route-code-matrix.csv` maps all 164 requested routes to candidate code, API and tests; `docs/kiro-integration-status.md` records what was actually verified and which external scan inputs are missing.
