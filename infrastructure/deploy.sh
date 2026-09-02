#!/bin/bash

# =============================================================
# VibeGrid — Production Deploy Script
# Usage (from project root or VPS): bash infrastructure/deploy.sh
# What it does:
#   1. Loads AppArmor profiles (optional — skipped if not available)
#   2. Ensures Docker network exists
#   3. Starts all services (docker-compose.yml) with retry logic
#   4. Reloads Nginx gateway config
#   5. Health-checks API Gateway and prints service summary
# =============================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$SCRIPT_DIR/.."
ENV_FILE="$ROOT_DIR/.env"

echo ""
echo "=============================================="
echo " VibeGrid — Production Deployment"
echo "=============================================="

# ── 1. AppArmor Profiles (optional — skip gracefully if unavailable) ──
echo ""
echo "[1/4] Loading AppArmor profiles..."
APPARMOR_DIR="$SCRIPT_DIR/apparmor"
if command -v apparmor_parser &>/dev/null && ls "$APPARMOR_DIR"/vibegrid-* &>/dev/null 2>&1; then
  sudo mkdir -p /etc/apparmor.d/
  for profile in "$APPARMOR_DIR"/vibegrid-*; do
    sudo cp "$profile" /etc/apparmor.d/
    sudo apparmor_parser -r -W "/etc/apparmor.d/$(basename "$profile")"
    echo "  ✅ Loaded: $(basename "$profile")"
  done
else
  echo "  ℹ️  AppArmor not available or no profiles found — skipping."
fi

# ── 2. Docker Network ──────────────────────────────────────────
echo ""
echo "[2/4] Checking Docker network..."
if ! docker network ls | grep -q "vibegrid_net"; then
  echo "🌐 Creating Docker network 'vibegrid_net'..."
  docker network create vibegrid_net
else
  echo "✅ Docker network 'vibegrid_net' already exists."
fi

# ── 3. Bring up containers ─────────────────────────────────────
echo ""
echo "[3/4] Starting Docker Compose (production)..."
MAX_RETRIES=3
RETRY_COUNT=0
SUCCESS=false

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
  if docker compose \
      --env-file "$ENV_FILE" \
      -f "$SCRIPT_DIR/docker-compose.yml" \
      up -d --build; then
    SUCCESS=true
    break
  else
    echo "⚠️  Docker Compose failed. Retrying in 10s... ($((RETRY_COUNT + 1))/$MAX_RETRIES)"
    RETRY_COUNT=$((RETRY_COUNT + 1))
    sleep 10
  fi
done

if [ "$SUCCESS" = false ]; then
  echo "❌ Docker Compose failed after $MAX_RETRIES attempts. Aborting."
  exit 1
fi

# Reload Nginx config after all containers are up
echo "🔄 Reloading Nginx API Gateway config..."
docker compose -f "$SCRIPT_DIR/docker-compose.yml" exec -T vibegrid_api_gateway nginx -s reload || true

echo "✅ Containers started!"

# ── 4. Wait for API Gateway to be ready ───────────────────────
echo ""
echo "[4/4] Waiting for API Gateway to be ready..."
HEALTH_URL="http://localhost:8000/health"
MAX_WAIT=90
WAITED=0

until curl -s -o /dev/null -w "%{http_code}" "$HEALTH_URL" | grep -q "200"; do
  if [ $WAITED -ge $MAX_WAIT ]; then
    echo "⚠️  API Gateway did not respond in ${MAX_WAIT}s. Check logs:"
    echo "    docker logs -f vibegrid_api_gateway"
    exit 0
  fi
  sleep 2
  WAITED=$((WAITED + 2))
  echo "   Still waiting... (${WAITED}s)"
done

echo "✅ API Gateway is ready! (after ${WAITED}s)"

# ── Summary ────────────────────────────────────────────────────
echo ""
echo "=============================================="
echo " ✅ Production Stack Running!"
echo "=============================================="
echo " API Gateway:      http://localhost:8000"
echo " Auth Health:      http://localhost:8000/api/auth/health"
echo " Auth Readiness:   http://localhost:8000/api/auth/ready"
echo " RabbitMQ UI:      http://localhost:15672"
echo " MinIO Console:    http://localhost:9001"
echo ""
echo " Logs:             docker logs -f vibegrid_auth"
echo " Stop:             docker compose -f infrastructure/docker-compose.yml down"
echo "=============================================="
