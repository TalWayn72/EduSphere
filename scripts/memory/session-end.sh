#!/usr/bin/env bash
# session-end.sh — Stop hook
# 1. Appends a git snapshot section to docs/memory/primer.md
# 2. Warns about stale memory files (>60 days old)
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
PRIMER="$PROJECT_ROOT/docs/memory/primer.md"
MEMORY_DIR="C:/Users/P0039217/.claude/projects/c--Users-P0039217--claude-projects-EduSphere/memory"

cd "$PROJECT_ROOT"

TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

# ── Git Snapshot ──────────────────────────────────────────────────────────────
BRANCH=$(git branch --show-current 2>/dev/null || echo "unknown")
LAST_COMMIT=$(git log --oneline -1 2>/dev/null || echo "none")
MODIFIED=$(git diff --name-only 2>/dev/null | wc -l | tr -d ' ')
UNTRACKED=$(git ls-files --others --exclude-standard 2>/dev/null | wc -l | tr -d ' ')

# Ensure primer.md exists before appending
mkdir -p "$(dirname "$PRIMER")"
if [[ ! -f "$PRIMER" ]]; then
  echo "# EduSphere Session Primer" > "$PRIMER"
  echo "" >> "$PRIMER"
fi

cat >> "$PRIMER" <<EOF

## Git Snapshot (auto — Stop hook)
- Branch: $BRANCH
- Last commit: $LAST_COMMIT
- Modified: $MODIFIED files | Untracked: $UNTRACKED files
- Timestamp: $TIMESTAMP
EOF

echo "[session-end] Git snapshot appended to primer.md" >&2

# ── Staleness Check on Memory Files ──────────────────────────────────────────
STALE_THRESHOLD=60  # days

if [[ -d "$MEMORY_DIR" ]]; then
  NOW_EPOCH=$(date -u +%s)
  THRESHOLD_SECS=$((STALE_THRESHOLD * 86400))

  while IFS= read -r -d '' file; do
    filename=$(basename "$file")
    # Get last modified time in epoch seconds (Git Bash / GNU stat)
    mod_epoch=$(stat -c "%Y" "$file" 2>/dev/null || echo "0")
    if [[ "$mod_epoch" -eq 0 ]]; then
      continue
    fi
    age_secs=$(( NOW_EPOCH - mod_epoch ))
    age_days=$(( age_secs / 86400 ))
    if [[ "$age_days" -gt "$STALE_THRESHOLD" ]]; then
      echo "[STALE] $filename — last modified $age_days days ago" >&2
    fi
  done < <(find "$MEMORY_DIR" -maxdepth 1 -name "*.md" -print0 2>/dev/null)
else
  echo "[session-end] Memory dir not found: $MEMORY_DIR" >&2
fi

echo "[session-end] Done at $TIMESTAMP" >&2
