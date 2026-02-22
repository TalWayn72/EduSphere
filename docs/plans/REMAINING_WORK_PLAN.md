# EduSphere — Remaining Work Plan

**Created:** 2026-02-22
**Status:** Active
**Phase Completed:** Security Compliance G-01→G-22 (476/476 tests)

---

## Current State

| Layer | Status | Tests |
|-------|--------|-------|
| Security compliance (G-01→G-22) | ✅ Complete | 476/476 |
| SOC2 policy library (10 docs) | ✅ Complete | POL-001→POL-010 |
| CI security pipeline | ✅ Complete | Trivy+OWASP+SBOM |
| Compliance docs (GDPR Art.30/35) | ✅ Complete | SUBPROCESSORS, DPIA, RoPA |
| PgBouncer config | ✅ Config exists | Tests in progress |
| OpenTelemetry + Prometheus | ✅ Config exists | Tests in progress |
| Query hardening | ✅ Middleware exists | Tests in progress |

---

## A. Production Scale — Phase 7 Remaining

### A1. Read Replicas + CDN (Phase 7.1)
**Why:** 100k concurrent users need read distribution
**Effort:** Medium

**Tasks:**
- [ ] `infrastructure/postgres/postgresql-replica.conf` — streaming replication config
- [ ] `infrastructure/postgres/pg_hba.conf` — replication auth
- [ ] `docs/deployment/READ_REPLICAS.md` — setup guide
- [ ] `packages/db/src/helpers/readReplica.ts` — Drizzle read/write split
- [ ] `tests/security/read-replica.spec.ts` — config validation

**CDN:**
- [ ] `infrastructure/nginx/nginx.conf` — static asset caching headers
- [ ] `docs/deployment/CDN.md` — CloudFront/Cloudflare setup for media assets

### A2. Persisted Queries — Production Mode (Phase 7.3)
**Why:** Prevents arbitrary GraphQL from reaching production
**Effort:** Medium

**Tasks:**
- [ ] `apps/gateway/src/persisted-queries/registry.ts` — APQ hash store
- [ ] `apps/gateway/src/persisted-queries/middleware.ts` — reject unknown hashes in prod
- [ ] `apps/gateway/.env.example` — `PERSISTED_QUERIES_ONLY=true`
- [ ] `tests/security/persisted-queries.spec.ts`

### A3. CD Pipeline — Helm to Kubernetes (Phase 7)
**Why:** Currently CI/CD has no automated deployment
**Effort:** Large

**Tasks:**
- [ ] `.github/workflows/cd.yml` — complete deployment pipeline
- [ ] `infrastructure/k8s/helm/edusphere/values.production.yaml`
- [ ] `infrastructure/k8s/helm/edusphere/values.staging.yaml`
- [ ] Staging → Production promotion gate
- [ ] Rollback automation

---

## B. Compliance Documents Remaining

### B1. DPA Template for Clients
**Why:** GDPR Art.28 — written DPA required before processing on behalf of controllers
**Effort:** Small (document creation)

**Tasks:**
- [ ] `docs/legal/DPA_TEMPLATE.md` — pre-signed DPA template for white-label clients
- [ ] `docs/legal/DPA_INSTRUCTIONS.md` — how to customize and execute

### B2. Legitimate Interest Assessment (LIA)
**Why:** GDPR Art.6(1)(f) requires LIA for legitimate interest processing
**Effort:** Small

**Tasks:**
- [ ] `docs/security/LIA_SECURITY_MONITORING.md` — LIA for audit logging
- [ ] `docs/security/LIA_ANALYTICS.md` — LIA for anonymized analytics

### B3. Breach Register
**Why:** GDPR Art.33(5) — controller must maintain record of all breaches
**Effort:** Small

**Tasks:**
- [ ] `docs/security/BREACH_REGISTER.md` — template + instructions

---

## C. Frontend Features — Phase 8 (Mobile + Advanced)

### C1. Video Annotation Layer (Phase 8 — Frontend)
**Why:** Annotation subgraph backend complete (Phase 3) but no video annotation UI
**Effort:** Large

**Tasks:**
- [ ] `apps/web/src/components/annotation/VideoAnnotationLayer.tsx`
- [ ] `apps/web/src/hooks/useVideoAnnotations.ts`
- [ ] `apps/web/src/components/annotation/AnnotationTimeline.tsx`
- [ ] Integration with `useSubscription` for real-time annotations
- [ ] Tests: `apps/web/src/components/annotation/*.test.tsx`

### C2. Mobile App — Offline-First Completion (Phase 8)
**Why:** Expo SDK 54 offline patterns not yet connected to all subgraphs
**Effort:** Large

