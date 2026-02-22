# EduSphere — Security Hardening Checklist
**For:** On-premises and private-cloud deployments  
**Standards:** GDPR Art.32, SOC 2 CC6.7, OWASP  
**Review:** Before every production deployment  

---

## PRE-DEPLOYMENT CHECKLIST

### Network Security

- [ ] **All inter-service TLS** — Linkerd mesh (preferred) or manual certificates
  - Verification: `linkerd check` passes, or each service has cert/key env vars
- [ ] **PostgreSQL TLS** — `sslmode=require` in all `DATABASE_URL` values
  - Verification: `psql "$DATABASE_URL" -c "\conninfo"` shows SSL: on
- [ ] **NATS TLS** — TLS + NKey authentication configured
  - Verification: `nats server check --server tls://nats:4222 --tlsca /etc/nats/ca.crt`
- [ ] **MinIO HTTPS only** — HTTP port 9000 disabled, HTTPS on 9001
  - Verification: `curl http://minio:9000` → connection refused
- [ ] **Keycloak HTTPS** — `sslRequired=all` in realm settings
  - Verification: HTTP to Keycloak → 301 redirect to HTTPS
- [ ] **Gateway HTTPS** — TLS terminated at Traefik/Nginx ingress
  - Verification: `curl http://gateway:4000` → redirects to HTTPS
- [ ] **Block direct subgraph access** — no external route to ports 4001-4006
  - Verification: `nc -zv <external-ip> 4001` → connection refused

### Authentication & Authorization

- [ ] **Keycloak brute force protection enabled** (G-12)
  - Setting: `bruteForceProtected: true`, `failureFactor: 5`
  - Verification: Realm JSON export contains `"bruteForceProtected": true`
- [ ] **MFA enforced for privileged roles** — INSTRUCTOR, ORG_ADMIN, SUPER_ADMIN
  - Setting: Keycloak OTP required action on role assignment
- [ ] **Keycloak admin console not internet-accessible**
  - Verification: `curl https://<public-ip>:8443/auth/admin` → 404 or blocked
- [ ] **All default passwords changed** — no admin/admin123 anywhere
  - Check: `grep -r "admin123\|password123\|changeme" infrastructure/`
- [ ] **Service account tokens have minimum TTL**
  - Setting: `accessTokenLifespan: 900` (15 minutes)

### Database Security

- [ ] **No superuser for application connections** — use `edusphere_app` role
  - Verification: `SELECT usesuperuser FROM pg_user WHERE usename = 'edusphere_app'` → f
- [ ] **pgAudit enabled and logging** — verify in postgresql.conf
  - Verification: `SHOW pgaudit.log;` → `read,write,ddl`
- [ ] **All RLS policies enabled on sensitive tables**
  - Verification: `SELECT schemaname, tablename, rowsecurity FROM pg_tables WHERE rowsecurity = true;`
  - Expected: 26+ tables with RLS enabled
- [ ] **Database backups encrypted**
  - Setting: `pg_dump | openssl enc -aes-256-cbc -k $BACKUP_KEY`
- [ ] **Backup restore tested** — at least monthly test restore
- [ ] **Cross-tenant isolation validated**
  - Command: `pnpm test:rls`

### Secrets Management

- [ ] **No secrets in environment files committed to Git**
  - Check: `git log --all --full-history -- "**/.env*"` should show nothing sensitive
- [ ] **All secrets via OpenBao/Infisical** (not raw Kubernetes Secrets)
  - Verification: `kubectl get secrets -n edusphere | wc -l` → minimal (only bootstrap)
- [ ] **Database passwords rotated after initial setup**
- [ ] **API keys on quarterly rotation schedule**
  - Document in: `docs/policies/rotation-schedule.md`

### Container Security

- [ ] **All images from private registry** (no public pull in production)
  - Setting: `imagePullPolicy: Always`, private registry configured
- [ ] **Non-root containers** — all EduSphere containers run as UID 1000+
  - Verification: `kubectl get pods -o jsonpath='{.spec.securityContext.runAsNonRoot}'`
- [ ] **Read-only root filesystem** — `readOnlyRootFilesystem: true`
- [ ] **No privileged containers**
  - Verification: `kubectl get pods -o jsonpath='{.spec.containers[*].securityContext.privileged}'`
- [ ] **Resource limits set** — CPU and memory limits on all pods
- [ ] **Falco deployed** — runtime threat detection DaemonSet
  - Verification: `kubectl get daemonset falco -n falco`
