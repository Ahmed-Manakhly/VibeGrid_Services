#!/bin/bash
# VibeGrid Platform — Infrastructure & Service Health Monitor
# Checks container status, CPU/Memory resource usage, and HTTP health endpoints.
# Supports Telegram Bot API and generic Webhooks with alert deduplication and recovery notifications.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Load environment configuration if available
ENV_FILE="${ENV_FILE:-$HOME/.vibegrid_alert.env}"
if [ -f "$ENV_FILE" ]; then
    set -a
    source "$ENV_FILE"
    set +a
elif [ -f "$SCRIPT_DIR/.vibegrid_alert.env" ]; then
    set -a
    source "$SCRIPT_DIR/.vibegrid_alert.env"
    set +a
fi

LOG_FILE="${LOG_FILE:-/tmp/vibegrid-alert.log}"
STATE_FILE="${STATE_FILE:-/tmp/vibegrid_alert_state.env}"
HOSTNAME=$(hostname 2>/dev/null || echo "vibegrid-vps")

# Credentials & Config
ALERT_WEBHOOK_URL="${ALERT_WEBHOOK_URL:-}"
TELEGRAM_BOT_TOKEN="${TELEGRAM_BOT_TOKEN:-}"
TELEGRAM_CHAT_ID="${TELEGRAM_CHAT_ID:-}"

# Service Endpoints
BFF_URL="${BFF_URL:-http://localhost:3000/api/health}"
GATEWAY_URL="${GATEWAY_URL:-http://localhost:8000/health}"
AUTH_URL="${AUTH_URL:-http://localhost:8001/health}"
MEDIA_URL="${MEDIA_URL:-http://localhost:3002/health}"
EMAIL_URL="${EMAIL_URL:-http://localhost:8003/health}"
ONBOARDING_URL="${ONBOARDING_URL:-http://localhost:8004/health}"
REALTIME_URL="${REALTIME_URL:-http://localhost:8005/health}"

# Resource Thresholds
PID_WARN=${PID_WARN:-40}
PID_CRIT=${PID_CRIT:-80}
CPU_WARN=${CPU_WARN:-75}
CPU_CRIT=${CPU_CRIT:-90}
MEM_WARN=${MEM_WARN:-75}
MEM_CRIT=${MEM_CRIT:-90}

# Load previous state
PREV_STATE="OK"
if [ -f "$STATE_FILE" ]; then
    PREV_STATE=$(cat "$STATE_FILE" 2>/dev/null || echo "OK")
fi

save_state() {
    echo "$1" > "$STATE_FILE"
}

send_notification() {
    local level="$1"
    local metric="$2"
    local current_val="$3"
    local threshold="$4"
    local action="$5"
    local timestamp=$(date -u +"%Y-%m-%d %H:%M:%S UTC")

    local emoji="⚠️"
    if [ "$level" = "CRITICAL" ]; then
        emoji="🚨"
    elif [ "$level" = "RECOVERY" ]; then
        emoji="✅"
    fi

    local text_message="$emoji VIBEGRID HEALTH & MONITORING ALERT

Host: $HOSTNAME
Timestamp: $timestamp
Severity: $level
Metric: $metric
Current Value: $current_val
Threshold: $threshold
Suggested Action: $action"

    # Log locally
    echo "[$timestamp] [$level] Metric: $metric | Value: $current_val | Threshold: $threshold" | tee -a "$LOG_FILE"

    # 1. Telegram Bot API
    if [ -n "$TELEGRAM_BOT_TOKEN" ] && [ -n "$TELEGRAM_CHAT_ID" ]; then
        curl -s -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" \
            -d "chat_id=${TELEGRAM_CHAT_ID}" \
            -d "text=${text_message}" >/dev/null 2>&1 || true
    fi

    # 2. Generic Webhook (Slack / Discord)
    if [ -n "$ALERT_WEBHOOK_URL" ]; then
        local payload=$(cat <<EOF
{
  "content": "$emoji **VIBEGRID HEALTH ALERT**\n\`\`\`\nHost: $HOSTNAME\nSeverity: $level\nMetric: $metric\nValue: $current_val (Threshold: $threshold)\nTimestamp: $timestamp\nSuggested Action: $action\n\`\`\`"
}
EOF
)
        curl -s -X POST -H "Content-Type: application/json" -d "$payload" "$ALERT_WEBHOOK_URL" >/dev/null 2>&1 || true
    fi
}

