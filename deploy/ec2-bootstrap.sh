#!/usr/bin/env bash
# One-command install / update of USAM_New on a fresh Ubuntu EC2 instance.
#   curl -fsSL https://raw.githubusercontent.com/mohamedsaber3108/New_Kids/main/deploy/ec2-bootstrap.sh | sudo bash
# Optional environment (pass with: sudo DOMAIN=kids.example.com CERT_EMAIL=you@example.com bash):
#   DOMAIN       public hostname. Default: <public-ip>.sslip.io (works without buying DNS; replace later)
#   CERT_EMAIL   email for Let's Encrypt expiry notices (recommended)
#   ADMIN_EMAIL  first admin login (default admin@usamif.com); password is generated
#   BRANCH       git branch to deploy (default main)
# Safe to re-run: keeps .env, database volume and certificates; pulls and rebuilds the latest code.
set -euo pipefail
REPO_URL="${REPO_URL:-https://github.com/mohamedsaber3108/New_Kids.git}"
BRANCH="${BRANCH:-main}"
APP_DIR=/opt/usam-new
log(){ printf '\n\033[1;32m==> %s\033[0m\n' "$*"; }
die(){ printf '\n\033[1;31mERROR: %s\033[0m\n' "$*" >&2; exit 1; }
[ "$(id -u)" = 0 ] || die "run with sudo"

log "Installing system packages (Docker, Nginx, Certbot, Git)"
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y -qq ca-certificates curl git openssl nginx certbot python3-certbot-nginx >/dev/null
if ! docker compose version >/dev/null 2>&1; then
  apt-get install -y -qq docker.io docker-compose-v2 >/dev/null 2>&1 || true
fi
if ! docker compose version >/dev/null 2>&1; then
  log "Ubuntu packages did not provide Docker Compose; using Docker's installer"
  curl -fsSL https://get.docker.com | sh
fi
systemctl enable --now docker >/dev/null
docker compose version >/dev/null || die "Docker Compose is not available"

# Public hostname: default to sslip.io, which resolves <a-b-c-d>.sslip.io to that IP.
if [ -z "${DOMAIN:-}" ]; then
  TOKEN="$(curl -fsS -m 3 -X PUT http://169.254.169.254/latest/api/token -H 'X-aws-ec2-metadata-token-ttl-seconds: 60' || true)"
  PUBLIC_IP="$(curl -fsS -m 3 -H "X-aws-ec2-metadata-token: $TOKEN" http://169.254.169.254/latest/meta-data/public-ipv4 || curl -fsS -m 5 https://checkip.amazonaws.com || true)"
  PUBLIC_IP="$(echo "$PUBLIC_IP" | tr -d '[:space:]')"
  [[ "$PUBLIC_IP" =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]] || die "could not detect the public IP; re-run with DOMAIN=your.domain"
  DOMAIN="${PUBLIC_IP//./-}.sslip.io"
fi
log "Public address: https://$DOMAIN"

log "Fetching the application ($BRANCH)"
if [ -d "$APP_DIR/.git" ]; then
  git -C "$APP_DIR" fetch --quiet origin "$BRANCH"
  git -C "$APP_DIR" checkout --quiet "$BRANCH"
  git -C "$APP_DIR" reset --quiet --hard "origin/$BRANCH"   # server copy is never edited by hand; .env/data are untracked
else
  git clone --quiet --branch "$BRANCH" "$REPO_URL" "$APP_DIR"
