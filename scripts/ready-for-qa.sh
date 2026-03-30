#!/usr/bin/env bash

# EduSphere Ready-for-QA Gate
# Run before spawning E2E/Playwright specialists to ensure environment is stable.
#
# Usage:
#   ./scripts/ready-for-qa.sh
#
# Exit codes:
#   0 — all checks passed, ready for QA
#   1 — one or more checks failed (details in output)
#   2 — Docker daemon unreachable (fatal)

set -uo pipefail

# ── Colors ──────────────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
FAILED=0
TOTAL_CHECKS=8
RESULTS=()

# ── Helper ──────────────────────────────────────────────────────────────────
record() {
  local CHECK_NUM="$1"
  local CHECK_NAME="$2"
  local STATUS="$3"  # pass|fail|warn
  local DETAIL="$4"

  if [ "$STATUS" = "pass" ]; then
    RESULTS+=("$(printf "  %d. %-35s ${GREEN}PASS${NC}  %s" "$CHECK_NUM" "$CHECK_NAME" "$DETAIL")")
  elif [ "$STATUS" = "warn" ]; then
    RESULTS+=("$(printf "  %d. %-35s ${YELLOW}WARN${NC}  %s" "$CHECK_NUM" "$CHECK_NAME" "$DETAIL")")
  else
    RESULTS+=("$(printf "  %d. %-35s ${RED}FAIL${NC}  %s" "$CHECK_NUM" "$CHECK_NAME" "$DETAIL")")
    FAILED=$((FAILED + 1))
  fi
}

curl_check() {
  local URL="$1"
  local CODE
  CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 "$URL" 2>/dev/null || echo "000")
  echo "$CODE"
}

echo -e "${BOLD}═══════════════════════════════════════════════════${NC}"
echo -e "${BOLD} READY-FOR-QA GATE — EduSphere${NC}"
echo -e "${BOLD}═══════════════════════════════════════════════════${NC}"
echo ""

# ── Check 0: Docker daemon (fatal if missing) ─────────────────────────────
echo -n "Checking Docker daemon... "
if ! docker ps > /dev/null 2>&1; then
  echo -e "${RED}UNREACHABLE${NC}"
  echo -e "${RED}FATAL: Docker daemon not responding. Start Docker Desktop first.${NC}"
  exit 2
fi
echo -e "${GREEN}OK${NC}"

# ── Check 1: Docker containers healthy (>=5) ──────────────────────────────
echo -n "[1/8] Docker containers... "
CONTAINER_STATUS=$(docker ps --format "{{.Names}} {{.Status}}" --filter name=edusphere 2>/dev/null || echo "")
HEALTHY_COUNT=0

if echo "$CONTAINER_STATUS" | grep -q "healthy"; then
  HEALTHY_COUNT=$(echo "$CONTAINER_STATUS" | grep -c "healthy" || echo "0")
fi

# Also count individual services inside all-in-one container
if docker inspect edusphere-all-in-one --format '{{.State.Running}}' 2>/dev/null | grep -q true; then
  # Count internal services via supervisorctl
  INTERNAL=$(docker exec edusphere-all-in-one supervisorctl status 2>/dev/null | grep -c "RUNNING" || echo "0")
  if [ "$INTERNAL" -ge 5 ]; then
    HEALTHY_COUNT=$((HEALTHY_COUNT > 0 ? HEALTHY_COUNT : INTERNAL))
  fi
fi

if [ "$HEALTHY_COUNT" -ge 5 ]; then
  record 1 "Docker containers" "pass" "${HEALTHY_COUNT} healthy"
  echo -e "${GREEN}${HEALTHY_COUNT} healthy${NC}"
elif [ "$HEALTHY_COUNT" -ge 1 ]; then
  record 1 "Docker containers" "fail" "only ${HEALTHY_COUNT} healthy (need >=5)"
  echo -e "${RED}only ${HEALTHY_COUNT} (need >=5)${NC}"
