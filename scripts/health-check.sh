#!/bin/bash

# EduSphere Health Check Script
# Verifies all infrastructure services are healthy
# Architecture: single all-in-one container (edusphere-all-in-one)

set -e

echo "🏥 EduSphere Health Check"
echo "=========================="

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

FAILED=0

check_service() {
  local SERVICE=$1
  local CHECK_CMD=$2
  local WARN_MSG=${3:-""}

  echo -n "Checking $SERVICE... "
  if eval "$CHECK_CMD" > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC}"
    return 0
  else
    echo -e "${RED}✗${NC}"
    [ -n "$WARN_MSG" ] && echo -e "${YELLOW}  $WARN_MSG${NC}"
    return 1
  fi
}

check_warn() {
  # Like check_service but failure is a warning (doesn't increment FAILED)
  local SERVICE=$1
  local CHECK_CMD=$2
  local WARN_MSG=${3:-""}

  echo -n "Checking $SERVICE... "
  if eval "$CHECK_CMD" > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC}"
  else
    echo -e "${YELLOW}⚠ (not running — optional)${NC}"
    [ -n "$WARN_MSG" ] && echo -e "${YELLOW}  $WARN_MSG${NC}"
  fi
}

# 1. All-in-one container running
if ! check_service "Container (edusphere-all-in-one)" \
  "docker inspect edusphere-all-in-one --format '{{.State.Running}}' | grep -q true"; then
  echo -e "${RED}  FATAL: edusphere-all-in-one not running — run: docker-compose up -d${NC}"
  FAILED=$((FAILED + 1))
fi

# 2. PostgreSQL (inside all-in-one)
if ! check_service "PostgreSQL" \
  "docker exec edusphere-all-in-one pg_isready -U edusphere -d edusphere"; then
  FAILED=$((FAILED + 1))
fi

# 3. PostgreSQL Extensions
echo -n "Checking PostgreSQL extensions... "
EXTENSIONS=$(docker exec edusphere-all-in-one bash -c \
  "PGPASSWORD=edusphere_dev_password psql -h 127.0.0.1 -U edusphere -d edusphere -t -A -c \
  \"SELECT COUNT(*) FROM pg_extension WHERE extname IN ('uuid-ossp', 'pgcrypto', 'age', 'vector')\"" \
  2>/dev/null || echo "0")
if [ "${EXTENSIONS}" -eq "4" ]; then
  echo -e "${GREEN}✓${NC} (uuid-ossp, pgcrypto, age, vector)"
else
  echo -e "${RED}✗${NC} (expected 4, found ${EXTENSIONS:-0})"
  FAILED=$((FAILED + 1))
fi

# 4. Apache AGE Graph
echo -n "Checking Apache AGE graph... "
GRAPH_EXISTS=$(docker exec edusphere-all-in-one bash -c \
  "PGPASSWORD=edusphere_dev_password psql -h 127.0.0.1 -U edusphere -d edusphere -t -A -c \
  \"SELECT COUNT(*) FROM ag_catalog.ag_graph WHERE name = 'edusphere_graph'\"" \
  2>/dev/null || echo "0")
if [ "${GRAPH_EXISTS}" -eq "1" ]; then
  echo -e "${GREEN}✓${NC} (edusphere_graph)"
else
  echo -e "${RED}✗${NC} (graph not found — run: pnpm --filter @edusphere/db graph:init)"
  FAILED=$((FAILED + 1))
fi

# 5. Redis (inside all-in-one, password-protected)
if ! check_service "Redis" \
  "docker exec edusphere-all-in-one redis-cli -a edusphere_redis_password ping"; then
  FAILED=$((FAILED + 1))
fi

# 6. NATS
if ! check_service "NATS" \
  "docker exec edusphere-all-in-one bash -c 'curl -sf http://127.0.0.1:8222/healthz'"; then
  FAILED=$((FAILED + 1))
fi

# 7. Keycloak
if ! check_service "Keycloak" \
  "curl -sf http://localhost:8080/realms/edusphere/.well-known/openid-configuration" \
  "Allow up to 90s for Keycloak to start"; then
  FAILED=$((FAILED + 1))
fi

# 8. MinIO
if ! check_service "MinIO" \
  "curl -sf http://localhost:9000/minio/health/live"; then
  FAILED=$((FAILED + 1))
fi

# 9. Jaeger (optional — requires docker-compose.monitoring.yml)
check_warn "Jaeger" \
  "curl -sf http://localhost:16686/" \
  "Start with: docker-compose -f docker-compose.monitoring.yml up -d"

# 10. mcp-nats for Claude Code MCP (auto-install if missing)
echo -n "Checking mcp-nats (Claude MCP)... "
if docker exec edusphere-all-in-one bash -c "test -f /tmp/nats-test/node_modules/.bin/mcp-nats" > /dev/null 2>&1; then
  echo -e "${GREEN}✓${NC}"
else
  echo -e "${YELLOW}missing — installing...${NC}"
  if docker exec edusphere-all-in-one bash -c \
    "mkdir -p /tmp/nats-test && cd /tmp/nats-test && NODE_TLS_REJECT_UNAUTHORIZED=0 npm install mcp-nats --save --loglevel=error" \
    > /dev/null 2>&1; then
    echo -e "  ${GREEN}✓ mcp-nats installed${NC}"
  else
    echo -e "  ${RED}✗ mcp-nats install failed${NC}"
    FAILED=$((FAILED + 1))
  fi
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