fi
cd "$APP_DIR"
chmod +x deploy/*.sh

CRED_FILE=/root/usam-credentials.txt
if [ ! -f .env ]; then
  log "Creating .env with generated staff passwords"
  gen(){ openssl rand -base64 36 | tr -d '/+=\n' | cut -c1-24; }
  ADMIN_PASSWORD="$(gen)"; MODERATOR_PASSWORD="$(gen)"
  ADMIN_EMAIL="${ADMIN_EMAIL:-admin@usamif.com}"; MODERATOR_EMAIL="${MODERATOR_EMAIL:-moderator@usamif.com}"
  umask 077
  cat > .env <<EOF
PUBLIC_ORIGIN=https://$DOMAIN
NODE_ENV=production
ADMIN_EMAIL=$ADMIN_EMAIL
ADMIN_PASSWORD=$ADMIN_PASSWORD
MODERATOR_EMAIL=$MODERATOR_EMAIL
MODERATOR_PASSWORD=$MODERATOR_PASSWORD
REQUIRE_GUARDIAN_CONSENT=true
LOG_REQUESTS=true
# Add EMAIL_*, AI_* and PAYMENT_* settings here when the provider accounts exist (see deploy/example.env).
EOF
  printf 'USAM_New staff accounts (created on first start)\nURL: https://%s\nAdmin: %s / %s\nModerator: %s / %s\n' \
    "$DOMAIN" "$ADMIN_EMAIL" "$ADMIN_PASSWORD" "$MODERATOR_EMAIL" "$MODERATOR_PASSWORD" > "$CRED_FILE"
  chmod 600 "$CRED_FILE"
else
  log "Keeping existing .env"
  CURRENT_ORIGIN="$(grep -E '^PUBLIC_ORIGIN=' .env | cut -d= -f2-)"
  if [ "$CURRENT_ORIGIN" != "https://$DOMAIN" ]; then
    sed -i "s#^PUBLIC_ORIGIN=.*#PUBLIC_ORIGIN=https://$DOMAIN#" .env
    log "Updated PUBLIC_ORIGIN to https://$DOMAIN"
  fi
fi
chmod 600 .env

log "Building and starting the containers (runs the test suite inside the build; takes a few minutes)"
docker compose build
docker compose up -d --remove-orphans
for i in $(seq 1 60); do
  curl -fsS http://127.0.0.1:8080/api/health/ready >/dev/null 2>&1 && break
  [ "$i" = 60 ] && { docker compose logs --tail 40 usam-kids-api; die "API did not become ready"; }
  sleep 3
done
log "Application is healthy on 127.0.0.1:8080"

log "Configuring Nginx and HTTPS for $DOMAIN"
VHOST=/etc/nginx/sites-available/usam-kids
if [ ! -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" ]; then
  cat > "$VHOST" <<EOF
server {
  listen 80;
  listen [::]:80;
  server_name $DOMAIN;
  client_max_body_size 1m;
  location / {
    proxy_pass http://127.0.0.1:8080;
    proxy_set_header Host \$host;
    proxy_set_header X-Real-IP \$remote_addr;
    proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto \$scheme;
    proxy_read_timeout 30s;
  }
}
EOF
  ln -sf "$VHOST" /etc/nginx/sites-enabled/usam-kids
  rm -f /etc/nginx/sites-enabled/default
  nginx -t && systemctl reload nginx
  EMAIL_ARGS=(--register-unsafely-without-email); [ -n "${CERT_EMAIL:-}" ] && EMAIL_ARGS=(-m "$CERT_EMAIL")
  if ! certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos --redirect "${EMAIL_ARGS[@]}"; then
    die "HTTPS certificate failed. In the EC2 console open Security group -> Edit inbound rules and allow HTTP (80) and HTTPS (443) from 0.0.0.0/0, then run this command again."
  fi
  # HSTS on every response, including static files served by the app container.
  sed -i "0,/ssl_certificate /s//add_header Strict-Transport-Security \"max-age=31536000\" always;\n    ssl_certificate /" "$VHOST"
  nginx -t && systemctl reload nginx
else
  log "Certificate already present; leaving Nginx configuration unchanged"
  systemctl reload nginx
fi
systemctl enable --now certbot.timer >/dev/null 2>&1 || true

log "Enabling hourly verified backups"
sed "s#/opt/usam-new#$APP_DIR#g" deploy/usam-backup.service > /etc/systemd/system/usam-backup.service
cp deploy/usam-backup.timer /etc/systemd/system/usam-backup.timer
systemctl daemon-reload
systemctl enable --now usam-backup.timer >/dev/null

log "Final checks through the public address"
curl -fsS "https://$DOMAIN/api/health/ready" && echo
curl -fsS -o /dev/null -w 'Home page HTTP %{http_code}\n' "https://$DOMAIN/"
git rev-parse --short HEAD | sed 's/^/Deployed commit: /'

printf '\n\033[1;32mDONE.\033[0m Open https://%s\n' "$DOMAIN"
[ -f "$CRED_FILE" ] && { echo; cat "$CRED_FILE"; echo; echo "(saved in $CRED_FILE, readable by root only)"; }
echo "Update later with the same command. Logs: cd $APP_DIR && sudo docker compose logs -f usam-kids-api"
