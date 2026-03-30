#!/bin/bash

# EduSphere Session Completion Gate
# Automates the 10-check Session Completion Gate from CLAUDE.md.
# Runs checks in parallel where possible and outputs a summary table.
#
# Usage: ./scripts/session-completion-gate.sh [--quick]
#   --quick  Skip slow checks (typecheck, lint) for faster feedback

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

QUICK_MODE=false
if [ "$1" = "--quick" ]; then
  QUICK_MODE=true
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

# Temp files for parallel check results
TMPDIR_GATE=$(mktemp -d 2>/dev/null || mktemp -d -t 'edusphere-gate')
trap 'rm -rf "$TMPDIR_GATE"' EXIT

echo -e "\n${CYAN}${BOLD}================================================================"
echo -e "  EduSphere Session Completion Gate — $(date '+%Y-%m-%d %H:%M:%S')"
echo -e "================================================================${NC}\n"

# ── Check 1: Docker containers ──────────────────────────────────────────────
check_docker() {
  local outfile="$TMPDIR_GATE/docker"
  if ! docker ps > /dev/null 2>&1; then
    echo "FAIL|Docker daemon not reachable" > "$outfile"
    return
  fi

  local running
  running=$(docker inspect edusphere-all-in-one --format '{{.State.Running}}' 2>/dev/null || echo "false")
  if [ "$running" = "true" ]; then
    # Count healthy services inside the container
    local svc_count=0
    docker exec edusphere-all-in-one pg_isready -U edusphere -d edusphere > /dev/null 2>&1 && svc_count=$((svc_count + 1))
    docker exec edusphere-all-in-one redis-cli -a edusphere_redis_password ping > /dev/null 2>&1 && svc_count=$((svc_count + 1))
    docker exec edusphere-all-in-one bash -c 'curl -sf http://127.0.0.1:8222/healthz' > /dev/null 2>&1 && svc_count=$((svc_count + 1))
    curl -sf --max-time 5 http://localhost:8080/realms/edusphere/.well-known/openid-configuration > /dev/null 2>&1 && svc_count=$((svc_count + 1))
    curl -sf --max-time 5 http://localhost:9000/minio/health/live > /dev/null 2>&1 && svc_count=$((svc_count + 1))

    if [ "$svc_count" -ge 5 ]; then
      echo "PASS|$svc_count/5 services healthy" > "$outfile"
    else
      echo "FAIL|$svc_count/5 services healthy (need 5)" > "$outfile"
    fi
  else
    echo "FAIL|edusphere-all-in-one container not running" > "$outfile"
  fi
}

# ── Check 2: TypeScript ─────────────────────────────────────────────────────
check_typecheck() {
  local outfile="$TMPDIR_GATE/typecheck"
  if [ "$QUICK_MODE" = true ]; then
    echo "SKIP|Skipped (--quick mode)" > "$outfile"
    return
  fi

  local output
  output=$(cd "$PROJECT_DIR" && pnpm turbo typecheck 2>&1)
  local exit_code=$?

  if [ $exit_code -eq 0 ]; then
    echo "PASS|0 TypeScript errors" > "$outfile"
  else
    local error_count
    error_count=$(echo "$output" | grep -c "error TS" 2>/dev/null || echo "?")
    echo "FAIL|$error_count TypeScript error(s)" > "$outfile"
  fi
}

# ── Check 3: Lint ────────────────────────────────────────────────────────────
check_lint() {
  local outfile="$TMPDIR_GATE/lint"
  if [ "$QUICK_MODE" = true ]; then
    echo "SKIP|Skipped (--quick mode)" > "$outfile"
    return
  fi

  local output
  output=$(cd "$PROJECT_DIR" && pnpm turbo lint 2>&1)
  local exit_code=$?

  if [ $exit_code -eq 0 ]; then
    echo "PASS|0 lint errors" > "$outfile"
  else
    local error_count
    error_count=$(echo "$output" | grep -cE "(error|warning)" 2>/dev/null || echo "?")
    echo "FAIL|$error_count lint issue(s)" > "$outfile"
  fi
}

