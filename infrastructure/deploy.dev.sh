#!/bin/bash

# =============================================================
# VibeGrid — Local Docker Dev Deploy Script
# Usage (from project root): bash infrastructure/deploy.dev.sh
# What it does:
#   1. Ensures Docker network exists
#   2. Ensures shared directories exist
#   3. Starts all DBs + auth service container (docker-compose.dev.yml)
#      with retry logic (same pattern as modelLink deploy.dev.sh)
#   4. Health-checks the auth service and prints service URLs
# =============================================================

set -e

# Always resolve relative to repo root regardless of where script is called from
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$SCRIPT_DIR/.."
ENV_FILE="$ROOT_DIR/.env"

echo ""
echo "=============================================="
echo " VibeGrid — Local Docker Dev Deployment"
echo "=============================================="

# ── 1. Docker Network ──────────────────────────────────────────
echo ""
echo "[1/3] Checking Docker network..."
if ! docker network ls | grep -q "vibegrid_net"; then
  echo "🌐 Creating Docker network 'vibegrid_net'..."
  docker network create vibegrid_net
else
  echo "✅ Docker network 'vibegrid_net' already exists."
fi

# ── 2. Ensure host-owned directories exist (prevents Docker creating them as root) ──
mkdir -p "$ROOT_DIR/services/auth/secrets" "$ROOT_DIR/logs"

# ── 3. Bring up containers ─────────────────────────────────────
echo ""
echo "[2/3] Starting Docker Compose (dev)..."
MAX_RETRIES=3
RETRY_COUNT=0
SUCCESS=false

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
  if docker compose \
      --env-file "$ENV_FILE" \
      -f "$SCRIPT_DIR/docker-compose.dev.yml" \
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

echo "✅ Containers started!"

# ── 4. Wait for auth service to be ready ──────────────────────
echo ""
echo "[3/3] Waiting for Auth Service to be ready..."
HEALTH_URL="http://localhost:8001/health"
MAX_WAIT=90
WAITED=0

until curl -s -o /dev/null -w "%{http_code}" "$HEALTH_URL" | grep -q "200"; do
  if [ $WAITED -ge $MAX_WAIT ]; then
    echo "⚠️  Auth Service did not respond in ${MAX_WAIT}s. Check logs:"
    echo "    docker logs -f vibegrid_auth_dev"
    exit 0
  fi
  sleep 2
  WAITED=$((WAITED + 2))
  echo "   Still waiting... (${WAITED}s)"
done

echo "✅ Auth Service is ready! (after ${WAITED}s)"

# ── Summary ────────────────────────────────────────────────────
echo ""
echo "=============================================="
echo " ✅ Dev Stack Running!"
echo "=============================================="
echo " Auth Service:     http://localhost:8001"
echo " Auth Health:      http://localhost:8001/health"
echo " Auth Readiness:   http://localhost:8001/ready"
echo " MongoDB:          localhost:27017"
echo " Redis:            localhost:6379"
echo " RabbitMQ AMQP:    localhost:5672"
echo " RabbitMQ UI:      http://localhost:15672"
echo " PostgreSQL:       localhost:5432"
echo " MinIO API:        localhost:9000"
echo " MinIO Console:    http://localhost:9001"
echo ""
echo " Logs:             docker logs -f vibegrid_auth_dev"
echo " Stop:             docker compose -f infrastructure/docker-compose.yml down"
echo "=============================================="
