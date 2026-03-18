#!/bin/bash

# EduSphere Service Restoration Guard
# Run after ANY operation that may disrupt services.
# If any service is down, auto-restores and re-verifies.

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

ENDPOINTS=(
  "Keycloak:http://localhost:8080/realms/edusphere"
  "Gateway:http://localhost:4000/graphql"
  "Frontend:http://localhost:5173"
  "NATS:http://localhost:8222/varz"
  "MinIO:http://localhost:9000/minio/health/live"
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

  # PostgreSQL via docker exec
  if docker exec edusphere-all-in-one pg_isready -U edusphere -d edusphere >/dev/null 2>&1; then
    echo -e "  ${GREEN}OK${NC} PostgreSQL"
  else
    echo -e "  ${RED}DOWN${NC} PostgreSQL"
    FAILED=$((FAILED + 1))
  fi

  return $FAILED
}

echo "=== Service Verification ==="
if check_all; then
  echo -e "\n${GREEN}All services healthy.${NC}"
  exit 0
fi

echo -e "\n${YELLOW}Services down detected. Auto-restoring...${NC}"
docker-compose up -d 2>&1 | tail -5

echo "Waiting 15s for services to start..."
sleep 15

echo "=== Re-verifying ==="
if check_all; then
  echo -e "\n${GREEN}All services restored successfully.${NC}"
  exit 0
else
  echo -e "\n${RED}Some services still down after restore attempt.${NC}"
  echo "Run: docker-compose logs | tail -50"
  exit 1
fi