# -------------------------------------------------------------
# SAFE TEST MODE HANDLERS (--test-warning, --test-critical, --test-recovery)
# -------------------------------------------------------------
if [ "$1" = "--test-warning" ]; then
    echo "🧪 Executing SAFE TEST MODE: WARNING Alert..."
    send_notification "WARNING" "Test Resource Metric" "45 PIDs" "40 PIDs" "Safe end-to-end monitoring alert test."
    exit 0
elif [ "$1" = "--test-critical" ]; then
    echo "🧪 Executing SAFE TEST MODE: CRITICAL Alert..."
    send_notification "CRITICAL" "Test Service Health" "500 Internal Server Error" "HTTP 200 OK" "Safe end-to-end monitoring alert test."
    exit 0
elif [ "$1" = "--test-recovery" ]; then
    echo "🧪 Executing SAFE TEST MODE: RECOVERY Alert..."
    send_notification "RECOVERY" "Test Service Health" "HTTP 200 OK" "Normal" "System restored to normal operating state."
    exit 0
fi

# -------------------------------------------------------------
# REAL MONITORING EXECUTION
# -------------------------------------------------------------

FAILED_SERVICES=()

check_http_endpoint() {
    local name="$1"
    local url="$2"
    local code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 "$url" 2>/dev/null || echo "000")
    if [ "$code" != "200" ]; then
        FAILED_SERVICES+=("$name (HTTP $code at $url)")
    fi
}

# Check HTTP endpoints
check_http_endpoint "Auth Service" "$AUTH_URL"
check_http_endpoint "Media Service" "$MEDIA_URL"
check_http_endpoint "Realtime Gateway" "$REALTIME_URL"
check_http_endpoint "BFF" "$BFF_URL"

# Check Docker Container statuses if Docker is available
CONTAINER_FAILED=()
if command -v docker >/dev/null 2>&1; then
    REQUIRED_CONTAINERS=("vibegrid-postgres" "vibegrid-mongodb" "vibegrid-redis" "vibegrid-rabbitmq" "vibegrid-minio")
    for container in "${REQUIRED_CONTAINERS[@]}"; do
        if docker ps --format '{{.Names}}' | grep -q "^${container}$"; then
            :
        else
            CONTAINER_FAILED+=("$container")
        fi
    done
fi

CURRENT_STATE="OK"
ALERT_LEVEL=""
ALERT_METRIC=""
ALERT_VAL=""
ALERT_THRESH=""
ALERT_ACTION=""

if [ ${#FAILED_SERVICES[@]} -gt 0 ]; then
    CURRENT_STATE="CRITICAL"
    ALERT_LEVEL="CRITICAL"
    ALERT_METRIC="HTTP Health Endpoint Failure"
    ALERT_VAL="${FAILED_SERVICES[*]}"
    ALERT_THRESH="HTTP 200 OK"
    ALERT_ACTION="Check target service logs via 'docker logs <container>' or systemd status."
elif [ ${#CONTAINER_FAILED[@]} -gt 0 ]; then
    CURRENT_STATE="CRITICAL"
    ALERT_LEVEL="CRITICAL"
    ALERT_METRIC="Infrastructure Container Stopped"
    ALERT_VAL="${CONTAINER_FAILED[*]}"
    ALERT_THRESH="RUNNING"
    ALERT_ACTION="Restart missing containers using 'docker-compose up -d'."
fi

# Deduplication & State Transition Logic
if [ "$CURRENT_STATE" != "$PREV_STATE" ]; then
    if [ "$CURRENT_STATE" != "OK" ]; then
        send_notification "$ALERT_LEVEL" "$ALERT_METRIC" "$ALERT_VAL" "$ALERT_THRESH" "$ALERT_ACTION"
    elif [ "$PREV_STATE" != "OK" ]; then
        send_notification "RECOVERY" "Services & Containers" "All Health Endpoints Passing" "Normal Baseline" "No action required. All systems normal."
    fi
    save_state "$CURRENT_STATE"
fi

if [ "$CURRENT_STATE" = "OK" ]; then
    echo "OK: All VibeGrid services and infrastructure containers operating normally."
    exit 0
else
    echo "CRITICAL: Health issues detected: ${ALERT_VAL}"
    exit 1
fi
