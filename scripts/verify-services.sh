#!/bin/bash

# EduSphere Service Restoration Guard
# Run after ANY operation that may disrupt services.
# If any service is down, auto-restores (including supervisord) and re-verifies.

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

# One-off services that are EXPECTED to exit after running once
ONEOFF_SERVICES="compose-supergraph|gpu-detect|keycloak-seed|minio-init|node-deps"

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

# ── 1. Pre-check: ensure all supervisord services are RUNNING ─────────────────
# This runs BEFORE the endpoint check to catch the root cause (a stopped
# supervisord service) before it manifests as a failed HTTP check.
restore_supervisord() {
  if ! docker ps --format '{{.Names}}' | grep -q edusphere-all-in-one; then
    return 1  # container not running at all
  fi
  # supervisorctl status returns non-zero if ANY service is not RUNNING (exit 3),
  # so we test reachability by checking if the output contains process names.
  local STATUS_OUT
  STATUS_OUT=$(docker exec edusphere-all-in-one supervisorctl status 2>/dev/null || true)
  if [ -z "$STATUS_OUT" ]; then
    return 1  # supervisord not reachable
  fi

  local STOPPED
  STOPPED=$(echo "$STATUS_OUT" \
    | grep -E 'STOPPED|FATAL|BACKOFF' \
    | grep -vE "$ONEOFF_SERVICES" \
    | awk '{print $1}' || true)

  if [ -z "$STOPPED" ]; then
    return 0  # all running
  fi

  echo -e "${YELLOW}Stopped supervisord services detected:${NC}"
  for svc in $STOPPED; do
    echo -e "  ${YELLOW}↻ Starting${NC} $svc..."
    docker exec edusphere-all-in-one supervisorctl start "$svc" 2>/dev/null || true
  done
  echo "Waiting 15s for services to initialize..."
  sleep 15
  return 0
}

# Run pre-check and wait if services were restarted
if ! restore_supervisord; then
  echo -e "${YELLOW}Container not available for supervisord check.${NC}"
fi

# ── 2. Endpoint verification ──────────────────────────────────────────────────
echo "=== Service Verification ==="
if check_all; then
  echo -e "\n${GREEN}All services healthy.${NC}"
  exit 0
fi

# ── 3. Auto-restore ──────────────────────────────────────────────────────────
echo -e "\n${YELLOW}Services down. Auto-restoring...${NC}"

# 3a. If container is missing, bring it up
if ! docker ps --format '{{.Names}}' | grep -q edusphere-all-in-one; then
  echo "Container not running. Starting docker-compose..."
  docker compose up -d 2>&1 | tail -5
  echo "Waiting 30s for full container startup..."
  sleep 30
else
  # 3b. Container exists — restart any stopped supervisord services
  restore_supervisord
fi

# ── 4. Final verification ────────────────────────────────────────────────────
echo "=== Final Verification ==="
if check_all; then
  echo -e "\n${GREEN}All services restored successfully.${NC}"
  exit 0
else
  echo -e "\n${RED}⚠️  SERVICES STILL DOWN after auto-restore.${NC}"
  echo -e "${RED}   DO NOT declare task complete until all services are healthy.${NC}"
  echo ""
  echo "Diagnostics:"
  echo "  docker exec edusphere-all-in-one supervisorctl status"
  echo "  docker-compose logs --tail=50"
  exit 1
fi
