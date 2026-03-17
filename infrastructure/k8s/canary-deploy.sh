#!/usr/bin/env bash
# Canary Deployment Script — Traefik weighted routing
# Usage: ./canary-deploy.sh <service> <new-image-tag> [--auto-promote]
#
# Stages: 5% → 20% → 100% (with health checks between each)
# Item #83, #109 from master work plan.

set -euo pipefail

SERVICE="${1:?Usage: canary-deploy.sh <service> <new-image-tag> [--auto-promote]}"
NEW_TAG="${2:?Provide new image tag}"
AUTO_PROMOTE="${3:-}"
NAMESPACE="${NAMESPACE:-edusphere}"
HEALTH_ENDPOINT="${HEALTH_ENDPOINT:-/graphql}"
HEALTH_TIMEOUT=30
CANARY_STAGES=(5 20 100)

log() { echo "[canary] $(date +%H:%M:%S) $*"; }
err() { log "ERROR: $*" >&2; }

# Verify prerequisites
command -v kubectl >/dev/null || { err "kubectl not found"; exit 1; }
command -v curl >/dev/null || { err "curl not found"; exit 1; }

# Get current deployment
CURRENT_DEPLOY="$SERVICE"
CANARY_DEPLOY="${SERVICE}-canary"

log "Starting canary deployment for $SERVICE with tag $NEW_TAG"

# Stage 1: Create canary deployment with 0 traffic
log "Creating canary deployment $CANARY_DEPLOY"
kubectl -n "$NAMESPACE" get deployment "$CURRENT_DEPLOY" -o yaml | \
  sed "s/name: $CURRENT_DEPLOY/name: $CANARY_DEPLOY/" | \
  sed "s|image: .*|image: edusphere/$SERVICE:$NEW_TAG|" | \
  kubectl apply -f -

# Wait for canary pods to be ready
log "Waiting for canary pods to be ready..."
kubectl -n "$NAMESPACE" rollout status deployment/"$CANARY_DEPLOY" --timeout=120s

# Health check function
health_check() {
  local target="$1"
  local retries=0
  while [ $retries -lt $HEALTH_TIMEOUT ]; do
    local pod
    pod=$(kubectl -n "$NAMESPACE" get pods -l "app=$target" -o jsonpath='{.items[0].metadata.name}' 2>/dev/null)
    if [ -n "$pod" ]; then
      local status
      status=$(kubectl -n "$NAMESPACE" exec "$pod" -- \
        curl -s -o /dev/null -w '%{http_code}' "http://localhost:4000${HEALTH_ENDPOINT}" \
        -H 'Content-Type: application/json' \
        -d '{"query":"{ __typename }"}' 2>/dev/null || echo "000")
      if [ "$status" = "200" ]; then
        return 0
      fi
    fi
    retries=$((retries + 1))
    sleep 1
  done
  return 1
}

# Progressive traffic shifting
for weight in "${CANARY_STAGES[@]}"; do
  stable_weight=$((100 - weight))

  log "Setting canary weight to ${weight}% (stable: ${stable_weight}%)"

  # Apply Traefik weighted round-robin via IngressRoute
  cat <<EOF | kubectl apply -f -
apiVersion: traefik.io/v1alpha1
kind: TraefikService
metadata:
  name: ${SERVICE}-weighted
  namespace: ${NAMESPACE}
spec:
  weighted:
    services:
      - name: ${CURRENT_DEPLOY}
        port: 4000
        weight: ${stable_weight}
      - name: ${CANARY_DEPLOY}
        port: 4000
        weight: ${weight}
EOF

  if [ "$weight" -eq 100 ]; then
    log "Canary promoted to 100% — finalizing"
    break
  fi

  # Health check at this weight level
  log "Running health checks at ${weight}% canary traffic..."
  sleep 10  # Let traffic stabilize

  if ! health_check "$CANARY_DEPLOY"; then
    err "Health check FAILED at ${weight}% — rolling back"
    kubectl -n "$NAMESPACE" delete deployment "$CANARY_DEPLOY" --ignore-not-found
    cat <<EOF | kubectl apply -f -
apiVersion: traefik.io/v1alpha1
kind: TraefikService
metadata:
  name: ${SERVICE}-weighted
  namespace: ${NAMESPACE}
spec:
  weighted:
    services:
      - name: ${CURRENT_DEPLOY}
        port: 4000
        weight: 100
EOF
    err "Rollback complete — all traffic on stable deployment"
    exit 1
  fi

  log "Health check passed at ${weight}%"

  if [ "$AUTO_PROMOTE" != "--auto-promote" ]; then
    read -rp "[canary] Promote to next stage? (y/n) " answer
    if [ "$answer" != "y" ]; then
      log "Canary paused at ${weight}% — run again to continue"
      exit 0
    fi
  fi
done

# Finalize: update stable deployment image and remove canary
log "Updating stable deployment to $NEW_TAG"
kubectl -n "$NAMESPACE" set image "deployment/$CURRENT_DEPLOY" \
  "$SERVICE=edusphere/$SERVICE:$NEW_TAG"
kubectl -n "$NAMESPACE" rollout status "deployment/$CURRENT_DEPLOY" --timeout=120s

log "Removing canary deployment"
kubectl -n "$NAMESPACE" delete deployment "$CANARY_DEPLOY" --ignore-not-found

# Reset weights to 100% stable
cat <<EOF | kubectl apply -f -
apiVersion: traefik.io/v1alpha1
kind: TraefikService
metadata:
  name: ${SERVICE}-weighted
  namespace: ${NAMESPACE}
spec:
  weighted:
    services:
      - name: ${CURRENT_DEPLOY}
        port: 4000
        weight: 100
EOF

log "Canary deployment complete — $SERVICE running $NEW_TAG at 100%"