**Tasks:**
- [ ] `apps/mobile/src/sync/SyncEngine.ts` — delta sync with server
- [ ] `apps/mobile/src/offline/OfflineQueue.ts` — mutation queue for offline writes
- [ ] `apps/mobile/src/hooks/useOfflineAnnotations.ts`
- [ ] expo-sqlite integration for all core entities

### C3. Chavruta (Debate) UI
**Why:** Agent subgraph has Chavruta workflow but no dedicated UI
**Effort:** Medium

**Tasks:**
- [ ] `apps/web/src/pages/chavruta/ChavrutaPage.tsx`
- [ ] `apps/web/src/components/chavruta/DebateInterface.tsx`
- [ ] Real-time debate via GraphQL subscription
- [ ] Tests + E2E

---

## D. Performance & Scale Testing

### D1. k6 Load Tests — Phase 7.5
**Why:** Must validate 100k concurrent users before production launch
**Effort:** Medium

**Tasks:**
- [ ] `infrastructure/load-testing/scenarios/100k-users.js` — k6 load scenario
- [ ] `infrastructure/load-testing/scenarios/spike-test.js` — spike test
- [ ] `infrastructure/load-testing/scenarios/soak-test.js` — 24h soak test
- [ ] PgBouncer saturation test
- [ ] NATS backpressure test under load
- [ ] Performance budget: p95 < 500ms for all queries

### D2. pgvector HNSW Index Tuning
**Why:** Vector search performance degrades without proper index parameters
**Effort:** Small

**Tasks:**
- [ ] Benchmark `ef_construction` and `m` parameters at 1M, 10M, 100M vectors
- [ ] `packages/db/src/migrations/optimize-hnsw.sql`
- [ ] Grafana dashboard for vector search latency

---

## E. Missing Test Coverage

### E1. Apache AGE Graph Tests
**Why:** Graph queries use raw Cypher — need comprehensive test coverage
**Effort:** Medium

**Tasks:**
- [ ] `packages/db/src/graph/__tests__/age-queries.spec.ts`
- [ ] Test: cross-tenant Cypher query isolation
- [ ] Test: parameterized Cypher (no injection)
- [ ] Test: graph schema integrity (required node labels)

### E2. NATS Event Schema Tests
**Why:** Events.ts defines event schema but no contract tests
**Effort:** Small

**Tasks:**
- [ ] `packages/nats-client/src/events.test.ts` — already exists, check coverage
- [ ] Event schema versioning tests
- [ ] Consumer group isolation tests

### E3. LangGraph Workflow Tests
**Why:** Agent workflows complex, need state machine tests
**Effort:** Medium

**Tasks:**
- [ ] `apps/subgraph-agent/src/ai/ai.langgraph.memory.spec.ts` — exists, review
- [ ] Test: state machine transitions (assess→quiz→explain→debate)
- [ ] Test: timeout handling (Promise.race + 5min limit)
- [ ] Test: gVisor sandbox isolation

---

## F. Documentation Gaps

| Document | Status | Priority |
|---------|--------|---------|
| `docs/legal/DPA_TEMPLATE.md` | ❌ Missing | High |
| `docs/security/LIA_SECURITY_MONITORING.md` | ❌ Missing | Medium |
| `docs/security/BREACH_REGISTER.md` | ❌ Missing | Medium |
| `docs/deployment/READ_REPLICAS.md` | ❌ Missing | Medium |
| `docs/deployment/CDN.md` | ❌ Missing | Low |
| `docs/deployment/DR_TEST_RESULTS.md` | ❌ Missing (referenced in BC policy) | Low |
| `docs/security/SUBPROCESSORS.md` | ✅ Created | — |
| `docs/security/VENDOR_REGISTER.md` | ✅ Created | — |
| `docs/security/DPIA_TEMPLATE.md` | ✅ Created | — |
| `docs/security/PROCESSING_ACTIVITIES.md` | ✅ Created | — |
| `docs/security/CRYPTO_INVENTORY.md` | In progress | — |
| `docs/security/MODEL_CARDS.md` | In progress | — |

---

## Priority Order (Recommended)

| Priority | Work | Impact | Effort |
|---------|------|--------|--------|
| 🔴 1 | A3 — CD Pipeline | Deploy to production | Large |
| 🔴 2 | A1 — Read Replicas | Scale to 100k users | Medium |
| 🟡 3 | D1 — k6 Load Tests | Validate scale claims | Medium |
| 🟡 4 | C1 — Video Annotation UI | Key product feature | Large |
| 🟡 5 | A2 — Persisted Queries | Production security | Medium |
| 🟢 6 | B1 — DPA Template | Legal compliance | Small |
| 🟢 7 | C3 — Chavruta UI | Advanced feature | Medium |
| 🟢 8 | C2 — Mobile Offline | Mobile completion | Large |
| 🟢 9 | E1 — AGE Graph Tests | Test coverage | Medium |

---

*Last updated: 2026-02-22 | Next review: after Phase 7 agents complete*
