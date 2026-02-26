# EduSphere — Air-Gapped Installation Guide

**For:** Deployments with no internet access (government, healthcare, high-security)  
**Prerequisites:** EduSphere release package downloaded on internet-connected machine

---

## STEP 1: Export Container Images (internet-connected machine)

```bash
#!/usr/bin/env bash
# Run on internet-connected machine with Docker access
VERSION="1.0.0"
REGISTRY="ghcr.io/edusphere"

IMAGES=(
  "gateway:$VERSION"
  "subgraph-core:$VERSION"
  "subgraph-content:$VERSION"
  "subgraph-annotation:$VERSION"
  "subgraph-collaboration:$VERSION"
  "subgraph-agent:$VERSION"
  "subgraph-knowledge:$VERSION"
)

# Pull all images
for img in "${IMAGES[@]}"; do
  docker pull "$REGISTRY/$img"
done

# Export to single archive
docker save "${IMAGES[@]/#/$REGISTRY/}" | gzip > "edusphere-$VERSION-images.tar.gz"

# Also export infrastructure images
docker pull postgres:16-alpine keycloak/keycloak:26 nats:2.10-alpine \
  minio/minio:latest jaegertracing/all-in-one:latest
docker save postgres:16-alpine keycloak/keycloak:26 nats:2.10-alpine \
  minio/minio:latest jaegertracing/all-in-one:latest \
  | gzip > "edusphere-$VERSION-infra-images.tar.gz"

echo "Transfer these files to air-gapped environment:"
echo "  edusphere-$VERSION-images.tar.gz"
echo "  edusphere-$VERSION-infra-images.tar.gz"
```

---

## STEP 2: Transfer to Air-Gapped Environment

Transfer via approved media (USB, physical courier, secure file transfer):

- `edusphere-$VERSION-images.tar.gz`
- `edusphere-$VERSION-infra-images.tar.gz`
- `edusphere-$VERSION-helm-charts.tar.gz` (from GitHub releases)
- `edusphere-$VERSION-keys.tar.gz` (encrypted, separate courier)

**Verify checksums:**

```bash
sha256sum edusphere-$VERSION-images.tar.gz
# Compare with published checksums at: https://github.com/edusphere/releases
```

---

## STEP 3: Load Images into Private Registry

```bash
# Load images into Docker
docker load < edusphere-$VERSION-images.tar.gz
docker load < edusphere-$VERSION-infra-images.tar.gz

# Tag and push to internal registry
INTERNAL_REGISTRY="registry.internal.company.com"
for img in $(docker images --format "{{.Repository}}:{{.Tag}}" | grep edusphere); do
  docker tag "$img" "$INTERNAL_REGISTRY/$img"
  docker push "$INTERNAL_REGISTRY/$img"
done
```

---

## STEP 4: Configure Internal CA

See [SECURITY_HARDENING.md — Internal CA Setup](./SECURITY_HARDENING.md#internal-ca-setup-step-ca-for-air-gapped)

---

## STEP 5: Configure Services for Air-Gap

### Keycloak (offline mode)

```yaml
# In keycloak environment
KC_HOSTNAME: keycloak.edusphere.internal
KC_HOSTNAME_STRICT: 'true'
KC_PROXY: edge
# DISABLE theme auto-download (requires internet)
KC_THEME_STATIC_MAX_AGE: 31536000
```

### Subgraph-Agent (local LLM only)

```env
# Force local Ollama — no OpenAI/Anthropic calls
OLLAMA_URL=http://ollama.edusphere.internal:11434
OPENAI_API_KEY=  # Leave empty — disables OpenAI
ANTHROPIC_API_KEY=  # Leave empty — disables Anthropic
LOCAL_LLM_ONLY=true
```

### Node.js services (internal CA)

```env
NODE_EXTRA_CA_CERTS=/etc/edusphere/ca/root_ca.crt
```

### Corporate proxy bypass

```env
NO_PROXY=.edusphere.internal,postgres.internal,nats.internal,minio.internal
# If proxy required for specific traffic:
HTTP_PROXY=http://proxy.company.com:8080
HTTPS_PROXY=http://proxy.company.com:8080
```

---

## STEP 6: Keycloak Realm Import (offline)

```bash
# Import EduSphere realm configuration (no internet required)
docker exec -it keycloak /opt/keycloak/bin/kc.sh import \
  --file /opt/keycloak/data/import/edusphere-realm.json

# Verify import
kcadm.sh get realms/edusphere --fields realm,enabled,bruteForceProtected
```

---

## STEP 7: Database Initialization (offline)

```bash
# Run migrations (uses local PostgreSQL — no internet required)
pnpm --filter @edusphere/db migrate

# Seed minimal required data (no demo content)
pnpm --filter @edusphere/db seed:minimal
```

---

## STEP 8: Post-Install Verification

```bash
# Run full security test suite (all tests are offline — no network calls)
pnpm --filter @edusphere/security-tests test

# Verify all services healthy
./scripts/health-check.sh

# Verify no outbound connections are attempted
tcpdump -i eth0 -n "not src net 10.0.0.0/8 and not src net 172.16.0.0/12"
# Expected: no traffic to external IPs after startup
```

---

## OFFLINE UPDATE PROCEDURE

```bash
# 1. Download new version on internet-connected machine (same as Step 1)
# 2. Transfer via approved media
# 3. Load new images to internal registry
# 4. Run helm upgrade with new image tags
helm upgrade edusphere ./charts/edusphere \
  --set image.tag=$NEW_VERSION \
  --set image.registry=$INTERNAL_REGISTRY \
  --wait

# 5. Verify zero-downtime upgrade
kubectl rollout status deployment/edusphere-gateway
pnpm --filter @edusphere/security-tests test
```
