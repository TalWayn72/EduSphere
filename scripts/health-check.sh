#!/bin/bash

# EduSphere Health Check Script
# Verifies all infrastructure services are healthy
# Multi-container dev setup (docker-compose.yml)

set -e

echo "EduSphere Health Check"
echo "=========================="

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

FAILED=0

# ── 0. Docker daemon reachability (MUST be first check) ──────────────────────
echo -n "Checking Docker daemon... "
if ! docker ps > /dev/null 2>&1; then
  echo -e "${RED}x UNREACHABLE${NC}"
  echo -e "${RED}  FATAL: Docker daemon not responding.${NC}"
  exit 2
fi
echo -e "${GREEN}ok${NC}"

check_service() {
  local SERVICE=$1
  local CHECK_CMD=$2
  local WARN_MSG=${3:-""}

  echo -n "Checking $SERVICE... "
  if eval "$CHECK_CMD" > /dev/null 2>&1; then
    echo -e "${GREEN}ok${NC}"
    return 0
  else
    echo -e "${RED}FAIL${NC}"
    [ -n "$WARN_MSG" ] && echo -e "${YELLOW}  $WARN_MSG${NC}"
    return 1
  fi
}

check_warn() {
  local SERVICE=$1
  local CHECK_CMD=$2
  local WARN_MSG=${3:-""}

  echo -n "Checking $SERVICE... "
  if eval "$CHECK_CMD" > /dev/null 2>&1; then
    echo -e "${GREEN}ok${NC}"
  else
    echo -e "${YELLOW}SKIP (optional)${NC}"
    [ -n "$WARN_MSG" ] && echo -e "${YELLOW}  $WARN_MSG${NC}"
  fi
}

echo "Mode: individual containers (docker-compose.yml)"

# 1. PostgreSQL
if ! check_service "PostgreSQL" \
  "docker exec edusphere-postgres pg_isready -U edusphere -d edusphere"; then
  FAILED=$((FAILED + 1))
fi
PG_EXEC="docker exec edusphere-postgres"

# 2. PostgreSQL Extensions
echo -n "Checking PostgreSQL extensions... "
EXTENSIONS=$($PG_EXEC bash -c \
  "PGPASSWORD=edusphere_dev_password psql -h 127.0.0.1 -U edusphere -d edusphere -t -A -c \
  \"SELECT COUNT(*) FROM pg_extension WHERE extname IN ('uuid-ossp', 'pgcrypto', 'age', 'vector')\"" \
  2>/dev/null || echo "0")
if [ "${EXTENSIONS}" -ge "3" ]; then
  echo -e "${GREEN}ok${NC} (found ${EXTENSIONS} extensions)"
else
  echo -e "${RED}FAIL${NC} (expected >=3, found ${EXTENSIONS:-0})"
  FAILED=$((FAILED + 1))
fi

# 3. Apache AGE Graph
echo -n "Checking Apache AGE graph... "
GRAPH_EXISTS=$($PG_EXEC bash -c \
  "PGPASSWORD=edusphere_dev_password psql -h 127.0.0.1 -U edusphere -d edusphere -t -A -c \
  \"SELECT COUNT(*) FROM ag_catalog.ag_graph WHERE name = 'edusphere_graph'\"" \
  2>/dev/null || echo "0")
if [ "${GRAPH_EXISTS}" -eq "1" ]; then
  echo -e "${GREEN}ok${NC} (edusphere_graph)"
else
  echo -e "${RED}FAIL${NC} (graph not found)"
  FAILED=$((FAILED + 1))
fi

# 4. Redis
if ! check_service "Redis" \
  "docker exec edusphere-redis redis-cli ping"; then
  FAILED=$((FAILED + 1))
fi

# 5. NATS
if ! check_service "NATS" \
  "curl -sf http://localhost:8222/healthz"; then
  FAILED=$((FAILED + 1))
fi

# 6. Keycloak
if ! check_service "Keycloak" \
  "curl -sf http://localhost:8080/realms/edusphere/.well-known/openid-configuration" \
  "Allow up to 90s for Keycloak to start"; then
  FAILED=$((FAILED + 1))
fi

# 7. MinIO (optional in dev mode)
check_warn "MinIO" \
  "curl -sf http://localhost:9000/minio/health/live" \
  "MinIO not running (optional for dev)"

# 8. Jaeger
check_warn "Jaeger" \
  "curl -sf http://localhost:16686/" \
  "Start with: docker-compose -f docker-compose.monitoring.yml up -d"

# 9. Gateway
check_warn "Gateway (port 4000)" \
  "curl -sf http://localhost:4000/health" \
  "Start with: pnpm --filter @edusphere/gateway dev"

# 10. Subgraphs (optional in dev — not all may be running)
for PORT in 4001 4002 4003 4004 4005 4006; do
  check_warn "Subgraph (port $PORT)" \
    "curl -sf http://localhost:${PORT}/health" \
    "Start subgraph or run: pnpm turbo dev --filter='@edusphere/subgraph-*'"
done

# ─── GPU Health (optional) ────────────────
echo ""
echo "=== GPU Health ==="
if command -v nvidia-smi &>/dev/null && nvidia-smi &>/dev/null 2>&1; then
  echo "GPU: $(nvidia-smi --query-gpu=name --format=csv,noheader 2>/dev/null | head -1)"
elif command -v rocm-smi &>/dev/null && rocm-smi &>/dev/null 2>&1; then
  echo "AMD GPU (ROCm) detected"
else
  echo "GPU: INFO — No discrete GPU detected, CPU mode active"
fi

WHISPER_HEALTH=$(curl -sf http://localhost:3200/health 2>/dev/null || echo "")
if [ -n "$WHISPER_HEALTH" ]; then
  echo "Whisper server: running"
else
  echo "Whisper server: INFO — not running (start with --profile ai)"
fi

echo ""
echo "=========================="
if [ $FAILED -eq 0 ]; then
  echo -e "${GREEN}All services healthy!${NC}"
  exit 0
else
  echo -e "${RED}$FAILED service(s) failed health check${NC}"
  exit 1
fi
