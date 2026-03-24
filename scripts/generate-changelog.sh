#!/bin/bash
# Generate CHANGELOG.md from conventional commits
# Usage:
#   ./scripts/generate-changelog.sh          # Full regeneration (all history)
#   ./scripts/generate-changelog.sh --latest # Only latest release (for CI)
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
CHANGELOG_FILE="${PROJECT_ROOT}/CHANGELOG.md"

# Check if conventional-changelog-cli is available
if ! command -v conventional-changelog &>/dev/null && ! npx --no -- conventional-changelog --help &>/dev/null 2>&1; then
  echo "Installing conventional-changelog-cli..."
  npm install -g conventional-changelog-cli
fi

if [[ "${1:-}" == "--latest" ]]; then
  # Append only the latest release (used in CI on tag push)
  echo "Generating changelog for latest release only..."
  npx --yes conventional-changelog-cli -p angular -i "$CHANGELOG_FILE" -s -r 1
else
  # Full regeneration from all commits
  echo "Regenerating full changelog from commit history..."
  npx --yes conventional-changelog-cli -p angular -i "$CHANGELOG_FILE" -s -r 0
fi

echo "Changelog updated: $CHANGELOG_FILE"