else
  # All-in-one might be running but not yet healthy
  if docker inspect edusphere-all-in-one --format '{{.State.Running}}' 2>/dev/null | grep -q true; then
    record 1 "Docker containers" "warn" "container running, not yet healthy"
    echo -e "${YELLOW}running but not healthy yet${NC}"
  else
    record 1 "Docker containers" "fail" "no containers found"
    echo -e "${RED}no containers${NC}"
  fi
fi

# ── Check 2: Database migrations ──────────────────────────────────────────
echo -n "[2/8] Database migrations... "
DB_CHECK=$(docker exec edusphere-all-in-one bash -c \
  "PGPASSWORD=edusphere_dev_password psql -h 127.0.0.1 -U edusphere -d edusphere -t -A -c \
  \"SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public'\"" \
  2>/dev/null || echo "0")

if [ "${DB_CHECK:-0}" -gt 0 ]; then
  record 2 "Database migrations" "pass" "${DB_CHECK} tables in public schema"
  echo -e "${GREEN}${DB_CHECK} tables${NC}"
else
  record 2 "Database migrations" "fail" "no tables or DB unreachable"
  echo -e "${RED}no tables or DB unreachable${NC}"
fi

# ── Check 3: Gateway responds ─────────────────────────────────────────────
echo -n "[3/8] Gateway (port 4000)... "
GW_CODE=$(curl_check "http://localhost:4000/graphql")
if [ "$GW_CODE" != "000" ]; then
  record 3 "Gateway (4000)" "pass" "HTTP ${GW_CODE}"
  echo -e "${GREEN}HTTP ${GW_CODE}${NC}"
else
  record 3 "Gateway (4000)" "fail" "not responding"
  echo -e "${RED}not responding${NC}"
fi

# ── Check 4: All 6 subgraphs respond ─────────────────────────────────────
echo -n "[4/8] Subgraphs (4001-4006)... "
SG_OK=0
SG_FAIL_LIST=""
for PORT in 4001 4002 4003 4004 4005 4006; do
  CODE=$(curl_check "http://localhost:${PORT}/graphql")
  if [ "$CODE" != "000" ]; then
    SG_OK=$((SG_OK + 1))
  else
    SG_FAIL_LIST="${SG_FAIL_LIST} ${PORT}"
  fi
done

if [ "$SG_OK" -eq 6 ]; then
  record 4 "Subgraphs (4001-4006)" "pass" "6/6 responding"
  echo -e "${GREEN}6/6${NC}"
elif [ "$SG_OK" -gt 0 ]; then
  record 4 "Subgraphs (4001-4006)" "fail" "${SG_OK}/6 — down:${SG_FAIL_LIST}"
  echo -e "${RED}${SG_OK}/6 — down:${SG_FAIL_LIST}${NC}"
else
  record 4 "Subgraphs (4001-4006)" "fail" "0/6 responding"
  echo -e "${RED}0/6${NC}"
fi

# ── Check 5: Web dev server ──────────────────────────────────────────────
echo -n "[5/8] Web dev server (5173)... "
WEB_CODE=$(curl_check "http://localhost:5173")
if [ "$WEB_CODE" != "000" ]; then
  record 5 "Web dev server (5173)" "pass" "HTTP ${WEB_CODE}"
  echo -e "${GREEN}HTTP ${WEB_CODE}${NC}"
else
  record 5 "Web dev server (5173)" "fail" "not responding — run: pnpm --filter @edusphere/web dev"
  echo -e "${RED}not responding${NC}"
fi

# ── Check 6: TypeScript clean ─────────────────────────────────────────────
echo -n "[6/8] TypeScript typecheck... "
TS_OUTPUT=$(cd "$PROJECT_ROOT" && pnpm turbo typecheck 2>&1)
TS_EXIT=$?
if [ "$TS_EXIT" -eq 0 ]; then
  record 6 "TypeScript typecheck" "pass" "0 errors"
  echo -e "${GREEN}clean${NC}"
else
  TS_ERRORS=$(echo "$TS_OUTPUT" | grep -c "error TS" || echo "?")
  record 6 "TypeScript typecheck" "fail" "${TS_ERRORS} errors"
  echo -e "${RED}${TS_ERRORS} errors${NC}"
fi