- [ ] **Latest image tags** — no `:latest` in production manifests

### Monitoring & Alerting

- [ ] **Wazuh agent deployed** on all nodes
  - Verification: `wazuh-agent status` on each node
- [ ] **pgAudit logs shipping to Wazuh SIEM**
- [ ] **Alert on failed login > 5 in 60 seconds**
  - Wazuh rule: 100003 enabled
- [ ] **Alert on cross-tenant violations**
  - Wazuh rule: 100001 enabled
- [ ] **Uptime monitoring configured** — Prometheus + AlertManager
- [ ] **Log retention policy** — 7 years for audit logs (SOC 2 CC7.4)

---

## GDPR-SPECIFIC CHECKLIST (EU Deployments)

- [ ] **Data residency configured** — EU region only (eu-central-1 or eu-west-1)
  - Setting: `tenants.settings.dataResidency.primaryRegion = 'eu-central-1'`
- [ ] **DPA signed with all sub-processors**
  - Required: OpenAI, Anthropic, any cloud provider used
- [ ] **Consent banner deployed and tested**
  - Test: New user sees consent banner; selections persist in `user_consents` table
- [ ] **Right-to-erasure workflow tested end-to-end**
  - Test: `pnpm test:security -- gdpr-erasure`
- [ ] **Data portability export tested**
  - Test: Export generates valid ZIP with all user data
- [ ] **DPO appointed** — named individual listed in `docs/security/INCIDENT_RESPONSE.md`
- [ ] **DPIA completed** — for AI profiling and any high-risk processing
- [ ] **Incident response contacts current** — phone + email for all roles

---

## POST-DEPLOYMENT VERIFICATION COMMANDS

```bash
# 1. Run full security test suite
pnpm --filter @edusphere/security-tests test

# 2. Run RLS isolation tests
pnpm test:rls

# 3. Verify CORS configuration
curl -H "Origin: https://evil.com" https://your-gateway/graphql -I \
  | grep -i "access-control-allow-origin"
# Expected: header absent or empty (not "https://evil.com")

# 4. Verify rate limiting
for i in $(seq 1 110); do
  curl -s -o /dev/null -w "%{http_code}\n" https://your-gateway/graphql
done
# Expected: first 100 → 200/400, last 10 → 429

# 5. Verify GraphQL depth limit
curl -X POST https://your-gateway/graphql \
  -H "Content-Type: application/json" \
  -d '{"query":"{ user { tenant { courses { modules { lessons { content { media { url } } } } } } } }"}'
# Expected: errors containing "exceeds maximum depth"

# 6. Verify pgAudit is logging
psql $DATABASE_URL -c "SHOW pgaudit.log;"
# Expected: read,write,ddl

# 7. Verify NATS TLS
nats server check --server tls://nats:4222 --tlsca /etc/nats/ca.crt
# Expected: OK

# 8. Check for hardcoded secrets in codebase
grep -r "password\s*=\s*['\"].\{8,\}['\"]" --include="*.ts" src/
# Expected: no matches (all passwords from env vars)
```

---

## INTERNAL CA SETUP (step-ca for Air-Gapped)

For on-premises deployments without Let's Encrypt access:

```bash
# Install step-ca (smallstep — open source internal CA)
# https://smallstep.com/docs/step-ca/

# Initialize CA
step ca init \
  --name "EduSphere Internal CA" \
  --dns edusphere.internal,*.edusphere.internal \
  --address :8443 \
  --provisioner admin@edusphere.internal

# Issue service certificates
step ca certificate "postgres.edusphere.internal" postgres.crt postgres.key \
  --ca-url https://step-ca:8443 \
  --root /etc/step-ca/certs/root_ca.crt

step ca certificate "nats.edusphere.internal" nats.crt nats.key \
  --ca-url https://step-ca:8443 \
  --root /etc/step-ca/certs/root_ca.crt

# Auto-renew certificates (runs in background, renews at 2/3 of lifetime)
step ca renew --daemon postgres.crt postgres.key
```

Configure all services to trust the internal CA root certificate:
```bash
# Add to system trust store
cp /etc/step-ca/certs/root_ca.crt /usr/local/share/ca-certificates/edusphere-ca.crt
update-ca-certificates

# For Node.js services (add to each service startup)
export NODE_EXTRA_CA_CERTS=/etc/edusphere/ca/root_ca.crt
```
