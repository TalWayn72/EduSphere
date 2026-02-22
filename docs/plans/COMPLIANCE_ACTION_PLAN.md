# EduSphere — Information Security Compliance Action Plan
## SOC 2 Type II + GDPR + EU AI Act + White-Label / On-Premises

> ## ✅ STATUS: FULLY COMPLETE — 2026-02-22
> All 11 phases + Wave 1+2 + MCP-001 (10 MCP servers) implemented.
> **738/738 security tests passing. >3,800 total tests.**
>
> ### ⚠️ OUTSTANDING: Uncommitted MCP-001 Files (need one more commit)
> | File | Status | Note |
> |------|--------|------|
> | `.mcp.json` | Modified (NOT staged) | ⚠️ Contains real API keys — must add to `.gitignore` first |
> | `OPEN_ISSUES.md` | Staged | Safe to commit |
> | `docs/plans/MCP_TOOLS_SETUP.md` | Untracked | Safe to commit |
> | `scripts/setup-mcp-keys.sh` | Untracked | Safe to commit |
> | `packages/graphql-shared/tsconfig.tsbuildinfo` | Staged | Must unstage (already in .gitignore as *.tsbuildinfo) |
>
> **Plan:** (1) add `.mcp.json` to `.gitignore`; (2) create `.mcp.json.example` with placeholders;
> (3) unstage tsconfig.tsbuildinfo; (4) commit safe files; (5) push (user approval required)
>
> ### External Actions (outside this plan's scope):
> - SOC2 Type II audit engagement — external auditor + 12-month observation period
> - Sub-processor DPAs — legal signing with OpenAI, Anthropic
> - Production K8s deployment — ops team action

**Document Version:** 1.0
**Date:** 2026-02-22
**Prepared by:** Claude Sonnet 4.6 — Deep Research & Analysis
**Target:** 100,000+ concurrent users | Global SaaS + White-Label + On-Premises
**Regulatory Scope:** GDPR (EU), SOC 2 Type II (AICPA), EU AI Act (Aug 2026)

---

## CONTEXT & PURPOSE

EduSphere is a multi-tenant knowledge-graph educational platform serving hundreds of thousands of users globally. The platform stores sensitive personal data (PII, learning behavior, AI conversations, personal annotations) across a GraphQL Federation architecture with 6 subgraphs, PostgreSQL 16 with RLS, Apache AGE, pgvector, and NATS JetStream.

**Why this plan is required:**
1. Business expansion into regulated markets (EU, healthcare, finance, government) demands SOC 2 Type II certification and full GDPR compliance.
2. White-label and on-premises deployments require that each client installation comply independently with applicable local regulations.
3. The platform operates AI agents (LangGraph.js) that collect, store, and process user conversational data — triggering EU AI Act requirements by August 2026.
4. Deep codebase analysis identified **21 critical and high-priority security gaps** that must be resolved before certification or regulated-market launch.
5. A breach through the platform must be architecturally impossible — not just policy-based.

**Intended Outcome:** A fully compliant platform that can pass a SOC 2 Type II audit, demonstrate GDPR Article 5 compliance to EU supervisory authorities, and deploy safely as white-label or on-premises in any jurisdiction.

---

## PART 1 — CURRENT STATE ASSESSMENT

### 1.1 Security Strengths (Already Implemented)

| Control | Implementation | Location |
|---------|---------------|----------|
| JWT Validation | jose library + remote JWKS from Keycloak | `packages/auth/src/jwt.ts` |
| Row-Level Security | 54 RLS policies across 26 tables | `packages/db/src/schema/` |
| Multi-tenancy at DB Layer | `withTenantContext()` sets SET LOCAL session variables | `packages/db/src/rls/withTenantContext.ts` |
| GraphQL Auth Directives | `@authenticated` on all mutations | All subgraph .graphql files |
| Input Validation | Zod schemas on all mutations | `apps/subgraph-*/src/**/*.schemas.ts` |
| Secret Scanning CI/CD | TruffleHog (verified-only mode) | `.github/workflows/codeql.yml` |
| Static Analysis | CodeQL on every PR | `.github/workflows/codeql.yml` |
| Container Scanning | Trivy in Docker build pipeline | `.github/workflows/docker-build.yml` |
| K8s Secrets | External Secrets Operator → AWS SM / Vault | `infrastructure/k8s/helm/edusphere/templates/secrets/` |
| Keycloak OIDC | Centralized identity with 5-role RBAC | `infrastructure/docker/keycloak-realm.json` |
| TypeScript Strict Mode | No `any`, enforced at build | All `tsconfig.json` files |
| Test Coverage Gates | 90%+ backend, 80%+ frontend | `.github/workflows/ci.yml` |

### 1.2 Critical Gaps Identified

#### 🔴 CRITICAL (Block production / certification)

| ID | Gap | Affected Standard | File/Location |
|----|-----|-------------------|---------------|
| G-01 | **RLS variable mismatch**: annotations use `app.current_user` but context sets `app.current_user_id` — annotations RLS silently disabled | GDPR Art.32, SOC2 CC6 | `packages/db/src/schema/annotation.ts` |
| G-02 | **No data encryption at rest**: PostgreSQL stores plaintext PII (email, name, annotations, AI conversations) | GDPR Art.32, SOC2 CC6.1 | All schema files |
| G-03 | **Right-to-erasure broken**: `deleteAccount` only sets `deleted_at`, no cascading deletes for annotations, AI messages, progress, files | GDPR Art.17 | `apps/subgraph-core/src/user/` |
| G-04 | **No consent management**: No consent table, no cookie banner, no lawful basis tracking | GDPR Art.6, Art.7 | Missing entirely |
| G-05 | **SSL verification disabled in Docker**: `curl --insecure` and APT MITM-vulnerable config in Dockerfile | SOC2 CC7, SUPPLY CHAIN | `Dockerfile` lines 30-32, 108 |
| G-06 | **CORS wildcard with credentials**: Default `origin: '*'` violates CORS spec with `credentials: true` | OWASP API1, SOC2 CC6 | `apps/gateway/src/index.ts` lines 48-51 |
| G-07 | **Inter-service communication unencrypted**: Gateway→Subgraphs and Subgraphs→PostgreSQL use plain HTTP/TCP | GDPR Art.32, SOC2 CC6.7 | `apps/gateway/src/index.ts` |
| G-08 | **No audit trail for data access**: Only mutation logs, no record of who accessed which annotations/records | GDPR Art.32, SOC2 CC7.2 | Missing entirely |

#### 🟡 HIGH (Required for certification)

| ID | Gap | Affected Standard | Location |
|----|-----|-------------------|----------|
| G-09 | **No rate limiting**: Configured in env but not implemented in gateway or subgraphs | SOC2 CC6, OWASP API4 | `apps/gateway/src/index.ts` |
| G-10 | **No GraphQL query complexity/depth limits**: DoS via nested queries possible | OWASP API4 | `apps/gateway/src/index.ts` |
| G-11 | **No data portability endpoint**: GDPR Article 20 right not implemented | GDPR Art.20 | Missing entirely |
| G-12 | **Brute force protection disabled**: Keycloak `bruteForceProtected: false` | SOC2 CC6.7 | `keycloak-realm.json` line 40 |
| G-13 | **No data retention policy**: AI conversations, annotations, CRDT updates persist indefinitely | GDPR Art.5(e) | All schema files |
| G-14 | **LLM data transfers without DPA**: User queries sent to OpenAI/Anthropic without documented Data Processing Agreement | GDPR Art.28, Art.46 | `apps/subgraph-agent/` |
| G-15 | **No @requiresScopes / @requiresRole directives in schemas**: Only @authenticated used | SOC2 CC6.3, GDPR Art.25 | All subgraph .graphql files |
| G-16 | **NATS JetStream not secured**: No TLS, no authentication on message bus | SOC2 CC6.7 | `packages/nats-client/src/` |
| G-17 | **MinIO files unencrypted**: Default configuration stores all files in plaintext | GDPR Art.32, SOC2 C1.1 | `apps/subgraph-content/src/media.service.ts` |
| G-18 | **No incident response procedure**: No documented breach response, no 72-hour notification process | GDPR Art.33, SOC2 CC7.4 | Missing entirely |

#### 🟢 MEDIUM (Needed for white-label/on-prem)

| ID | Gap | Impact |
|----|-----|--------|
| G-19 | No frontend branding system (hardcoded "EduSphere") | Cannot rebrand for white-label clients |
| G-20 | Single Keycloak realm — no per-tenant isolation at IdP level | User enumeration across tenants possible |
| G-21 | No data residency controls | Cannot guarantee EU data stays in EU |

---

## PART 2 — REGULATORY REQUIREMENTS MAPPING

### 2.1 GDPR Compliance Requirements

| Article | Requirement | Current Status | Action Required |
|---------|-------------|---------------|-----------------|
| Art. 5 | Data minimization, purpose limitation | ⚠️ Partial | Define data categories, add retention TTLs |
| Art. 6 | Lawful basis for processing | ❌ Missing | Implement consent tracking |
| Art. 7 | Proof of consent | ❌ Missing | Consent database table + UI |
| Art. 13/14 | Privacy notice | ❌ Missing | Privacy policy page + in-app notices |
| Art. 17 | Right to erasure | ❌ Broken | Implement cascading deletion |
| Art. 20 | Data portability | ❌ Missing | Export endpoint (JSON/ZIP) |
| Art. 25 | Privacy by design | ⚠️ Partial | Add @requiresScopes, encrypt PII fields |
| Art. 28 | Processor agreements | ❌ Missing | DPA with OpenAI, Keycloak (if hosted), MinIO |
| Art. 30 | Records of processing | ❌ Missing | RoPA document + code documentation |
| Art. 32 | Security measures | ❌ Critical | Encryption at rest, audit logs |
| Art. 33 | Breach notification (72h) | ❌ Missing | Incident response procedure + automation |
| Art. 35 | DPIA | ❌ Missing | Data Protection Impact Assessment document |
| Art. 46 | Data transfers (3rd countries) | ⚠️ Risk | SCCs for OpenAI/Anthropic API calls |

### 2.2 SOC 2 Type II Trust Services Criteria

| Criteria | Description | Current | Gap |
|----------|-------------|---------|-----|
| CC6.1 | Logical access controls | ✓ JWT + RLS | Add @requiresScopes, MFA |
| CC6.2 | System access provisioning | ⚠️ Partial | Audit user provisioning events |
| CC6.3 | Restrict access per least privilege | ❌ Fail | Add fine-grained directives |
| CC6.6 | Prevent/detect unauthorized access | ⚠️ Partial | Enable brute force protection, add rate limiting |
| CC6.7 | Encrypt data in transit | ❌ Fail | mTLS inter-service, NATS TLS |
| CC7.1 | System monitoring | ⚠️ Partial | Add SIEM (Wazuh), pgAudit |
| CC7.2 | Anomaly detection | ❌ Missing | Falco runtime detection |
| CC7.3 | Incident evaluation | ❌ Missing | Incident response plan |
| CC7.4 | Incident response | ❌ Missing | Runbooks, escalation paths |
| CC8.1 | Change management | ✓ GitHub PR | Document process |
| C1.1 | Confidentiality controls | ❌ Fail | Encrypt PII at rest |
| A1.1 | Availability monitoring | ⚠️ Partial | Add uptime alerting |
| PI1.1 | Processing integrity | ✓ Zod validation | Expand audit logging |

### 2.3 EU AI Act Requirements (August 2026 Deadline)

EduSphere's AI agents (LangGraph.js) interact with students in educational contexts. Under Annex III, educational AI systems that influence assessment or progress **may be classified as high-risk**.

| Requirement | Status | Action |
|-------------|--------|--------|
| AI Literacy (Feb 2025 — already mandatory) | ❌ Missing | Internal training program |
| Transparency to users about AI involvement | ❌ Missing | "This response is AI-generated" labeling |
| Human oversight mechanism | ⚠️ Partial | Instructor review of AI responses |
| Technical documentation | ❌ Missing | Model cards per agent type |
| Risk management system | ❌ Missing | AI risk register |
| Prohibited: emotion recognition in education | ✓ Not implemented | — |
| Opt-out from AI profiling | ❌ Missing | Agent opt-out setting in user preferences |
| GPAI transparency (model architecture, training) | ⚠️ Partial | Document models used per environment |
| Post-market monitoring | ❌ Missing | AI output monitoring, bias detection |

