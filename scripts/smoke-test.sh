#!/bin/bash
# =============================================================================
# EduSphere Smoke Test Script
#
# Usage:
#   GATEWAY_URL=https://staging-api.edusphere.dev \
#   FRONTEND_URL=https://staging.edusphere.dev \
#   ENVIRONMENT=staging \
#   ./scripts/smoke-test.sh
#
# Exit codes:
#   0 — all smoke tests passed
#   1 — one or more tests failed
# =============================================================================

set -euo pipefail

# ── Configuration ─────────────────────────────────────────────────────────────
GATEWAY_URL="${GATEWAY_URL:-http://localhost:4000}"
FRONTEND_URL="${FRONTEND_URL:-http://localhost:5173}"
ENVIRONMENT="${ENVIRONMENT:-local}"

# Maximum seconds to wait for the gateway to become reachable on startup
GATEWAY_READY_TIMEOUT="${GATEWAY_READY_TIMEOUT:-120}"
# Retry interval (seconds)
RETRY_INTERVAL=5
# curl connect timeout (seconds)
CURL_CONNECT_TIMEOUT=10
# curl max total time per request (seconds)
CURL_MAX_TIME=20

# ── Colors ────────────────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

# ── Counters ──────────────────────────────────────────────────────────────────
TESTS_PASSED=0
TESTS_FAILED=0

# ── Helpers ───────────────────────────────────────────────────────────────────
log_info()    { echo -e "${CYAN}[INFO]${NC} $*"; }
log_success() { echo -e "${GREEN}[PASS]${NC} $*"; }
log_warn()    { echo -e "${YELLOW}[WARN]${NC} $*"; }
log_error()   { echo -e "${RED}[FAIL]${NC} $*"; }
log_section() { echo -e "\n${BOLD}${CYAN}=== $* ===${NC}"; }

# Wait for the gateway /health endpoint to return HTTP 200.
wait_for_gateway() {
  local url="${GATEWAY_URL}/health"
  local deadline=$(( $(date +%s) + GATEWAY_READY_TIMEOUT ))

  log_info "Waiting for gateway health endpoint: ${url}"
  log_info "Timeout: ${GATEWAY_READY_TIMEOUT}s (interval: ${RETRY_INTERVAL}s)"

  local attempt=0
  while [ "$(date +%s)" -lt "${deadline}" ]; do
    attempt=$(( attempt + 1 ))
    local http_code
    http_code=$(curl -s -o /dev/null -w "%{http_code}" \
      --connect-timeout "${CURL_CONNECT_TIMEOUT}" \
      --max-time "${CURL_MAX_TIME}" \
      "${url}" 2>/dev/null || echo "000")

    if [ "${http_code}" = "200" ]; then
      log_success "Gateway is reachable (attempt ${attempt}, HTTP ${http_code})"
      return 0
    fi

    log_info "  attempt ${attempt} — HTTP ${http_code} — retrying in ${RETRY_INTERVAL}s..."
    sleep "${RETRY_INTERVAL}"
  done

  log_error "Gateway did not become ready within ${GATEWAY_READY_TIMEOUT}s"
  return 1
}

# Run a single test. Prints PASS/FAIL and increments counters.
# Args: <test_name> <expected_pattern> <curl_exit_code> <response_body>
record_result() {
  local name="$1"
  local passed="$2"

  if [ "${passed}" = "true" ]; then
    log_success "${name}"
    TESTS_PASSED=$(( TESTS_PASSED + 1 ))
  else
    log_error "${name}"
    TESTS_FAILED=$(( TESTS_FAILED + 1 ))
  fi
}

# HTTP GET check — expects HTTP 200.
check_http() {
  local name="$1"
  local url="$2"

  local http_code
  http_code=$(curl -s -o /dev/null -w "%{http_code}" \
    --connect-timeout "${CURL_CONNECT_TIMEOUT}" \
    --max-time "${CURL_MAX_TIME}" \
    "${url}" 2>/dev/null || echo "000")

  if [ "${http_code}" = "200" ]; then
    record_result "${name} (HTTP ${http_code})" "true"
  else
    log_warn "Response code was ${http_code} for ${url}"
    record_result "${name} (HTTP ${http_code} — expected 200)" "false"
  fi
}

