# DEPLOYMENT_RUNBOOK.md — USAM_New on Amazon EC2

Target: one EC2 Linux host running Docker Compose behind an Nginx/TLS reverse proxy.
Topology (from `docker-compose.yml`):

```
Internet --443--> host Nginx (TLS, deploy/ec2-reverse-proxy.example.conf)
            --> 127.0.0.1:8080  usam-kids-web  (Nginx: SPA + /api proxy, read-only, no-new-privileges)
                    --> usam-kids-api:3001 (Node 24, non-root, read-only FS, no host port)
                            --> volume kids-data:/data/kids.db (SQLite, WAL)
```

Everything in sections 1–7 is scripted in this repo and verified by `node scripts/verify-docker.mjs`
(builds the real images and exercises them through the proxy). Steps marked **[OWNER]** need your
AWS account, domain, or provider accounts and have not been performed.

## 0. Pre-flight on your workstation
```bash
npm ci
npm run verify            # unit + e2e + content parity + roles + entrypoint + production build
node scripts/verify-docker.mjs   # real images: build, run, journey, backup/restore, restart
```
Both must end with 0 failures before you deploy.

## 1. Host preparation [OWNER]
- Ubuntu 22.04/24.04 (or Amazon Linux 2023) EC2 instance, patched; EBS volume encrypted.
- Security group: inbound 443 (and 80 for ACME redirect) from the internet; SSH only from your
  admin IP or use SSM Session Manager. **Never open 8080 or 3001.**
- Install Docker Engine + Compose plugin; enable the docker service.
- DNS: A/AAAA record for `kids.usamif.com` → the instance's Elastic IP.
- TLS: certbot (or ACM + ALB). Example host vhost: `deploy/ec2-reverse-proxy.example.conf`.

## 2. Secrets
Create `.env` beside `docker-compose.yml` from `deploy/example.env`, then `chmod 600 .env`.
The API **refuses to start** in production if settings are unsafe (`server/config.mjs`):
http/absent `PUBLIC_ORIGIN`, half-set credential pairs, passwords < 12 chars, http webhooks,
incomplete AI/email provider settings, payment secret < 32 chars.

Required: `PUBLIC_ORIGIN=https://kids.usamif.com`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`,
`REQUIRE_GUARDIAN_CONSENT=true`. Recommended: `MODERATOR_EMAIL`/`MODERATOR_PASSWORD`, an email
provider (`EMAIL_PROVIDER` + `EMAIL_API_TOKEN` + `EMAIL_FROM`, or `EMAIL_WEBHOOK_URL`).
Optional: `AI_*` (live AI, guardian opt-in per child still required), `PAYMENT_*`.
Prefer injecting these from AWS SSM Parameter Store / Secrets Manager into `.env` at deploy time
rather than storing them long-term on disk. Staff accounts are created only on first boot and
are never overwritten by later boots.

## 3. First deployment
```bash
docker compose build
docker compose up -d
curl -fsS http://127.0.0.1:8080/healthz          # web container
curl -fsS http://127.0.0.1:8080/api/health       # API through the internal proxy
curl -fsS http://127.0.0.1:8080/api/health/ready # API + database
docker compose logs usam-kids-api | head         # JSON logs: "listening", provider status lines
```
Then through the public domain: `curl -fsS https://kids.usamif.com/api/health`.
Log in as the admin, approve a test guardian, and walk one guardian → child → mission journey.

## 4. Logs and monitoring
- API writes one JSON line per request: `time, level, msg, requestId, method, path, status, ms`.
  Query strings, bodies, cookies and tokens are never logged. Every response carries `X-Request-Id`.
- Startup lines state honestly which providers are live (`email_delivery_disabled`,
  `ai_live_disabled`, `payments_disabled`, or `*_configured`).
- `GET /api/admin/integrations` (admin) shows provider status, 7-day email SENT/FAILED counts,
  AI call/token counts, subscriptions — no secrets.
- **[OWNER]** Ship container logs to CloudWatch (awslogs driver or the CloudWatch agent) and add
  alarms on: `level:"error"`, `/api/health/ready` failing, disk usage of the Docker volume.

