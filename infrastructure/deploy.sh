#!/usr/bin/env bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR/.."

echo "=========================================="
echo " VibeGrid Services Infrastructure Deployment"
echo "=========================================="

# 1. Create Docker network if it doesn't exist
if ! docker network inspect vibegrid_net >/dev/null 2>&1; then
    echo "Creating Docker network: vibegrid_net..."
    docker network create vibegrid_net
else
    echo "Docker network 'vibegrid_net' already exists."
fi

# 2. Spin up containers
echo "Starting Docker containers..."
docker compose -f infrastructure/docker-compose.yml up -d

# 3. Wait for services to become healthy
echo "Waiting for infrastructure containers to become healthy..."
MAX_RETRIES=30
RETRY_COUNT=0

until curl -s http://localhost:8000/health | grep -q "vibegrid-api-gateway"; do
    RETRY_COUNT=$((RETRY_COUNT + 1))
    if [ $RETRY_COUNT -ge $MAX_RETRIES ]; then
        echo "Error: API Gateway healthcheck timed out after 30 seconds."
        docker compose -f infrastructure/docker-compose.yml ps
        exit 1
    fi
    echo "Waiting for API Gateway... ($RETRY_COUNT/$MAX_RETRIES)"
    sleep 1
done

echo "=========================================="
echo " ✅ Infrastructure deployed and healthy!"
echo "=========================================="
echo " Services Running:"
echo " - PostgreSQL:      localhost:5432"
echo " - MongoDB:         localhost:27017"
echo " - Redis:           localhost:6379"
echo " - RabbitMQ AMQP:   localhost:5672"
echo " - RabbitMQ UI:     http://localhost:15672 (guest/guest)"
echo " - MinIO API:       localhost:9000"
echo " - MinIO Console:   http://localhost:9001 (minioadmin/minioadmin)"
echo " - API Gateway:     http://localhost:8000/health"
echo "=========================================="
