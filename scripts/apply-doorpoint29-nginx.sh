#!/usr/bin/env bash
# Deploy doorpoint29 nginx site config from repo and reload nginx.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SITE_CONF=/etc/nginx/sites-enabled/doorpoint29.conf

cp "$REPO_ROOT/scripts/doorpoint29.nginx.conf" "$SITE_CONF"
nginx -t
nginx -s reload
echo "OK: nginx reloaded ($(nginx -v 2>&1))"
