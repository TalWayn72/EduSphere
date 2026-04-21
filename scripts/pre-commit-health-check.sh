#!/bin/bash

# EduSphere Pre-Commit Health Check
# Checks Docker infrastructure health before commits.
# WARNING-ONLY: never blocks the commit (always exits 0).
# Called from .husky/pre-commit hook.

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

WARNINGS=0

# Required individual containers (multi-container dev setup)
REQUIRED_SERVICES=("edusphere-postgres" "edusphere-keycloak" "edusphere-nats" "edusphere-minio" "edusphere-redis")
REQUIRED_COUNT=5

echo ""
echo -e "${CYAN}${BOLD}=== EduSphere Pre-Commit Health Check ===${NC}"
echo ""

# Step 1: Check if Docker daemon is reachable
if ! docker ps > /dev/null 2>&1; then
  echo -e "${YELLOW}WARNING: Docker daemon not reachable${NC}"
  echo -e "${YELLOW}  Infrastructure services cannot be verified.${NC}"
  echo -e "${YELLOW}  Start Docker Desktop and run: docker-compose up -d${NC}"
  echo ""
  echo -e "${YELLOW}Commit proceeding without health verification.${NC}"
  echo ""
  exit 0
fi

# Step 2: Check individual containers are running (multi-container dev setup)
check_service_quiet() {
  local name=$1
  local cmd=$2
  if eval "$cmd" > /dev/null 2>&1; then
    echo -e "  ${GREEN}$name${NC}"
    return 0
  else
    echo -e "  ${RED}$name — DOWN${NC}"
    return 1
  fi
}

CONTAINERS_HEALTHY=0
for container in "edusphere-postgres" "edusphere-keycloak" "edusphere-nats" "edusphere-minio" "edusphere-redis"; do
  RUNNING=$(docker inspect "$container" --format '{{.State.Running}}' 2>/dev/null || echo "false")
  if [ "$RUNNING" = "true" ]; then
    CONTAINERS_HEALTHY=$((CONTAINERS_HEALTHY + 1))
  fi
done

if [ "$CONTAINERS_HEALTHY" -lt "$REQUIRED_COUNT" ]; then
  echo -e "${YELLOW}WARNING: Only $CONTAINERS_HEALTHY/$REQUIRED_COUNT infrastructure containers are running${NC}"
  echo -e "${YELLOW}  Run: docker-compose up -d${NC}"
  WARNINGS=$((WARNINGS + 1))
else
  echo -e "${GREEN}Infrastructure containers ($CONTAINERS_HEALTHY/$REQUIRED_COUNT): running${NC}"
fi

# Step 3: Check individual services
echo ""
echo -e "${BOLD}Service status:${NC}"

# PostgreSQL
if ! check_service_quiet "PostgreSQL" \
  "docker exec edusphere-postgres pg_isready -U edusphere -d edusphere"; then
  WARNINGS=$((WARNINGS + 1))
fi

# Redis
if ! check_service_quiet "Redis" \
  "docker exec edusphere-redis redis-cli -a edusphere_redis_password ping"; then
  WARNINGS=$((WARNINGS + 1))
fi

# NATS
if ! check_service_quiet "NATS" \
  "curl -sf --max-time 5 http://localhost:8222/healthz"; then
  WARNINGS=$((WARNINGS + 1))
fi

# Keycloak
if ! check_service_quiet "Keycloak" \
  "curl -sf --max-time 5 http://localhost:8080/realms/edusphere/.well-known/openid-configuration"; then
  WARNINGS=$((WARNINGS + 1))
fi

# MinIO
if ! check_service_quiet "MinIO" \
  "curl -sf --max-time 5 http://localhost:9000/minio/health/live"; then
  WARNINGS=$((WARNINGS + 1))
fi

# Step 4: Summary
echo ""
if [ $WARNINGS -eq 0 ]; then
  echo -e "${GREEN}${BOLD}All infrastructure services healthy.${NC}"
else
  echo -e "${YELLOW}${BOLD}$WARNINGS service(s) not healthy.${NC}"
  echo -e "${YELLOW}Consider running: docker-compose up -d${NC}"
  echo -e "${YELLOW}Then verify with: ./scripts/health-check.sh${NC}"
fi

echo -e "${CYAN}Commit proceeding (health check is advisory only).${NC}"
echo ""

# Always allow commit — this is advisory only
exit 0
