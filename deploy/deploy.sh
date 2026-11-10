#!/usr/bin/env bash
# Deploy or roll back USAM_New on the EC2 host (run from the git checkout, e.g. /opt/usam-new).
#   deploy/deploy.sh <git-ref>    # back up, check out <git-ref>, build, start, health-check; auto-rollback on failure
#   deploy/deploy.sh rollback     # return to the release that was live before the last deploy
# Code rollback only. Migrations are additive, so older code runs on the newer schema.
# To roll back data as well, restore the pre-deploy backup (DEPLOYMENT_RUNBOOK.md section 6).
set -euo pipefail

# git checkout below can replace this file while bash is still reading it, so run from a copy.
if [ -z "${USAM_DEPLOY_REPO:-}" ]; then
  repo="$(cd "$(dirname "$0")/.." && pwd)"
  copy="$(mktemp)"
  cp "$0" "$copy"
  USAM_DEPLOY_REPO="$repo" exec bash "$copy" "$@"
fi
trap 'rm -f "$0"' EXIT
cd "$USAM_DEPLOY_REPO"

STATE_DIR=.deploy
mkdir -p "$STATE_DIR"
HEALTH_URL="${HEALTH_URL:-http://127.0.0.1:8080/api/health/ready}"

die() { echo "deploy: $*" >&2; exit 1; }

[ -f .env ] || die ".env is missing (create it from deploy/example.env)"
perm="$(stat -c %a .env)"
[ "$perm" = "600" ] || [ "$perm" = "400" ] || die ".env must be chmod 600 (is $perm)"
[ -z "$(git status --porcelain --untracked-files=no)" ] || die "working tree has local changes; refusing to deploy"

wait_healthy() {
  for _ in $(seq 1 30); do
    if curl -fsS "$HEALTH_URL" >/dev/null 2>&1; then return 0; fi
    sleep 2
  done
  return 1
}

start_release() {
  git checkout --quiet --detach "$1"
  docker compose build
  docker compose up -d --remove-orphans
}

if [ "${1:-}" = "rollback" ]; then
  [ -s "$STATE_DIR/previous" ] || die "no previous release recorded"
  target="$(cat "$STATE_DIR/previous")"
  echo "deploy: rolling back to $target"
  start_release "$target"
  wait_healthy || die "rollback release is not healthy; check: docker compose logs usam-kids-api"
  git rev-parse HEAD >"$STATE_DIR/current"
  echo "deploy: rolled back to $target"
  exit 0
fi

ref="${1:-}"
[ -n "$ref" ] || die "usage: deploy/deploy.sh <git-ref> | rollback"
git fetch --quiet --tags origin
target="$(git rev-parse --verify "$ref^{commit}" 2>/dev/null || git rev-parse --verify "origin/$ref^{commit}")" \
  || die "unknown ref: $ref"
current="$(git rev-parse HEAD)"

# Pre-deploy backup (skipped on the very first deploy, when the API is not running yet).
if [ -n "$(docker compose ps -q usam-kids-api 2>/dev/null)" ]; then
  BACKUP_DIR="${BACKUP_DIR:-./backups}" deploy/backup.sh
fi

echo "deploy: $current -> $target"
start_release "$target"
if wait_healthy; then
  echo "$current" >"$STATE_DIR/previous"
  echo "$target" >"$STATE_DIR/current"
  echo "deploy: $target is live and healthy"
else
  echo "deploy: $target failed its health check; rolling back to $current" >&2
  start_release "$current"
  wait_healthy || die "rollback to $current is ALSO unhealthy; investigate now"
  die "deploy of $target failed; $current restored"
fi