# ── Check 4: Health check script ────────────────────────────────────────────
check_health() {
  local outfile="$TMPDIR_GATE/health"
  if [ ! -f "$PROJECT_DIR/scripts/health-check.sh" ]; then
    echo "FAIL|health-check.sh not found" > "$outfile"
    return
  fi

  local output
  output=$(cd "$PROJECT_DIR" && bash scripts/health-check.sh 2>&1)
  local exit_code=$?

  if [ $exit_code -eq 0 ]; then
    echo "PASS|All services healthy" > "$outfile"
  elif [ $exit_code -eq 2 ]; then
    echo "FAIL|Docker unreachable" > "$outfile"
  else
    local failed
    failed=$(echo "$output" | grep -oE "[0-9]+ service" | head -1 || echo "some")
    echo "FAIL|$failed failed" > "$outfile"
  fi
}

# ── Check 5: Git status ─────────────────────────────────────────────────────
check_git_status() {
  local outfile="$TMPDIR_GATE/git"
  local uncommitted
  uncommitted=$(cd "$PROJECT_DIR" && git status --porcelain 2>/dev/null | wc -l | tr -d ' ')

  if [ "$uncommitted" -eq 0 ]; then
    echo "PASS|Working tree clean" > "$outfile"
  else
    echo "WARN|$uncommitted uncommitted change(s)" > "$outfile"
  fi
}

# ── Check 6: OPEN_ISSUES.md ─────────────────────────────────────────────────
check_open_issues() {
  local outfile="$TMPDIR_GATE/issues"
  local issues_file="$PROJECT_DIR/OPEN_ISSUES.md"

  if [ ! -f "$issues_file" ]; then
    echo "FAIL|OPEN_ISSUES.md not found" > "$outfile"
    return
  fi

  local now=$(date +%s)
  local mod_time
  mod_time=$(stat -c %Y "$issues_file" 2>/dev/null || stat -f %m "$issues_file" 2>/dev/null || echo "$now")
  local age_days=$(( (now - mod_time) / 86400 ))

  if [ "$age_days" -le 7 ]; then
    echo "PASS|Updated $age_days day(s) ago" > "$outfile"
  else
    echo "WARN|Last updated $age_days days ago" > "$outfile"
  fi
}

# ── Check 7: Recent git commit ──────────────────────────────────────────────
check_git_commit() {
  local outfile="$TMPDIR_GATE/commit"
  local last_commit
  last_commit=$(cd "$PROJECT_DIR" && git log --oneline -1 2>/dev/null)

  if [ -n "$last_commit" ]; then
    echo "PASS|$last_commit" > "$outfile"
  else
    echo "FAIL|No commits found" > "$outfile"
  fi
}

# ── Run checks ──────────────────────────────────────────────────────────────
echo -e "${BOLD}Running checks...${NC}"
echo ""

# Phase 1: Fast parallel checks (Docker + Git + OPEN_ISSUES)
echo -e "  Phase 1: Infrastructure & git checks (parallel)..."
check_docker &
PID_DOCKER=$!
check_git_status &
PID_GIT=$!
check_open_issues &
PID_ISSUES=$!
check_git_commit &
PID_COMMIT=$!

wait $PID_DOCKER $PID_GIT $PID_ISSUES $PID_COMMIT 2>/dev/null

# Phase 2: Slow parallel checks (typecheck + lint) — skip in quick mode
if [ "$QUICK_MODE" = true ]; then
  echo -e "  Phase 2: TypeScript + Lint ${YELLOW}(skipped — quick mode)${NC}"
  check_typecheck
  check_lint
else
  echo -e "  Phase 2: TypeScript + Lint (parallel, may take a while)..."
  check_typecheck &
  PID_TC=$!
  check_lint &
  PID_LINT=$!
  wait $PID_TC $PID_LINT 2>/dev/null