---

## PART 3 — OPEN-SOURCE TECHNOLOGY STACK (FREE & SELF-HOSTABLE)

All tools are free, open-source, and self-hostable — no vendor lock-in.

### 3.1 Security Infrastructure

| Tool | Purpose | License | Integration Point |
|------|---------|---------|-------------------|
| **Wazuh** | SIEM + XDR, File Integrity Monitoring, compliance reporting | GPLv2 | All containers + Kubernetes nodes |
| **Falco** | Runtime container threat detection (eBPF syscall monitoring) | Apache 2.0 | Kubernetes DaemonSet |
| **pgAudit** | PostgreSQL audit logging (DDL + DML + SELECT) for SOC2/GDPR | PostgreSQL License | PostgreSQL extension |
| **Trivy** | Container + code + SBOM vulnerability scanning (already partially present) | Apache 2.0 | Expand in CI/CD |
| **OWASP Dependency-Check** | SCA for npm packages + CVE detection | Apache 2.0 | Add to CI/CD pipeline |
| **OpenBao** | Secrets management (HashiCorp Vault fork, truly OSS under MPL 2.0) | MPL 2.0 | Replace raw K8s secrets |
| **Infisical** | Secrets + certificates management, self-hosted | MIT | Development secrets rotation |
| **Linkerd** | Service mesh with automatic mTLS between all subgraphs | Apache 2.0 | Kubernetes sidecar injection |
| **Cerbos** | Policy-as-code authorization (RBAC + ABAC), replaces @requiresScopes | Apache 2.0 | NestJS middleware / Gateway |

### 3.2 GDPR & Privacy Tools

| Tool | Purpose | License | Integration Point |
|------|---------|---------|-------------------|
| **Klaro** | Cookie consent manager (open source CMP) | MIT | `apps/web/src/` React integration |
| **Privado CLI** | Static code scanning for PII data flows | MIT | CI/CD pipeline (pre-commit) |
| **Probo** | Compliance management platform (SOC2/GDPR/ISO27001) | Apache 2.0 | Evidence collection + policy tracking |
| **Comply (StrongDM)** | Markdown-based policy documentation + Jira integration | MIT | Policy library |
| **pgcrypto** | PostgreSQL column-level encryption for PII fields | PostgreSQL License | Already installed, needs activation |

### 3.3 Monitoring & Observability

| Tool | Purpose | License | Integration Point |
|------|---------|---------|-------------------|
| **OpenSearch** | Log aggregation + SIEM backend (ElasticSearch compatible) | Apache 2.0 | Wazuh backend, Pino log shipping |
| **Prometheus + Grafana** | Metrics + dashboards (already partially deployed) | Apache 2.0 | Expand with security dashboards |
| **Jaeger** | Distributed tracing (already deployed) | Apache 2.0 | Expand with security span tagging |
| **Matomo** | Privacy-respecting analytics (GDPR-compliant alternative to GA) | GPL 3.0 | Replace any analytics |

---

## PART 4 — IMPLEMENTATION PLAN (28 SPRINTS / ~14 WEEKS)

### PHASE 0 — Critical Bug Fixes (Week 1) — BLOCKS ALL ELSE

#### 0.1 Fix RLS Variable Mismatch (G-01)
**File:** `packages/db/src/schema/annotation.ts`

Change all occurrences of `app.current_user` to `app.current_user_id` in RLS policies:
```sql
-- BEFORE (broken):
CREATE POLICY annotations_user_isolation ON annotations
  USING (user_id::text = current_setting('app.current_user', TRUE))

-- AFTER (correct):
CREATE POLICY annotations_user_isolation ON annotations
  USING (user_id::text = current_setting('app.current_user_id', TRUE))
  WITH CHECK (user_id::text = current_setting('app.current_user_id', TRUE))
```

Also audit all 26 schema files in `packages/db/src/schema/` to verify all policies use the correct variable names. Add a dedicated regression test in `packages/db/src/rls/withTenantContext.test.ts` that verifies annotation isolation.

#### 0.2 Fix CORS Configuration (G-06)
**File:** `apps/gateway/src/index.ts`

Change default from wildcard to empty array (fail-closed):
```typescript
cors: {
  origin: process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',').map(o => o.trim())
    : [],  // NEVER wildcard in production
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS'],
}
```

#### 0.3 Enable Keycloak Brute Force Protection (G-12)
**File:** `infrastructure/docker/keycloak-realm.json`

```json
"bruteForceProtected": true,
"permanentLockout": false,
"maxFailureWaitSeconds": 900,
"minimumQuickLoginWaitSeconds": 60,
"waitIncrementSeconds": 60,
"quickLoginCheckMilliSeconds": 1000,
"maxDeltaTimeSeconds": 43200,
"failureFactor": 5
```

#### 0.4 Remove SSL Verification Bypass in Docker (G-05)
**File:** `Dockerfile`

Replace `--insecure` and `APT insecure config` with proper certificate handling:
```dockerfile
# REMOVE THESE:
# RUN echo 'Acquire::https::Verify-Peer "false";' > /etc/apt/apt.conf.d/99insecure
# curl --insecure ...

# REPLACE WITH:
RUN apt-get update && apt-get install -y ca-certificates && update-ca-certificates
RUN curl -fsSL https://ollama.com/install.sh | sh
```

---

### PHASE 1 — Data Encryption (Weeks 2-3)

#### 1.1 Column-Level Encryption for PII (G-02)

**Strategy:** Use pgcrypto (already installed) + application-layer encryption with a key stored in OpenBao/Infisical.

**New PostgreSQL migration** (`packages/db/src/migrations/0XX_add_pii_encryption.sql`):
```sql
-- Enable pgcrypto (already enabled in schema)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Add encrypted shadow columns for PII fields
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_enc BYTEA;
ALTER TABLE users ADD COLUMN IF NOT EXISTS first_name_enc BYTEA;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_name_enc BYTEA;

-- Encryption function using symmetric encryption with tenant-specific key
CREATE OR REPLACE FUNCTION encrypt_pii(plaintext TEXT, encryption_key BYTEA)
RETURNS BYTEA AS $$
  SELECT pgp_sym_encrypt(plaintext, encode(encryption_key, 'escape'));
$$ LANGUAGE SQL SECURITY DEFINER;

CREATE OR REPLACE FUNCTION decrypt_pii(ciphertext BYTEA, encryption_key BYTEA)
RETURNS TEXT AS $$
  SELECT pgp_sym_decrypt(ciphertext, encode(encryption_key, 'escape'));
$$ LANGUAGE SQL SECURITY DEFINER;
```

**Per-tenant encryption key model:** Each tenant has a unique AES-256 key stored in OpenBao/Infisical. Key ID stored in `tenants.settings.encryptionKeyId`. Key derivation uses tenant UUID + master key.

**Drizzle ORM layer changes** (`packages/db/src/helpers/encryption.ts` — new file):
- `encryptField(value: string, tenantKey: Buffer): Buffer`
- `decryptField(ciphertext: Buffer, tenantKey: Buffer): string`
- Applied in all service methods before writes, after reads

**Fields to encrypt (minimum):**
- `users.email`, `users.first_name`, `users.last_name`
- `annotations.text`, `annotations.highlighted_text`
- `agent_messages.content`
- `files.original_name` (if contains PII)

#### 1.2 Encrypt NATS JetStream (G-16)

**Configuration** (`packages/nats-client/src/index.ts`):
```typescript
import { connect, TlsOptions } from 'nats';

const tls: TlsOptions = {
  certFile: process.env.NATS_TLS_CERT,
  keyFile: process.env.NATS_TLS_KEY,
  caFile: process.env.NATS_TLS_CA,
};

const nc = await connect({
  servers: process.env.NATS_URL,
  tls,
  authenticator: nkeyAuthenticator(new TextEncoder().encode(process.env.NATS_NKEY)),
});
```

NATS server configuration (`infrastructure/nats/nats-server.conf` — new file):
```conf
tls {
  cert_file: "/etc/nats/tls/server.crt"
  key_file: "/etc/nats/tls/server.key"
  ca_file: "/etc/nats/tls/ca.crt"
  verify: true
}

authorization {
  users = [
    { nkey: <subgraph_nkey_public>, permissions: { publish: ">" subscribe: ">" } },
    { nkey: <gateway_nkey_public>, permissions: { subscribe: ">" } }
  ]
}
```

#### 1.3 Encrypt MinIO Storage (G-17)

MinIO server-side encryption configuration (docker-compose + Helm):
```yaml
environment:
  - MINIO_KMS_SECRET_KEY=minio-encryption-key:<base64-key>
  - MINIO_KMS_KES_ENDPOINT=https://kes:7373  # KES = Key Encryption Service
```

Per-bucket policy to enforce SSE-S3:
```json
{
  "QueueConfigurations": [],
  "Bucket": "edusphere-content",
  "ServerSideEncryptionConfiguration": {
    "Rules": [{"ApplyServerSideEncryptionByDefault": {"SSEAlgorithm": "AES256"}}]
  }
}
```

#### 1.4 Encrypt Inter-Service Communication (G-07)

**Option A (Recommended — Linkerd service mesh):**
Install Linkerd in Kubernetes:
```bash
# Install Linkerd CLI + CRDs
linkerd install --crds | kubectl apply -f -
linkerd install | kubectl apply -f -

# Inject all EduSphere pods
kubectl annotate ns edusphere linkerd.io/inject=enabled
```

Linkerd automatically encrypts all pod-to-pod communication with mTLS — no code changes needed in subgraphs or gateway.

**Option B (Without K8s — Docker Compose):**
Use stunnel or NGINX with mutual TLS for subgraph-to-PostgreSQL connections:
```yaml
# DATABASE_SSL=require in each subgraph .env
DATABASE_URL: postgresql://user:pass@postgres:5432/edusphere?sslmode=require&sslrootcert=/etc/ssl/ca.crt
```

---

### PHASE 2 — Audit Logging System (Weeks 3-4)

#### 2.1 Database Audit Table

**New migration** (`packages/db/src/migrations/0XX_audit_log.sql`):
```sql
CREATE TABLE IF NOT EXISTS audit_log (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id   UUID NOT NULL,
  user_id     UUID,
  action      VARCHAR(100) NOT NULL,  -- 'READ', 'CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'EXPORT', 'CONSENT_GIVEN', 'CONSENT_WITHDRAWN', 'DATA_ERASURE'
  resource_type VARCHAR(50),          -- 'USER', 'ANNOTATION', 'COURSE', 'AGENT_SESSION', 'FILE'
  resource_id UUID,
  old_values  JSONB,
  new_values  JSONB,
  ip_address  INET,
  user_agent  TEXT,
  request_id  VARCHAR(36),
  status      VARCHAR(20) DEFAULT 'SUCCESS', -- 'SUCCESS', 'FAILED', 'DENIED'
  metadata    JSONB,
  created_at  TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Partition by month for performance
CREATE INDEX audit_log_tenant_created ON audit_log (tenant_id, created_at DESC);
CREATE INDEX audit_log_user_action ON audit_log (user_id, action, created_at DESC);

-- RLS: SUPER_ADMIN sees all, ORG_ADMIN sees own tenant, others see own user
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY audit_log_rls ON audit_log
  USING (
    current_setting('app.current_user_role', TRUE) = 'SUPER_ADMIN'
    OR tenant_id::text = current_setting('app.current_tenant', TRUE)
  );
```

#### 2.2 pgAudit Extension (G-08 — Database-level)

**PostgreSQL configuration:**
```sql
-- Load pgAudit (add to postgresql.conf shared_preload_libraries)
shared_preload_libraries = 'pgaudit,age'

-- Configure pgAudit in postgresql.conf
pgaudit.log = 'read,write,ddl'
pgaudit.log_catalog = off
pgaudit.log_relation = on
pgaudit.log_statement_once = off
pgaudit.log_level = log
```

