#!/usr/bin/env bash
# EduSphere — Per-tenant Keycloak realm provisioner (G-20)
# Usage: ./scripts/provision-tenant-realm.sh <slug> <uuid> <display-name> <redirect-domain>
set -euo pipefail

TENANT_SLUG="${1:?Usage: $0 <slug> <uuid> <display-name> <redirect-domain>}"
TENANT_UUID="${2:?}"
DISPLAY_NAME="${3:?}"
REDIRECT_DOMAIN="${4:?}"
REALM_NAME="edusphere-${TENANT_SLUG}"

KEYCLOAK_URL="${KEYCLOAK_URL:-http://localhost:8080}"
KEYCLOAK_ADMIN="${KEYCLOAK_ADMIN:-admin}"
KEYCLOAK_ADMIN_PASSWORD="${KEYCLOAK_ADMIN_PASSWORD:?KEYCLOAK_ADMIN_PASSWORD env var required}"

echo "[INFO] Provisioning Keycloak realm: ${REALM_NAME} for tenant ${TENANT_UUID}"

# Authenticate
kcadm.sh config credentials \
  --server "${KEYCLOAK_URL}" \
  --realm master \
  --user "${KEYCLOAK_ADMIN}" \
  --password "${KEYCLOAK_ADMIN_PASSWORD}"

# Create realm with security hardening (G-12 brute force protection applied)
kcadm.sh create realms \
  -s "realm=${REALM_NAME}" \
  -s enabled=true \
  -s "displayName=${DISPLAY_NAME}" \
  -s bruteForceProtected=true \
  -s permanentLockout=false \
  -s maxFailureWaitSeconds=900 \
  -s minimumQuickLoginWaitSeconds=60 \
  -s waitIncrementSeconds=60 \
  -s quickLoginCheckMilliSeconds=1000 \
  -s maxDeltaTimeSeconds=43200 \
  -s failureFactor=5 \
  -s sslRequired=all \
  -s accessTokenLifespan=900 \
  -s ssoSessionIdleTimeout=1800 \
  -s ssoSessionMaxLifespan=36000

# Create confidential OIDC client
CLIENT_ID=$(kcadm.sh create clients -r "${REALM_NAME}" \
  -s clientId=edusphere-app \
  -s enabled=true \
  -s publicClient=false \
  -s standardFlowEnabled=true \
  -s directAccessGrantsEnabled=false \
  -s "redirectUris=[\"https://${REDIRECT_DOMAIN}/*\",\"https://${TENANT_SLUG}.edusphere.io/*\"]" \
  -s "webOrigins=[\"https://${REDIRECT_DOMAIN}\",\"https://${TENANT_SLUG}.edusphere.io\"]" \
  -i)

echo "[INFO] Created OIDC client ID: ${CLIENT_ID}"

# Add hardcoded tenant_id claim to JWT — prevents cross-tenant token reuse (G-20)
kcadm.sh create "clients/${CLIENT_ID}/protocol-mappers/models" -r "${REALM_NAME}" \
  -s name=tenant-id-claim \
  -s protocolMapper=oidc-hardcoded-claim-mapper \
  -s 'config={"claim.name":"tenant_id","claim.value":"'"${TENANT_UUID}"'","jsonType.label":"String","access.token.claim":"true","id.token.claim":"true","userinfo.token.claim":"true"}'

# Add roles: STUDENT, INSTRUCTOR, ORG_ADMIN, SUPER_ADMIN
for ROLE in STUDENT INSTRUCTOR ORG_ADMIN SUPER_ADMIN; do
  kcadm.sh create "clients/${CLIENT_ID}/roles" -r "${REALM_NAME}" \
    -s name="${ROLE}" \
    -s "description=EduSphere ${ROLE} role"
done

echo "[OK] Realm ${REALM_NAME} provisioned for tenant ${TENANT_UUID}"
echo "[OK] Redirect domain: ${REDIRECT_DOMAIN}"
echo "[OK] Client ID: ${CLIENT_ID}"
