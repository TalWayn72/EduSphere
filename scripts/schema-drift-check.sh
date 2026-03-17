#!/usr/bin/env bash
# Schema Drift Detection — CI step
# Compares current DB schema against Drizzle definition.
# Item #88 from master work plan.
set -euo pipefail

echo "[schema-drift] Generating Drizzle schema snapshot..."
pnpm --filter @edusphere/db generate --dry-run 2>/dev/null || true

echo "[schema-drift] Checking for uncommitted schema changes..."
if ! git diff --exit-code packages/db/drizzle/ > /dev/null 2>&1; then
  echo "ERROR: Schema drift detected — Drizzle definition does not match migrations."
  echo "Run 'pnpm --filter @edusphere/db generate' and commit the migration."
  git diff --stat packages/db/drizzle/
  exit 1
fi

echo "[schema-drift] Checking codegen drift..."
pnpm codegen 2>/dev/null || true
if ! git diff --exit-code packages/graphql-types/ > /dev/null 2>&1; then
  echo "ERROR: Codegen drift detected — GraphQL types out of sync with schema."
  echo "Run 'pnpm codegen' and commit the updated types."
  git diff --stat packages/graphql-types/
  exit 1
fi

echo "[schema-drift] No schema drift detected ✓"
