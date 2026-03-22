#!/usr/bin/env bash
# build-org-app.sh — Build a white-label mobile app for a specific organization.
#
# Usage:
#   ./scripts/build-org-app.sh <slug> [platform]
#
# Arguments:
#   slug      — Organization slug (e.g., "acme-corp")
#   platform  — "ios", "android", or "all" (default: "all")
#
# The script fetches branding from the GraphQL API, sets environment
# variables, and runs EAS Build with the org-build profile.

set -euo pipefail

SLUG="${1:?Usage: $0 <org-slug> [ios|android|all]}"
PLATFORM="${2:-all}"
GRAPHQL_URL="${GRAPHQL_URL:-http://localhost:4000/graphql}"

echo "=== Building white-label app for org: ${SLUG} ==="

# Fetch branding from GraphQL API
QUERY='{"query":"query TenantBranding($slug: String) { tenantBranding(slug: $slug) { organizationName logoUrl primaryColor } }","variables":{"slug":"'"${SLUG}"'"}}'

BRANDING_RESPONSE=$(curl -s -X POST "${GRAPHQL_URL}" \
  -H "Content-Type: application/json" \
  -d "${QUERY}" 2>/dev/null || echo '{}')

# Extract org name (fallback to slug if API unavailable)
ORG_NAME=$(echo "${BRANDING_RESPONSE}" | node -pe "
  try {
    const d = JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'));
    d.data?.tenantBranding?.organizationName || '${SLUG}';
  } catch { '${SLUG}'; }
" 2>/dev/null || echo "${SLUG}")

echo "Organization name: ${ORG_NAME}"

# Export env vars for app.config.js
export ORG_SLUG="${SLUG}"
export ORG_NAME="${ORG_NAME}"
export APP_VARIANT="org"
# ORG_ICON can be set externally if a custom icon is available
# export ORG_ICON="./assets/org-icons/${SLUG}-icon.png"

cd "$(dirname "$0")/../apps/mobile"

case "${PLATFORM}" in
  ios)
    echo "Building iOS..."
    npx eas build --profile org-build --platform ios --non-interactive
    ;;
  android)
    echo "Building Android..."
    npx eas build --profile org-build --platform android --non-interactive
    ;;
  all)
    echo "Building iOS + Android..."
    npx eas build --profile org-build --platform all --non-interactive
    ;;
  *)
    echo "Error: Unknown platform '${PLATFORM}'. Use ios, android, or all."
    exit 1
    ;;
esac

echo "=== Build submitted for ${SLUG} (${PLATFORM}) ==="