**Object-level audit for sensitive tables:**
```sql
CREATE ROLE auditor NOLOGIN;
GRANT SELECT ON annotations TO auditor;
GRANT SELECT ON agent_messages TO auditor;
GRANT SELECT ON users TO auditor;

-- pgAudit will log all SELECT on these tables when accessed
SET pgaudit.role = auditor;
```

#### 2.3 Application-Level Audit Middleware

**New NestJS interceptor** (`packages/audit/src/audit.interceptor.ts` — new package):
```typescript
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  async intercept(context: ExecutionContext, next: CallHandler) {
    const gqlContext = GqlExecutionContext.create(context).getContext();
    const { userId, tenantId, role } = gqlContext.auth || {};
    const operationName = gqlContext.req?.body?.operationName;
    const ipAddress = gqlContext.req?.ip;
    const userAgent = gqlContext.req?.headers?.['user-agent'];

    const result = await next.handle().toPromise();

    // Write to audit_log table asynchronously (fire-and-forget, non-blocking)
    await this.auditService.log({
      tenantId, userId,
      action: operationName,
      ipAddress, userAgent,
      status: 'SUCCESS',
      metadata: { operationType: 'GRAPHQL_MUTATION' },
    });

    return result;
  }
}
```

Apply to all resolver methods that access sensitive data.

#### 2.4 Wazuh SIEM Integration

**Wazuh deployment** (docker-compose.monitoring.yml — new file):
```yaml
services:
  wazuh-manager:
    image: wazuh/wazuh-manager:4.9.0
    volumes:
      - wazuh_data:/var/ossec/data
      - ./infrastructure/wazuh/ossec.conf:/var/ossec/etc/ossec.conf:ro

  wazuh-dashboard:
    image: wazuh/wazuh-dashboard:4.9.0
    ports:
      - "5601:5601"
    environment:
      OPENSEARCH_HOSTS: '["https://opensearch:9200"]'
```

**Log shipping configuration** — forward Pino logs + pgAudit logs to Wazuh:
```json
// wazuh agent config for each subgraph container
{
  "localfile": {
    "log_format": "json",
    "location": "/app/logs/*.log",
    "label.container": "subgraph-core"
  }
}
```

**Compliance rules to configure in Wazuh:**
- GDPR rules (built-in ruleset: rule IDs 80-99)
- PCI-DSS rules (for SOC2 overlap)
- Custom rules for failed authentication attempts
- Custom rules for cross-tenant access attempts

---

### PHASE 3 — GDPR Rights Implementation (Weeks 4-6)

#### 3.1 Right to Erasure — Cascading Deletion (G-03)

**New service** (`apps/subgraph-core/src/user/user-erasure.service.ts`):

```typescript
@Injectable()
export class UserErasureService {
  async eraseUserData(userId: string, tenantId: string, requestedBy: string): Promise<ErasureReport> {
    const report: ErasureReport = { userId, startedAt: new Date(), deletedEntities: [] };

    await withTenantContext(db, { tenantId, userId: requestedBy, userRole: 'SUPER_ADMIN' }, async (tx) => {
      // Step 1: Delete AI conversations (agent_messages first due to FK)
      const msgs = await tx.delete(agentMessages)
        .where(inArray(agentMessages.sessionId,
          tx.select({ id: agentSessions.id })
            .from(agentSessions).where(eq(agentSessions.userId, userId))
        )).returning();
      report.deletedEntities.push({ type: 'AGENT_MESSAGES', count: msgs.length });

      // Step 2: Delete agent sessions
      const sessions = await tx.delete(agentSessions)
        .where(eq(agentSessions.userId, userId)).returning();
      report.deletedEntities.push({ type: 'AGENT_SESSIONS', count: sessions.length });

      // Step 3: Delete annotations + embeddings
      const annotations = await tx.delete(annotationsTable)
        .where(eq(annotationsTable.userId, userId)).returning();
      report.deletedEntities.push({ type: 'ANNOTATIONS', count: annotations.length });

      // Step 4: Delete learning progress
      await tx.delete(userProgress).where(eq(userProgress.userId, userId));

      // Step 5: Delete CRDT collaboration data
      await tx.delete(collaborationSessions).where(eq(collaborationSessions.userId, userId));

      // Step 6: Anonymize discussion messages (preserve forum integrity)
      await tx.update(discussionMessages)
        .set({ userId: ANONYMIZED_USER_UUID, content: '[DELETED]' })
        .where(eq(discussionMessages.userId, userId));

      // Step 7: Delete uploaded files from MinIO + DB
      const files = await tx.select().from(filesTable).where(eq(filesTable.uploadedBy, userId));
      for (const file of files) {
        await this.minioService.deleteObject(file.storageKey);
      }
      await tx.delete(filesTable).where(eq(filesTable.uploadedBy, userId));

      // Step 8: Hard-delete user record (not soft-delete)
      await tx.delete(users).where(eq(users.id, userId));

      // Step 9: Disable user in Keycloak
      await this.keycloakAdmin.disableUser(userId);

      // Step 10: Write audit log of erasure
      await this.auditService.log({
        tenantId, userId: requestedBy,
        action: 'DATA_ERASURE', resourceType: 'USER', resourceId: userId,
        metadata: { report, gdprArticle: '17', completedAt: new Date() },
      });
    });

    return report;
  }
}
```

**GraphQL mutation** (in `apps/subgraph-core/src/user/user.graphql`):
```graphql
type Mutation {
  requestDataErasure(userId: ID!, reason: String!): DataErasureReport! @authenticated @requiresRole(roles: [SUPER_ADMIN, ORG_ADMIN])
  selfRequestErasure: DataErasureReport! @authenticated
}

type DataErasureReport {
  requestId: ID!
  userId: ID!
  completedAt: DateTime
  deletedEntityCounts: [EntityCount!]!
  status: ErasureStatus!
}
```

#### 3.2 Right to Data Portability (G-11)

**New endpoint** (`apps/subgraph-core/src/user/user-export.service.ts`):

```typescript
@Injectable()
export class UserExportService {
  async exportUserData(userId: string, tenantId: string): Promise<Buffer> {
    const export_data = {
      exportedAt: new Date().toISOString(),
      gdprArticle: '20',
      format: 'JSON/1.0',

      profile: await this.getUserProfile(userId, tenantId),
      learningProgress: await this.getUserProgress(userId, tenantId),
      annotations: await this.getUserAnnotations(userId, tenantId),
      aiConversations: await this.getUserAgentMessages(userId, tenantId),
      discussionPosts: await this.getUserDiscussions(userId, tenantId),
      consentHistory: await this.getUserConsentHistory(userId, tenantId),
    };

    const zip = new JSZip();
    zip.file('user-data.json', JSON.stringify(export_data, null, 2));
    // Attach uploaded files
    const files = await this.getUploadedFiles(userId, tenantId);
    for (const f of files) {
      const stream = await this.minioService.getObject(f.storageKey);
      zip.file(`files/${f.filename}`, stream);
    }

    return zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
  }
}
```

#### 3.3 Consent Management System (G-04)

**New migration** (`packages/db/src/migrations/0XX_consent.sql`):
```sql
CREATE TYPE consent_type AS ENUM (
  'ESSENTIAL',         -- Required for platform operation
  'ANALYTICS',         -- Usage analytics
  'AI_PROCESSING',     -- AI agent interactions and personalization
  'THIRD_PARTY_LLM',  -- OpenAI/Anthropic API calls
  'MARKETING',         -- Marketing communications
  'RESEARCH'           -- Research and aggregated analysis
);

CREATE TABLE user_consents (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id       UUID NOT NULL REFERENCES tenants(id),
  user_id         UUID NOT NULL REFERENCES users(id),
  consent_type    consent_type NOT NULL,
  given           BOOLEAN NOT NULL,
  given_at        TIMESTAMPTZ,
  withdrawn_at    TIMESTAMPTZ,
  ip_address      INET,
  user_agent      TEXT,
  consent_version VARCHAR(20) NOT NULL,  -- Version of privacy policy
  method          VARCHAR(50),           -- 'BANNER', 'SETTINGS', 'API'
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, consent_type)
);

ALTER TABLE user_consents ENABLE ROW LEVEL SECURITY;
CREATE POLICY user_consents_user_isolation ON user_consents
  USING (
    user_id::text = current_setting('app.current_user_id', TRUE)
    OR current_setting('app.current_user_role', TRUE) IN ('SUPER_ADMIN', 'ORG_ADMIN')
  );
```

**Frontend consent banner** (`apps/web/src/components/ConsentBanner.tsx`):

Use **Klaro** (open source consent manager):
```typescript
import * as klaro from 'klaro/dist/klaro-no-css';

const klaroConfig = {
  version: 1,
  elementID: 'klaro',
  storageMethod: 'localStorage',
  storageName: 'edusphere-consent',
  privacyPolicy: '/privacy-policy',
  default: false,
  mustConsent: false,
  acceptAll: true,
  services: [
    { name: 'ai-processing', title: 'AI Learning Assistant', purposes: ['ai_processing'], required: false },
    { name: 'analytics', title: 'Usage Analytics', purposes: ['analytics'], required: false },
    { name: 'third-party-llm', title: 'External AI Services', purposes: ['third_party_llm'], required: false },
  ],
  callback: async (consent, service) => {
    await graphqlClient.mutation(UPDATE_CONSENT_MUTATION, {
      consentType: service.name.toUpperCase().replace('-', '_'),
      given: consent,
      consentVersion: '1.0',
    });
  },
};

klaro.setup(klaroConfig);
```

#### 3.4 Data Retention Policy Engine (G-13)

**New table and service** (`packages/db/src/schema/retention.ts`):
```typescript
export const dataRetentionPolicies = pgTable('data_retention_policies', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').references(() => tenants.id),
  entityType: varchar('entity_type', { length: 50 }).notNull(),  // 'AGENT_MESSAGES', 'USER_PROGRESS', etc.
  retentionDays: integer('retention_days').notNull(),
  deleteMode: varchar('delete_mode', { length: 20 }).notNull().default('HARD_DELETE'),  // 'HARD_DELETE' | 'ANONYMIZE'
  enabled: boolean('enabled').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});
```

**Default retention policies (GDPR data minimization):**
```
agent_messages:     90 days (configurable per tenant)
agent_sessions:     90 days
user_progress:      7 years (educational record requirement)
annotations:        7 years (or until account deletion)
discussion_messages: 3 years
collaboration_crdt:  30 days (CRDT diffs, not snapshots)
audit_log:          7 years (SOC2 requirement)
```

**Cron job** (`apps/subgraph-core/src/jobs/retention-cleanup.service.ts`):
```typescript
@Cron('0 2 * * *') // 2 AM daily
async runRetentionCleanup() {
  const policies = await this.getEnabledPolicies();
  for (const policy of policies) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - policy.retentionDays);

    if (policy.deleteMode === 'HARD_DELETE') {
      await this.hardDelete(policy.entityType, cutoff, policy.tenantId);
    } else {
      await this.anonymize(policy.entityType, cutoff, policy.tenantId);
    }

    await this.auditService.log({ action: 'RETENTION_CLEANUP', metadata: { policy, cutoff } });
  }
}
```

---

### PHASE 4 — API Security Hardening (Weeks 6-7)

#### 4.1 GraphQL Rate Limiting (G-09)

**Implementation in gateway** (`apps/gateway/src/middleware/rate-limit.ts`):
```typescript
import { Ratelimit } from '@upstash/ratelimit';  // Works with Redis

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(100, '15 m'),  // 100 requests / 15 min per tenant
  analytics: true,
});

// Gateway middleware:
const tenantId = context.tenantId || context.req.ip;
const { success, limit, remaining, reset } = await ratelimit.limit(tenantId);

if (!success) {
  throw new GraphQLError('Rate limit exceeded', {
    extensions: { code: 'RATE_LIMIT_EXCEEDED', retryAfter: reset }
  });
}
```

Per-tenant rate limit configuration stored in `tenants.settings.rateLimits`:
```json
{
  "requestsPerWindow": 1000,
  "windowMs": 900000,
  "maxQueryDepth": 10,
  "maxQueryComplexity": 1000
}
```

#### 4.2 GraphQL Query Depth & Complexity (G-10)