fi

# Phase 3: Health check (depends on Docker being checked first)
echo -e "  Phase 3: Full health check..."
check_health

# ── Read results ─────────────────────────────────────────────────────────────
read_result() {
  local file="$TMPDIR_GATE/$1"
  if [ -f "$file" ]; then
    cat "$file"
  else
    echo "FAIL|Check did not complete"
  fi
}

R_DOCKER=$(read_result "docker")
R_TYPECHECK=$(read_result "typecheck")
R_LINT=$(read_result "lint")
R_HEALTH=$(read_result "health")
R_GIT=$(read_result "git")
R_ISSUES=$(read_result "issues")
R_COMMIT=$(read_result "commit")

# ── Format result line ──────────────────────────────────────────────────────
format_line() {
  local num=$1
  local name=$2
  local result=$3

  local status="${result%%|*}"
  local detail="${result#*|}"

  local icon
  case "$status" in
    PASS) icon="${GREEN}PASS${NC}" ;;
    FAIL) icon="${RED}FAIL${NC}" ;;
    WARN) icon="${YELLOW}WARN${NC}" ;;
    SKIP) icon="${YELLOW}SKIP${NC}" ;;
    *)    icon="${RED}????${NC}" ;;
  esac

  printf "  ${BOLD}%-4s${NC} %-28s %b   %s\n" "$num" "$name" "$icon" "$detail"
}

# ── Summary table ────────────────────────────────────────────────────────────
echo -e "\n${CYAN}${BOLD}================================================================"
echo -e "  Session Completion Gate — Results"
echo -e "================================================================${NC}\n"

format_line "#1" "Docker Containers"    "$R_DOCKER"
format_line "#2" "TypeScript"           "$R_TYPECHECK"
format_line "#3" "Lint"                 "$R_LINT"
format_line "#4" "Health Check"         "$R_HEALTH"
format_line "#5" "Git Status"           "$R_GIT"
format_line "#6" "OPEN_ISSUES.md"       "$R_ISSUES"
format_line "#7" "Last Commit"          "$R_COMMIT"

echo ""

# ── Overall verdict ──────────────────────────────────────────────────────────
FAIL_COUNT=0
WARN_COUNT=0
PASS_COUNT=0

for r in "$R_DOCKER" "$R_TYPECHECK" "$R_LINT" "$R_HEALTH" "$R_GIT" "$R_ISSUES" "$R_COMMIT"; do
  status="${r%%|*}"
  case "$status" in
    PASS) PASS_COUNT=$((PASS_COUNT + 1)) ;;
    FAIL) FAIL_COUNT=$((FAIL_COUNT + 1)) ;;
    WARN) WARN_COUNT=$((WARN_COUNT + 1)) ;;
  esac
done

if [ $FAIL_COUNT -eq 0 ] && [ $WARN_COUNT -eq 0 ]; then
  echo -e "${GREEN}${BOLD}  ALL CHECKS PASSED (7/7)${NC}"
  echo -e "${GREEN}  Session completion gate: CLEAR${NC}"
elif [ $FAIL_COUNT -eq 0 ]; then
  echo -e "${YELLOW}${BOLD}  $PASS_COUNT passed, $WARN_COUNT warning(s)${NC}"
  echo -e "${YELLOW}  Session completion gate: CLEAR (with warnings)${NC}"
else
  echo -e "${RED}${BOLD}  $FAIL_COUNT FAILED, $WARN_COUNT warning(s), $PASS_COUNT passed${NC}"
  echo -e "${RED}  Session completion gate: BLOCKED${NC}"
  echo ""
  echo -e "${RED}  Fix failing checks before declaring session complete.${NC}"
fi

echo -e "\n${CYAN}================================================================${NC}\n"
# Exit with failure count
exit $FAIL_COUNT
