#!/usr/bin/env bash
# One-time setup on Hostinger VPS — backend only. Does NOT touch other nginx sites.
set -euo pipefail

REPO_DIR="${CASEBOX_REPO_DIR:-/var/www/casebox}"
BRANCH="${CASEBOX_BRANCH:-main}"
PM2_NAME="${CASEBOX_PM2_NAME:-casebox-api}"
REPO_URL="${CASEBOX_REPO_URL:-https://github.com/osforhsoftware/drop-box.git}"

echo "==> CaseBox backend one-time VPS setup"
echo "    repo dir: $REPO_DIR"
echo "    branch: $BRANCH"

command -v node >/dev/null || { echo "Install Node.js first"; exit 1; }
command -v npm >/dev/null || { echo "Install npm first"; exit 1; }
command -v pm2 >/dev/null || npm install -g pm2
command -v git >/dev/null || { echo "Install git first"; exit 1; }

mkdir -p "$(dirname "$REPO_DIR")"

if [ ! -d "$REPO_DIR/.git" ]; then
  echo "==> Cloning repo"
  git clone "$REPO_URL" "$REPO_DIR"
fi

cd "$REPO_DIR"
git fetch origin "$BRANCH"
git checkout -B "$BRANCH" "origin/$BRANCH"
git reset --hard "origin/$BRANCH"

if [ -d backend ] && [ -f backend/server.js ]; then
  APP_DIR="$REPO_DIR/backend"
else
  APP_DIR="$REPO_DIR"
fi

echo "==> App dir: $APP_DIR"

if [ ! -f "$APP_DIR/.env" ]; then
  echo "==> Creating $APP_DIR/.env from example (edit secrets!)"
  if [ -f "$APP_DIR/.env.example" ]; then
    cp "$APP_DIR/.env.example" "$APP_DIR/.env"
  else
    cat > "$APP_DIR/.env" <<'EOF'
MONGO_URL=mongodb://localhost:27017
DB_NAME=drop_box
JWT_SECRET=replace_with_long_random_secret_32plus_chars
ADMIN_EMAIL=admin@caseboxstore.com
ADMIN_PASSWORD=replace_with_strong_password
NODE_ENV=production
HOST=0.0.0.0
PORT=8000
PUBLIC_BASE_URL=https://145-223-23-47.sslip.io
CORS_ORIGINS=https://caseboxstore.com,https://www.caseboxstore.com
EOF
  fi
  echo "!! Edit $APP_DIR/.env with real secrets before going live"
fi

chmod +x scripts/deploy-backend-vps.sh
CASEBOX_REPO_DIR="$REPO_DIR" CASEBOX_BRANCH="$BRANCH" CASEBOX_PM2_NAME="$PM2_NAME" \
  bash scripts/deploy-backend-vps.sh

echo "==> Setup complete"
echo "    Backend should be on http://127.0.0.1:8000"
echo "    Public URL: https://145-223-23-47.sslip.io"
echo "    Frontend stays at: https://caseboxstore.com"
