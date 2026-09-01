#!/usr/bin/env bash
# Run on the VPS (or via CI SSH). Updates CaseBox API only — does not touch other sites.
set -euo pipefail

REPO_DIR="${CASEBOX_REPO_DIR:-/var/www/casebox}"
BRANCH="${CASEBOX_BRANCH:-main}"
PM2_NAME="${CASEBOX_PM2_NAME:-casebox-api}"

upsert_env() {
  local file="$1" key="$2" value="$3"
  if [ ! -f "$file" ]; then
    printf '%s=%s\n' "$key" "$value" > "$file"
    return
  fi
  if grep -qE "^${key}=" "$file"; then
    # portable-ish in-place replace
    awk -v k="$key" -v v="$value" 'BEGIN{FS=OFS="="} $1==k{$0=k"="v} {print}' "$file" > "${file}.tmp"
    mv "${file}.tmp" "$file"
  else
    printf '\n%s=%s\n' "$key" "$value" >> "$file"
  fi
}

echo "==> CaseBox backend deploy (isolated)"
echo "    repo: $REPO_DIR"
echo "    branch: $BRANCH"
echo "    pm2: $PM2_NAME"

cd "$REPO_DIR"

# Preserve production secrets across checkout
ENV_PRESERVE="/root/casebox.env.preserve"
if [ -f backend/.env ]; then
  cp -a backend/.env "$ENV_PRESERVE"
elif [ -f .env ]; then
  cp -a .env "$ENV_PRESERVE"
fi

git fetch origin "$BRANCH"
git checkout -B "$BRANCH" "origin/$BRANCH"
git reset --hard "origin/$BRANCH"

if [ -d backend ] && [ -f backend/server.js ]; then
  APP_DIR="$REPO_DIR/backend"
else
  APP_DIR="$REPO_DIR"
fi

echo "==> App dir: $APP_DIR"

# Restore .env if checkout wiped it
if [ -f "$ENV_PRESERVE" ]; then
  cp -a "$ENV_PRESERVE" "$APP_DIR/.env"
fi

# Production public settings (frontend is hosted elsewhere)
upsert_env "$APP_DIR/.env" "NODE_ENV" "production"
upsert_env "$APP_DIR/.env" "HOST" "0.0.0.0"
upsert_env "$APP_DIR/.env" "PORT" "8000"
upsert_env "$APP_DIR/.env" "PUBLIC_BASE_URL" "https://145-223-23-47.sslip.io"
upsert_env "$APP_DIR/.env" "CORS_ORIGINS" "https://caseboxstore.com,https://www.caseboxstore.com"

cd "$APP_DIR"
npm install --omit=dev

# Restart only CaseBox — leave other PM2 apps alone
if pm2 describe "$PM2_NAME" >/dev/null 2>&1; then
  pm2 restart "$PM2_NAME" --update-env
else
  pm2 start server.js --name "$PM2_NAME" --cwd "$APP_DIR"
fi
pm2 save

# Do not reload nginx or other vhosts — CaseBox already proxied to :8000
echo "==> Health check"
sleep 2
curl -fsS "http://127.0.0.1:8000/api" || curl -fsS "http://127.0.0.1:8000/api/" || true
echo
echo "==> Done (other nginx sites untouched)"
