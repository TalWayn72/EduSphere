#!/usr/bin/env bash

# EduSphere Discovery Wave Automation
# Automates the 3-wave bug discovery process from the Bug Fix Protocol.
#
# Usage:
#   ./scripts/discovery-wave.sh "pattern" [--wave 1|2|3|all]
#
# Examples:
#   ./scripts/discovery-wave.sh "setInterval"
#   ./scripts/discovery-wave.sh "error.message" --wave 2
#   ./scripts/discovery-wave.sh "useSubscription" --wave all

set -uo pipefail

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
CYAN='\033[0;36m'; BOLD='\033[1m'; NC='\033[0m'
PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
GREP_EXCLUDES="--exclude-dir=node_modules --exclude-dir=dist --exclude-dir=.turbo --exclude-dir=coverage"

if [ $# -lt 1 ]; then
  echo "Usage: $0 \"pattern\" [--wave 1|2|3|all]"; exit 1
fi
PATTERN="$1"; WAVE="all"; shift
while [ $# -gt 0 ]; do
  case "$1" in --wave) WAVE="$2"; shift 2 ;; *) echo "Unknown: $1"; exit 1 ;; esac
done

DISCOVERY_LIST=()
WAVE1_COUNT=0; WAVE1_FILES=0; WAVE2_COUNT=0
WAVE2_DIRS_CHECKED=0; WAVE2_DIRS_HIT=0; WAVE3_COUNT=0
add_to_list() { DISCOVERY_LIST+=("$1"); }

run_wave1() {
  echo -e "\n${BOLD}${CYAN}━━━ WAVE 1: Exact Match ━━━${NC}"
  echo -e "Pattern: ${YELLOW}${PATTERN}${NC}\n"
  local RESULTS
  RESULTS=$(grep -rn "$PATTERN" "$PROJECT_ROOT/apps/" "$PROJECT_ROOT/packages/" "$PROJECT_ROOT/tests/" \
    --include="*.ts" --include="*.tsx" $GREP_EXCLUDES 2>/dev/null || true)

  if [ -z "$RESULTS" ]; then
    echo -e "  ${YELLOW}No exact matches found.${NC}"
    WAVE1_COUNT=0
    WAVE1_FILES=0
    return
  fi

  WAVE1_COUNT=$(echo "$RESULTS" | wc -l)
  WAVE1_FILES=$(echo "$RESULTS" | cut -d: -f1 | sort -u | wc -l)

  echo -e "  ${GREEN}Found ${WAVE1_COUNT} matches in ${WAVE1_FILES} files:${NC}\n"

  # Group by file, show file header + matching lines
  local PREV_FILE=""
  while IFS= read -r line; do
    local FILE="${line%%:*}"; local REST="${line#*:}"; local REL_FILE="${FILE#"$PROJECT_ROOT"/}"
    [ "$FILE" != "$PREV_FILE" ] && echo -e "  ${BOLD}${REL_FILE}${NC}" && PREV_FILE="$FILE"
    local LINENO="${REST%%:*}"; local CODE="${REST#*:}"
    echo -e "    ${CYAN}${LINENO}${NC}: ${CODE}"
    add_to_list "${REL_FILE}:${LINENO} — exact match"
  done <<< "$RESULTS"
}

check_dir() {
  local DIR_PATH="$1"; local DIR_LABEL="$2"
  WAVE2_DIRS_CHECKED=$((WAVE2_DIRS_CHECKED + 1))
  if [ ! -d "$PROJECT_ROOT/$DIR_PATH" ]; then
    printf "  %-50s ${YELLOW}— (dir not found)${NC}\n" "$DIR_LABEL"; return
  fi
  local HITS
  HITS=$(grep -rn "$PATTERN" "$PROJECT_ROOT/$DIR_PATH" \
    --include="*.ts" --include="*.tsx" --exclude-dir=node_modules --exclude-dir=dist \
    2>/dev/null || true)
  local COUNT=0
  [ -n "$HITS" ] && COUNT=$(echo "$HITS" | wc -l)

  if [ "$COUNT" -gt 0 ]; then
    WAVE2_DIRS_HIT=$((WAVE2_DIRS_HIT + 1))
    WAVE2_COUNT=$((WAVE2_COUNT + COUNT))
    printf "  ${GREEN}[+]${NC} %-48s ${GREEN}%d matches${NC}\n" "$DIR_LABEL" "$COUNT"

    while IFS= read -r line; do
      local FILE="${line%%:*}"; local REST="${line#*:}"; local LINENO="${REST%%:*}"
      add_to_list "${FILE#"$PROJECT_ROOT"/}:${LINENO} — similarity (${DIR_LABEL})"
    done <<< "$HITS"
  else
    printf "  ${YELLOW}[ ]${NC} %-48s ${YELLOW}clean${NC}\n" "$DIR_LABEL"
  fi
}