## 5. Backups
Online, consistent backup while the API runs (refuses to overwrite an existing file and runs
`PRAGMA integrity_check` on the copy):
```bash
STAMP=$(date -u +%Y%m%dT%H%M%SZ)
docker compose exec -T usam-kids-api node server/backup.mjs /data/backup-$STAMP.sqlite
docker cp "$(docker compose ps -q usam-kids-api)":/data/backup-$STAMP.sqlite ./backup-$STAMP.sqlite
chmod 600 ./backup-$STAMP.sqlite
aws s3 cp ./backup-$STAMP.sqlite s3://<your-backup-bucket>/usam/ --sse aws:kms    # [OWNER]
docker compose exec -T usam-kids-api rm /data/backup-$STAMP.sqlite
```
**Never copy the live `kids.db` file directly** (WAL mode).

The same steps are scripted in `deploy/backup.sh` (verified by `scripts/verify-docker.mjs`):
the script writes to `./backups` (mode 700/600), keeps the newest `KEEP` copies (default 48),
and uploads with SSE-KMS when `S3_URI` is set. Schedule it hourly with the bundled systemd units:
```bash
sudo cp deploy/usam-backup.service deploy/usam-backup.timer /etc/systemd/system/
sudo systemctl daemon-reload && sudo systemctl enable --now usam-backup.timer
systemctl list-timers usam-backup.timer      # next run
journalctl -u usam-backup.service -n 20      # last result
```
Edit `WorkingDirectory`/`ExecStart` if the checkout is not `/opt/usam-new`. **[OWNER]** bucket,
instance role (`s3:PutObject`, `kms:GenerateDataKey`) and an S3 lifecycle retention rule.

## 6. Restore (tested by tests/restore.test.mjs and scripts/verify-docker.mjs)
```bash
docker cp ./backup-<STAMP>.sqlite "$(docker compose ps -q usam-kids-api)":/data/restore.sqlite
docker compose stop usam-kids-api
docker compose run --rm usam-kids-api node server/restore.mjs /data/restore.sqlite --replace
docker compose start usam-kids-api
curl -fsS http://127.0.0.1:8080/api/health/ready
```
`restore.mjs` verifies the backup's integrity and USAM schema first, refuses to overwrite without
`--replace`, and saves the current database to `/data/kids.db.pre-restore-<timestamp>.sqlite`
before restoring, so a restore can itself be undone. Rehearse on a separate instance quarterly.

## 7. Upgrades and rollback
CI (`.github/workflows/ci.yml`) runs `npm audit`, `npm run verify`, `npm run verify:ui` and
`npm run verify:docker` on every push; deploy only commits that passed.
```bash
deploy/deploy.sh <tag-or-commit>   # checks .env is 600, backs up, checks out, builds, starts,
                                   # waits for /api/health/ready; auto-rolls back on failure
deploy/deploy.sh rollback          # return to the release that was live before the last deploy
```
Manual equivalent:
```bash
git pull
docker compose exec -T usam-kids-api node server/backup.mjs /data/pre-upgrade-$(date -u +%s).sqlite
docker compose build && docker compose up -d
```
Container logs rotate at 10 MB × 5 files per service (`docker-compose.yml`, `x-logging`).
Database migrations (`server/migrate.mjs`) are additive, versioned, transactional and run
automatically on API start; each is recorded in `schema_migrations`.
Rollback: redeploy the previous release. Because migrations are additive, the previous code
runs against the newer schema. If data must be rolled back, restore the pre-upgrade backup (section 6).
Graceful shutdown: `docker compose stop` sends SIGTERM; the API stops accepting connections and
closes SQLite cleanly (logged as `"msg":"shutdown"`).

## 8. Launch checklist
- [ ] `npm run verify` and `node scripts/verify-docker.mjs` green on the release commit
- [ ] `.env` from SSM/Secrets Manager, `chmod 600`, HTTPS `PUBLIC_ORIGIN` exact
- [ ] Security group exposes only 443/80; SSH restricted or SSM only
- [ ] TLS certificate valid; HSTS returned (API sets it when `NODE_ENV=production`)
- [ ] Email provider configured and a real verification + reset email received **[OWNER]**
- [ ] `usam-backup.timer` enabled with `S3_URI`; one restore rehearsed on a separate host **[OWNER]**
- [ ] CloudWatch logs + alarms routed to a named person **[OWNER]**
- [ ] Legal/privacy text and guardian-consent process approved for launch markets **[OWNER]**
