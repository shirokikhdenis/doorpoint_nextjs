#!/usr/bin/env bash
# Production health check for doorpoint Next.js storefront.
# Usage on VPS: bash scripts/health-check.sh

set -u

BASE_URL="${HEALTH_BASE_URL:-http://127.0.0.1:3000}"
PUBLIC_URL="${HEALTH_PUBLIC_URL:-https://doorpoint29.ru}"
PROJECT_DIR="${HEALTH_PROJECT_DIR:-/var/www/doorpoint/doorpoint_nextjs}"
FAIL=0

pass() { echo "OK   $1"; }
fail() { echo "FAIL $1"; FAIL=1; }

check_http() {
  local label="$1"
  local url="$2"
  local max_time="${3:-15}"
  local max_ok="${4:-3}"
  local out
  out="$(curl -sS -o /dev/null -w "%{http_code} %{time_total}" --max-time "$max_time" "$url" 2>/dev/null)" || {
    fail "$label -> curl error ($url)"
    return
  }
  local code time
  code="${out%% *}"
  time="${out#* }"
  if [[ "$code" == "200" ]]; then
    if awk -v t="$time" -v limit="$max_ok" 'BEGIN { exit !(t <= limit) }'; then
      pass "$label -> HTTP $code ${time}s"
    else
      fail "$label -> HTTP $code ${time}s (slow, limit ${max_ok}s) ($url)"
    fi
  else
    fail "$label -> HTTP $code ${time}s ($url)"
  fi
}

echo "=== doorpoint health check $(date -Is) ==="
echo

echo "--- System ---"
df -h / | tail -1
free -h | awk '/^Mem:/ {print "Mem: "$3" used / "$2" total, "$7" available"}'
uptime
echo

echo "--- Services ---"
for svc in nginx postgresql; do
  if systemctl is-active --quiet "$svc"; then
    pass "systemctl $svc active"
  else
    fail "systemctl $svc not active"
  fi
done
if command -v pm2 >/dev/null 2>&1; then
  pm2 jlist 2>/dev/null | grep -q '"name":"doorpoint_nextjs".*"status":"online"' \
    && pass "pm2 doorpoint_nextjs online" \
    || fail "pm2 doorpoint_nextjs not online"
fi
echo

echo "--- Local app ( $BASE_URL ) ---"
check_http "GET /" "$BASE_URL/" 15 3
check_http "GET /catalog" "$BASE_URL/catalog" 20 3
check_http "GET /catalog/dveri-mezhkomnatnyye" "$BASE_URL/catalog/dveri-mezhkomnatnyye" 25 3
check_http "GET /contact" "$BASE_URL/contact" 15 3
check_http "GET /api/health" "$BASE_URL/api/health" 15 3
check_http "GET /api/products" "$BASE_URL/api/products?catalogPage=dveri-mezhkomnatnyye&page=1&limit=20" 20 3
check_http "GET /api/products/meta" "$BASE_URL/api/products/meta?catalogPage=dveri-mezhkomnatnyye" 20 3
check_http "GET /api/products/catalog-pages" "$BASE_URL/api/products/catalog-pages" 20 3

echo
echo "--- SSR catalog (products in HTML) ---"
if curl -sS --max-time 25 "$BASE_URL/catalog/dveri-mezhkomnatnyye" | grep -q "prima-2-cream-silk"; then
  pass "catalog slug contains product slug in HTML"
else
  fail "catalog slug missing product slug in HTML"
fi

echo
echo "--- RSC prefetch ---"
check_http "RSC /contact" "$BASE_URL/contact?_rsc=healthcheck" 20
check_http "RSC /catalog/slug" "$BASE_URL/catalog/dveri-mezhkomnatnyye?_rsc=healthcheck" 25

echo
echo "--- Public HTTPS ( $PUBLIC_URL ) ---"
check_http "public GET /" "$PUBLIC_URL/"
check_http "public GET /catalog" "$PUBLIC_URL/catalog" 25

echo
echo "--- Database ---"
if [[ -f "$PROJECT_DIR/.env" ]]; then
  set -a
  # shellcheck disable=SC1091
  source "$PROJECT_DIR/.env"
  set +a
  if [[ -n "${DATABASE_URL:-}" ]] && command -v psql >/dev/null 2>&1; then
    if psql "$DATABASE_URL" -t -c "SELECT 1" >/dev/null 2>&1; then
      count="$(psql "$DATABASE_URL" -t -A -c "SELECT count(*) FROM products WHERE is_active = true" 2>/dev/null || echo "?")"
      pass "PostgreSQL connected, active products: $count"
    else
      fail "PostgreSQL connection failed"
    fi
  else
    fail "DATABASE_URL or psql missing"
  fi
else
  fail ".env not found at $PROJECT_DIR/.env"
fi

echo
echo "--- Deploy drift ---"
if [[ -d "$PROJECT_DIR/.git" ]]; then
  cd "$PROJECT_DIR"
  local_commit="$(git rev-parse --short HEAD 2>/dev/null || echo unknown)"
  echo "git HEAD: $local_commit $(git log -1 --format=%s 2>/dev/null || true)"
  if grep -q 'getCachedCatalogPages' src/lib/server/catalog-shell.ts 2>/dev/null; then
    pass "storefront data cache wired in catalog shell"
  else
    fail "storefront data cache missing in catalog shell"
  fi
fi

echo
if [[ "$FAIL" -eq 0 ]]; then
  echo "RESULT: ALL CHECKS PASSED"
  exit 0
fi
echo "RESULT: SOME CHECKS FAILED"
exit 1