**Installation:**
```bash
pnpm add --filter @edusphere/gateway graphql-depth-limit graphql-query-complexity
```

**Gateway configuration** (`apps/gateway/src/index.ts`):
```typescript
import depthLimit from 'graphql-depth-limit';
import { createComplexityLimitRule } from 'graphql-query-complexity';

plugins: [
  useValidationRules([
    depthLimit(10),
    createComplexityLimitRule(1000, {
      onCost: (cost) => logger.debug({ cost }, 'Query complexity'),
      formatErrorMessage: (cost) => `Query complexity ${cost} exceeds limit 1000`,
    }),
  ]),
]
```

#### 4.3 Fine-Grained Authorization with Cerbos (G-15)

**Cerbos deployment** (sidecar in Kubernetes or standalone):
```yaml
# infrastructure/k8s/cerbos-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: cerbos-pdp
spec:
  containers:
    - name: cerbos
      image: ghcr.io/cerbos/cerbos:0.39.0
      args: ["server", "--config=/config/cerbos.yml"]
      volumeMounts:
        - name: policies
          mountPath: /policies
```

**Policy files** (`infrastructure/cerbos/policies/`):

```yaml
# resource_policies/annotation.yaml
apiVersion: api.cerbos.dev/v1
resourcePolicy:
  version: default
  resource: annotation
  rules:
    - actions: ["read"]
      effect: EFFECT_ALLOW
      roles: ["STUDENT"]
      condition:
        match:
          expr: "request.resource.attr.userId == request.principal.id || request.resource.attr.layer in ['SHARED', 'INSTRUCTOR']"
    - actions: ["create", "update", "delete"]
      effect: EFFECT_ALLOW
      roles: ["STUDENT"]
      condition:
        match:
          expr: "request.resource.attr.userId == request.principal.id"
    - actions: ["*"]
      effect: EFFECT_ALLOW
      roles: ["INSTRUCTOR", "ORG_ADMIN", "SUPER_ADMIN"]
```

**NestJS integration** (`packages/auth/src/cerbos.guard.ts`):
```typescript
@Injectable()
export class CerbosGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const gqlCtx = GqlExecutionContext.create(context);
    const { auth, resource } = gqlCtx.getContext();

    const decision = await this.cerbosClient.checkResource({
      principal: { id: auth.userId, roles: [auth.role], attributes: { tenantId: auth.tenantId } },
      resource: { kind: resource.type, id: resource.id, attributes: resource.attributes },
      actions: [resource.action],
    });

    return decision.isAllowed(resource.action);
  }
}
```

---

### PHASE 5 — LLM & AI Compliance (Weeks 7-8)

#### 5.1 Third-Party LLM Data Protection (G-14)

**Consent enforcement** (`apps/subgraph-agent/src/ai/consent-check.middleware.ts`):
```typescript
async function checkLLMConsent(userId: string, tenantId: string): Promise<boolean> {
  const consent = await db.select().from(userConsents)
    .where(and(
      eq(userConsents.userId, userId),
      eq(userConsents.consentType, 'THIRD_PARTY_LLM'),
      eq(userConsents.given, true)
    ));
  return consent.length > 0;
}

// In agent resolver — before forwarding to OpenAI/Anthropic:
if (!await checkLLMConsent(userId, tenantId)) {
  throw new GraphQLError('AI service requires explicit consent. Please update your privacy settings.', {
    extensions: { code: 'CONSENT_REQUIRED', consentType: 'THIRD_PARTY_LLM' }
  });
}
```

**PII Scrubbing before LLM calls** — strip PII before sending to external APIs:
```typescript
import { presidioClient } from '@azure/ai-text-analytics'; // Or use Presidio OSS

async function scrubPII(text: string): Promise<string> {
  // Use Microsoft Presidio (open source) for PII entity detection and masking
  const entities = await presidio.analyzeText(text);
  return presidio.anonymize(text, entities);
}
```

**Microsoft Presidio** (open source PII anonymization): Deploy as Docker container alongside agent subgraph.

#### 5.2 EU AI Act Compliance Controls

**AI Transparency Labels** — every AI-generated response includes metadata:
```graphql
type AgentMessage {
  id: ID!
  content: String!
  role: MessageRole!
  isAIGenerated: Boolean!          # Always true for ASSISTANT role
  modelUsed: String                 # "ollama/llama3.2" or "openai/gpt-4o"
  confidenceScore: Float            # Model confidence if available
  humanReviewRequired: Boolean      # True for high-stakes assessments
  createdAt: DateTime!
}
```

**Human Oversight for High-Stakes Decisions:**
```typescript
// In quiz/assessment agent — flag for instructor review if score impacts enrollment
if (result.type === 'ASSESSMENT' && result.impactsGrade) {
  await this.natsClient.publish('agent.assessment.human_review_required', {
    sessionId, userId, tenantId,
    assessment: result,
    dueBy: addHours(new Date(), 24),
  });
}
```

**AI Opt-Out Setting** (in user preferences schema):
```typescript
// Add to user preferences JSONB:
{
  aiAssistant: {
    enabled: boolean,            // Master AI opt-out
    externalLLM: boolean,        // OpenAI/Anthropic calls
    behaviorProfiling: boolean,  // Learning behavior analysis for personalization
    agentTypes: {
      CHAVRUTA: boolean,
      QUIZ_MASTER: boolean,
      SUMMARIZER: boolean,
      DEBATE: boolean,
    }
  }
}
```

**Model documentation** (`docs/ai/MODEL_CARDS.md`):
- Document each agent type: purpose, model used per environment, training data (if applicable), limitations, bias considerations
- Required for EU AI Act GPAI transparency obligations

---

### PHASE 6 — Secrets Management Hardening (Week 8-9)

#### 6.1 Deploy OpenBao (HashiCorp Vault Open-Source Fork)

**OpenBao** replaces raw K8s secrets and provides:
- Dynamic credentials (auto-rotating DB passwords)
- PKI (certificate generation for mTLS)
- Transit encryption (application-layer key management)
- Audit logging of all secret access

**Kubernetes deployment:**
```yaml
# infrastructure/k8s/helm/openbao/values.yaml
server:
  ha:
    enabled: true
    replicas: 3
  auditStorage:
    enabled: true
    size: 10Gi
```

**Dynamic PostgreSQL credentials** (rotate every 1 hour):
```bash
bao write database/config/edusphere-db \
  plugin_name=postgresql-database-plugin \
  connection_url="postgresql://{{username}}:{{password}}@postgres:5432/edusphere" \
  allowed_roles="subgraph-*" \
  username="bao-admin" password="$VAULT_ADMIN_PASSWORD"

bao write database/roles/subgraph-core \
  db_name=edusphere-db \
  creation_statements="CREATE ROLE \"{{name}}\" WITH LOGIN PASSWORD '{{password}}' VALID UNTIL '{{expiration}}'; GRANT edusphere_app TO \"{{name}}\";" \
  default_ttl="1h" max_ttl="24h"
```

**NestJS integration** — request dynamic credentials on startup:
```typescript
// apps/subgraph-core/src/main.ts
const baoClient = new VaultClient({ endpoint: process.env.OPENBAO_ADDR });
const { data } = await baoClient.read('database/creds/subgraph-core');
process.env.DATABASE_URL = `postgresql://${data.username}:${data.password}@postgres:5432/edusphere`;
```

#### 6.2 Privado CLI — Static PII Scanning in CI/CD

**GitHub Actions step** (add to `.github/workflows/ci.yml`):
```yaml
- name: Scan for PII data flows
  uses: docker://docker.io/privado/privado:latest
  with:
    args: scan --sourceCodePath ${{ github.workspace }}
  env:
    PRIVADO_ACCESS_KEY: ${{ secrets.PRIVADO_KEY }}  # Free tier available
```

Privado will detect PII data flows and flag any new sensitive fields added to code without encryption handling.

---

### PHASE 7 — Container & Runtime Security (Week 9-10)

#### 7.1 Falco Runtime Detection

**Falco deployment** (Kubernetes DaemonSet):
```bash
helm repo add falcosecurity https://falcosecurity.github.io/charts
helm install falco falcosecurity/falco \
  --set driver.kind=ebpf \
  --set falcosidekick.enabled=true \
  --set falcosidekick.config.webhook.address=https://wazuh-manager:55000/alerts
```

**Custom rules for EduSphere** (`infrastructure/falco/edusphere-rules.yaml`):
```yaml
- rule: Unexpected DB direct access
  desc: Detects direct psql access bypassing application layer
  condition: >
    spawned_process and proc.name = "psql" and
    container.label.app in (subgraph-core, subgraph-content) and
    not proc.pname in (startup-scripts)
  output: "Direct psql access detected (user=%user.name cmd=%proc.cmdline container=%container.name)"
  priority: WARNING
  tags: [database, compliance, gdpr]

- rule: Unexpected outbound connection from agent
  desc: Agent subgraph connecting to non-whitelisted endpoint
  condition: >
    outbound and container.label.app = "subgraph-agent" and
    not fd.sip.name in (allowed-llm-endpoints, ollama, keycloak)
  output: "Unexpected outbound from agent (dest=%fd.sip.name:%fd.sport)"
  priority: CRITICAL
  tags: [network, ai-compliance]
```

#### 7.2 Expand Trivy Scanning

**Add to CI pipeline** (`.github/workflows/ci.yml`):
```yaml
- name: Trivy - scan IaC for misconfigurations
  uses: aquasecurity/trivy-action@master
  with:
    scan-type: config
    scan-ref: ./infrastructure/
    severity: 'HIGH,CRITICAL'
    exit-code: '1'

- name: Generate SBOM
  uses: aquasecurity/trivy-action@master
  with:
    scan-type: fs
    format: cyclonedx
    output: sbom.json
```

**SBOM (Software Bill of Materials)** — CycloneDX format, stored as build artifact. Required for SOC2 supply-chain controls and EU Cyber Resilience Act (CRA, coming 2027).

#### 7.3 OWASP Dependency-Check

**Add to CI pipeline:**
```yaml
- name: OWASP Dependency Check
  uses: dependency-check/Dependency-Check_Action@main
  with:
    project: EduSphere
    path: .
    format: HTML
    args: >
      --enableRetired
      --enableExperimental
      --suppression ./owasp-suppressions.xml
```

---

### PHASE 8 — SOC 2 Evidence Collection (Weeks 10-11)

#### 8.1 Deploy Probo (Open-Source Compliance Platform)

**Probo** manages controls, evidence, and audit workflows:
```bash
docker run -d \
  -p 3001:3001 \
  -e DATABASE_URL=postgresql://probo:pass@postgres:5432/probo \
  ghcr.io/getprobo/probo:latest
```

**Map EduSphere controls to SOC2 Trust Service Criteria:**
- CC6.1: JWT validation + RLS policies → Evidence: test reports, policy files
- CC6.7: Linkerd mTLS + NATS TLS → Evidence: Linkerd dashboard, network policies
- CC7.2: Wazuh + pgAudit logs → Evidence: SIEM dashboards, alert configurations
- CC8.1: GitHub PR requirement + CI gates → Evidence: GitHub audit logs, workflow runs

#### 8.2 GitHub SOC 2 Configuration (CC8.1 Change Management)

Required GitHub settings (add to documentation):
```yaml
# .github/branch-protection.yml (document enforcement)
main branch protection:
  - Require pull request reviews: minimum 2 approvers
  - Require status checks: ci, test, federation, security-scan
  - Restrict pushes to main: only via PR (no direct push)
  - Require signed commits: GPG/SSH signing mandatory
  - GitHub Audit Log streaming: enabled → OpenSearch
```

GitHub audit logs must be exported continuously (retention beyond GitHub's 90 days):
```yaml
# .github/workflows/audit-export.yml
schedule:
  - cron: '0 */6 * * *'  # Every 6 hours
steps:
  - name: Export GitHub Audit Logs
    run: |
      gh api --paginate /orgs/$ORG/audit-log \
        --field phrase="action:repo" \
        >> audit-logs/$(date +%Y-%m-%d).jsonl
      # Ship to OpenSearch/Wazuh
