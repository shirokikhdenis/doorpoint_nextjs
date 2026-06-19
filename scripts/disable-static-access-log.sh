#!/usr/bin/env bash
# Revert temporary static chunk logging.
set -euo pipefail

SITE_CONF=/etc/nginx/sites-enabled/doorpoint29.conf

sed -i 's|access_log /var/log/nginx/next-static.log timed;|access_log off;|' "$SITE_CONF"

nginx -t
nginx -s reload

echo "OK: /_next/static/ access_log off restored"