run_wave2() {
  echo -e "\n${BOLD}${CYAN}━━━ WAVE 2: Similarity Search (Mandatory Dirs) ━━━${NC}"
  echo -e "Pattern: ${YELLOW}${PATTERN}${NC}\n"
  check_dir "apps/web/src/pages"                "apps/web/src/pages/"
  check_dir "apps/web/src/hooks"                "apps/web/src/hooks/"
  check_dir "apps/web/src/components"           "apps/web/src/components/"
  check_dir "apps/mobile/src"                   "apps/mobile/src/"
  check_dir "apps/subgraph-core/src"            "subgraph-core/src/"
  check_dir "apps/subgraph-content/src"         "subgraph-content/src/"
  check_dir "apps/subgraph-annotation/src"      "subgraph-annotation/src/"
  check_dir "apps/subgraph-collaboration/src"   "subgraph-collaboration/src/"
  check_dir "apps/subgraph-agent/src"           "subgraph-agent/src/"
  check_dir "apps/subgraph-knowledge/src"       "subgraph-knowledge/src/"

  # Resolver files across all subgraphs
  echo -e "\n  ${BOLD}Resolver files:${NC}"
  local RESOLVER_HITS
  RESOLVER_HITS=$(grep -rn "$PATTERN" "$PROJECT_ROOT/apps/" \
    --include="*.resolver.ts" --exclude-dir=node_modules --exclude-dir=dist 2>/dev/null || true)
  if [ -n "$RESOLVER_HITS" ]; then
    local RCOUNT; RCOUNT=$(echo "$RESOLVER_HITS" | wc -l)
    echo -e "  ${GREEN}[+]${NC} *.resolver.ts files                              ${GREEN}${RCOUNT} matches${NC}"
    while IFS= read -r line; do
      local FILE="${line%%:*}"; local REST="${line#*:}"; local LINENO="${REST%%:*}"
      add_to_list "${FILE#"$PROJECT_ROOT"/}:${LINENO} — resolver pattern"
    done <<< "$RESOLVER_HITS"
  else
    echo -e "  ${YELLOW}[ ]${NC} *.resolver.ts files                              ${YELLOW}clean${NC}"
  fi
  echo -e "\n  Dirs checked: ${WAVE2_DIRS_CHECKED} | Dirs with matches: ${WAVE2_DIRS_HIT}"
}

run_wave3() {
  echo -e "\n${BOLD}${CYAN}━━━ WAVE 3: Class of Bug ━━━${NC}"
  local CLASS_PATTERN="" CLASS_DESC=""
  case "$PATTERN" in
    *setInterval*|*setTimeout*)      CLASS_PATTERN="(setInterval|setTimeout|clearInterval|clearTimeout)"; CLASS_DESC="Timer usage — check cleanup" ;;
    *useSubscription*|*useQuery*|*useMutation*) CLASS_PATTERN="(useSubscription|useQuery|useMutation|useFragment)"; CLASS_DESC="GraphQL hooks — check cache/unmount" ;;
    *error.message*|*\.message*)     CLASS_PATTERN="(error\.message|err\.message|\.message\b)"; CLASS_DESC="Error message rendering — check sanitization" ;;
    *console.log*|*console.error*)   CLASS_PATTERN="console\.(log|error|warn|debug|info)"; CLASS_DESC="Console usage — should use Pino" ;;
    *new\ Pool*|*createPool*)        CLASS_PATTERN="(new Pool|createPool|pg\.connect)"; CLASS_DESC="Direct DB pool — use getOrCreatePool()" ;;
    *addEventListener*)              CLASS_PATTERN="(addEventListener|removeEventListener)"; CLASS_DESC="Event listeners — check cleanup" ;;
    *)                               CLASS_PATTERN="$PATTERN"; CLASS_DESC="Same pattern class" ;;
  esac
  echo -e "Class: ${YELLOW}${CLASS_DESC}${NC}"
  echo -e "Search: ${YELLOW}${CLASS_PATTERN}${NC}\n"

  local RESULTS
  RESULTS=$(grep -rn -E "$CLASS_PATTERN" "$PROJECT_ROOT/apps/" "$PROJECT_ROOT/packages/" \
    --include="*.ts" --include="*.tsx" $GREP_EXCLUDES \
    --exclude="*.spec.ts" --exclude="*.test.ts" --exclude="*.test.tsx" 2>/dev/null || true)
  if [ -z "$RESULTS" ]; then
    echo -e "  ${YELLOW}No class-of-bug instances found.${NC}"; WAVE3_COUNT=0; return
  fi
  WAVE3_COUNT=$(echo "$RESULTS" | wc -l)
  local FILE_COUNT; FILE_COUNT=$(echo "$RESULTS" | cut -d: -f1 | sort -u | wc -l)
  echo -e "  ${GREEN}Found ${WAVE3_COUNT} instances in ${FILE_COUNT} files:${NC}\n"
  local PREV_FILE=""
  while IFS= read -r line; do
    local FILE="${line%%:*}"; local REST="${line#*:}"; local REL_FILE="${FILE#"$PROJECT_ROOT"/}"
    [ "$FILE" != "$PREV_FILE" ] && echo -e "  ${BOLD}${REL_FILE}${NC}" && PREV_FILE="$FILE"
    local LINENO="${REST%%:*}"; local CODE="${REST#*:}"
    CODE="$(echo "$CODE" | sed 's/^[[:space:]]*//')"
    echo -e "    ${CYAN}${LINENO}${NC}: ${CODE}"
    add_to_list "${REL_FILE}:${LINENO} — class-of-bug (${CLASS_DESC})"
  done <<< "$RESULTS"
}

