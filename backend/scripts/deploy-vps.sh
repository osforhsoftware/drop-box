#!/usr/bin/env bash
# Run ON the VPS after backend code is updated (git pull or rsync).
# Usage: bash /var/www/casebox/scripts/deploy-vps.sh

set -euo pipefail

APP_DIR="${CASEBOX_APP_DIR:-/var/www/casebox}"
PM2_NAME="${CASEBOX_PM2_NAME:-casebox-api}"

cd "$APP_DIR"

echo "==> Installing dependencies..."
npm ci --omit=dev

echo "==> Running tests..."
npm test

echo "==> Restarting API..."
if command -v pm2 >/dev/null 2>&1; then
  pm2 restart "$PM2_NAME" || pm2 start server.js --name "$PM2_NAME"
  pm2 save
elif systemctl is-active --quiet casebox-api 2>/dev/null; then
  sudo systemctl restart casebox-api
else
  echo "No pm2 or casebox-api systemd unit found. Start manually:"
  echo "  NODE_ENV=production node server.js"
  exit 1
fi

echo "==> Health check..."
sleep 2
curl -fsS "http://127.0.0.1:${PORT:-8000}/" | head -c 200
echo ""
echo "Deploy complete."
