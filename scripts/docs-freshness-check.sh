#!/usr/bin/env bash
# docs-freshness-check.sh — Fail CI if key documentation is stale.
#
# "Stale" means the doc was not updated within STALENESS_DAYS of the
# most recent feat/fix commit in the repository.
#
# Exit codes:
#   0 — all docs are fresh (or only non-critical docs have warnings)
#   1 — at least one CRITICAL doc is stale

set -euo pipefail

STALENESS_DAYS="${STALENESS_DAYS:-7}"

# ── Monitored documents ──────────────────────────────────────────────
# Format: "path|critical"  (critical = yes | no)
DOCS=(
  "CHANGELOG.md|yes"
  "API_CONTRACTS_GRAPHQL_FEDERATION.md|yes"
  "docs/INDEX.md|no"
  "docs/testing/TEST_REGISTRY.md|no"
  "docs/project/PROJECT_STATUS.md|no"
)

# ── Helpers ──────────────────────────────────────────────────────────
epoch_of() {
  # Return the unix timestamp of the most recent commit that touched $1.
  # Returns 0 if the file has never been committed.
  local ts
  ts=$(git log -1 --format='%ct' -- "$1" 2>/dev/null || true)
  echo "${ts:-0}"
}

latest_feat_fix_epoch() {
  # Return the unix timestamp of the most recent feat/ or fix/ commit
  # anywhere in the repo (conventional-commit prefix in subject line).
  local ts
  ts=$(git log -1 --format='%ct' --grep='^feat' --grep='^fix' --all-match=false -- 2>/dev/null || true)
  # --all-match=false is default; git log ORs multiple --grep patterns.
  # Fallback: scan with extended regex if the above returns empty.
  if [ -z "$ts" ]; then
    ts=$(git log -1 --format='%ct' --extended-regexp --grep='^(feat|fix)' 2>/dev/null || true)
  fi
  echo "${ts:-0}"
}

human_date() {
  # Cross-platform date formatting (GNU coreutils on Linux, busybox, macOS).
  if date -d "@$1" '+%Y-%m-%d' 2>/dev/null; then
    return
  fi
  # macOS / BSD date
  date -r "$1" '+%Y-%m-%d' 2>/dev/null || echo "epoch:$1"
}

# ── Main ─────────────────────────────────────────────────────────────
LATEST_CODE_EPOCH=$(latest_feat_fix_epoch)

if [ "$LATEST_CODE_EPOCH" = "0" ]; then
  echo "No feat/fix commits found in history — nothing to check."
  exit 0
fi

THRESHOLD=$(( STALENESS_DAYS * 86400 ))
HAS_CRITICAL_STALE=0
HAS_WARNING=0

echo "============================================="
echo "  Documentation Freshness Check"
echo "============================================="
echo ""
echo "Latest feat/fix commit: $(human_date "$LATEST_CODE_EPOCH")"
echo "Staleness threshold:    ${STALENESS_DAYS} days"
echo ""

for entry in "${DOCS[@]}"; do
  DOC_PATH="${entry%%|*}"
  IS_CRITICAL="${entry##*|}"

  if [ ! -f "$DOC_PATH" ]; then
    LABEL="MISSING"
    if [ "$IS_CRITICAL" = "yes" ]; then
      LABEL="MISSING (CRITICAL)"
      HAS_CRITICAL_STALE=1
    else
      HAS_WARNING=1
    fi
    printf "  %-50s  %s\n" "$DOC_PATH" "$LABEL"
    continue
  fi

  DOC_EPOCH=$(epoch_of "$DOC_PATH")

  if [ "$DOC_EPOCH" = "0" ]; then
    # File exists on disk but has never been committed.
    LABEL="UNTRACKED"
    if [ "$IS_CRITICAL" = "yes" ]; then
      HAS_CRITICAL_STALE=1
      LABEL="UNTRACKED (CRITICAL)"
    else
      HAS_WARNING=1
    fi
    printf "  %-50s  %s\n" "$DOC_PATH" "$LABEL"
    continue
  fi

  GAP=$(( LATEST_CODE_EPOCH - DOC_EPOCH ))

  if [ "$GAP" -gt "$THRESHOLD" ]; then
    DAYS_BEHIND=$(( GAP / 86400 ))
    if [ "$IS_CRITICAL" = "yes" ]; then
      printf "  %-50s  STALE (CRITICAL) — %d days behind\n" "$DOC_PATH" "$DAYS_BEHIND"
      HAS_CRITICAL_STALE=1
    else
      printf "  %-50s  WARNING — %d days behind\n" "$DOC_PATH" "$DAYS_BEHIND"
      HAS_WARNING=1
    fi
  else
    printf "  %-50s  OK (last updated %s)\n" "$DOC_PATH" "$(human_date "$DOC_EPOCH")"
  fi
done

echo ""

if [ "$HAS_CRITICAL_STALE" -eq 1 ]; then
  echo "FAILED: One or more critical docs are stale or missing."
  echo "Update them and commit before merging."
  exit 1
fi

if [ "$HAS_WARNING" -eq 1 ]; then
  echo "PASSED with warnings: Some non-critical docs may need attention."
  exit 0
fi

echo "PASSED: All monitored docs are fresh."
exit 0