# ── Run Waves ──────────────────────────────────────────────────────────────
echo -e "${BOLD}═══════════════════════════════════════════════════${NC}"
echo -e "${BOLD} DISCOVERY WAVE AUTOMATION — EduSphere${NC}"
echo -e "${BOLD}═══════════════════════════════════════════════════${NC}"
echo -e "Pattern: ${YELLOW}${PATTERN}${NC}"
echo -e "Wave:    ${CYAN}${WAVE}${NC}"
echo -e "Root:    ${PROJECT_ROOT}"

case "$WAVE" in
  1)   run_wave1 ;;
  2)   run_wave2 ;;
  3)   run_wave3 ;;
  all) run_wave1; run_wave2; run_wave3 ;;
  *)   echo "Invalid wave: $WAVE (use 1, 2, 3, or all)"; exit 1 ;;
esac

# ── Summary Report ─────────────────────────────────────────────────────────
echo ""
echo -e "${BOLD}═══════════════════════════════════════════════════${NC}"
echo -e "${BOLD} DISCOVERY WAVE REPORT${NC}"
echo -e "${BOLD}═══════════════════════════════════════════════════${NC}"

if [ "$WAVE" = "all" ] || [ "$WAVE" = "1" ]; then
  echo -e "Wave 1: ${GREEN}${WAVE1_COUNT}${NC} exact matches in ${GREEN}${WAVE1_FILES}${NC} files"
fi
if [ "$WAVE" = "all" ] || [ "$WAVE" = "2" ]; then
  echo -e "Wave 2: ${GREEN}${WAVE2_DIRS_CHECKED}/${WAVE2_DIRS_CHECKED} dirs checked${NC} — ${GREEN}${WAVE2_COUNT}${NC} similar patterns"
fi
if [ "$WAVE" = "all" ] || [ "$WAVE" = "3" ]; then
  echo -e "Wave 3: ${GREEN}${WAVE3_COUNT}${NC} class-of-bug instances"
fi

TOTAL=${#DISCOVERY_LIST[@]}
echo ""
echo -e "${BOLD}═══ DISCOVERY LIST (${TOTAL} items) ═══${NC}"

if [ "$TOTAL" -eq 0 ]; then
  echo -e "  ${GREEN}No issues found — pattern is clean.${NC}"
else
  declare -A SEEN
  IDX=1
  for item in "${DISCOVERY_LIST[@]}"; do
    KEY="${item%% —*}"
    if [ -z "${SEEN[$KEY]+x}" ]; then
      SEEN[$KEY]=1
      printf "  ${CYAN}%3d.${NC} %s\n" "$IDX" "$item"
      IDX=$((IDX + 1))
    fi
  done
fi

echo -e "\n${BOLD}═══════════════════════════════════════════════════${NC}"

# Exit with count for scripting use
if [ "$TOTAL" -gt 0 ]; then
  exit 1
else
  exit 0
fi
