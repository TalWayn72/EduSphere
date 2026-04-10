#!/usr/bin/env bash
# session-resume-compact.sh — SessionStart hook (compact matcher)
# Same as session-start.sh but with a compaction-recovery notice prepended.
# Output is truncated at 8,000 chars.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "[CONTEXT RECOVERED AFTER COMPACTION — primer.md has last known state]"
echo ""

# Delegate to session-start.sh to avoid duplication
exec "$SCRIPT_DIR/session-start.sh"