```

#### 8.3 Policy Documentation with Comply

**Install strongDM/comply** and set up policy library:
```bash
comply init --framework soc2
```

Required policy documents to maintain in `docs/policies/`:
```
policies/
├── information-security-policy.md
├── access-control-policy.md
├── change-management-policy.md
├── incident-response-policy.md
├── business-continuity-policy.md
├── vendor-management-policy.md
├── data-classification-policy.md
├── encryption-policy.md
├── gdpr-data-subject-rights-policy.md
└── ai-usage-policy.md
```

Each policy must include: Owner, Review date, Version, Controls mapped.

---

### PHASE 9 — White-Label Security Compliance (Weeks 11-12)

This phase covers everything required to deploy EduSphere as a branded product under a client's name, domain, and identity — while maintaining full SOC 2 / GDPR compliance for each client independently.

---

#### 9.1 Keycloak Identity Architecture — Three Options

The current single-realm approach is insufficient for true white-label deployments. Three architectures are available:

**Architecture Comparison:**

| Approach | Isolation | Scalability | Complexity | Recommended For |
|----------|-----------|-------------|------------|-----------------|
| **A. Multi-Realm** | Highest | ≤100 tenants | High | Enterprise white-label, high security |
| **B. Keycloak Organizations** (v26 native) | Medium-High | Unlimited | Medium | SaaS with many SMB tenants |
| **C. keycloak-orgs Extension** (Phase Two OSS) | Medium-High | Unlimited | Low | Fastest to implement |

---

**Option A — Multi-Realm (One Realm Per Enterprise Client):**

Best for: clients who require complete user database isolation (government, healthcare, financial).

**Realm provisioning script** (`scripts/provision-tenant-realm.sh`):
```bash
#!/bin/bash
# Usage: ./provision-tenant-realm.sh <slug> <uuid> <display-name> <redirect-domain>
TENANT_SLUG=$1
TENANT_UUID=$2
DISPLAY_NAME=$3
REDIRECT_DOMAIN=$4
REALM_NAME="edusphere-${TENANT_SLUG}"

# Authenticate to Keycloak admin
kcadm.sh config credentials \
  --server http://keycloak:8080 \
  --realm master \
  --user admin --password "$KEYCLOAK_ADMIN_PASSWORD"

# Create realm from security-hardened template
kcadm.sh create realms \
  -s realm="${REALM_NAME}" \
  -s enabled=true \
  -s displayName="${DISPLAY_NAME}" \
  -s bruteForceProtected=true \
  -s permanentLockout=false \
  -s maxFailureWaitSeconds=900 \
  -s failureFactor=5 \
  -s sslRequired=all \
  -s accessTokenLifespan=900 \
  -s ssoSessionIdleTimeout=1800

# Create OIDC client with tenant-specific settings
CLIENT_ID=$(kcadm.sh create clients -r "${REALM_NAME}" \
  -s clientId="edusphere-app" \
  -s enabled=true \
  -s publicClient=false \
  -s "redirectUris=[\"https://${REDIRECT_DOMAIN}/*\",\"https://${TENANT_SLUG}.edusphere.io/*\"]" \
  -s "webOrigins=[\"https://${REDIRECT_DOMAIN}\",\"https://${TENANT_SLUG}.edusphere.io\"]" \
  -i)

# Add tenant_id JWT claim (hardcoded to this tenant's UUID)
kcadm.sh create clients/${CLIENT_ID}/protocol-mappers/models -r "${REALM_NAME}" \
  -s name="tenant-id-claim" \
  -s protocolMapper="oidc-hardcoded-claim-mapper" \
  -s 'config={"claim.name":"tenant_id","claim.value":"'"${TENANT_UUID}"'","jsonType.label":"String","access.token.claim":"true","id.token.claim":"true"}'

# Apply per-tenant login theme (Keycloakify-generated)
kcadm.sh update realms/${REALM_NAME} \
  -s loginTheme="edusphere-${TENANT_SLUG}" \
  -s emailTheme="edusphere-${TENANT_SLUG}"

echo "Realm ${REALM_NAME} provisioned for tenant ${TENANT_UUID}"
```

**Capacity note:** Multi-realm approach degrades at >100 realms in a single Keycloak instance. For >100 enterprise clients, use multiple Keycloak instances with a routing layer.

---

**Option B — Keycloak v26 Organizations (Native, Recommended for SaaS):**

Keycloak 26 (already deployed by EduSphere) includes the **Organizations** feature (promoted from experimental in v25 to preview in v26). This is the preferred approach for SaaS with many tenants because it scales infinitely within a single realm.

**How it works:**
- One Keycloak realm for all tenants
- Each tenant is a Keycloak `Organization`
- Each organization has: its own login theme, its own IdP (SSO), its own member management
- Users are uniquely identified within their organization domain

**Organization provisioning** (`scripts/provision-tenant-org.sh`):
```bash
# Create organization
ORG_ID=$(kcadm.sh create organizations -r edusphere \
  -s name="${TENANT_SLUG}" \
  -s displayName="${DISPLAY_NAME}" \
  -s "domains=[{\"name\":\"${CLIENT_DOMAIN}\",\"verified\":false}]" \
  -i)

# Add tenant_id attribute to organization
kcadm.sh update organizations/${ORG_ID} -r edusphere \
  -s "attributes={\"tenant_id\":[\"${TENANT_UUID}\"]}"

# Configure organization-specific IdP (if client uses their own SSO)
kcadm.sh create organizations/${ORG_ID}/identity-providers -r edusphere \
  -s providerId="saml" \
  -s "config.singleSignOnServiceUrl=${CLIENT_SAML_URL}" \
  -s "config.entityId=${CLIENT_ENTITY_ID}"
```

**Per-tenant login page theming with Keycloakify** (open source, TypeScript):
```typescript
// Keycloakify allows building per-realm login pages in React
// Each tenant gets a themed login page via Organization-level theme override

// Build tenant-specific theme:
// keycloakify build --theme-name "edusphere-${tenantSlug}"
// Uploads to: /opt/keycloak/providers/edusphere-${tenantSlug}.jar
```

---

**Option C — keycloak-orgs by Phase Two (OSS Extension):**

GitHub: `p2-inc/keycloak-orgs` — Adds organization management to Keycloak before Organizations was native. Includes:
- Organization invitations by email
- Domain-based auto-assignment (users with @client.com auto-join client's org)
- Per-organization roles
- Open source, Apache 2.0 license

Installation:
```bash
# Download and install as Keycloak provider
wget https://github.com/p2-inc/keycloak-orgs/releases/latest/download/keycloak-orgs-*.jar \
  -O /opt/keycloak/providers/keycloak-orgs.jar
```

**Recommendation:** Use **Option B** (native Keycloak Organizations) for SaaS tenants, and **Option A** (multi-realm) for enterprise clients requiring contractual user-database isolation.

---

**Gateway dynamic realm/org detection** (`apps/gateway/src/middleware/realm-detector.ts`):
```typescript
interface TenantIdentity {
  realmName: string;
  organizationId?: string;
  tenantId: string;
}

async function detectTenantIdentity(request: Request): Promise<TenantIdentity> {
  // Priority 1: Explicit header (on-prem, B2B API clients)
  const headerOrg = request.headers['x-organization-id'] as string;
  if (headerOrg) {
    const tenant = await getTenantByOrgId(headerOrg);
    return { realmName: tenant.realmName, organizationId: headerOrg, tenantId: tenant.id };
  }

  // Priority 2: Custom domain (white-label: app.client.com)
  const hostname = request.headers.host as string;
  const customDomainTenant = await getTenantByDomain(hostname);
  if (customDomainTenant) {
    return { realmName: customDomainTenant.realmName, tenantId: customDomainTenant.id };
  }

  // Priority 3: EduSphere subdomain (tenant.edusphere.io)
  const subdomain = hostname.split('.')[0];
  if (subdomain !== 'www' && subdomain !== 'app') {
    const subdomainTenant = await getTenantBySlug(subdomain);
    if (subdomainTenant) {
      return { realmName: subdomainTenant.realmName, tenantId: subdomainTenant.id };
    }
  }

  // Priority 4: JWT issuer (already authenticated request)
  const jwtIssuer = extractIssuerFromToken(request.headers.authorization as string);
  if (jwtIssuer) {
    return { realmName: extractRealmFromIssuer(jwtIssuer), tenantId: extractTenantId(jwtIssuer) };
  }

  // Fallback: default SaaS realm
  return { realmName: 'edusphere', tenantId: DEFAULT_TENANT_ID };
}
```

---

#### 9.2 Custom Domain Management (CNAME + SSL Automation)

White-label clients need to deploy on their own domain (e.g., `learn.company.com` instead of `company.edusphere.io`).

**Architecture:**
```
learn.company.com  (CNAME → company.edusphere.io)
  → Traefik Ingress (detects SNI hostname)
    → Routes to EduSphere with tenant context header
      → Dynamic SSL cert via Let's Encrypt ACME
```

**Tenant domain table** (`packages/db/src/schema/tenantDomains.ts`):
```typescript
export const tenantDomains = pgTable('tenant_domains', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').references(() => tenants.id).notNull(),
  domain: varchar('domain', { length: 255 }).unique().notNull(),
  domainType: varchar('domain_type').notNull().default('SUBDOMAIN'), // 'SUBDOMAIN' | 'CUSTOM'
  verified: boolean('verified').notNull().default(false),
  verificationToken: varchar('verification_token', { length: 64 }),
  sslProvisioned: boolean('ssl_provisioned').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});
```

**Domain verification + Traefik SSL provisioning** (`apps/subgraph-core/src/tenant/domain-provisioner.service.ts`):
```typescript
@Injectable()
export class DomainProvisionerService {
  async requestCustomDomain(tenantId: string, domain: string): Promise<void> {
    const token = crypto.randomBytes(32).toString('hex');

    // Step 1: Store verification challenge
    await db.insert(tenantDomains).values({ tenantId, domain, verificationToken: token });

    // Step 2: Instruct client to create DNS TXT record
    return { verificationRecord: `edusphere-verify=${token}`, dnsTarget: 'verify.edusphere.io' };
  }

  @Cron('*/5 * * * *') // Check every 5 minutes
  async verifyAndProvisionDomains(): Promise<void> {
    const pending = await db.select().from(tenantDomains).where(eq(tenantDomains.verified, false));

    for (const domain of pending) {
      const txtRecords = await dns.resolveTxt(domain.domain);
      const verified = txtRecords.flat().includes(`edusphere-verify=${domain.verificationToken}`);

      if (verified) {
        // Step 3: Create Traefik IngressRoute (triggers Let's Encrypt ACME)
        await this.createTraefikRoute(domain.domain, domain.tenantId);
        await db.update(tenantDomains).set({ verified: true, sslProvisioned: true })
          .where(eq(tenantDomains.id, domain.id));

        this.logger.info({ domain: domain.domain, tenantId: domain.tenantId }, 'Custom domain provisioned');
      }
    }
  }

  private async createTraefikRoute(domain: string, tenantId: string): Promise<void> {
    // Write Traefik CRD IngressRoute (Kubernetes) or file provider config
    const ingressRoute = {
      apiVersion: 'traefik.io/v1alpha1',
      kind: 'IngressRoute',
      metadata: { name: `custom-domain-${tenantId}`, namespace: 'edusphere' },
      spec: {
        entryPoints: ['websecure'],
        routes: [{
          match: `Host(\`${domain}\`)`,
          kind: 'Rule',
          middlewares: [{ name: 'tenant-inject', namespace: 'edusphere' }],
          services: [{ name: 'edusphere-gateway', port: 4000 }],
        }],
        tls: {
          certResolver: 'letsencrypt',
          domains: [{ main: domain }],
        },
      },
    };

    await kubernetesClient.applyManifest(ingressRoute);
  }
}
```

**Traefik middleware** — injects tenant header based on domain lookup:
```yaml
# Traefik middleware to inject x-tenant-id header from custom domain
apiVersion: traefik.io/v1alpha1
kind: Middleware
metadata:
  name: tenant-inject
spec:
  plugin:
    tenantHeaderInjector:
      domainToTenantMap: "/etc/traefik/tenant-map.json"  # Updated by provisioner
      headerName: "X-Tenant-ID"
