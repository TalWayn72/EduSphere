#!/bin/bash

# EduSphere Pre-E2E Gate
# MUST run before any Playwright/E2E test execution.
# Ensures Docker is running and all services are healthy.
# Exit codes: 0 = ready for E2E, 1 = services down, 2 = Docker unreachable
#
# In CI (GitHub Actions), the pre-e2e-gate is skipped because services are
# provided by the workflow's `services:` block (postgres, nats) and Docker
# Compose is not available. The test:e2e command handles CI mode via
# Playwright config (CI=true → Vite dev server auto-start, no backend).

set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m'

echo "=== Pre-E2E Gate ==="

# In CI environments, skip Docker-based checks entirely.
# CI runners use workflow-level service containers instead.
if [ "${CI:-}" = "true" ] || [ "${GITHUB_ACTIONS:-}" = "true" ]; then
  echo -e "${GREEN}CI environment detected — skipping Docker gate (services provided by workflow)${NC}"
  exit 0
fi

# Step 1: Ensure Docker daemon is available
if ! bash "$SCRIPT_DIR/ensure-docker.sh"; then
  echo -e "${RED}GATE FAILED: Docker daemon not available — E2E tests cannot run.${NC}"
  exit 2
fi

# Step 2: Check if container is running, start if needed
if ! docker ps --format '{{.Names}}' | grep -q "edusphere-all-in-one"; then
  echo "Container not running — starting docker-compose..."
  cd "$SCRIPT_DIR/.." && docker compose up -d 2>&1 | tail -3
  echo "Waiting 30s for container startup..."
  sleep 30
fi

# Step 3: Wait for container to be healthy (max 120s)
echo -n "Waiting for container health... "
for i in $(seq 1 12); do
  STATUS=$(docker ps --format "{{.Status}}" --filter name=edusphere-all-in-one 2>/dev/null)
  if echo "$STATUS" | grep -q "healthy)"; then
    echo -e "${GREEN}healthy${NC}"
    break
  fi
  if [ "$i" -eq 12 ]; then
    echo -e "${RED}timeout — container not healthy after 120s${NC}"
    exit 1
  fi
  sleep 10
done

# Step 4: Verify key endpoints
ENDPOINTS_OK=true
for endpoint in "http://localhost:5173:Frontend" "http://localhost:4000/graphql:Gateway" "http://localhost:8080:Keycloak"; do
  URL="${endpoint%%:*}:${endpoint#*:}"
  # Parse correctly: URL is everything before last colon-word
  NAME="${endpoint##*:}"
  URL="${endpoint%:*}"
  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 "$URL" 2>/dev/null || echo "000")
  if [ "$HTTP_CODE" = "000" ]; then
    echo -e "  ${RED}DOWN${NC} $NAME ($URL)"
    ENDPOINTS_OK=false
  else
    echo -e "  ${GREEN}OK${NC} $NAME (HTTP $HTTP_CODE)"
  fi
done

if [ "$ENDPOINTS_OK" = true ]; then
  echo -e "\n${GREEN}=== Pre-E2E Gate PASSED — ready for testing ===${NC}"
  exit 0
else
  echo -e "\n${RED}=== Pre-E2E Gate FAILED — some services are down ===${NC}"
  echo "Run: bash scripts/verify-services.sh"
  exit 1
fi
