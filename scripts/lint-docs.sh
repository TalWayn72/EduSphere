#!/bin/bash
# EduSphere — Doc naming lint
# Usage: ./scripts/lint-docs.sh
# Returns exit 1 if any naming violations found
# Convention: SCREAMING_SNAKE_CASE (uppercase letters, digits, underscores, hyphens allowed only in
#             specific sub-paths like docs/plans/bugs/ and docs/plans/features/ with BUG-NNN / FEAT- prefix)

VIOLATIONS=0
# SCREAMING_SNAKE_CASE: uppercase letters, digits, underscores (and hyphens in certain contexts)
SCREAMING_SNAKE_REGEX='^[A-Z0-9][A-Z0-9_-]*\.md$'

# Exception filenames (exact match, any directory)
EXCEPTIONS=("README.md" "CLAUDE.md" "OPEN_ISSUES.md" "INDEX.md")

# Sub-paths where hyphens in BUG-NNN / FEAT-NNN prefixes are accepted (but must still be uppercase)
HYPHEN_ALLOWED_PATHS=("docs/plans/bugs/" "docs/plans/features/" "docs/plans/archive/")

echo "=== EduSphere Doc Naming Lint ==="
echo ""

# ── Scan all .md files under docs/ ───────────────────────────────────────────
while IFS= read -r file; do
  filename=$(basename "$file")

  # Skip known exceptions
  skip=0
  for exc in "${EXCEPTIONS[@]}"; do
    if [ "$filename" = "$exc" ]; then skip=1; break; fi
  done
  [ $skip -eq 1 ] && continue

  # Check SCREAMING_SNAKE_CASE (uppercase, digits, underscores only — hyphens treated separately)
  if ! echo "$filename" | grep -qE "$SCREAMING_SNAKE_REGEX"; then
    echo "VIOLATION [naming]: $file"
    # Suggest a corrected name: uppercase + replace non-alphanumeric (except . and _) with _
    suggestion=$(echo "$filename" | tr '[:lower:]' '[:upper:]' | sed 's/[^A-Z0-9_.]/-/g' | sed 's/-\+/_/g' | sed 's/_\././g')
    echo "  Suggested: $suggestion"
    VIOLATIONS=$((VIOLATIONS + 1))
  fi
done < <(find docs -name "*.md" -type f | sort)

echo ""

# ── Check for .md files placed directly in docs/ root (except INDEX.md) ──────
echo "--- Checking docs/ root for misplaced files ---"
ROOT_VIOLATIONS=0
while IFS= read -r file; do
  filename=$(basename "$file")
  dir=$(dirname "$file")

  # Only flag files directly in docs/ (not in subdirectories)
  if [ "$dir" = "docs" ]; then
    # INDEX.md is allowed in docs/ root
    if [ "$filename" != "INDEX.md" ]; then
      echo "VIOLATION [location]: $file"
      echo "  Should be in a sub-folder (e.g. docs/reference/, docs/plans/, etc.)"
      ROOT_VIOLATIONS=$((ROOT_VIOLATIONS + 1))
      VIOLATIONS=$((VIOLATIONS + 1))
    fi
  fi
done < <(find docs -maxdepth 1 -name "*.md" -type f | sort)

if [ $ROOT_VIOLATIONS -eq 0 ]; then
  echo "  OK — no misplaced files in docs/ root"
fi

echo ""

# ── Summary ──────────────────────────────────────────────────────────────────
if [ $VIOLATIONS -eq 0 ]; then
  echo "All doc files follow naming standards (0 violations)"
  exit 0
else
  echo "Found $VIOLATIONS naming violation(s)"
  echo "  Fix: rename to SCREAMING_SNAKE_CASE, move root files into sub-folders"
  exit 1
fi