```

---

#### 9.3 Per-Tenant Feature Flags (Flagsmith — Open Source)

White-label clients may need to enable/disable specific features (AI assistants, specific agent types, collaboration tools, analytics).

**Flagsmith deployment** (self-hosted):
```bash
docker run -d \
  --name flagsmith \
  -p 8000:8000 \
  -e DATABASE_URL=postgresql://flagsmith:pass@postgres:5432/flagsmith \
  flagsmith/flagsmith:latest
```

**Feature flags defined per tenant:**
```typescript
// Feature flag structure
interface TenantFeatureFlags {
  // AI Features
  aiAssistantEnabled: boolean;
  agentTypes: ('CHAVRUTA' | 'QUIZ_MASTER' | 'SUMMARIZER' | 'DEBATE')[];
  externalLLMEnabled: boolean;  // OpenAI/Anthropic — may be disabled in air-gapped
  localLLMOnly: boolean;        // Ollama only — for air-gapped/GDPR-strict clients

  // Collaboration
  realTimeCollaborationEnabled: boolean;
  discussionForumsEnabled: boolean;

  // Analytics
  analyticsEnabled: boolean;
  learningProgressTracking: boolean;

  // Security
  mfaRequired: boolean;         // Enforce MFA for all users in tenant
  ssoRequired: boolean;         // Enforce SSO (no username/password)
  ipWhitelistEnabled: boolean;  // Restrict access by IP range
  dataResidencyRegion: string;  // Enforce specific cloud region
}
```

**NestJS Flagsmith integration** (`packages/flagsmith/src/flagsmith.service.ts`):
```typescript
@Injectable()
export class FlagsmithService {
  async getTenantFlags(tenantId: string): Promise<TenantFeatureFlags> {
    const flags = await this.flagsmithClient.getEnvironmentFlags({
      identifier: tenantId,  // Per-tenant flag evaluation
    });

    return {
      aiAssistantEnabled: flags.isFeatureEnabled('ai_assistant'),
      externalLLMEnabled: flags.isFeatureEnabled('external_llm'),
      localLLMOnly: flags.isFeatureEnabled('local_llm_only'),
      mfaRequired: flags.isFeatureEnabled('mfa_required'),
      // ... etc
    };
  }
}
```

**Security enforcement from feature flags:**
```typescript
// In agent resolver — check feature flag before processing
const flags = await this.flagsmithService.getTenantFlags(tenantId);

if (!flags.aiAssistantEnabled) {
  throw new GraphQLError('AI assistant is not enabled for this organization', {
    extensions: { code: 'FEATURE_DISABLED' }
  });
}

if (flags.localLLMOnly && request.modelProvider !== 'ollama') {
  throw new GraphQLError('This organization requires local AI processing only', {
    extensions: { code: 'POLICY_VIOLATION', policy: 'LOCAL_LLM_ONLY' }
  });
}
```

---

#### 9.4 Per-Tenant SSO / SAML Federation

Enterprise white-label clients require authentication through their own Identity Provider (Microsoft Entra, Okta, Google Workspace, ADFS).

**SSO configuration stored per tenant** (in `tenants.settings.sso`):
```typescript
interface TenantSSOConfig {
  enabled: boolean;
  protocol: 'SAML' | 'OIDC';
  required: boolean;  // If true, username/password login is disabled

  saml?: {
    entityId: string;
    singleSignOnServiceUrl: string;
    singleLogoutServiceUrl: string;
    signingCertificate: string;
    nameIdPolicyFormat: string;
  };

  oidc?: {
    issuerUrl: string;
    clientId: string;
    clientSecret: string;  // Stored encrypted in OpenBao
    scopes: string[];
    claimMappings: {
      userId: string;    // e.g., "sub" or "employeeId"
      email: string;     // e.g., "email" or "mail"
      firstName: string;
      lastName: string;
      role: string;      // e.g., "groups"
    };
  };
}
```

**Keycloak Identity Provider provisioning via API:**
```typescript
async provisionSSO(tenantId: string, ssoConfig: TenantSSOConfig): Promise<void> {
  const realmName = await this.getTenantRealm(tenantId);

  if (ssoConfig.protocol === 'SAML') {
    await this.keycloakAdmin.createIdentityProvider({
      realm: realmName,
      providerId: 'saml',
      alias: `sso-${tenantId}`,
      config: {
        entityId: ssoConfig.saml.entityId,
        singleSignOnServiceUrl: ssoConfig.saml.singleSignOnServiceUrl,
        signingCertificate: ssoConfig.saml.signingCertificate,
        postBindingAuthnRequest: 'true',
        wantAuthnRequestsSigned: 'true',
      },
    });
  }

  // Map external IdP roles to EduSphere roles
  await this.keycloakAdmin.createIdentityProviderMapper({
    realm: realmName,
    identityProviderAlias: `sso-${tenantId}`,
    name: 'role-mapper',
    identityProviderMapper: 'saml-role-idp-mapper',
    config: {
      syncMode: 'INHERIT',
      attribute: 'groups',
      'attribute.value': 'educators',
      role: 'INSTRUCTOR',
    },
  });
}
```

---

#### 9.5 Dynamic Frontend Branding System

**Tenant branding fetch on app init** (`apps/web/src/lib/branding.ts`):
```typescript
interface TenantBranding {
  logoUrl: string;
  logoMarkUrl: string;         // Compact version for mobile
  faviconUrl: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  backgroundColor: string;
  textColor: string;
  fontFamily: string;          // Custom Google Font or system font
  organizationName: string;
  tagline: string;
  privacyPolicyUrl: string;
  termsOfServiceUrl: string;
  supportEmail: string;
  supportUrl: string;
  footerLinks: { label: string; url: string }[];
  hideEduSphereBranding: boolean;  // White-label: hide "Powered by EduSphere"
}

