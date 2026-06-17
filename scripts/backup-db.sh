#!/usr/bin/env bash
# PostgreSQL backup for doorpoint_nextjs.
# Reads DATABASE_URL from .env in the project root.
#
# Usage:
#   ./scripts/backup-db.sh
#   ./scripts/backup-db.sh --keep 14
#   BACKUP_DIR=/var/backups/doorpoint ./scripts/backup-db.sh

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="${ENV_FILE:-$ROOT_DIR/.env}"
BACKUP_DIR="${BACKUP_DIR:-$ROOT_DIR/backups}"
KEEP="${BACKUP_KEEP:-7}"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --keep)
      KEEP="${2:?missing value for --keep}"
      shift 2
      ;;
    --dir)
      BACKUP_DIR="${2:?missing value for --dir}"
      shift 2
      ;;
    --env)
      ENV_FILE="${2:?missing value for --env}"
      shift 2
      ;;
    -h|--help)
      cat <<'EOF'
Usage: ./scripts/backup-db.sh [options]

Options:
  --keep N   Keep last N backup files (default: BACKUP_KEEP or 7)
  --dir PATH Output directory (default: ./backups)
  --env PATH Path to .env with DATABASE_URL (default: ./.env)
  -h, --help Show this help

Environment:
  DATABASE_URL   Used if already exported
  BACKUP_DIR     Same as --dir
  BACKUP_KEEP    Same as --keep
EOF
      exit 0
      ;;
    *)
      echo "Unknown option: $1" >&2
      exit 1
      ;;
  esac
done

load_database_url() {
  if [[ -n "${DATABASE_URL:-}" ]]; then
    return 0
  fi
  if [[ ! -f "$ENV_FILE" ]]; then
    echo "Error: .env not found at $ENV_FILE and DATABASE_URL is not set." >&2
    exit 1
  fi
  # shellcheck disable=SC1090
  set -a
  source "$ENV_FILE"
  set +a
  if [[ -z "${DATABASE_URL:-}" ]]; then
    echo "Error: DATABASE_URL is missing in $ENV_FILE" >&2
    exit 1
  fi
}

require_pg_dump() {
  if command -v pg_dump >/dev/null 2>&1; then
    PG_DUMP="pg_dump"
    return 0
  fi
  echo "Error: pg_dump not found. Install postgresql-client:" >&2
  echo "  sudo apt install -y postgresql-client" >&2
  exit 1
}

prune_old_backups() {
  local keep="$1"
  local count
  count="$(find "$BACKUP_DIR" -maxdepth 1 -type f -name 'db_*.dump' | wc -l | tr -d ' ')"
  if [[ "$count" -le "$keep" ]]; then
    return 0
  fi
  find "$BACKUP_DIR" -maxdepth 1 -type f -name 'db_*.dump' -printf '%T@ %p\n' \
    | sort -n \
    | head -n "-$((count - keep))" \
    | cut -d' ' -f2- \
    | while read -r old_file; do
        echo "Removing old backup: $old_file"
        rm -f "$old_file"
      done
}

load_database_url
require_pg_dump

mkdir -p "$BACKUP_DIR"

STAMP="$(date +%Y-%m-%d_%H-%M-%S)"
OUT_FILE="$BACKUP_DIR/db_${STAMP}.dump"

echo "Backing up database..."
echo "  Output: $OUT_FILE"

"$PG_DUMP" -Fc --no-owner --no-acl "$DATABASE_URL" -f "$OUT_FILE"

SIZE="$(du -h "$OUT_FILE" | cut -f1)"
echo "Done. Size: $SIZE"

prune_old_backups "$KEEP"
echo "Kept last $KEEP backup(s) in $BACKUP_DIR"
