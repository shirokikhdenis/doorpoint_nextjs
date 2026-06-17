#!/usr/bin/env bash
# Restore PostgreSQL backup created by backup-db.sh.
#
# Usage:
#   ./scripts/restore-db.sh backups/db_2026-06-16_12-00-00.dump --yes
#
# Without --yes the script only prints what it would do.

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="${ENV_FILE:-$ROOT_DIR/.env}"
CONFIRM=0
DUMP_FILE=""

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

require_pg_restore() {
  if command -v pg_restore >/dev/null 2>&1; then
    PG_RESTORE="pg_restore"
    return 0
  fi
  echo "Error: pg_restore not found. Install postgresql-client:" >&2
  echo "  sudo apt install -y postgresql-client" >&2
  exit 1
}

usage() {
  cat <<'EOF'
Usage: ./scripts/restore-db.sh <backup.dump> [--yes]

Arguments:
  backup.dump   Path to .dump file from backup-db.sh

Options:
  --yes         Actually run restore (required)
  --env PATH    Path to .env with DATABASE_URL (default: ./.env)
  -h, --help    Show this help

Warning: restores into the database from DATABASE_URL and overwrites existing data.
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --yes)
      CONFIRM=1
      shift
      ;;
    --env)
      ENV_FILE="${2:?missing value for --env}"
      shift 2
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    -*)
      echo "Unknown option: $1" >&2
      usage >&2
      exit 1
      ;;
    *)
      if [[ -z "$DUMP_FILE" ]]; then
        DUMP_FILE="$1"
      else
        echo "Unexpected argument: $1" >&2
        exit 1
      fi
      shift
      ;;
  esac
done

if [[ -z "$DUMP_FILE" ]]; then
  usage >&2
  exit 1
fi

if [[ ! -f "$DUMP_FILE" ]]; then
  echo "Error: backup file not found: $DUMP_FILE" >&2
  exit 1
fi

load_database_url
require_pg_restore

MASKED_URL="$(echo "$DATABASE_URL" | sed -E 's#(postgresql://[^:]+:)[^@]+#\1***#')"
echo "Target database: $MASKED_URL"
echo "Backup file:     $DUMP_FILE"
echo ""
echo "This will DROP and recreate objects from the dump (--clean --if-exists)."
echo "Application data in this database will be replaced."

if [[ "$CONFIRM" -ne 1 ]]; then
  echo ""
  echo "Dry run only. To restore, rerun with --yes:"
  echo "  ./scripts/restore-db.sh \"$DUMP_FILE\" --yes"
  exit 0
fi

echo ""
read -r -p "Type RESTORE to continue: " answer
if [[ "$answer" != "RESTORE" ]]; then
  echo "Aborted."
  exit 1
fi

echo "Restoring..."
"$PG_RESTORE" \
  -d "$DATABASE_URL" \
  --clean \
  --if-exists \
  --no-owner \
  --no-acl \
  --exit-on-error \
  "$DUMP_FILE"

echo "Restore finished."
echo "If the app was running during restore, restart it:"
echo "  pm2 restart all"