export async function applyTenantBranding(tenantId: string): Promise<TenantBranding> {
  const branding = await graphqlClient.query(GET_TENANT_BRANDING_QUERY, { tenantId });

  // Apply CSS custom properties (affects ALL shadcn/ui + Tailwind components)
  const root = document.documentElement;
  const hsl = hexToHSL(branding.primaryColor);
  root.style.setProperty('--primary', hsl);
  root.style.setProperty('--primary-foreground', getContrastColor(hsl));
  root.style.setProperty('--secondary', hexToHSL(branding.secondaryColor));
  root.style.setProperty('--accent', hexToHSL(branding.accentColor));
  root.style.setProperty('--background', hexToHSL(branding.backgroundColor));

  // Custom font (preloaded from MinIO or Google Fonts)
  if (branding.fontFamily !== 'system') {
    const fontLink = document.createElement('link');
    fontLink.rel = 'stylesheet';
    fontLink.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(branding.fontFamily)}`;
    document.head.appendChild(fontLink);
    root.style.setProperty('--font-sans', `'${branding.fontFamily}', sans-serif`);
  }

  // Update document metadata
  document.title = branding.organizationName;
  (document.querySelector('link[rel="icon"]') as HTMLLinkElement).href = branding.faviconUrl;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', branding.primaryColor);

  return branding;
}
```

`apps/web/src/main.tsx`:
```typescript
// BEFORE ReactDOM.render() — apply branding first to prevent FOUC (Flash of Unstyled Content)
const tenantId = detectTenantFromDomain();
const branding = await applyTenantBranding(tenantId);

// Store in Zustand for components to access
useBrandingStore.setState({ branding });

ReactDOM.createRoot(document.getElementById('root')!).render(
  <BrandingProvider branding={branding}>
    <App />
  </BrandingProvider>
);
```

**GraphQL branding query + mutation:**
```graphql
type Query {
  tenantBranding: TenantBranding! # Unauthenticated — needed before login
}

type Mutation {
  updateTenantBranding(input: TenantBrandingInput!): TenantBranding!
    @authenticated @requiresRole(roles: [ORG_ADMIN, SUPER_ADMIN])
}

type TenantBranding {
  logoUrl: String!
  logoMarkUrl: String
  faviconUrl: String!
  primaryColor: String!
  secondaryColor: String!
  accentColor: String!
  fontFamily: String!
  organizationName: String!
  tagline: String
  privacyPolicyUrl: String
  termsOfServiceUrl: String
  supportEmail: String
  hideEduSphereBranding: Boolean!
}
```

---

#### 9.6 Per-Tenant Storage Isolation (G-17 Extension)

**MinIO bucket per tenant** (`apps/subgraph-content/src/media/media.service.ts`):
```typescript
private getTenantBucket(tenantId: string): string {
  return `edusphere-tenant-${tenantId.replace(/-/g, '')}`;  // MinIO bucket naming rules
}

async ensureTenantBucket(tenantId: string, region: string = 'eu-central-1'): Promise<void> {
  const bucket = this.getTenantBucket(tenantId);
  const exists = await this.minioClient.bucketExists(bucket);
  if (!exists) {
    // Create bucket in tenant's data residency region
    await this.minioClient.makeBucket(bucket, region);

    // Block all public access
    await this.minioClient.setBucketPolicy(bucket, JSON.stringify({
      Version: '2012-10-17',
      Statement: [{ Effect: 'Deny', Principal: '*', Action: 's3:*',
        Resource: [`arn:aws:s3:::${bucket}/*`],
        Condition: { Bool: { 'aws:SecureTransport': 'false' } }  // HTTPS only
      }]
    }));

    // Enable server-side encryption (AES-256)
    await this.minioClient.setBucketEncryption(bucket, {
      Rule: [{ ApplyServerSideEncryptionByDefault: { SSEAlgorithm: 'AES256' } }]
    });

    // Enable versioning (for GDPR audit trail)
    await this.minioClient.setBucketVersioning(bucket, { Status: 'Enabled' });

    this.logger.info({ tenantId, bucket, region }, 'Tenant storage bucket provisioned');
  }
}
```

---

#### 9.7 Data Residency Controls

**Tenant-level region configuration in schema:**
```typescript
// packages/db/src/schema/tenants.ts — extend settings JSONB
interface TenantSettings {
  dataResidency: {
    primaryRegion: 'eu-central-1' | 'eu-west-1' | 'us-east-1' | 'ap-southeast-1' | 'custom';
    allowCrossRegionBackup: boolean;    // false for strict GDPR tenants
    customRegionLabel?: string;         // For on-prem: "On-Premises Frankfurt DC"
    storageRegion: string;              // MinIO/S3 region
    postgresRegion: string;             // DB region (for multi-region K8s)
    llmProcessingRegion: string;        // Where AI inference runs
  };
  compliance: {
    gdprApplicable: boolean;
    gdprSupervisoryAuthority: string;   // e.g., "BfDI" (Germany), "CNIL" (France)
    hipaaApplicable: boolean;
    soc2Required: boolean;
    dataRetentionOverrideDays?: number; // Tenant-specific retention override
  };
}
```

**K8s namespace-per-tenant for strict isolation (enterprise):**
```yaml
# For enterprise clients needing namespace isolation
apiVersion: v1
kind: Namespace
metadata:
  name: edusphere-tenant-{{ .TenantSlug }}
  labels:
    tenant-id: "{{ .TenantUUID }}"
    data-residency: "{{ .Region }}"
---
# NetworkPolicy: isolate namespace from other tenants
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: tenant-isolation
  namespace: edusphere-tenant-{{ .TenantSlug }}
spec:
  podSelector: {}
  policyTypes: [Ingress, Egress]
  ingress:
    - from:
        - namespaceSelector:
            matchLabels: { name: edusphere-gateway }  # Only gateway can reach
  egress:
    - to:
        - namespaceSelector:
            matchLabels: { name: edusphere-infrastructure }  # DB, NATS, MinIO
```

**K8s node affinity for EU data residency:**
```yaml
# Helm template — node affinity based on tenant data residency
affinity:
  nodeAffinity:
    requiredDuringSchedulingIgnoredDuringExecution:
      nodeSelectorTerms:
        - matchExpressions:
            - key: topology.kubernetes.io/region
              operator: In
              values: ["{{ .DataResidencyRegion }}"]
```

---

#### 9.8 Per-Tenant Audit Log Separation (White-Label Compliance)

Each white-label client must be able to access their own audit logs independently, without seeing other tenants' data.

**Tenant-accessible audit log GraphQL:**
```graphql
type Query {
  auditLog(
    startDate: DateTime!
    endDate: DateTime!
    action: String
    userId: ID
    resourceType: String
    pagination: CursorPaginationInput!
  ): AuditLogConnection! @authenticated @requiresRole(roles: [ORG_ADMIN, SUPER_ADMIN])
}

type AuditLogEntry {
  id: ID!
  userId: ID
  action: String!
  resourceType: String
  resourceId: ID
  ipAddress: String  # Masked to /24 for privacy: 192.168.1.xxx
  userAgent: String
  status: AuditStatus!
  createdAt: DateTime!
}
```

**Audit log export for client compliance auditors:**
```graphql
type Mutation {
  exportAuditLog(
    startDate: DateTime!
    endDate: DateTime!
    format: ExportFormat!  # JSON, CSV, SYSLOG
  ): DownloadToken! @authenticated @requiresRole(roles: [ORG_ADMIN, SUPER_ADMIN])
}
```

---

#### 9.9 White-Label Tenant Provisioning — Full IaC Automation

**Complete tenant onboarding script** (`scripts/onboard-tenant.ts`):
```typescript
async function onboardTenant(config: {
  name: string;
  slug: string;
  plan: 'STARTER' | 'PROFESSIONAL' | 'ENTERPRISE';
  region: string;
  identityArchitecture: 'SINGLE_REALM_ORG' | 'DEDICATED_REALM';
  ssoConfig?: TenantSSOConfig;
  customDomain?: string;
  branding?: Partial<TenantBranding>;
}) {
  const tenantId = crypto.randomUUID();

  // 1. Create database tenant record + RLS policies
  await db.insert(tenants).values({ id: tenantId, name: config.name, slug: config.slug, plan: config.plan });

  // 2. Provision Keycloak realm or organization
  if (config.identityArchitecture === 'DEDICATED_REALM') {
    await provisionKeycloakRealm(tenantId, config.slug, config.name, config.ssoConfig);
  } else {
    await provisionKeycloakOrganization(tenantId, config.slug, config.name, config.ssoConfig);
  }

  // 3. Create MinIO bucket in correct region
  await ensureTenantBucket(tenantId, config.region);

  // 4. Set up Flagsmith environment for tenant feature flags
  await flagsmith.createEnvironment(tenantId, config.plan);

  // 5. Configure custom domain (if provided)
  if (config.customDomain) {
    await requestCustomDomain(tenantId, config.customDomain);
  }

  // 6. Apply branding
  if (config.branding) {
    await applyBranding(tenantId, config.branding);
  }

  // 7. Create default ORG_ADMIN user (send onboarding email via Keycloak)
  await createInitialAdminUser(tenantId, config);

  // 8. Seed demo content (optional)
  if (config.plan !== 'ENTERPRISE') {
    await seedDemoContent(tenantId);
  }

  // 9. Write audit log of tenant creation
  await auditService.log({ action: 'TENANT_CREATED', resourceId: tenantId, metadata: config });

  // 10. Send onboarding webhook (if configured)
  await sendOnboardingWebhook(tenantId, config);

  return { tenantId, adminSetupUrl: `https://${config.slug}.edusphere.io/setup` };
}
```

---

#### 9.10 White-Label Compliance Posture

Each white-label client gets their **own compliance posture** — EduSphere acts as a data processor under GDPR Article 28.

**Per-client compliance documentation package** (generated automatically):
1. **Data Processing Agreement (DPA)** — pre-signed template with client's data filled in
2. **Sub-processor list** — OpenAI, Anthropic (if enabled), Keycloak, MinIO with DPAs
3. **Audit log access** — ORG_ADMIN can access full audit trail
4. **Privacy policy template** — customizable, includes EduSphere's processing activities
5. **Incident response contacts** — EduSphere's DPO contact + 72h breach notification commitment

**White-label compliance API:**
```graphql
type Query {
  complianceStatus: ComplianceStatus! @authenticated @requiresRole(roles: [ORG_ADMIN])
  downloadDPA: DownloadToken! @authenticated @requiresRole(roles: [ORG_ADMIN])
  subProcessorList: [SubProcessor!]! @authenticated @requiresRole(roles: [ORG_ADMIN])
}

type ComplianceStatus {
  gdprCompliant: Boolean!
  missingConsents: [String!]!
  dataRetentionConfigured: Boolean!
  encryptionEnabled: Boolean!
  mfaEnforced: Boolean!
  ssoConfigured: Boolean!
  lastSecurityReview: DateTime
  pendingActions: [ComplianceAction!]!
}
```

---

### PHASE 10 — On-Premises Security Guide (Weeks 12-13)

#### 10.1 Air-Gapped Installation Package

**New document** (`docs/deployment/AIR_GAPPED_INSTALL.md`):

Content to include:
1. Pre-flight container image export: `docker save ghcr.io/edusphere/*:VERSION | gzip > edusphere-images.tar.gz`
2. Import into air-gapped registry: `docker load < edusphere-images.tar.gz`
3. Configure internal image registry URL in Helm values
4. Offline Keycloak realm import procedure
5. Certificate Authority setup for internal mTLS (step-ca by smallstep — open source)
6. Corporate proxy configuration (`HTTP_PROXY`, `NO_PROXY` env vars)
7. NATS JetStream TLS with self-signed certificates
8. MinIO with internal S3-compatible storage alternative

#### 10.2 Self-Signed Certificate Setup (step-ca)

**Smallstep step-ca** (open source internal CA):
```bash
# Initialize internal CA
step ca init \
  --name "EduSphere Internal CA" \
  --dns edusphere.internal \
  --address :8443 \
  --provisioner admin@edusphere.internal

# Issue certificates for each service
step ca certificate "postgres.edusphere.internal" server.crt server.key
step ca certificate "nats.edusphere.internal" nats.crt nats.key
step ca certificate "gateway.edusphere.internal" gateway.crt gateway.key
```

**Auto-renewal** (ACME protocol, built into step-ca): Certificates renew automatically, no manual intervention.

#### 10.3 On-Prem Security Hardening Checklist

**New document** (`docs/deployment/SECURITY_HARDENING.md`):

```markdown
## Pre-Deployment Security Checklist

### Network
- [ ] All inter-service communication via TLS (Linkerd mesh or manual certs)
- [ ] PostgreSQL: `sslmode=require` in all DATABASE_URL values
- [ ] NATS: TLS + NKey authentication configured
- [ ] MinIO: HTTPS only, HTTP disabled
- [ ] Keycloak: `sslRequired=all` in realm settings
- [ ] Gateway: HTTPS only (terminate TLS at Traefik/Nginx)
- [ ] Block direct access to all subgraphs (only via gateway)

### Authentication
- [ ] Keycloak bruteForceProtected=true
- [ ] MFA enabled for all INSTRUCTOR, ORG_ADMIN, SUPER_ADMIN roles
- [ ] Keycloak admin console NOT accessible from internet
- [ ] All default passwords changed (no 'admin/admin123')
- [ ] Keycloak realm token lifetime ≤ 900 seconds

### Database
- [ ] PostgreSQL: No superuser for application connections
- [ ] PostgreSQL: pgAudit enabled and logging to SIEM
- [ ] All RLS policies verified with cross-tenant test suite
- [ ] Database backups encrypted and tested
- [ ] Backup retention policy documented

### Secrets
- [ ] No secrets in environment files committed to Git
- [ ] All secrets via OpenBao/Vault (not K8s raw Secrets)
- [ ] Database passwords rotated after initial setup
- [ ] API keys rotated on schedule (quarterly)

### Monitoring
- [ ] Wazuh agent deployed on all nodes
- [ ] Falco deployed as DaemonSet
- [ ] pgAudit logs shipping to SIEM
- [ ] Alert on failed login attempts > 5
- [ ] Alert on cross-tenant RLS violation attempts
- [ ] Alert on unexpected outbound connections from containers

### GDPR (for EU deployments)
- [ ] Data residency configured for EU region
- [ ] DPA signed with all sub-processors
- [ ] Consent banner deployed and tested
- [ ] Right-to-erasure workflow tested end-to-end
- [ ] Data portability export tested
- [ ] Incident response plan documented and contact list current
- [ ] DPIA completed and archived
```

---

### PHASE 11 — Incident Response System (Week 13-14)

#### 11.1 Incident Response Procedure

**New document** (`docs/security/INCIDENT_RESPONSE.md`):

**Breach Detection → 72-Hour GDPR Notification Flow:**

```
0:00 — Detection
├─ Source: Wazuh alert / Falco alert / User report / Third-party notification
├─ Immediate: Isolate affected systems (kubectl cordon node)
├─ Assign: Incident Commander (always a named individual)
└─ Open: Incident Slack channel #incident-YYYY-MM-DD-N

0:00 to 0:04 hours — Initial Assessment
├─ Determine: Personal data involved? (Yes → GDPR clock starts)
├─ Scope: Which tenants affected? How many users?
├─ Severity: Critical / High / Medium (determine within 4 hours)
└─ Notify: Legal counsel immediately if personal data confirmed

4:00 to 24:00 hours — Investigation
├─ Preserve: Copy logs to tamper-evident storage before remediation
├─ Investigate: Root cause analysis using audit_log + Wazuh timeline
├─ Contain: Deploy patch or rollback, revoke compromised credentials
└─ Draft: Initial notification to DPA (can be phase 1 without full details)

24:00 to 72:00 hours — Notification (GDPR Art.33)
├─ Notify: Supervisory Authority (DPA) within 72 hours
│   └─ Include: Nature, categories/approximate number of data subjects,
│              approximate number of records, likely consequences,
│              measures taken/proposed
├─ Notify: Affected users if high risk (GDPR Art.34)
└─ Notify: Affected tenants (contract obligation, typically < 24h)

72+ hours — Recovery & Post-Mortem
├─ Full RCA document with timeline
├─ Update Wazuh detection rules
├─ Update security procedures
└─ File with SOC2 auditor (evidence of CC7.4)
```

#### 11.2 Automated Breach Detection

**Wazuh custom rules** (`infrastructure/wazuh/rules/edusphere-breach.xml`):
```xml
<group name="edusphere,breach">
  <!-- Cross-tenant access attempt -->
  <rule id="100001" level="15">
    <decoded_as>json</decoded_as>
    <field name="message">cross.tenant.violation</field>
    <description>CRITICAL: Cross-tenant RLS violation attempted</description>
    <options>alert_by_email</options>
    <email_to>security@edusphere.io</email_to>
  </rule>

  <!-- Mass data export (potential exfiltration) -->
  <rule id="100002" level="12">
    <decoded_as>json</decoded_as>
    <field name="action">exportUserData</field>
    <field name="count">\d{3,}</field>
    <description>HIGH: Mass data export detected (&gt;100 records)</description>
  </rule>

  <!-- Unusual authentication pattern -->
  <rule id="100003" level="10" frequency="10" timeframe="60">
    <decoded_as>json</decoded_as>
    <field name="status">FAILED</field>
    <field name="action">LOGIN</field>
    <description>Authentication brute force detected</description>
  </rule>
</group>
```

---

## PART 5 — VERIFICATION & TESTING PLAN

### 5.1 Security Test Suite Requirements

Every implemented control must have a corresponding test:

| Control | Test Type | Location | Pass Criteria |
|---------|-----------|----------|---------------|
| RLS variable names | Unit test | `packages/db/src/rls/` | Annotations RLS blocks cross-user access |
| Cascading deletion | Integration test | `apps/subgraph-core/src/test/` | User deletion removes all child records |
| Consent enforcement | Integration test | `apps/subgraph-agent/src/test/` | LLM call rejected without THIRD_PARTY_LLM consent |
| Rate limiting | Load test | `tests/security/rate-limit.spec.ts` | 101st request returns 429 |
| Query depth | Unit test | `apps/gateway/src/test/` | Depth > 10 returns validation error |
| Query complexity | Unit test | `apps/gateway/src/test/` | Complexity > 1000 returns validation error |
| CORS wildcard | Unit test | `apps/gateway/src/test/` | Missing CORS_ORIGIN → empty allowed origins |
| Data portability | E2E test | `apps/web/e2e/` | Export ZIP contains all expected files |
| Encryption at rest | Integration test | `packages/db/src/test/` | PII fields return ciphertext when read directly from DB |
| mTLS | Network test | `tests/security/network.spec.ts` | Plain HTTP to subgraph returns TLS error |
| Audit log | Integration test | `packages/db/src/test/` | Every mutation creates audit_log entry |

### 5.2 Cross-Tenant Isolation Tests

**New test file** (`tests/security/cross-tenant.spec.ts`):
```typescript
describe('Cross-Tenant Security', () => {
  it('Tenant A cannot read Tenant B annotations', async () => {
    const tenantAToken = await getToken('tenant-a-user');
    const tenantBAnnotationId = await createAnnotation('tenant-b-user');

    const response = await graphqlRequest(tenantAToken, `
      query { annotation(id: "${tenantBAnnotationId}") { id content } }
    `);

    expect(response.errors[0].extensions.code).toBe('NOT_FOUND');
  });

  it('Tenant A cannot list Tenant B users', async () => { /* ... */ });
  it('Tenant A cannot access Tenant B AI conversations', async () => { /* ... */ });
  it('Tenant A cannot modify Tenant B courses', async () => { /* ... */ });
});
```

### 5.3 GDPR Rights Tests

```typescript
describe('GDPR Data Subject Rights', () => {
  it('Data erasure removes all user data', async () => {
    const userId = await createTestUser(tenantId);
    await createAnnotations(userId, 5);
    await createAgentConversation(userId, 10);

    await requestErasure(userId);

    expect(await getAnnotations(userId)).toHaveLength(0);
    expect(await getAgentMessages(userId)).toHaveLength(0);
    expect(await getUserRecord(userId)).toBeNull();
  });

  it('Data portability export contains all user data', async () => {
    const zipBuffer = await exportUserData(userId);
    const zip = await JSZip.loadAsync(zipBuffer);

    expect(zip.file('user-data.json')).toBeTruthy();
    const data = JSON.parse(await zip.file('user-data.json').async('text'));
    expect(data.profile).toBeDefined();
    expect(data.annotations).toBeDefined();
    expect(data.aiConversations).toBeDefined();
  });

  it('Consent withdrawal stops LLM calls', async () => {
    await withdrawConsent(userId, 'THIRD_PARTY_LLM');

    const response = await sendAgentMessage(userId, 'Hello');
    expect(response.errors[0].extensions.code).toBe('CONSENT_REQUIRED');
  });
});
```

### 5.4 Compliance Verification Commands

```bash
# 1. Run full security test suite
pnpm turbo test --filter='./tests/security' --filter='./packages/db' -- --coverage

