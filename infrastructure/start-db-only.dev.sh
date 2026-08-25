#!/usr/bin/env bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "=========================================="
echo " VibeGrid — Local Native Dev DB Startup"
echo " (Databases in Docker, App runs on HOST)"
echo "=========================================="

# 1. Create Docker network if it doesn't exist
if ! docker network inspect vibegrid_net >/dev/null 2>&1; then
    echo "Creating Docker network: vibegrid_net..."
    docker network create vibegrid_net
else
    echo "✔ Docker network 'vibegrid_net' already exists."
fi

# 2. Boot ONLY infrastructure databases (no app containers)
echo ""
echo "🚀 Starting infrastructure databases only..."
docker compose -f "$SCRIPT_DIR/docker-compose.yml" up -d \
    vibegrid_mongo \
    vibegrid_postgres \
    vibegrid_redis \
    vibegrid_rabbitmq

# 3. Wait for MongoDB to be ready (Auth Service primary DB)
echo ""
echo "Waiting for MongoDB to become healthy..."
MAX_RETRIES=20
COUNT=0
until docker exec vibegrid_mongo mongosh --eval "db.adminCommand('ping')" --quiet >/dev/null 2>&1; do
    COUNT=$((COUNT + 1))
    if [ $COUNT -ge $MAX_RETRIES ]; then
        echo "❌ MongoDB did not become healthy in time."
        exit 1
    fi
    echo "  ... ($COUNT/$MAX_RETRIES)"
    sleep 2
done

echo ""
echo "=========================================="
echo " ✅ Databases are ready for local dev!"
echo "=========================================="
echo ""
echo " Connection endpoints (localhost):"
echo "   MongoDB:   mongodb://admin:admin_secret@localhost:27017"
echo "   Postgres:  postgresql://vibegrid:vibegrid_secret@localhost:5432"
echo "   Redis:     redis://:redis_secret@localhost:6379"
echo "   RabbitMQ:  amqp://guest:guest@localhost:5672"
echo "   RabbitMQ UI: http://localhost:15672 (guest/guest)"
echo ""
echo " ➜ Run 'npm run dev' inside services/auth to start the Auth Service!"
echo "=========================================="
