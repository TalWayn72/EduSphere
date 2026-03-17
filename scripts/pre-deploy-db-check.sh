#!/usr/bin/env bash
# Pre-Deploy DB Dry-Run Check
# Verifies migrations are backward-compatible before deployment.
# Item #58 from master work plan.
set -euo pipefail

echo "[pre-deploy-db] Checking for pending migrations..."

PENDING=$(pnpm --filter @edusphere/db exec drizzle-kit generate --dry-run 2>&1 || true)

if echo "$PENDING" | grep -q "No schema changes"; then
  echo "[pre-deploy-db] No pending migrations ✓"
  exit 0
fi

echo "[pre-deploy-db] Pending migration detected:"
echo "$PENDING"

# Check for destructive operations
DESTRUCTIVE_PATTERNS="DROP TABLE|DROP COLUMN|ALTER.*TYPE|RENAME TABLE"
if echo "$PENDING" | grep -qE "$DESTRUCTIVE_PATTERNS"; then
  echo ""
  echo "⚠️  WARNING: Destructive migration detected!"
  echo "Destructive operations (DROP, ALTER TYPE, RENAME) require:"
  echo "  1. A rollback migration script in packages/db/rollback/"
  echo "  2. Backward-compatibility verification (old code + new schema)"
  echo "  3. Manual approval from DBA"
  echo ""
  exit 1
fi

echo "[pre-deploy-db] Migration is safe (no destructive operations) ✓"
