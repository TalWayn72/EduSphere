#!/usr/bin/env bash
# pre-compact.sh — PreCompact hook (auto matcher)
# Updates primer.md timestamp and maintains compaction-log.txt.
# Outputs nothing to stdout (minimal stderr status only).
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
PRIMER="$PROJECT_ROOT/docs/memory/primer.md"
LOG="$PROJECT_ROOT/docs/memory/compaction-log.txt"

cd "$PROJECT_ROOT"

TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

# ── Update primer.md timestamp ────────────────────────────────────────────────
if [[ -f "$PRIMER" ]]; then
  # Replace or append "Last Updated:" line near top
  if grep -q "^Last Updated:" "$PRIMER"; then
    # Use a temp file to avoid in-place sed issues on Windows/Git Bash
    TMP=$(mktemp)
    sed "s/^Last Updated:.*/Last Updated: $TIMESTAMP/" "$PRIMER" > "$TMP"
    mv "$TMP" "$PRIMER"
  else
    # Prepend timestamp after first line (title)
    TMP=$(mktemp)
    awk -v ts="$TIMESTAMP" 'NR==1{print; print "Last Updated: " ts; next} {print}' "$PRIMER" > "$TMP"
    mv "$TMP" "$PRIMER"
  fi

  # Append compaction marker
  echo "" >> "$PRIMER"
  echo "<!-- PreCompact auto-save: $TIMESTAMP -->" >> "$PRIMER"
  echo "[pre-compact] primer.md updated at $TIMESTAMP" >&2
else
  echo "[pre-compact] primer.md not found — skipping timestamp update" >&2
fi

# ── Maintain compaction-log.txt (keep last 20 entries) ───────────────────────
mkdir -p "$(dirname "$LOG")"
echo "$TIMESTAMP  PreCompact hook fired" >> "$LOG"

# Keep only the last 20 lines
if [[ -f "$LOG" ]]; then
  TMP=$(mktemp)
  tail -20 "$LOG" > "$TMP"
  mv "$TMP" "$LOG"
fi

echo "[pre-compact] compaction-log.txt updated ($LOG)" >&2
