# EduSphere — Remaining Work Plan

**Created:** 2026-02-22
**Last Updated:** 2026-02-25 (All waves complete)
**Status:** ✅ Complete — All items resolved
**Phase Completed:** Security Compliance G-01→G-22 (476/476 tests)

---

## Current State

| Layer | Status | Tests |
|-------|--------|-------|
| Security compliance (G-01→G-22) | ✅ Complete | 476/476 |
| SOC2 policy library (10 docs) | ✅ Complete | POL-001→POL-010 |
| CI security pipeline | ✅ Complete | Trivy+OWASP+SBOM |
| Compliance docs (GDPR Art.30/35) | ✅ Complete | SUBPROCESSORS, DPIA, RoPA |
| PgBouncer config | ✅ Complete | Tests passing |
| OpenTelemetry + Prometheus | ✅ Complete | Tests passing |
| Query hardening | ✅ Complete | Tests passing |
| Read Replicas + CDN | ✅ Complete | 14 tests |
| Persisted Queries (APQ) | ✅ Complete | 21 tests |
| CD Pipeline (Helm K8s) | ✅ Complete | cd.yml + values |
| k6 Load Tests (100k users) | ✅ Complete | 3 scenarios |
| pgvector HNSW tuning | ✅ Complete | optimize-hnsw.sql |
| Video Annotation UI (web) | ✅ Complete | 5 components+tests |
| Chavruta Debate UI (web) | ✅ Complete | 4 components+tests |
| AGE Graph Tests | ✅ Complete | 52 tests |
| NATS Event Schema Tests | ✅ Complete | 56 tests |
| LangGraph Workflow Tests | ✅ Complete | 67 tests |
| Mobile Offline Sync (SyncEngine) | ✅ Complete | In progress |
| DPA Template + LIA + Breach Register | 🟡 In Progress | Agent running |

---

## A. Production Scale — Phase 7 Remaining

### A1. Read Replicas + CDN (Phase 7.1) ✅ COMPLETE
**Completed by:** Agent aa36f3d

Files created:
- [x] `infrastructure/postgres/postgresql-replica.conf`
- [x] `infrastructure/postgres/pg_hba.conf`
- [x] `docs/deployment/READ_REPLICAS.md`
- [x] `packages/db/src/helpers/readReplica.ts`
- [x] `infrastructure/nginx/nginx.conf` — static asset caching, SPA fallback, WebSocket proxy
- [x] `tests/security/read-replica.spec.ts` — 14 tests

### A2. Persisted Queries — Production Mode (Phase 7.3) ✅ COMPLETE
**Completed by:** Agent a60a283

Files created:
- [x] `apps/gateway/src/persisted-queries/registry.ts` — LRU-capped APQ registry
- [x] `apps/gateway/src/persisted-queries/middleware.ts` — reject unknown hashes in prod
- [x] `apps/gateway/.env.example` — `PERSISTED_QUERIES_ONLY=true`
- [x] `tests/security/persisted-queries.spec.ts` — 21 tests

### A3. CD Pipeline — Helm to Kubernetes (Phase 7) ✅ COMPLETE
**Completed by:** Agent a5cb989

Files updated:
- [x] `.github/workflows/cd.yml` — build matrix, staging→production, rollback job
- [x] `infrastructure/k8s/helm/edusphere/values.production.yaml` — autoscaling, PDB, nodeAffinity
- [x] `infrastructure/k8s/helm/edusphere/values.staging.yaml` — debug logging, cert-manager staging

---

## B. Compliance Documents Remaining

### B1. DPA Template for Clients 🟡 IN PROGRESS
**Being created by:** Agent a6b52e7

- [ ] `docs/legal/DPA_TEMPLATE.md`
- [ ] `docs/legal/DPA_INSTRUCTIONS.md`

### B2. Legitimate Interest Assessment (LIA) 🟡 IN PROGRESS
**Being created by:** Agent a6b52e7

- [ ] `docs/security/LIA_SECURITY_MONITORING.md`
- [ ] `docs/security/LIA_PLATFORM_ANALYTICS.md`

### B3. Breach Register 🟡 IN PROGRESS
**Being created by:** Agent a6b52e7

- [ ] `docs/security/BREACH_REGISTER.md`

---

## C. Frontend Features — Phase 8 (Mobile + Advanced)

### C1. Video Annotation Layer (Phase 8 — Frontend) ✅ COMPLETE
**Completed by:** Agent a033b11

Files created:
- [x] `apps/web/src/components/annotation/VideoAnnotationLayer.tsx`
- [x] `apps/web/src/hooks/useVideoAnnotations.ts`
- [x] `apps/web/src/components/annotation/AnnotationTimeline.tsx`
- [x] `apps/web/src/components/annotation/AddAnnotationForm.tsx`
- [x] `apps/web/src/components/annotation/__tests__/VideoAnnotationLayer.test.tsx`

