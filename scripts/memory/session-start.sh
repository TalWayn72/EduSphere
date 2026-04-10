#!/usr/bin/env bash
# session-start.sh — SessionStart hook (startup | resume)
# Outputs git context + primer.md contents to stdout (injected into Claude context)
# Output is truncated at 8,000 chars.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
PRIMER="$PROJECT_ROOT/docs/memory/primer.md"

cd "$PROJECT_ROOT"

# ── Layer 3: Git Context ──────────────────────────────────────────────────────
echo "=== EduSphere Memory Layer 3: Git Context ==="

BRANCH=$(git branch --show-current 2>/dev/null || echo "unknown")
echo "Branch: $BRANCH"

echo "Last 5 commits:"
git log --oneline -5 2>/dev/null | sed 's/^/  /' || echo "  (no commits)"

MODIFIED=$(git diff --name-only 2>/dev/null | wc -l | tr -d ' ')
UNTRACKED=$(git ls-files --others --exclude-standard 2>/dev/null | wc -l | tr -d ' ')
echo "Modified: $MODIFIED files | Untracked: $UNTRACKED files"

# Summarize modified areas by top-level directory
echo "Key areas:"
{
  git diff --name-only 2>/dev/null
  git diff --cached --name-only 2>/dev/null
} | awk -F/ '{
    if (NF >= 3) key = $1"/"$2
    else key = $1
    counts[key]++
  }
  END {
    for (k in counts) print counts[k], k
  }' | sort -rn | head -10 | while read -r count dir; do
  echo "  $dir: $count files"
done

echo ""

# ── Layer 2: Session Primer ───────────────────────────────────────────────────
echo "=== EduSphere Memory Layer 2: Session Primer ==="
if [[ -f "$PRIMER" ]]; then
  cat "$PRIMER"
else
  echo "(docs/memory/primer.md not found — first run or not yet created)"
fi