# 2. Verify RLS policies (cross-tenant isolation)
pnpm --filter @edusphere/db test -- --grep "cross-tenant"

# 3. Check all GDPR rights endpoints
pnpm --filter @edusphere/web test:e2e -- --grep "gdpr"

# 4. SBOM generation
trivy fs . --format cyclonedx --output sbom.json

# 5. Dependency vulnerability scan
npx owasp-dependency-check --project EduSphere --out ./reports/dependency-check

# 6. Privado PII scan
docker run --rm -v $(pwd):/code privado/privado scan --sourceCodePath /code

# 7. pgAudit verification
psql -c "SHOW pgaudit.log;"  # Should return: read,write,ddl

# 8. Wazuh compliance report
wazuh-manager health-check --format compliance --frameworks gdpr,pci-dss

# 9. Cerbos policy test
cerbos test --test-dir ./infrastructure/cerbos/policies/tests

# 10. Falco rule test
falco -r infrastructure/falco/edusphere-rules.yaml -T
```

---

## PART 6 — DOCUMENTATION REQUIREMENTS

### 6.1 Required Legal Documents

| Document | Purpose | Template Source |
|----------|---------|-----------------|
| Privacy Policy | GDPR Art.13/14 — inform users | GDPR.eu template |
| Cookie Policy | ePrivacy Directive | Klaro auto-generates |
| Data Processing Agreement (DPA) | GDPR Art.28 — sign with each enterprise client | GDPR.direct free template |
| Sub-processor List | GDPR Art.28.3 — list of processors used | Internal document |
| Standard Contractual Clauses (SCCs) | GDPR Art.46 — for OpenAI/Anthropic data transfers | EC official template |
| Data Protection Impact Assessment (DPIA) | GDPR Art.35 — required for AI profiling | Internal + DPA guidance |
| Records of Processing Activities (RoPA) | GDPR Art.30 | Internal document |
| Incident Response Plan | SOC2 CC7.4, GDPR Art.33 | This document |
| AI Model Cards | EU AI Act transparency | Internal per agent type |
| Information Security Policy | SOC2 CC2.2 | Comply framework |

### 6.2 Sub-Processor Data Processing Agreements Required

| Sub-Processor | Data Transferred | Action Required |
|---------------|-----------------|-----------------|
| **OpenAI** | User prompts, AI context | Sign OpenAI DPA + SCCs |
| **Anthropic** | User prompts, AI context | Sign Anthropic DPA + SCCs |
| **Keycloak** (if SaaS) | User identity, credentials | Sign or self-host |
| **MinIO** (if SaaS/cloud) | File content, metadata | Sign cloud DPA + SCCs |
| **GitHub** | Code, CI/CD logs | Sign GitHub DPA |
| **NATS Synadia** (if cloud) | Event messages | Sign or self-host |

---

## PART 7 — PRIORITY MATRIX & TIMELINE

### Executive Summary of Work

| Phase | Duration | Effort | Blocks |
|-------|----------|--------|--------|
| Phase 0: Critical Bug Fixes | Week 1 | 3-5 days | Production launch |
| Phase 1: Encryption | Weeks 2-3 | 8-10 days | SOC2 CC6.1, GDPR Art.32 |
| Phase 2: Audit Logging | Weeks 3-4 | 5-7 days | SOC2 CC7.2, GDPR Art.32 |
| Phase 3: GDPR Rights | Weeks 4-6 | 10-14 days | EU market entry |
| Phase 4: API Security | Weeks 6-7 | 4-6 days | SOC2 CC6.3, OWASP |
| Phase 5: AI Compliance | Weeks 7-8 | 5-7 days | EU AI Act (Aug 2026) |
| Phase 6: Secrets | Weeks 8-9 | 3-5 days | SOC2 CC6.1 |
| Phase 7: Runtime Security | Weeks 9-10 | 3-4 days | SOC2 CC7.2 |
| Phase 8: SOC2 Evidence | Weeks 10-11 | 4-5 days | Audit readiness |
| Phase 9: White-Label | Weeks 11-12 | 8-10 days | Client deployments |
| Phase 10: On-Premises | Weeks 12-13 | 4-5 days | On-prem clients |
| Phase 11: Incident Response | Weeks 13-14 | 3-4 days | SOC2 CC7.4, GDPR Art.33 |
| **SOC2 Observation Period** | Months 4-16 | Ongoing | Certification |

**Total estimated development effort:** 14 weeks (2-3 engineers in parallel)
**SOC2 Type II certification:** Earliest: Month 16 (12-month observation period required after controls in place)
**GDPR compliance:** Month 4 (after Phases 0-3 complete)

### Critical Path

```
BUG FIXES (Phase 0)
  → ENCRYPTION (Phase 1)
    → AUDIT LOGGING (Phase 2)
      → GDPR RIGHTS (Phase 3) → EU MARKET ENTRY
  → API HARDENING (Phase 4)
      → SOC2 EVIDENCE (Phase 8)
        → SOC2 OBSERVATION STARTS
          → SOC2 TYPE II CERTIFICATION (Month 16)
```

---

## PART 8 — FILES TO CREATE OR MODIFY

### New Files to Create
```
packages/audit/src/audit.interceptor.ts          — Audit logging interceptor
packages/audit/src/audit.service.ts              — Audit write service
packages/db/src/helpers/encryption.ts            — PII encryption/decryption
packages/db/src/schema/consent.ts                — Consent management table
packages/db/src/schema/auditLog.ts               — Audit log table
packages/db/src/schema/retentionPolicies.ts      — Retention policy table
infrastructure/cerbos/policies/                  — Cerbos authorization policies
infrastructure/falco/edusphere-rules.yaml        — Falco detection rules
infrastructure/wazuh/rules/edusphere-breach.xml  — Wazuh breach rules
infrastructure/nats/nats-server.conf             — Secured NATS config
infrastructure/step-ca/                          — Internal CA setup
docs/policies/                                   — 10 policy documents
docs/security/INCIDENT_RESPONSE.md              — IR procedure
docs/ai/MODEL_CARDS.md                          — EU AI Act documentation
docs/deployment/AIR_GAPPED_INSTALL.md           — Air-gapped guide
docs/deployment/SECURITY_HARDENING.md           — On-prem hardening checklist
tests/security/cross-tenant.spec.ts             — Cross-tenant isolation tests
tests/security/gdpr-rights.spec.ts              — GDPR rights tests
tests/security/rate-limit.spec.ts               — Rate limiting tests
apps/web/src/components/ConsentBanner.tsx        — Klaro consent UI
apps/web/src/pages/PrivacyPolicyPage.tsx         — Privacy policy page
apps/web/src/lib/branding.ts                    — Dynamic tenant branding
apps/subgraph-core/src/user/user-erasure.service.ts    — Right to erasure
apps/subgraph-core/src/user/user-export.service.ts     — Data portability
apps/subgraph-core/src/jobs/retention-cleanup.service.ts — Retention cron
apps/subgraph-agent/src/ai/consent-check.middleware.ts — LLM consent gate
scripts/provision-tenant-realm.sh               — Keycloak realm automation
```

### Files to Modify
```
packages/db/src/schema/annotation.ts            — Fix RLS variable (G-01)
packages/db/src/schema/users.ts                 — Add encrypted columns
packages/db/src/schema/tenants.ts               — Add branding + residency fields
packages/nats-client/src/index.ts               — Add TLS + auth (G-16)
apps/gateway/src/index.ts                       — Fix CORS (G-06), add rate limit, depth limits
apps/gateway/src/middleware/                    — New rate limit + complexity middleware
apps/web/src/main.tsx                           — Apply tenant branding on init
infrastructure/docker/keycloak-realm.json       — Enable brute force protection (G-12)
Dockerfile                                       — Remove SSL bypass (G-05)
.github/workflows/ci.yml                        — Add Privado, OWASP scan, audit export
.github/workflows/docker-build.yml              — Add full SBOM generation
packages/graphql-shared/src/index.ts            — Add @requiresScopes directive
All subgraph .graphql files                     — Add @requiresScopes to sensitive mutations
```

---

## APPENDIX: REGULATORY REFERENCE LINKS

- GDPR Full Text: https://gdpr-info.eu/
- SOC 2 Trust Services Criteria: https://www.aicpa.org/soc2
- EU AI Act Text: https://artificialintelligenceact.eu/
- EDPB Opinion 28/2024 (LLMs): https://www.edpb.europa.eu/
- OWASP GraphQL Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/GraphQL_Cheat_Sheet.html
- pgAudit Documentation: https://www.pgaudit.org/
- Wazuh GDPR Compliance: https://documentation.wazuh.com/current/compliance/gdpr/
- Cerbos Documentation: https://docs.cerbos.dev/
- Linkerd mTLS Guide: https://linkerd.io/2.14/features/automatic-mtls/
- OpenBao Documentation: https://openbao.org/docs/
- Infisical Self-Host: https://infisical.com/docs/self-hosting/overview
- Klaro Consent Manager: https://klaro.org/
- Privado Open Source: https://github.com/Privado-Inc/privado
- Falco Rules: https://falco.org/docs/rules/
- Probo Compliance: https://github.com/getprobo/probo
- Comply (StrongDM): https://github.com/strongdm/comply
- Step CA (Internal CA): https://smallstep.com/docs/step-ca/

---

*This plan was prepared based on deep analysis of the EduSphere codebase, web research on 2025-2026 security standards and open-source tools, and regulatory requirements as of February 2026.*

*All tools recommended are free, open-source, and self-hostable — no vendor lock-in.*
