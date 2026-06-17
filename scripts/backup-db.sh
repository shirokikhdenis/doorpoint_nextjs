#!/usr/bin/env bash
# PostgreSQL backup. Reads DATABASE_URL from .env in project root.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="${ENV_FILE:-$ROOT_DIR/.env}"
BACKUP_DIR="${BACKUP_DIR:-$ROOT_DIR/backups}"
KEEP="${BACKUP_KEEP:-7}"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --keep) KEEP="${2:?}"; shift 2 ;;
    --dir) BACKUP_DIR="${2:?}"; shift 2 ;;
    --env) ENV_FILE="${2:?}"; shift 2 ;;
    -h|--help)
      echo "Usage: ./scripts/backup-db.sh [--keep N] [--dir PATH] [--env PATH]"
      exit 0
      ;;
    *) echo "Unknown option: $1" >&2; exit 1 ;;
  esac
done

if [[ -z "${DATABASE_URL:-}" ]]; then
  [[ -f "$ENV_FILE" ]] || { echo "Error: .env not found at $ENV_FILE" >&2; exit 1; }
  set -a; source "$ENV_FILE"; set +a
fi
[[ -n "${DATABASE_URL:-}" ]] || { echo "Error: DATABASE_URL missing" >&2; exit 1; }

command -v pg_dump >/dev/null || { echo "Error: pg_dump not found" >&2; exit 1; }

mkdir -p "$BACKUP_DIR"
OUT_FILE="$BACKUP_DIR/db_$(date +%Y-%m-%d_%H-%M-%S).dump"
echo "Backing up to $OUT_FILE"
pg_dump -Fc --no-owner --no-acl "$DATABASE_URL" -f "$OUT_FILE"
echo "Done: $OUT_FILE ($(du -h "$OUT_FILE" | cut -f1))"

if [[ "$KEEP" -gt 0 ]]; then
  mapfile -t files < <(find "$BACKUP_DIR" -maxdepth 1 -type f -name 'db_*.dump' -printf '%T@ %p\n' 2>/dev/null | sort -n | cut -d' ' -f2-)
  count=${#files[@]}
  if [[ "$count" -gt "$KEEP" ]]; then
    for ((i = 0; i < count - KEEP; i++)); do
      echo "Removing old backup: ${files[$i]}"
      rm -f "${files[$i]}"
    done
  fi
fi