# GraphQL POST check — sends a query and expects `"data"` in the response.
# Args: <test_name> <graphql_query_string>
check_graphql() {
  local name="$1"
  local query="$2"

  local response
  local http_code
  response=$(curl -s -w "\n__HTTP_CODE__%{http_code}" \
    --connect-timeout "${CURL_CONNECT_TIMEOUT}" \
    --max-time "${CURL_MAX_TIME}" \
    -X POST \
    -H "Content-Type: application/json" \
    -d "{\"query\":\"${query}\"}" \
    "${GATEWAY_URL}/graphql" 2>/dev/null || echo '{"errors":[{"message":"curl failed"}]}
__HTTP_CODE__000')

  http_code=$(echo "${response}" | grep '__HTTP_CODE__' | sed 's/__HTTP_CODE__//')
  local body
  body=$(echo "${response}" | grep -v '__HTTP_CODE__')

  # A valid GraphQL response always has a "data" key (even if null for errors)
  if echo "${body}" | grep -q '"data"' && [ "${http_code}" = "200" ]; then
    record_result "${name} (GraphQL — HTTP ${http_code})" "true"
  else
    log_warn "Response: ${body}"
    record_result "${name} (GraphQL — HTTP ${http_code})" "false"
  fi
}

# GraphQL check that also asserts no "errors" array in the response.
check_graphql_no_errors() {
  local name="$1"
  local query="$2"

  local response
  local http_code
  response=$(curl -s -w "\n__HTTP_CODE__%{http_code}" \
    --connect-timeout "${CURL_CONNECT_TIMEOUT}" \
    --max-time "${CURL_MAX_TIME}" \
    -X POST \
    -H "Content-Type: application/json" \
    -d "{\"query\":\"${query}\"}" \
    "${GATEWAY_URL}/graphql" 2>/dev/null || echo '{"errors":[{"message":"curl failed"}]}
__HTTP_CODE__000')

  http_code=$(echo "${response}" | grep '__HTTP_CODE__' | sed 's/__HTTP_CODE__//')
  local body
  body=$(echo "${response}" | grep -v '__HTTP_CODE__')

  if echo "${body}" | grep -q '"data"' \
      && ! echo "${body}" | grep -q '"errors"' \
      && [ "${http_code}" = "200" ]; then
    record_result "${name} (no errors — HTTP ${http_code})" "true"
  else
    log_warn "Response: ${body}"
    record_result "${name} (errors present or HTTP ${http_code})" "false"
  fi
}

# =============================================================================
# MAIN
# =============================================================================

echo ""
echo -e "${BOLD}=============================================================${NC}"
echo -e "${BOLD}  EduSphere Smoke Test Suite — ${ENVIRONMENT}${NC}"
echo -e "${BOLD}=============================================================${NC}"
echo "  Gateway  : ${GATEWAY_URL}"
echo "  Frontend : ${FRONTEND_URL}"
echo "  Time     : $(date -u +'%Y-%m-%dT%H:%M:%SZ')"
echo ""

# ── Step 1: Wait for gateway readiness ───────────────────────────────────────
log_section "Gateway Readiness"
if ! wait_for_gateway; then
  log_error "Aborting smoke tests — gateway not reachable."
  exit 1
fi

# ── Step 2: Health endpoints ──────────────────────────────────────────────────
log_section "Health Endpoints"

check_http "Gateway /health" "${GATEWAY_URL}/health"
check_http "Frontend root" "${FRONTEND_URL}"

# ── Step 3: GraphQL introspection (supergraph is composed correctly) ──────────
log_section "GraphQL Introspection"

check_graphql \
  "Supergraph introspection — __typename" \
  "{ __typename }"

check_graphql \
  "Supergraph introspection — queryType name" \
  "query { __schema { queryType { name } } }"

# ── Step 4: Federation entity resolution ─────────────────────────────────────
log_section "Federation Health"

# The _service field is required by Apollo Federation on every subgraph
check_graphql \
  "Gateway _service field (federation probe)" \
  "{ _service { sdl } }"

# ── Step 5: Core domain queries ───────────────────────────────────────────────
log_section "Core Domain Queries"

# Health query through the full supergraph (no auth required)
check_graphql \
  "Gateway _health field" \
  "{ _health }"

# ── Step 6: Security headers ──────────────────────────────────────────────────
log_section "Security Headers"

HEADERS_RESPONSE=$(curl -sI \
  --connect-timeout "${CURL_CONNECT_TIMEOUT}" \
  --max-time "${CURL_MAX_TIME}" \
  "${GATEWAY_URL}/health" 2>/dev/null || echo "")

check_header() {
  local header_name="$1"
  if echo "${HEADERS_RESPONSE}" | grep -qi "${header_name}"; then
    record_result "Response header: ${header_name}" "true"
  else
    log_warn "Missing response header: ${header_name}"
    record_result "Response header: ${header_name}" "false"
  fi
}

# These headers are expected to be set by Traefik middleware
check_header "X-Content-Type-Options"
check_header "X-Frame-Options"

# ── Step 7: Static asset delivery (frontend) ──────────────────────────────────
log_section "Frontend Static Assets"

check_http "Frontend favicon" "${FRONTEND_URL}/favicon.ico"

# ── Final summary ─────────────────────────────────────────────────────────────
TOTAL=$(( TESTS_PASSED + TESTS_FAILED ))
echo ""
echo -e "${BOLD}=============================================================${NC}"
echo -e "${BOLD}  Smoke Test Results — ${ENVIRONMENT}${NC}"
echo -e "${BOLD}=============================================================${NC}"
echo -e "  Total  : ${TOTAL}"
echo -e "  ${GREEN}Passed : ${TESTS_PASSED}${NC}"
echo -e "  ${RED}Failed : ${TESTS_FAILED}${NC}"
echo ""

if [ "${TESTS_FAILED}" -eq 0 ]; then
  echo -e "${GREEN}${BOLD}All smoke tests passed. ${ENVIRONMENT} is healthy.${NC}"
  exit 0
else
  echo -e "${RED}${BOLD}${TESTS_FAILED} smoke test(s) failed. ${ENVIRONMENT} is NOT healthy.${NC}"
  exit 1
fi
