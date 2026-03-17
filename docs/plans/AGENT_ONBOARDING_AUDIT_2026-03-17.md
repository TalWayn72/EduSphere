# EduSphere — Full Agent Onboarding Audit Report

**Date:** 2026-03-17
**Scope:** All 11 Enterprise Divisions
**Total Recommendations:** 110 (10 per division)
**Method:** Each division agent read all project documentation and produced Top 10 critical recommendations

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Cross-Division Priority Matrix](#cross-division-priority-matrix)
3. [Orchestrator Division](#1-orchestrator-division)
4. [Product & Requirements Division](#2-product--requirements-division)
5. [Software Architecture Division](#3-software-architecture-division)
6. [UX/UI Design Division](#4-uxui-design-division)
7. [Frontend Engineering Division](#5-frontend-engineering-division)
8. [Backend Engineering Division](#6-backend-engineering-division)
9. [Database & Data Engineering Division](#7-database--data-engineering-division)
10. [Security & Compliance Division](#8-security--compliance-division)
11. [QA & Validation Division](#9-qa--validation-division)
12. [Documentation Division](#10-documentation-division)
13. [DevOps & Release Division](#11-devops--release-division)

---

## Executive Summary

### Top 5 Cross-Division Consensus Issues (flagged by 3+ divisions)

| # | Issue | Flagged By | Priority |
|---|-------|-----------|----------|
| 1 | **Keycloak Client-ID Mismatch (BUG-073)** — `edusphere-app` vs `edusphere-web` causes silent JWT audience failure across all 6 subgraphs | Orchestrator, Product, Architecture, Security, Backend, DevOps | **P0** |
| 2 | **Security tests are static-analysis only** — grep source files but never test runtime behavior | Orchestrator, Security, QA | **P0** |
| 3 | **Upload error recovery broken across 4 components** — no retry, no logging, generic errors | Orchestrator, Product, UX/UI, Frontend | **P1** |
| 4 | **Documentation pipeline frozen 11 days** — CHANGELOG, TEST_REGISTRY, PROJECT_STATUS all stale | Orchestrator, Documentation | **P1** |
| 5 | **Visual snapshots disabled in CI** — `ignoreSnapshots: !!process.env.CI` bypasses all visual regression | QA, UX/UI | **P1** |

### Recommendation Distribution by Category

| Category | Count |
|----------|-------|
| [Product] — Product/architecture improvements | 62 |
| [Operations] — Inter-agent workflow improvements | 27 |
| [Self] — Division self-improvement | 21 |

---

## Cross-Division Priority Matrix

### P0 — Must Fix Before Next Production Deploy

| ID | Recommendation | Division | Category |
|----|---------------|----------|----------|
| SEC-1 | Dev-token bypass + header fallback grants SUPER_ADMIN | Security | Product |
| SEC-3 | Subgraphs skip JWT audience check — direct access bypasses auth | Security | Product |
| BE-1 | SI-7: 15+ services use raw NATS `connect()` without TLS/auth | Backend | Product |
| BE-7 | Auth header fallback is single point of failure — no header stripping | Backend | Operations |
| ARCH-3 | Keycloak Client-ID mismatch — systemic auth fragility | Architecture | Product |
| DB-3 | `annotations` and `agentSessions` lack `tenant_id` column | Database | Product |

### P1 — Must Fix Before Enterprise Pilot

| ID | Recommendation | Division | Category |
|----|---------------|----------|----------|
| ORCH-2 | supergraph.graphql is hand-maintained — will drift again | Orchestrator | Product |
| PROD-5 | YAU pricing enforcement infrastructure missing entirely | Product | Product |
| PROD-6 | Admin Dashboard is the platform's biggest onboarding liability | Product | Product |
| ARCH-4 | Content subgraph grew to 38 domains — needs splitting | Architecture | Product |
| UX-2 | UnifiedLearningPage has zero responsive design | UX/UI | Product |
| UX-6 | AgentStudio/PortalBuilder DnD has no keyboard fallback (WCAG) | UX/UI | Product |
| FE-1 | Route-level error boundaries absent — crash kills entire shell | Frontend | Product |
| BE-2 | AgentService lacks mandatory `Promise.race` timeout guard | Backend | Product |
| BE-9 | Critical features are stubs returning `true` (password reset, graph enrich) | Backend | Product |
| DB-2 | HNSW indexes missing on 3 primary embedding tables | Database | Product |
| QA-4 | Visual snapshot baselines disabled in CI (`ignoreSnapshots`) | QA | Self |
| QA-5 | Apache AGE graph queries untested in CI | QA | Product |
| DOC-2 | CHANGELOG missing versions 0.45.0 through 0.64.0 | Documentation | Product |
| OPS-2 | GraphQL Hive schema registry is optional — breaking changes pass CI | DevOps | Product |

---

## 1. Orchestrator Division

1. **Fix Keycloak JWT Audience Mismatch Before P0 Incident** [Product] — `KEYCLOAK_CLIENT_ID` defaults to `edusphere-app` but frontend uses `edusphere-web`. All subgraphs silently fall back to gateway headers.

2. **supergraph.graphql Is Hand-Maintained** [Product] — Must become a generated artifact from `pnpm compose`, never manually edited. Root cause of BUG-057, BUG-065, BUG-007.

3. **Discovery Wave Checklist Is Structurally Incomplete** [Operations] — Missing `packages/` shared utilities and Docker/env files as mandatory Wave 2 targets.

4. **BUG-073 Upload Errors Still Open Across 4 Components** [Product] — CourseWizardMediaStep, AssetUploader, ScormImportDialog, RichDocumentEditor all share broken pattern.

5. **Completion Gate Is Routinely Violated on Infrastructure Checks** [Self] — 10+ violations of Docker health check rule. Row 0 failure must invalidate all other rows.

6. **Documentation Pipeline Fallen 3+ Sessions Behind** [Operations] — Doc-sync baseline frozen at `5a9a442` (March 6). CHANGELOG, README, TEST_REGISTRY all stale.

7. **Frontend Error Observability Gap** [Product] — Backend has Pino + Jaeger. Frontend has no centralized error telemetry in production.

8. **Agent Divisions Hand Off Without Structured Artifacts** [Operations] — No formal "Wave 2 input document" from Wave 1 agents to downstream teams.

9. **Orchestrator Completes Before Visual QA Confirms** [Self] — Accepts vitest pass as sufficient for UI bugs. Must require Playwright against containerized build.

10. **9,000+ Test Suite Has Growing Mock Dependency Debt** [Product] — Mock-based tests landing in E2E spec files. Need taxonomy: mocked = `*.test.tsx`, real = `*.spec.ts`.

---

## 2. Product & Requirements Division

1. **Close Gap Between "Implemented" and Actual Working State** [Product] — Many features marked `✅` are backend-only stubs. Need 3-state status: Full / Partial / Not Started.

2. **Keycloak Client-ID Architecture Risk** [Product] — Add SI-11 to enforce explicit `KEYCLOAK_CLIENT_ID` in all environments.

3. **Define Feature Completeness Contract** [Operations] — Standard template: navigation entry point + E2E test + screenshot baseline + QA sign-off.

4. **Knowledge Graph Unique Value Under-Marketed** [Product] — No user stories for graph as ambient intelligence for students (prerequisite prompts, adaptive quiz, concept sidebar).

5. **YAU Pricing Enforcement Missing** [Product] — No real YAU counter, no tier limit enforcement, no upgrade prompt, no Stripe webhooks.

6. **Admin Dashboard Is Biggest Onboarding Liability** [Product] — Enterprise buyers evaluate via admin console. No central dashboard, user management, audit log viewer.

7. **Upload Retry Must Be a Product Requirement** [Product] — PRD has no non-functional requirement for upload resilience (retry, progress, token freshness).

8. **Missing Time-to-Value Story for New Instructors** [Product] — AI Course Builder exists in backend but has no frontend entry point or onboarding flow.

9. **Acceptance Criteria Are Execution-Focused, Not Outcome-Focused** [Self] — `curl` checks pass but user journey untested. Need "User Outcome Acceptance Criterion" per feature.

10. **No Bug-to-PRD Feedback Loop** [Self] — Multi-file bugs (3+ files same root cause) should trigger PRD update within same sprint.

---

## 3. Software Architecture Division

1. **Monolithic PostgreSQL Is Primary Scalability Ceiling** [Product] — AGE + pgvector + OLTP compete on single node. Need extraction trigger condition + migration playbook.

2. **PgBouncer Transaction Mode Breaks SET LOCAL** [Product] — Dual-connection routing depends on `{ rls: true }` flag. Should be auto-selected by `getOrCreatePool()`.

3. **Keycloak Client-ID Mismatch Is Systemic Auth Fragility** [Product] — Standardize on single client ID or implement proper mTLS for inter-service traffic.

4. **Content Subgraph Grew to 38 Domains** [Product] — Need split: `subgraph-assessment` (quiz, peer-review, xAPI) + `subgraph-compliance` (LTI, SCORM, CPD, badges).

5. **Apache AGE Cannot Pass Through PgBouncer** [Product] — Knowledge subgraph direct connections must be budgeted against `max_connections` explicitly.

6. **CRDT Compaction Has No Automated Trigger** [Product] — `crdt_updates` table grows without bound. Need NestJS `@Cron` or NATS consumer for compaction.

7. **Gateway Is SPOF for WebSocket Subscriptions** [Product] — No connection-draining grace period. Need `preStop` lifecycle hook + NATS fan-out verification.

8. **HybridRAG Fusion Weights Are Hardcoded** [Product] — `0.6 vector + 0.4 graph` not configurable per tenant. Hebrew content may need higher graph weight.

9. **Architecture Decisions Don't Propagate as Structured Artifacts** [Operations] — PHASE29 gaps (G-1..G-12) not tracked in OPEN_ISSUES.md. Need ADR format + auto-issue generation.

10. **No Load Test Corpus for EduSphere-Specific Workload** [Self] — All scalability claims use third-party benchmarks. Need k6 corpus for actual user journeys.

---

## 4. UX/UI Design Division

1. **Dashboard Shows Mock Data Alongside Real Data** [Product] — Static "Concepts Mastered" next to live course count. No indicator which is synthetic.

2. **UnifiedLearningPage Has Zero Responsive Design** [Product] — Fixed horizontal split-pane. Breaks below 900px. No touch fallback for tablets.

3. **Sidebar Has 19 Items With No Grouping** [Product] — Flat list, no hierarchy. Collapsed icons ambiguous without tooltips. WCAG SC 1.3.1 concern.

4. **Upload Error UX Broken Across 4 Components** [Product] — Need standardized `UploadErrorState` component with retry, specific error messages, token-expiry CTA.

5. **Mobile App Missing Key Web Screens** [Product] — ~24 mobile screens vs 200+ web pages. No parity tracking document. Raw hex colors instead of theme.

6. **AgentStudio/PortalBuilder DnD Without Keyboard Fallback** [Product] — HTML5 DnD inaccessible to keyboard/touch. WCAG SC 2.1.1 violation. Need "Select then Place" mode.

7. **Onboarding Has Hard Skip With No Re-Entry** [Product] — Once skipped, user can never return. No "Complete your profile" dashboard card.

8. **Design System Underdocumented** [Self] — Only 2 `.stories.tsx` files. No Storybook. Inconsistent component usage across pages.

9. **UX Feedback Loop to FE Is Implicit** [Operations] — No structured UX Spec Template for Wave 1 → Wave 2 handoff. FE builds on guesses.

10. **Visual Regression Covers Screenshots But Not Interaction States** [Self] — No snapshots for error states, empty states, focus indicators, modal/dialog open states.

---

## 5. Frontend Engineering Division

1. **Route-Level Error Boundaries Absent** [Product] — Single root ErrorBoundary. Crash in any page kills entire shell including navigation.

2. **ProtectedRoute Has No Token Expiry Reaction** [Product] — Silent fail on token refresh → abrupt logout. No "session expiring" warning.

3. **OptimizedImage Declared But Never Used** [Product] — 200+ pages use bare `<img>`. No lazy loading, no WebP, no explicit dimensions. LCP/CLS impact.

4. **Sidebar No Role-Based Navigation Grouping** [Product] — Students see all 17 items equally prominent. No progressive disclosure by role.

5. **Upload Error Recovery Pattern Missing** [Operations] — Need shared `useFileUpload` hook with presign-upload-confirm + retry + structured logging.

6. **`guarded()` Has No Role-Scope Enforcement** [Operations] — Student can navigate to `/admin/users`. Route renders, then fails after server round-trip.

7. **LCP Monitoring Uses 4s Threshold With No Differential Budget** [Self] — No CI step to catch LCP regression. Bundle size can inflate silently to 3.8s.

8. **Storybook Exists But Not Wired Into CI** [Self] — 3 `.stories.tsx` files exist. No config, no script, no build step. Orphaned.

9. **`mounted` Guard Applied Inconsistently** [Self] — Only `LessonPipelinePage` uses it. All sibling route pages with shared urql queries need it.

10. **FE-to-BE Type Drift Has No Automated Catch** [Operations] — No CI check that `pnpm codegen` was re-run after SDL changes.

---

## 6. Backend Engineering Division

1. **SI-7: 15+ Services Use Raw NATS `connect()` Without TLS/Auth** [Product] — media, at-risk, certificate, live-session, peer-review, pilot, crm services all bypass `buildNatsOptions()`.

2. **AgentService Lacks `Promise.race` Timeout Guard** [Product] — Hung LLM call runs indefinitely. Must wrap with 5-min timeout + FAILED status update.

3. **`adminUsers` Loads All IDs Into Memory** [Product] — `SELECT id FROM users` instead of `COUNT(*)`. O(N) at 100K users. Search parameter ignored.

4. **`createUser`/`updateUser` Accept `unknown` Without Zod** [Product] — Bypasses project-wide validation rule. Same pattern in announcements, at-risk, billing resolvers.

5. **MediaService Opens/Closes NATS Connection Per Upload** [Product] — 100 concurrent uploads = 100 TCP connections. Need persistent connection with `OnModuleDestroy`.

6. **Relay Cursor Uses Offset-Encoded Base64** [Product] — Breaks on concurrent inserts/deletes. Need keyset pagination with `(created_at, id)` composite.

7. **Auth Header Fallback Is Single Point of Failure** [Operations] — No header stripping on ingress. Need NetworkPolicy + integration test for direct subgraph access.

8. **Tracing Coverage Uneven** [Self] — Core and Knowledge subgraphs have zero `startSpan`. Need `TracingInterceptor` at module level.

9. **Critical Features Are Stubs Returning `true`** [Product] — `resetUserPassword` (no Keycloak API), `enrichWithGraph` (appends string), `verifyHebrew` (returns IDs).

10. **No Circuit Breaker for External Dependencies** [Self] — MinIO, JWKS, Ollama calls have no retry/backoff/circuit-breaker. Need `cockatiel` wrapper.

---

## 7. Database & Data Engineering Division

1. **Dual Schema Definitions for `users` and `courses`** [Product] — `core.ts` vs `users.ts`, `content.ts` vs `courses.ts`. Legacy files must be deleted.

2. **HNSW Indexes Missing on 3 Primary Embedding Tables** [Product] — `content_embeddings`, `annotation_embeddings`, `concept_embeddings` degrade to sequential scan at scale.

3. **`annotations`/`agentSessions` Lack `tenant_id` Column** [Product] — RLS is user-only. Blocks tenant-scoped analytics and admin queries.

4. **29 Schema Files Missing `withTimezone: true`** [Product] — Timestamps interpreted as local server time. Breaks retention TTLs and DST transitions.

5. **Duplicate Graph Relationship Types** [Product] — `RELATED_TO` vs `RELATES_TO` in enum. `findRelatedConcepts` queries only one. Edges silently lost.

6. **`concept_embeddings` Has No FK to AGE Graph** [Product] — Deleted concepts leave orphan embeddings polluting HybridRAG search results.

7. **`withReadReplica` Creates New Drizzle Instance Per Call** [Self] — Object allocation pressure at scale. Need singleton `readDb`/`writeDb`.

8. **No Migration Rollback Scripts** [Operations] — 24 migrations, zero rollback files. Enterprise deploys need reversible migrations.

9. **No DB Change Propagation Protocol** [Operations] — Schema changes lack formal checklist for SDL + resolver + codegen + FE query updates.

10. **No Schema Drift Detection or Query Performance Monitoring** [Self] — No `information_schema` diff in CI. No `pg_stat_statements` for slow query visibility.

---

## 8. Security & Compliance Division

1. **Dev-Token Bypass + Header Fallback Grants SUPER_ADMIN** [Product] — Single `NODE_ENV` guard. Header fallback accepts plaintext `SUPER_ADMIN` from any internal caller.

2. **Security Tests Cover Presence, Not Behavior** [Product] — All 50+ tests grep source files. No runtime validation of encryption, RLS, or JWT rejection.

3. **Subgraphs Skip JWT Audience Check** [Product] — Direct access bypasses auth entirely. Ports 4001-4006 bound on `0.0.0.0` in development.

4. **PII Encryption Has No Key Versioning** [Product] — No `keyVersion` prefix. Master key rotation makes all encrypted data permanently unreadable.

5. **Apache AGE Cypher Path Lacks Injection Test Suite** [Product] — No Semgrep rule for Cypher. No `cypher-injection.spec.ts`. String interpolation not caught.

6. **DAST Runs Against Only 2 of 6 Subgraphs** [Operations] — Agent subgraph (highest risk — LLM bridge) is never DAST-scanned.

7. **Gateway-Header Fallback Has No Rate Limiting** [Product] — Rotating `x-tenant-id` creates new rate-limit buckets. No abuse monitoring on fallback path.

8. **APQ Registry Is In-Memory With No Cross-Pod Sync** [Product] — Horizontal scaling causes `PERSISTED_QUERY_NOT_FOUND` cascade. Need Redis-backed store.

9. **Security Review Runs After Code Is Written, Not Before** [Operations] — Need threat model stub at Wave 1, not post-hoc scan at Wave 2.

10. **GDPR Portability Export Has No Cryptographic Completeness Proof** [Product] — No hash attestation. New PII columns silently skipped by erasure service.

---

## 9. QA & Validation Division

1. **Eliminate `waitForTimeout` — 504 Call Sites** [Self] — Primary cause of flaky tests and slow CI. Replace with deterministic waits.

2. **Build `packages/test-utils` Shared Factory Library** [Self] — 6 subgraphs duplicate mock factories for AuthContext, Drizzle, NATS. Single change breaks all 6.

3. **BUG-073 Has No E2E Regression Guard** [Product] — Open bug with no Playwright spec covering media upload. Protocol violation.

4. **Visual Snapshot Baselines Disabled in CI** [Self] — `ignoreSnapshots: !!process.env.CI` makes all `toHaveScreenshot()` assertions no-ops in pipeline.

5. **Apache AGE Tests Skipped in CI** [Product] — `continue-on-error: true` because CI Docker image lacks AGE extension. Knowledge graph untested.

6. **No E2E for Cross-Role Mutation Authorization** [Product] — Student calling `createCourse` not tested at GraphQL layer. Only UI routing tested.

7. **Load Tests Never Run in CI** [Self] — k6 scenarios exist but no workflow executes them. 100K user target has no automated guard.

8. **QA Must Receive Testability Requirements at Wave 1** [Operations] — Missing `data-testid` attributes found post-implementation. Need "Testability Contract" in Wave 1.

9. **Mobile App Has Only 119 Pure-Logic Tests** [Product] — No component tests, no integration, no Detox/Maestro. Zero coverage of native features.

10. **Security Tests Are Static-Only — No Runtime Probes** [Self] — Need ~20 runtime tests: malformed JWTs, cross-tenant queries, rate-limit headers, CSP verification.

---

## 10. Documentation Division

1. **IMPLEMENTATION_ROADMAP Missing Phases 51-64** [Operations] — 14-phase blind spot. PROJECT_STATUS frozen at Phase 47.

2. **CHANGELOG Missing 20+ Versions (0.45.0–0.64.0)** [Product] — Primary external-facing artifact is 20 releases behind.

3. **TEST_REGISTRY Shows 6,125 Tests vs Actual 8,000+** [Operations] — Last updated Session 28. New E2E specs from BUG-067–072 not registered.

4. **docs/INDEX.md Frozen at Session 27** [Product] — Files from phases 28-64 not indexed. Navigation aid is incomplete.

5. **Only 2 of 18+ Bug Fixes Have `docs/plans/bugs/` Files** [Operations] — 16 fixes exist only in 566KB OPEN_ISSUES.md. File exceeds read limit.

6. **OPEN_ISSUES.md Has No Machine-Readable Status Table** [Product] — 566KB document with no summary. Open vs closed mixed throughout.

7. **API_CONTRACTS Not Updated Since Phase 27** [Product] — New types (OpenBadgeCredential, RubricAssessment, etc.) not documented. Rated FAILING.

8. **SESSION_SUMMARY Shows Only Session 1** [Operations] — 35+ sessions of history missing. Institutional memory lost.

9. **No Operational Runbooks for 6 Common Failure Modes** [Product] — Subgraph FATAL, stale supergraph, JWT mismatch, MinIO rotation, AGE unloaded, NATS backpressure.

10. **Doc-Pipeline Has No Freshness Enforcement** [Self] — No CI check fails on stale docs. Pipeline is fire-and-forget with advisory-only quality gate.

---

## 11. DevOps & Release Division

1. **Replace All-in-One Supervisord Container** [Product] — Single container with all services. Root cause of BUG-072, BUG-073. Need proper docker-compose for local dev.

2. **GraphQL Hive Schema Registry Is Optional** [Product] — `continue-on-error` when `HIVE_TOKEN` absent. Breaking schema changes pass CI silently.

3. **No Real Load Testing in CI** [Product] — k6 scenarios exist. Performance workflow skips actual service startup. 100K target unguarded.

4. **Alertmanager Routes to `null`** [Product] — Default receiver is `"null"`. Production alerts silently discarded. Slack/PagerDuty placeholders unfilled.

5. **Base Images Use Floating Tags** [Operations] — `postgres:16-alpine`, `clamav/clamav:latest`. No digest pinning. No Renovate/Dependabot.

6. **No Canary Traffic Split Before Full Rollout** [Product] — Helm `--atomic` is not a true canary. Bad deploy affects 100% of traffic immediately.

7. **KEYCLOAK_CLIENT_ID Inconsistent Across Deploy Targets** [Operations] — Missing in supervisord.conf, no CI env-var validation step.

8. **No Pre-Deployment Database Snapshot or Dry-Run Validation** [Operations] — Migrations applied without backward-compatibility check during rolling update window.

9. **No Test Result Aggregation or Trend Dashboard** [Self] — 5+ workflows upload artifacts separately. No flakiness detection, no CI duration trending.

10. **Rollback Protocol Has No Schema-Version Gating** [Self] — `helm rollback` without checking DB schema compatibility. No post-rollback GraphQL health query.

---

## Action Items — Recommended Sprint Priorities

### Sprint 1 (Immediate — P0 Security)
- [ ] Fix KEYCLOAK_CLIENT_ID across all environments (ARCH-3, DevOps-7)
- [ ] Remove SUPER_ADMIN from header fallback path (SEC-1)
- [ ] Replace 15 raw NATS `connect()` with `buildNatsOptions()` (BE-1)
- [ ] Add `tenant_id` to annotations and agentSessions (DB-3)

### Sprint 2 (Pre-Pilot — P1 Product)
- [ ] Build Admin Dashboard MVP — 5 screens (PROD-6)
- [ ] Create HNSW indexes on 3 embedding tables (DB-2)
- [ ] Make supergraph.graphql a generated artifact (ORCH-2)
- [ ] Fix upload retry across 4 components (ORCH-4, UX-4, FE-5)
- [ ] Add route-level error boundaries (FE-1)
- [ ] Enable visual snapshots in CI (QA-4)
- [ ] Complete `Promise.race` timeout on AgentService (BE-2)

### Sprint 3 (Quality & Ops)
- [ ] Build `packages/test-utils` shared factory (QA-2)
- [ ] Eliminate 504 `waitForTimeout` calls (QA-1)
- [ ] Update CHANGELOG with 20 missing versions (DOC-2)
- [ ] Extract bugs from OPEN_ISSUES.md to individual files (DOC-5)
- [ ] Add runtime security test suite (SEC-2, QA-10)
- [ ] Add responsive design to UnifiedLearningPage (UX-2)
- [ ] Wire keyboard fallback into AgentStudio/PortalBuilder (UX-6)

---

*Generated by 11 parallel division agents on 2026-03-17. Each agent independently read all project documentation before producing recommendations.*