# ── Check 7: Lint clean ──────────────────────────────────────────────────
echo -n "[7/8] ESLint... "
LINT_OUTPUT=$(cd "$PROJECT_ROOT" && pnpm turbo lint 2>&1)
LINT_EXIT=$?
if [ "$LINT_EXIT" -eq 0 ]; then
  record 7 "ESLint" "pass" "0 issues"
  echo -e "${GREEN}clean${NC}"
else
  LINT_ERRORS=$(echo "$LINT_OUTPUT" | grep -cE "[0-9]+ error" || echo "?")
  record 7 "ESLint" "fail" "lint errors found"
  echo -e "${RED}errors found${NC}"
fi

# ── Check 8: 5 test users in Keycloak ─────────────────────────────────────
echo -n "[8/8] Keycloak test users... "

# Get admin token
KC_TOKEN=$(curl -s -X POST "http://localhost:8080/realms/master/protocol/openid-connect/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=admin&password=admin&grant_type=password&client_id=admin-cli" \
  2>/dev/null | grep -o '"access_token":"[^"]*"' | cut -d'"' -f4)

if [ -z "$KC_TOKEN" ]; then
  record 8 "Keycloak test users" "fail" "cannot get admin token"
  echo -e "${RED}cannot get admin token${NC}"
else
  USERS_FOUND=0
  USERS_MISSING=""
  for EMAIL in "super.admin@edusphere.dev" "instructor@example.com" "org.admin@example.com" "researcher@example.com" "student@example.com"; do
    USER_CHECK=$(curl -s "http://localhost:8080/admin/realms/edusphere/users?email=${EMAIL}" \
      -H "Authorization: Bearer ${KC_TOKEN}" 2>/dev/null)

    if echo "$USER_CHECK" | grep -q "$EMAIL"; then
      USERS_FOUND=$((USERS_FOUND + 1))
    else
      USERS_MISSING="${USERS_MISSING} ${EMAIL%%@*}"
    fi
  done

  if [ "$USERS_FOUND" -eq 5 ]; then
    record 8 "Keycloak test users" "pass" "5/5 found"
    echo -e "${GREEN}5/5${NC}"
  else
    record 8 "Keycloak test users" "fail" "${USERS_FOUND}/5 — missing:${USERS_MISSING}"
    echo -e "${RED}${USERS_FOUND}/5 — missing:${USERS_MISSING}${NC}"
  fi
fi

# ── Summary Table ──────────────────────────────────────────────────────────
echo ""
echo -e "${BOLD}═══════════════════════════════════════════════════${NC}"
echo -e "${BOLD} READY-FOR-QA GATE RESULTS${NC}"
echo -e "${BOLD}═══════════════════════════════════════════════════${NC}"
echo ""

for line in "${RESULTS[@]}"; do
  echo -e "$line"
done

echo ""
PASSED=$((TOTAL_CHECKS - FAILED))
echo -e "  ${BOLD}Total:${NC} ${GREEN}${PASSED} passed${NC} / ${RED}${FAILED} failed${NC} / ${TOTAL_CHECKS} checks"
echo ""

if [ "$FAILED" -eq 0 ]; then
  echo -e "${GREEN}${BOLD}  QA GATE PASSED — environment is ready for E2E testing.${NC}"
  echo -e "${BOLD}═══════════════════════════════════════════════════${NC}"
  exit 0
else
  echo -e "${RED}${BOLD}  QA GATE FAILED — fix ${FAILED} issue(s) before running E2E tests.${NC}"
  echo ""
  echo -e "  Common fixes:"
  echo -e "    Docker:     docker-compose up -d"
  echo -e "    Gateway:    pnpm --filter @edusphere/gateway dev"
  echo -e "    Subgraphs:  pnpm turbo dev --filter='@edusphere/subgraph-*'"
  echo -e "    Frontend:   pnpm --filter @edusphere/web dev"
  echo -e "    TypeScript: pnpm turbo typecheck (fix errors)"
  echo -e "    Keycloak:   pnpm --filter @edusphere/db seed"
  echo -e "${BOLD}═══════════════════════════════════════════════════${NC}"
  exit 1
fi