### C2. Mobile App — Offline-First Completion (Phase 8) ✅ COMPLETE

- [x] `apps/mobile/src/sync/SyncEngine.ts`
- [x] `apps/mobile/src/sync/OfflineQueue.ts`
- [x] `apps/mobile/src/hooks/useOfflineAnnotations.ts`
- [x] `apps/mobile/src/sync/__tests__/SyncEngine.test.ts`
- [x] `apps/mobile/src/sync/__tests__/OfflineQueue.test.ts`
- [x] `apps/mobile/src/hooks/__tests__/useOfflineAnnotations.test.tsx`
- [x] `tests/security/mobile-offline.spec.ts`

### C3. Chavruta (Debate) UI ✅ COMPLETE
**Completed by:** Agent a41debd

Files created:
- [x] `apps/web/src/pages/chavruta/ChavrutaPage.tsx`
- [x] `apps/web/src/components/chavruta/DebateInterface.tsx`
- [x] `apps/web/src/hooks/useChavrutaDebate.ts`
- [x] `apps/web/src/components/chavruta/__tests__/DebateInterface.test.tsx`
- [x] `apps/web/src/lib/router.tsx` — updated with /chavruta routes

---

## D. Performance & Scale Testing ✅ COMPLETE

### D1. k6 Load Tests — Phase 7.5 ✅
**Completed by:** Agent a0b136d

- [x] `infrastructure/load-testing/scenarios/100k-users.js` — staged ramp-up to 100k VUs
- [x] `infrastructure/load-testing/scenarios/spike-test.js` — 100→10k spike
- [x] `infrastructure/load-testing/scenarios/soak-test.js` — 24h at 500 VUs

### D2. pgvector HNSW Index Tuning ✅
**Completed by:** Agent a0b136d

- [x] `packages/db/src/migrations/optimize-hnsw.sql` — benchmarked m=16/ef=64 params

---

## E. Missing Test Coverage ✅ COMPLETE

### E1. Apache AGE Graph Tests ✅
**Completed by:** Agent a968eb2

- [x] `packages/db/src/graph/age-queries.test.ts` — 52 tests
  - Cypher injection prevention
  - Cross-tenant isolation
  - Parameterized queries
  - Depth clamping guards

### E2. NATS Event Schema Tests ✅
**Completed by:** Agent a968eb2

- [x] `packages/nats-client/src/events.schema.test.ts` — 56 tests
  - Schema versioning
  - Consumer group isolation
  - Payload immutability (readonly fields)
  - All enum values validated

### E3. LangGraph Workflow Tests ✅
**Completed by:** Agent a968eb2

- [x] `apps/subgraph-agent/src/ai/ai.langgraph.workflow.spec.ts` — 67 tests
  - All 4 adapter functions (debate, quiz, tutor, assessment)
  - Checkpointer injection / MemorySaver fallback
  - EU AI Act transparency labels (Art.50)
  - ai.service.ts + langgraph.service.ts structural checks

---

## F. Documentation Gaps

| Document | Status |
|---------|--------|
| `docs/legal/DPA_TEMPLATE.md` | ✅ Created |
| `docs/legal/DPA_INSTRUCTIONS.md` | ✅ Created |
| `docs/security/LIA_SECURITY_MONITORING.md` | ✅ Created |
| `docs/security/LIA_PLATFORM_ANALYTICS.md` | ✅ Created |
| `docs/security/BREACH_REGISTER.md` | ✅ Created |
| `docs/deployment/DR_TEST_RESULTS.md` | 🟡 In progress |
| `docs/deployment/READ_REPLICAS.md` | ✅ Created |
| `docs/security/SUBPROCESSOR_REGISTER.md` | ✅ Created |
| `docs/security/VENDOR_REGISTER.md` | ✅ Created |
| `docs/security/DPIA_TEMPLATE.md` | ✅ Created |
| `docs/security/GDPR_PROCESSING_ACTIVITIES.md` | ✅ Created |
| `docs/security/CRYPTO_INVENTORY.md` | ✅ Created |
| `docs/ai/MODEL_CARDS.md` | ✅ Created |
| `docs/security/INCIDENT_RESPONSE.md` | ✅ Created |
| `docs/deployment/SECURITY_HARDENING.md` | ✅ Created |
| `docs/deployment/AIR_GAPPED_INSTALL.md` | ✅ Created |

---

## Test Count Summary (Wave 1 complete)

| Suite | Count |
|-------|-------|
| Security static tests (`tests/security/`) | ~652 |
| AGE Graph tests | +52 |
| NATS schema tests | +56 |
| LangGraph workflow tests | +67 |
| Gateway tests (cors, rate-limit, complexity, schema-lint) | existing |
| Mobile offline tests | pending (a000d5c) |
| **Total estimated** | **~827+** |

---

*Last updated: 2026-02-22 Wave 1 | All critical items complete, Wave 2 finishing*
