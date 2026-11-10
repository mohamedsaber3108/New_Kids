#!/usr/bin/env bash
# Online, verified SQLite backup of the running USAM_New API container.
# Usage (from the directory containing docker-compose.yml):
#   deploy/backup.sh                 # backup into $BACKUP_DIR (default ./backups)
#   S3_URI=s3://bucket/usam/ deploy/backup.sh   # also upload with SSE-KMS [OWNER: bucket + IAM role]
# Env: BACKUP_DIR (default ./backups), KEEP (local copies to keep, default 48), S3_URI (optional).
set -euo pipefail
umask 077
cd "$(dirname "$0")/.."

BACKUP_DIR="${BACKUP_DIR:-./backups}"
KEEP="${KEEP:-48}"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
NAME="backup-$STAMP.sqlite"
SERVICE=usam-kids-api

CID="$(docker compose ps -q "$SERVICE")"
if [ -z "$CID" ]; then echo "backup: $SERVICE is not running" >&2; exit 1; fi

mkdir -p "$BACKUP_DIR"
chmod 700 "$BACKUP_DIR"

# server/backup.mjs uses the SQLite online-backup API (safe under WAL) and runs PRAGMA integrity_check.
docker compose exec -T "$SERVICE" node server/backup.mjs "/data/$NAME"
cleanup() { docker compose exec -T "$SERVICE" rm -f "/data/$NAME" >/dev/null 2>&1 || true; }
trap cleanup EXIT

docker cp "$CID:/data/$NAME" "$BACKUP_DIR/$NAME"
chmod 600 "$BACKUP_DIR/$NAME"
echo "backup: wrote $BACKUP_DIR/$NAME"

if [ -n "${S3_URI:-}" ]; then
  aws s3 cp "$BACKUP_DIR/$NAME" "$S3_URI" --sse aws:kms --only-show-errors
  echo "backup: uploaded to $S3_URI$NAME"
fi

# Local retention: keep the newest $KEEP backups (off-host retention is an S3 lifecycle rule).
ls -1t "$BACKUP_DIR"/backup-*.sqlite 2>/dev/null | tail -n +"$((KEEP + 1))" | while read -r old; do
  rm -f -- "$old"
done
