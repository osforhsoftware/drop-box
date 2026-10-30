#!/usr/bin/env bash
# Run on the VPS (or via CI SSH). Updates CaseBox only — does not touch other sites.
# - Restarts only PM2 process: casebox-api
# - Never reloads nginx / never changes other vhosts
# - Never restarts other PM2 apps
set -euo pipefail

REPO_DIR="${CASEBOX_REPO_DIR:-/var/www/casebox}"
BRANCH="${CASEBOX_BRANCH:-main}"
PM2_NAME="${CASEBOX_PM2_NAME:-casebox-api}"
# Optional: nginx document root for caseboxstore.com only (leave empty to skip frontend publish)
FRONTEND_ROOT="${CASEBOX_FRONTEND_ROOT:-}"
DEPLOY_FRONTEND="${CASEBOX_DEPLOY_FRONTEND:-1}"
API_PUBLIC_URL="${CASEBOX_API_PUBLIC_URL:-https://145-223-23-47.sslip.io}"
SITE_URL="${CASEBOX_SITE_URL:-https://caseboxstore.com}"

upsert_env() {
  local file="$1" key="$2" value="$3"
  if [ ! -f "$file" ]; then
    printf '%s=%s\n' "$key" "$value" > "$file"
    return
  fi
  if grep -qE "^${key}=" "$file"; then
    awk -v k="$key" -v v="$value" 'BEGIN{FS=OFS="="} $1==k{$0=k"="v} {print}' "$file" > "${file}.tmp"
    mv "${file}.tmp" "$file"
  else
    printf '\n%s=%s\n' "$key" "$value" >> "$file"
  fi
}

echo "==> CaseBox deploy (isolated — other sites untouched)"
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

# Production public settings only — never overwrite ADMIN_EMAIL / ADMIN_PASSWORD
upsert_env "$APP_DIR/.env" "NODE_ENV" "production"
upsert_env "$APP_DIR/.env" "HOST" "0.0.0.0"
upsert_env "$APP_DIR/.env" "PORT" "8000"
upsert_env "$APP_DIR/.env" "PUBLIC_BASE_URL" "$API_PUBLIC_URL"
upsert_env "$APP_DIR/.env" "CORS_ORIGINS" "${SITE_URL},https://www.caseboxstore.com"
upsert_env "$APP_DIR/.env" "FRONTEND_URL" "$SITE_URL"
upsert_env "$APP_DIR/.env" "GOOGLE_CALLBACK_URL" "${API_PUBLIC_URL}/api/auth/google/callback"

# Hero / catalog uploads live on disk (not in git)
mkdir -p "$APP_DIR/uploads/hero" "$APP_DIR/uploads/designs" "$APP_DIR/uploads/templates" "$APP_DIR/uploads/template-products" "$APP_DIR/uploads/models" "$APP_DIR/uploads/brands" "$APP_DIR/uploads/popups"

cd "$APP_DIR"
npm install --omit=dev

# Restart only CaseBox — leave other PM2 apps alone
if pm2 describe "$PM2_NAME" >/dev/null 2>&1; then
  pm2 restart "$PM2_NAME" --update-env
else
  pm2 start server.js --name "$PM2_NAME" --cwd "$APP_DIR"
fi
pm2 save

# Frontend build (CaseBox UI). Does not touch other sites.
if [ "$DEPLOY_FRONTEND" = "1" ] && [ -d "$REPO_DIR/frontend" ]; then
  echo "==> Building CaseBox frontend"
  cd "$REPO_DIR/frontend"
  npm install
  export VITE_BACKEND_URL="$API_PUBLIC_URL"
  export VITE_PUBLIC_BASE_URL="$API_PUBLIC_URL"
  export VITE_FRONTEND_URL="$SITE_URL"
  export REACT_APP_BACKEND_URL="$API_PUBLIC_URL"
  export REACT_APP_PUBLIC_BASE_URL="$API_PUBLIC_URL"
  export REACT_APP_FRONTEND_URL="$SITE_URL"
  export REACT_APP_NODE_ENV="production"
  npm run build

  DIST_DIR="$REPO_DIR/frontend/dist"
  if [ ! -d "$DIST_DIR" ]; then
    echo "ERROR: frontend build missing dist/"
    exit 1
  fi

  # If nginx root is separate, sync only into that CaseBox path (never other vhosts)
  if [ -n "$FRONTEND_ROOT" ] && [ -d "$FRONTEND_ROOT" ]; then
    echo "==> Publishing frontend → $FRONTEND_ROOT"
    rsync -a --delete "$DIST_DIR"/ "$FRONTEND_ROOT"/
  else
    echo "==> Frontend built at $DIST_DIR (set CASEBOX_FRONTEND_ROOT to publish)"
  fi
fi

# Do not reload nginx or other vhosts — CaseBox already proxied to :8000
echo "==> Health check"
sleep 2
curl -fsS "http://127.0.0.1:8000/api" || curl -fsS "http://127.0.0.1:8000/api/" || true
echo
echo "==> Done (other nginx sites / other PM2 apps untouched)"
