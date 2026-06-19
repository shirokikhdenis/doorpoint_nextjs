#!/usr/bin/env bash
# Temporary: log /_next/static/ with request_time. Revert with disable-static-access-log.sh
set -euo pipefail

NGINX_CONF=/etc/nginx/nginx.conf
SITE_CONF=/etc/nginx/sites-enabled/doorpoint29.conf
STATIC_LOG=/var/log/nginx/next-static.log

if ! grep -q 'log_format timed' "$NGINX_CONF"; then
  sed -i '/access_log \/var\/log\/nginx\/access.log;/i\\tlog_format timed '"'"'$remote_addr [$time_local] "$request" $status $body_bytes_sent rt=$request_time;'"'"';' "$NGINX_CONF"
fi

sed -i 's|access_log off;|access_log '"$STATIC_LOG"' timed;|' "$SITE_CONF"

nginx -t
nginx -s reload

touch "$STATIC_LOG"
chmod 640 "$STATIC_LOG"
chown www-data:adm "$STATIC_LOG" 2>/dev/null || true

echo "OK: static chunks -> $STATIC_LOG (format timed, rt=seconds)"
grep -A5 'location /_next/static/' "$SITE_CONF"
