#!/usr/bin/env bash
# Run this on the Oracle Cloud server to apply the backend secret and restart.
# Usage:  bash oracle-setup.sh
set -euo pipefail

REPO_DIR="$(cd "$(dirname "$0")" && pwd)"
ENV_FILE="$REPO_DIR/backend/.env"
SECRET="8825c06df346d85672ff8994209af0702640b3970dbd9e3655ff18bc3a4be191"
FRONTEND_ORIGIN="${1:-}"   # pass your Vercel URL as first arg, e.g.:
                            # bash oracle-setup.sh https://my-app.vercel.app

echo "=== Oracle backend setup ==="
echo "Repo dir : $REPO_DIR"
echo "Env file : $ENV_FILE"

# ── 1. Pull latest code ───────────────────────────────────────────────────────
echo ""
echo "→ Pulling latest code..."
git -C "$REPO_DIR" pull origin main

# ── 2. Inject BACKEND_SECRET into .env ───────────────────────────────────────
echo ""
echo "→ Updating .env..."

if grep -q "^BACKEND_SECRET=" "$ENV_FILE" 2>/dev/null; then
    sed -i "s|^BACKEND_SECRET=.*|BACKEND_SECRET=$SECRET|" "$ENV_FILE"
    echo "  BACKEND_SECRET updated"
else
    echo "" >> "$ENV_FILE"
    echo "BACKEND_SECRET=$SECRET" >> "$ENV_FILE"
    echo "  BACKEND_SECRET added"
fi

if [ -n "$FRONTEND_ORIGIN" ]; then
    if grep -q "^FRONTEND_ORIGIN=" "$ENV_FILE" 2>/dev/null; then
        sed -i "s|^FRONTEND_ORIGIN=.*|FRONTEND_ORIGIN=$FRONTEND_ORIGIN|" "$ENV_FILE"
    else
        echo "FRONTEND_ORIGIN=$FRONTEND_ORIGIN" >> "$ENV_FILE"
    fi
    echo "  FRONTEND_ORIGIN set to $FRONTEND_ORIGIN"
fi

# ── 3. Restart backend container ─────────────────────────────────────────────
echo ""
echo "→ Restarting backend..."
docker compose -f "$REPO_DIR/docker-compose.yml" restart backend

# ── 4. Verify ─────────────────────────────────────────────────────────────────
echo ""
echo "→ Waiting for health check..."
sleep 5
STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8000/)
if [ "$STATUS" = "200" ]; then
    echo "  ✓ Backend is up (HTTP $STATUS)"
else
    echo "  ✗ Backend returned HTTP $STATUS — check: docker compose logs backend"
    exit 1
fi

echo ""
echo "→ Testing secret enforcement..."
DIRECT=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8000/api/auth/me)
echo "  Direct hit (no secret): HTTP $DIRECT  ← should be 403"

WITH_SECRET=$(curl -s -o /dev/null -w "%{http_code}" \
    -H "X-Backend-Secret: $SECRET" \
    http://localhost:8000/api/auth/me)
echo "  With secret:            HTTP $WITH_SECRET  ← should be 401 (unauth) not 403"

echo ""
echo "=== Done. Backend is secured. ==="
