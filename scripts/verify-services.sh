#!/bin/bash

# EduSphere Service Restoration Guard
# Run after ANY operation that may disrupt services.
# If any service is down, auto-restores via docker-compose and re-verifies.
# Multi-container dev setup — checks individual named containers.

set -uo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# ── 0. Docker daemon reachability ─────────────────────────────────────────────
echo -n "Checking Docker daemon... "
if ! docker ps > /dev/null 2>&1; then
  echo -e "${RED}UNREACHABLE${NC}"
  echo -e "${RED}Docker daemon not responding — start Docker Desktop and retry.${NC}"
  exit 2
fi
echo -e "${GREEN}OK${NC}"

ENDPOINTS=(
  "Keycloak:http://localhost:8080/realms/edusphere"
  "Gateway:http://localhost:4000/graphql"
  "Frontend:http://localhost:5173"
  "NATS:http://localhost:8222/varz"
  "MinIO:http://localhost:9000/minio/health/live"
)

# Core infrastructure containers in the multi-container dev setup
CORE_CONTAINERS=(
  "edusphere-postgres"
  "edusphere-keycloak"
  "edusphere-nats"
  "edusphere-minio"
  "edusphere-redis"
)

check_all() {
  local FAILED=0
  for entry in "${ENDPOINTS[@]}"; do
    local name="${entry%%:*}"
    local url="${entry#*:}"
    if curl -sf -o /dev/null -w "" "$url" 2>/dev/null; then
      echo -e "  ${GREEN}OK${NC} $name"
    else
      echo -e "  ${RED}DOWN${NC} $name ($url)"
      FAILED=$((FAILED + 1))
    fi
  done

  # PostgreSQL via docker exec (individual container)
  if docker exec edusphere-postgres pg_isready -U edusphere -d edusphere >/dev/null 2>&1; then
    echo -e "  ${GREEN}OK${NC} PostgreSQL"
  else
    echo -e "  ${RED}DOWN${NC} PostgreSQL"
    FAILED=$((FAILED + 1))
  fi

  return $FAILED
}

# ── 1. Pre-check: ensure core containers are RUNNING ─────────────────────────
check_containers() {
  local MISSING=0
  for container in "${CORE_CONTAINERS[@]}"; do
    RUNNING=$(docker inspect "$container" --format '{{.State.Running}}' 2>/dev/null || echo "false")
    if [ "$RUNNING" != "true" ]; then
      echo -e "${YELLOW}Container not running: $container${NC}"
      MISSING=$((MISSING + 1))
    fi
  done
  return $MISSING
}

if ! check_containers; then
  echo -e "${YELLOW}Some core containers are not running. Attempting docker-compose up -d...${NC}"
  docker compose up -d 2>&1 | tail -5
  echo "Waiting 20s for containers to initialize..."
  sleep 20
fi

# ── 2. Endpoint verification ──────────────────────────────────────────────────
echo "=== Service Verification ==="
if check_all; then
  echo -e "\n${GREEN}All services healthy.${NC}"
  exit 0
fi

# ── 3. Auto-restore ──────────────────────────────────────────────────────────
echo -e "\n${YELLOW}Services down. Auto-restoring via docker-compose...${NC}"
docker compose up -d 2>&1 | tail -5
echo "Waiting 30s for full container startup..."
sleep 30

# ── 4. Final verification ────────────────────────────────────────────────────
echo "=== Final Verification ==="
if check_all; then
  echo -e "\n${GREEN}All services restored successfully.${NC}"
  exit 0
else
  echo -e "\n${RED}SERVICES STILL DOWN after auto-restore.${NC}"
  echo -e "${RED}   DO NOT declare task complete until all services are healthy.${NC}"
  echo ""
  echo "Diagnostics:"
  echo "  docker ps"
  echo "  docker-compose logs --tail=50"
  exit 1
fi
