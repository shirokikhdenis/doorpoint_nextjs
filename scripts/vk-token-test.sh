#!/bin/bash
set -euo pipefail
cd /var/www/doorpoint/doorpoint_nextjs
set -a
source .env
set +a

REF=$(curl -s -X POST "https://id.vk.ru/oauth2/auth" \
  -d "grant_type=refresh_token" \
  -d "client_id=${VK_CLIENT_ID}" \
  -d "client_secret=${VK_CLIENT_SECRET}" \
  -d "refresh_token=${VK_REFRESH_TOKEN}")

echo "REFRESH_RESPONSE=$REF"

TOKEN=$(python3 - <<'PY'
import json, os, sys
data = json.loads(os.environ.get("REF_JSON", "{}"))
print(data.get("access_token", ""))
PY
)

export REF_JSON="$REF"
TOKEN=$(python3 -c 'import json,os; d=json.loads(os.environ["REF_JSON"]); print(d.get("access_token",""))')

if [ -z "$TOKEN" ]; then
  echo "NO_ACCESS_TOKEN"
  exit 1
fi

echo "TOKEN_PREFIX=${TOKEN:0:12}"

echo "PERMS=$(curl -s "https://api.vk.ru/method/account.getAppPermissions?access_token=${TOKEN}&v=5.199")"
echo "UPLOAD=$(curl -s -X POST "https://api.vk.ru/method/photos.getMarketUploadServer" -d "access_token=${TOKEN}" -d "group_id=${VK_GROUP_ID}" -d "main_photo=1" -d "v=5.199")"
