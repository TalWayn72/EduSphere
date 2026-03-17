# EduSphere — 110 Recommendations Master Work Plan

## Context

The 11 Enterprise Divisions completed their onboarding audit on 2026-03-17, producing 110 critical recommendations. This plan organizes ALL 110 items into 3 priority groups based on:
- **Competitor comparison** (Docebo, Moodle, Canvas, TalentLMS, Absorb, Mindsmith)
- **Industry best practices** (OWASP Top 10, WCAG 2.2 AA, Relay spec, 12-Factor App, SRE golden signals)
- **Business impact** (enterprise pilot readiness, revenue enablement, compliance)

Then structures them into 8 implementation waves following the Enterprise Execution Protocol.

---

## GROUP A — CRITICAL (33 items) — "Table Stakes vs Competition"
> Items that competitors ALREADY have, or that represent active security/data-integrity risks.
> Missing these = lost deals, compliance failures, or production incidents.

### A1. Security & Auth Foundation (10 items)

| # | ID | Item | Benchmark | Why Critical |
|---|-----|------|-----------|-------------|
| 1 | SEC-1 | Dev-token bypass grants SUPER_ADMIN | OWASP A01:2021 Broken Access Control | Active exploit path — single env-var misconfiguration = full admin access |
| 2 | SEC-3 | Subgraphs skip JWT audience check | OWASP A07:2021 Auth Failures | Every competitor validates JWT at each service boundary |
| 3 | ARCH-3 / PROD-2 / OPS-7 | Keycloak Client-ID mismatch across all environments | Basic auth hygiene | 6 divisions flagged this — systemic single point of failure |
| 4 | BE-1 | 15+ services use raw NATS without TLS/auth (SI-7) | Zero-trust networking | Every enterprise LMS requires encrypted inter-service comms |
| 5 | BE-7 | Auth header fallback — no header stripping on ingress | OWASP A04:2021 Insecure Design | Competitors (Canvas, Moodle) strip internal headers at load balancer |
| 6 | SEC-7 | Gateway fallback path has no rate limiting | OWASP A04 | Rotating tenant-id bypasses rate limits — trivial attack |
| 7 | SEC-4 | PII encryption has no key versioning | NIST SP 800-57, GDPR Art.32 | Key rotation renders all data unreadable — no competitor has this gap |
| 8 | SEC-5 | No Cypher injection test suite for Apache AGE | OWASP A03:2021 Injection | Unique attack surface — no industry benchmark, but injection is always P0 |
| 9 | DB-3 | `annotations`/`agentSessions` lack `tenant_id` | Multi-tenancy best practice | Every SaaS LMS enforces tenant isolation on ALL tables |
| 10 | SEC-10 | GDPR portability export lacks cryptographic proof | GDPR Art.20, ISO 27701 | EU enterprise buyers require attestable exports — Docebo/Moodle have this |

### A2. Data Integrity & Performance (8 items)

| # | ID | Item | Benchmark | Why Critical |
|---|-----|------|-----------|-------------|
| 11 | DB-2 | HNSW indexes missing on 3 embedding tables | pgvector best practice | Sequential scan at 100K users = unusable semantic search. Every RAG competitor indexes |
| 12 | DB-1 | Dual schema definitions for `users`/`courses` | Drizzle ORM best practice | Type conflicts between subgraphs — silent data corruption risk |
| 13 | DB-4 | 29 schema files missing `withTimezone: true` | PostgreSQL best practice | GDPR retention TTLs break across timezones — compliance risk |
| 14 | DB-5 | Duplicate graph relationship types (`RELATED_TO`/`RELATES_TO`) | Data modeling 101 | Edges silently lost — knowledge graph (core differentiator) degrades |
| 15 | BE-2 | AgentService lacks `Promise.race` timeout | Node.js memory safety | Hung LLM call = permanent memory leak + stuck execution row |
| 16 | BE-5 | MediaService opens NATS connection per upload | Connection pooling best practice | 100 concurrent uploads = 100 TCP connections. Exhausts NATS under load |
| 17 | BE-3 | `adminUsers` loads all IDs into memory (O(N)) | SQL performance 101 | Admin page crashes at 100K users. Every competitor uses COUNT(*) |
| 18 | SEC-8 | APQ registry in-memory with no cross-pod sync | Apollo/Hive Gateway best practice | Horizontal scaling causes error cascade. Every Federation gateway uses Redis |

### A3. Core Quality Gates (8 items)

| # | ID | Item | Benchmark | Why Critical |
|---|-----|------|-----------|-------------|
| 19 | QA-4 | Visual snapshots disabled in CI | Playwright best practice | 150+ visual tests are no-ops. Visual regressions ship silently |
| 20 | QA-5 | Apache AGE tests skipped in CI | Testing best practice | Core differentiator (knowledge graph) has zero CI coverage |
| 21 | SEC-2 / QA-10 | Security tests are static-only — no runtime probes | OWASP ASVS L2 | Every competitor with SOC 2 runs runtime security tests |
| 22 | FE-1 | Route-level error boundaries absent | React best practice | Single crash kills entire shell. Canvas, Moodle all have per-route recovery |
| 23 | ORCH-2 | supergraph.graphql is hand-maintained | Apollo Federation best practice | Root cause of 3 separate production bugs. Must be generated artifact |
| 24 | OPS-2 | Hive schema registry is optional in CI | Schema governance best practice | Breaking schema changes pass CI silently |
| 25 | FE-10 | FE-to-BE type drift has no automated catch | GraphQL codegen best practice | SDL changes without codegen = runtime failures |
| 26 | BE-4 | Mutation inputs accept `unknown` without Zod | Input validation best practice (OWASP A03) | Every mutation must validate. Multiple resolvers bypass Zod |

### A4. Operational Safety (7 items)

| # | ID | Item | Benchmark | Why Critical |
|---|-----|------|-----------|-------------|
| 27 | OPS-4 | Alertmanager routes to `null` | SRE golden rule: alert or it didn't happen | Production incidents go unnoticed. Every SaaS has active alerting |
| 28 | OPS-1 | All-in-one supervisord container for local dev | 12-Factor App, Docker best practice | Root cause of BUG-072, BUG-073. Competitors use proper compose |
| 29 | DB-8 | No migration rollback scripts (24 migrations, zero rollbacks) | Database DevOps best practice | Enterprise deploys require reversible migrations |
| 30 | OPS-10 | Rollback has no schema-version gating | SRE runbook standard | Helm rollback + incompatible DB schema = data corruption |
| 31 | BE-9 | Critical features are stubs (`resetUserPassword` returns `true`) | Functional completeness | Password reset doesn't work. No competitor ships non-functional features |
| 32 | DOC-9 | No operational runbooks for 6 common failures | SRE Handbook (Google) | Every mature SaaS has runbooks. Enterprise pilots require them |
| 33 | ORCH-5 | Completion gate routinely violated | Internal protocol | 10+ violations documented. Gate must be enforced, not advisory |

---

## GROUP B — IMPORTANT (42 items) — "Competitive Differentiation & Scale Readiness"
> Items where competitors have mature implementations, or where EduSphere needs polish for enterprise readiness.
> Missing these = weaker competitive position, poor UX, limited scalability.

### B1. Enterprise Product Readiness (12 items)

| # | ID | Item | Benchmark | Impact |
|---|-----|------|-----------|--------|
| 34 | PROD-6 | Admin Dashboard missing (5 screens needed) | Docebo, Canvas, TalentLMS all have admin consoles | #1 enterprise demo blocker |
| 35 | PROD-5 | YAU pricing enforcement missing | Industry standard billing model | Cannot legally enforce pricing tiers |
| 36 | PROD-8 | No time-to-value story for instructors | Mindsmith, Docebo lead with AI course creation | Instructor acquisition hook missing |
| 37 | PROD-1 | "Implemented" status doesn't reflect reality | Product management best practice | False confidence in GTM readiness |
| 38 | UX-7 | Onboarding skip with no re-entry | SaaS onboarding best practice (Pendo, Appcues) | Personalization never activated for skipped users |
| 39 | PROD-4 | Knowledge graph under-marketed to students | EduSphere's unique differentiator | Core moat not surfaced to end users |
| 40 | UX-1 | Dashboard shows mock data alongside real data | UX trust principle | Erodes user confidence in platform accuracy |
| 41 | FE-2 | No token expiry reaction — abrupt logout | Auth UX best practice (Auth0, Okta patterns) | Users lose work mid-session |
| 42 | FE-4 / UX-3 | Sidebar 19 items, no role-based grouping | Navigation UX (Nielsen Norman Group) | Information overload for students |
| 43 | ARCH-8 | HybridRAG fusion weights hardcoded | RAG best practice (NVIDIA, Pinecone) | Hebrew content may need different weights |
| 44 | DB-6 | Concept embeddings orphaned when AGE vertex deleted | Data integrity | HybridRAG results degrade over time |
| 45 | BE-6 | Relay cursor uses offset encoding | Relay spec (relay.dev) | Pagination breaks on concurrent writes. Every GraphQL competitor uses keyset |

### B2. Accessibility & Responsive (6 items)

| # | ID | Item | Benchmark | Impact |
|---|-----|------|-----------|--------|
| 46 | UX-6 | AgentStudio/PortalBuilder no keyboard fallback | WCAG 2.1.1 (A) — legal requirement | Blocks accessibility compliance certification |
| 47 | UX-2 | UnifiedLearningPage zero responsive design | WCAG, mobile-first standard | Primary learning interface broken on tablets |
| 48 | FE-3 | OptimizedImage declared but never used | Core Web Vitals (Google) | LCP/CLS degradation across 200+ pages |
| 49 | UX-10 | Visual regression covers only default states | Testing best practice | Error, empty, focus states never snapshot-tested |
| 50 | FE-6 | `guarded()` has no client-side role check | RBAC UX best practice | Students navigate to admin pages, see loading then error |
| 51 | UX-5 | Mobile app missing key web screens | Cross-platform parity (Expo best practice) | ~24 screens vs 200+ pages, no parity tracking |

### B3. CI/CD & Testing Infrastructure (12 items)

| # | ID | Item | Benchmark | Impact |
|---|-----|------|-----------|--------|
| 52 | QA-1 | 504 `waitForTimeout` calls in E2E | Playwright anti-pattern | Flaky tests + slow CI. Every mature test suite uses deterministic waits |
| 53 | QA-2 | No shared `packages/test-utils` | Monorepo testing best practice | 6 duplicate mock factories. Single auth change breaks all 6 |
| 54 | QA-6 | No E2E for cross-role mutation authorization | OWASP testing guide | Privilege escalation untested at GraphQL layer |
| 55 | QA-7 / OPS-3 | Load tests never run in CI | SRE performance gate | 100K user target has zero automated guard |
| 56 | SEC-6 | DAST scans only 2 of 6 subgraphs | DAST best practice (OWASP ZAP) | Agent subgraph (highest risk) never scanned |
| 57 | OPS-5 | Base images use floating tags | Container security (Docker best practice) | `clamav:latest` can change behavior silently |
| 58 | OPS-8 | No pre-deployment DB snapshot/dry-run | Database DevOps | Breaking migration during rolling update = downtime |
| 59 | OPS-9 | No test result aggregation/trend dashboard | CI observability (GitHub Actions best practice) | No flakiness detection, no duration trending |
| 60 | FE-9 | `mounted` guard inconsistently applied | urql + React 19 concurrent mode | Race conditions on sibling route pages |
| 61 | QA-3 | BUG-073 has no E2E regression guard | Protocol requirement | Open bug with zero Playwright coverage |
| 62 | QA-8 | QA gets testability requirements too late (Wave 2) | Shift-left testing | Missing `data-testid` found post-implementation |
| 63 | SEC-9 | Security review runs after code, not before | Shift-left security (DevSecOps) | Threat model should exist at Wave 1 |

### B4. Documentation & Knowledge (12 items)

| # | ID | Item | Benchmark | Impact |
|---|-----|------|-----------|--------|
| 64 | DOC-2 | CHANGELOG missing 20+ versions | SemVer standard | External stakeholders see outdated release history |
| 65 | DOC-7 | API_CONTRACTS not updated since Phase 27 | API documentation best practice | Mobile/partner consumers have stale contract |
| 66 | DOC-5 | 16 bug fixes only in 566KB OPEN_ISSUES.md | Bug tracking best practice | File exceeds read limit. Unnavigable |
| 67 | DOC-6 | OPEN_ISSUES.md has no status summary table | Issue tracking (Linear, Jira pattern) | Must scroll 566KB to find open bugs |
| 68 | DOC-1 | ROADMAP missing Phases 51-64 | Project management | 14-phase blind spot in execution blueprint |
| 69 | DOC-3 | TEST_REGISTRY shows 6,125 vs actual 8,000+ | Test documentation | QA cannot determine actual regression coverage |
| 70 | DOC-4 | docs/INDEX.md frozen at Session 27 | Documentation navigation | New contributors miss entire doc areas |
| 71 | DOC-8 | SESSION_SUMMARY shows only Session 1 | Institutional memory | 35+ sessions of decisions lost |
| 72 | DOC-10 | Doc pipeline has no freshness enforcement | Documentation-as-code (Backstage pattern) | Staleness never detected in CI |
| 73 | ORCH-6 | Documentation pipeline fallen 3+ sessions behind | Automation reliability | Pipeline exists but doesn't fire |
| 74 | ARCH-9 | Architecture decisions don't propagate as ADRs | ADR best practice (Thoughtworks) | Gaps found in reviews not tracked as issues |
| 75 | DB-9 | No DB change propagation protocol | Schema governance | Column rename breaks SDL → resolver → FE silently |

---

## GROUP C — STRATEGIC (35 items) — "Next-Level Maturity & Scale"
> Items for long-term platform excellence. Competitors may not all have these.
> These differentiate EduSphere at enterprise scale (100K+ users).

### C1. Architecture & Scale (10 items)

| # | ID | Item | Benchmark | Impact |
|---|-----|------|-----------|--------|
| 76 | ARCH-1 | Monolithic PostgreSQL scalability ceiling | Microservices DB-per-service pattern | Extraction trigger + playbook needed before 50K users |
| 77 | ARCH-2 | PgBouncer breaks SET LOCAL — dual-connection routing | PgBouncer transaction mode docs | Auto-select pool in `getOrCreatePool()` |
| 78 | ARCH-4 | Content subgraph has 38 domains — needs splitting | Federation domain decomposition | Extract `subgraph-assessment` + `subgraph-compliance` |
| 79 | ARCH-5 | AGE cannot pass through PgBouncer — connection budget | PostgreSQL scaling | Model `max_connections` budget for all direct paths |
| 80 | ARCH-6 | CRDT compaction has no automated trigger | CRDT best practice (Yjs) | `crdt_updates` grows without bound |
| 81 | ARCH-7 | Gateway SPOF for WebSocket subscriptions | K8s graceful shutdown | `preStop` hook + NATS fan-out verification |
| 82 | ARCH-10 | No load test corpus for actual workload | SRE performance engineering | All benchmarks use third-party numbers |
| 83 | OPS-6 | No canary traffic split before full rollout | Progressive delivery (Argo, Flagger) | Bad deploy affects 100% of traffic |
| 84 | DB-7 | `withReadReplica` creates new Drizzle per call | Connection management | Object allocation pressure at scale |
| 85 | BE-10 | No circuit breaker for external deps (MinIO, JWKS, Ollama) | Resilience patterns (Polly, cockatiel) | Single failure cascades across services |

### C2. Observability & Reliability (8 items)

| # | ID | Item | Benchmark | Impact |
|---|-----|------|-----------|--------|
| 86 | ORCH-7 | Frontend has no centralized error telemetry | OpenTelemetry browser SDK | Production errors invisible |
| 87 | BE-8 | Tracing coverage uneven (Core/Knowledge = zero) | Distributed tracing (Jaeger) | Cross-subgraph latency spikes undiagnosable |
| 88 | DB-10 | No schema drift detection or pg_stat_statements | Database observability | Slow queries invisible between migrations |
| 89 | FE-7 | LCP monitoring has 4s threshold, no differential budget | Core Web Vitals CI (Lighthouse CI) | Performance regressions ship silently |
| 90 | ORCH-10 | 9,000+ test suite has mock dependency debt | Test architecture | Mock-based E2E tests don't catch real integration bugs |
| 91 | ORCH-9 | Orchestrator completes before visual QA | QA gate enforcement | UI bugs pass unit tests but fail visually |
| 92 | PROD-9 | Acceptance criteria execution-focused, not outcome-focused | BDD (Cucumber, Gherkin) | API passes but user journey untested |
| 93 | PROD-10 | No bug-to-PRD feedback loop | Product management maturity | Same bug class recurs across features |

### C3. Process & Workflow Maturity (10 items)

| # | ID | Item | Benchmark | Impact |
|---|-----|------|-----------|--------|
| 94 | ORCH-3 | Discovery wave checklist incomplete | Bug fix protocol | Missing `packages/` and Docker/env targets |
| 95 | ORCH-8 | Agent divisions hand off without structured artifacts | SAFe, Agile handoff patterns | Wave 2 agents guess Wave 1 decisions |
| 96 | PROD-3 | No Feature Completeness Contract | Definition of Done (Scrum) | Backend "done" but no UI entry point |
| 97 | PROD-7 | Upload retry is not a product requirement | Non-functional requirements standard | Recurrent bug class has no PRD entry |
| 98 | UX-9 | UX-to-FE handoff has no structured template | Design handoff (Figma, Zeplin pattern) | FE builds on guesses about interaction design |
| 99 | UX-8 | Design system underdocumented — no Storybook | Design system governance (Radix, shadcn) | Inconsistent component usage |
| 100 | FE-8 | Storybook exists but not wired into CI | Component testing (Chromatic) | Stories are orphaned — cannot run or test |
| 101 | FE-5 | No shared `useFileUpload` hook | React hook composition | 4 components duplicate upload logic |
| 102 | QA-9 | Mobile has only 119 pure-logic tests | Mobile testing (Detox, Maestro) | Zero native feature coverage |
| 103 | SEC-9 + QA-8 | Security/QA shift-left — Wave 1 not Wave 2 | DevSecOps, shift-left testing | Testability and threat model too late |

### C4. Long-Term Product Vision (7 items)

| # | ID | Item | Benchmark | Impact |
|---|-----|------|-----------|--------|
| 104 | PROD-4 | Knowledge graph value under-marketed to students | EduSphere core differentiator | Ambient intelligence not surfaced |
| 105 | ARCH-8 | HybridRAG weights not tenant-configurable | RAG personalization (Pinecone, Weaviate) | Hebrew content needs different fusion |
| 106 | UX-5 | Mobile/web parity gap — no tracking document | Cross-platform strategy | 24 vs 200+ screens, no plan |
| 107 | DB-6 | Concept embedding orphan cleanup | Data lifecycle management | RAG precision degrades over time |
| 108 | ARCH-6 | CRDT compaction automation | Collaboration at scale (Yjs) | Table grows without bound |
| 109 | OPS-6 | Canary traffic split | Progressive delivery maturity | Bad deploy = 100% blast radius |
| 110 | ARCH-1 | PostgreSQL extraction playbook | Microservices evolution | Plan needed before 50K concurrent |

---

## EXECUTION PROTOCOL — MANDATORY FOR EVERY WAVE (IRON RULE)

Every wave follows the same 7-stage cycle. **No stage may be skipped. No shortcuts.**

### Stage 1 — PLAN (Enterprise Execution Protocol Wave 1)
```
Launch parallel agents:
├─ Product Agent: change spec, acceptance criteria for this wave's items
├─ Architecture Agent: system impact, service boundaries, migration strategy
└─ UX/UI Agent: user flows, WCAG check, responsive breakpoints (if UI items)
```
**Output:** Wave Input Document with: entity boundaries, threat model stub, testability contract, UX spec

### Stage 2 — IMPLEMENT (Enterprise Execution Protocol Wave 2)
```
Launch parallel agents (max 5 concurrent, sub-waves if >5):
├─ Frontend Agent(s): component changes, hooks, routing
├─ Backend Agent(s): services, resolvers, validators
├─ Database Agent: schema migrations, indexes, RLS policies
├─ Security Agent: SI enforcement, auth hardening, Semgrep rules
└─ QA Prep Agent: test scaffolding, E2E spec skeletons, data-testid audit
```
**Each agent MUST produce for every code change:**
- Unit test asserting CORRECT behavior is present
- Unit test asserting BAD behavior is GONE (regression guard)
- `*.memory.spec.ts` if new service with DB/NATS/timers (Memory Safety rule)
- Pino/console.error logging with `[ServiceName]` prefix + `tenantId`/`userId`

### Stage 3 — WRITE E2E TESTS (mandatory for every UI/API change)
```
For each changed component/endpoint:
├─ Playwright E2E spec with `page.route()` interception for failure scenarios
├─ `expect(element).not.toContainText(badString)` — assert ugly errors are gone
├─ `expect(page).toHaveScreenshot(...)` — visual regression baseline
├─ Cross-role test: verify unauthorized roles get FORBIDDEN, not data
└─ Memory test: verify cleanup on unmount/destroy (if timers/subscriptions added)
```
**Test file locations:**
- Subgraph unit: `apps/subgraph-*/src/**/*.spec.ts`
- Frontend unit: `apps/web/src/**/*.test.{ts,tsx}`
- E2E: `apps/web/e2e/*.spec.ts`
- Security: `tests/security/*.spec.ts`
- Memory: `*.memory.spec.ts` / `*.memory.test.ts`

### Stage 4 — RUN TESTS & BUG-FIX PROTOCOL V3 (Full 9-Stage Process)

> **Reference:** `docs/reference/BUG_FIX_PROTOCOL.md` + `memory/feedback_bugfix_protocol.md`
> Every bug discovered during test rounds follows the FULL 9-stage protocol. No shortcuts.

```
═══════════════════════════════════════════════════════════════
  STEP 1: RUN ALL TESTS (initial round)
═══════════════════════════════════════════════════════════════
  $ pnpm turbo test                    # unit + integration
  $ pnpm turbo typecheck               # TypeScript strict
  $ pnpm turbo lint                    # ESLint zero warnings
  $ pnpm test:security                 # security suite
  $ pnpm --filter @edusphere/web test:e2e  # Playwright E2E

  If ALL pass → proceed to Stage 5 (Git Commit)
  If ANY fail → enter Bug-Fix Protocol V3 below ↓
═══════════════════════════════════════════════════════════════
```

#### Bug-Fix Protocol V3 — For Every Bug Found During Testing

**Stage 0 — TRIAGE**
```
For each failing test / discovered bug:
├─ Assign severity: P0 (data loss/security) / P1 (broken feature) / P2 (degraded) / P3 (cosmetic)
├─ Log in OPEN_ISSUES.md with status 🔴 Open
├─ P0/P1 → immediate fix (block wave completion)
└─ P2/P3 → fix in current wave if <30 min, else defer to next wave with justification
```

**Stage 1 — DISCOVERY (3 Mandatory Waves — NEVER skip)**
```
Wave 1 — Exact match:
  $ grep -r "exact_failing_pattern" apps/ packages/ tests/
  → List every file with the exact same code that caused the failure

Wave 2 — Similarity search (MANDATORY 7-directory sweep):
  □ apps/web/src/pages/        — checked for same anti-pattern
  □ apps/web/src/hooks/        — checked for same anti-pattern
  □ apps/web/src/components/   — checked for same anti-pattern
  □ apps/mobile/src/           — checked for same anti-pattern
  □ apps/subgraph-*/src/       — ALL 6 subgraphs checked (if server-side bug)
  □ packages/*/src/            — shared packages checked
  □ tests/                     — test files checked for same mock/setup issue

Wave 3 — Pattern class:
  If bug is "missing cleanup"    → grep ALL setInterval/setTimeout/useSubscription
  If bug is "missing validation" → grep ALL mutation resolvers without Zod
  If bug is "type mismatch"      → grep ALL similar type assertions
  If bug is "missing tenant_id"  → grep ALL tables without RLS
  If bug is "race condition"     → grep ALL shared state mutations

OUTPUT: Numbered DISCOVERY LIST — every affected file + exact issue
        This list MUST be complete BEFORE writing any fix code.
```

**Stage 1.5 — CONTAINMENT (P0/P1 only)**
```
For P0 (data loss/security breach):
├─ Feature flag to disable affected path immediately
├─ OR circuit breaker if external service failure
├─ OR rollback to last known good state
└─ Containment must be in place within 15 minutes

For P1 (broken core feature):
├─ Identify blast radius — how many users/endpoints affected
├─ If >50% of users affected → apply temporary workaround
└─ Document containment measure in OPEN_ISSUES.md
```

**Stage 2 — FIX ROUNDS (one round per Discovery Wave group)**
```
Round structure:
├─ Round 1: Fix the original failing test + its root cause
├─ Round 2: Fix all Wave 2 items (similar patterns in other files)
├─ Round 3: Fix all Wave 3 items (pattern class across codebase)
└─ Round N: Continue until Discovery List is 100% empty

Each fix MUST produce:
├─ Unit test asserting CORRECT behavior is present
├─ Unit test asserting BAD behavior is GONE (regression guard)
├─ Pino/console.error log so bug is observable if it recurs
└─ Memory test (*.memory.spec.ts) if new timers/connections added

Round Completion Gate (MANDATORY after EVERY round):
  □ pnpm turbo test — 100% pass for ALL affected packages
  □ pnpm turbo typecheck — 0 TypeScript errors
  □ pnpm turbo lint — 0 lint errors
  □ New regression test green (asserts BAD state is GONE)
  □ Console.error/Pino log added for observability
  □ Discovery List items for this round all marked ✓

Max 5 rounds per bug. If still failing after 5:
  → Document blocker in OPEN_ISSUES.md with full diagnostic
  → Escalate to user with root cause analysis
  → Do NOT silently skip
```

**Stage 3 — VISUAL VERIFICATION (mandatory for UI bugs)**
```
For every UI-affecting bug:
├─ Playwright E2E test with page.route() to reproduce failure scenario
├─ expect(element).not.toContainText(badString) — ugly errors gone
├─ expect(page).toHaveScreenshot(...) — visual regression baseline
├─ Run the E2E test 10x to verify no flakiness:
│   $ for i in {1..10}; do pnpm --filter web test:e2e -- --grep "test-name"; done
└─ If flaky (>0 failures in 10 runs) → fix flakiness before proceeding
```

**Stage 4 — FULL VERIFICATION**
```
  $ pnpm turbo test                         # ALL unit + integration
  $ pnpm turbo typecheck                    # 0 TypeScript errors
  $ pnpm turbo lint                         # 0 lint errors/warnings
  $ pnpm test:security                      # security suite
  $ pnpm --filter @edusphere/web test:e2e   # ALL Playwright E2E
  $ grep -r "bug_pattern" apps/ packages/   # 0 matches outside tests
  $ pnpm audit --audit-level=high           # no new vulnerabilities

ALL must pass. If any fail → return to Stage 2 Fix Rounds.
```

**Stage 5 — ROLLBACK READINESS (before deploying fix)**
```
Document for each bug fix:
├─ Rollback command: exact git revert or helm rollback command
├─ DB impact: does rollback require migration revert? Which migration?
├─ Recovery time estimate: P0/P1 must be <5 min recovery
├─ Data integrity: will rollback cause data loss? If yes, backup plan.
└─ 30-minute decision gate: if fix causes new issues in container,
   revert within 30 min — don't debug in production

Format in OPEN_ISSUES.md:
  **Rollback:** `git revert <hash>` | DB: no migration impact | Recovery: <2 min
```

**Stage 6 — CONTAINER DEPLOY & LIVE BUG REPRODUCTION**
```
(This is the same as the main Stage 6 below — but specifically:)
├─ Build → verify → switch (Blue-Green)
├─ Health check → 6 subgraphs running
├─ 5-user authentication verification
├─ REPRODUCE THE ORIGINAL BUG SCENARIO in the running container
│   → Navigate to the page/endpoint that was failing
│   → Confirm the fix is visible to real users
│   → If bug was UI: take screenshot showing clean state
└─ If reproduction shows bug still present → return to Stage 2
```

**Stage 7 — AUTO-COMMIT (NO asking — commit automatically)**
```
# Stage specific files (never git add -A)
$ git add <specific-files-for-this-bug>

# Commit with conventional format — NEVER ask "should I commit?"
$ git commit -m "$(cat <<'EOF'
fix(<scope>): <bug description>

- Root cause: <one-line root cause>
- Discovery: <N> files affected across <M> directories
- Tests: <count> new regression tests
- Rollback: git revert <hash> | DB: <impact>

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
EOF
)"

# Push and verify CI
$ git push origin <branch>
$ gh run list --limit 3    # verify CI triggered
$ gh run watch             # wait for green
# If CI red → fix → new commit → push → repeat (NEVER leave CI red)
```

**Stage 8 — RCA DOCUMENTATION (in OPEN_ISSUES.md)**
```
For each fixed bug, update OPEN_ISSUES.md with:
├─ Status: 🔴 → ✅ Fixed
├─ Root Cause: exact line(s) + why they were wrong
├─ Why Missed: why existing tests didn't catch this
├─ Prevention: what new test/lint rule prevents recurrence
├─ Discovery List: complete numbered list from all 3 waves
├─ Files affected: per round, all files touched
├─ Anti-recurrence: regression test file:line that guards against return
└─ Rollback plan: documented recovery command
```

**IRON RULES FOR BUG-FIX DURING WAVES:**
- Every bug found in test rounds gets the FULL 9-stage treatment — no shortcuts
- Multiple bugs can be processed in parallel (separate Discovery Lists)
- P0/P1 bugs block wave completion — must be fixed before proceeding
- P2/P3 bugs: fix if <30 min, else document in OPEN_ISSUES.md and defer
- NEVER declare a wave complete with failing tests
- NEVER skip Discovery waves even for "obvious" single-file bugs
- The wave's main Stage 5 (Git Commit) happens AFTER all bug fixes are committed

### Stage 5 — GIT COMMIT
```
# Stage specific files (never `git add -A`)
$ git add <specific-files>

# Commit with conventional format
$ git commit -m "$(cat <<'EOF'
<type>(<scope>): <description>

- <change 1>
- <change 2>
- Tests: <test count> new, <test count> modified

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
EOF
)"

# Verify commit
$ git log --oneline -3
```
**Commit rules:**
- One commit per logical change (not one per wave)
- Security fixes get their own commit (separate from feature work)
- Test files included in same commit as the code they test
- Never commit secrets, .env files, or node_modules

### Stage 6 — CONTAINER DEPLOY & LIVE VERIFICATION
```
# 1. Build new image (Blue-Green — NEVER take down before new is ready)
$ docker-compose build --no-cache

# 2. Verify build succeeded (exit 0) BEFORE touching running container
# 3. Only then switch:
$ docker-compose down && docker-compose up -d

# 4. Wait for healthy (30s max)
$ docker ps | grep -c healthy    # must show ≥5

# 5. Health check
$ ./scripts/health-check.sh      # ALL services must PASS

# 6. Verify all subgraphs running (if using all-in-one container)
$ docker exec edusphere-all-in-one supervisorctl status
#   → ALL subgraphs must show RUNNING (not FATAL/BACKOFF)

# 7. Real GraphQL query through gateway
$ curl -s http://localhost:4000/graphql \
  -H 'Content-Type: application/json' \
  -d '{"query":"{ __typename }"}' | grep -q data

# 8. Frontend loads
$ curl -s -o /dev/null -w "%{http_code}" http://localhost:5173
#   → must return 200 (not ERR_CONNECTION_REFUSED)

# 9. Five-user authentication verification
┌─────────────────────────────────────┬──────────────┬──────────────────┐
│ User                                │ Role         │ Password         │
├─────────────────────────────────────┼──────────────┼──────────────────┤
│ super.admin@edusphere.dev           │ SUPER_ADMIN  │ SuperAdmin123!   │
│ instructor@example.com              │ INSTRUCTOR   │ Instructor123!   │
│ org.admin@example.com               │ ORG_ADMIN    │ OrgAdmin123!     │
│ researcher@example.com              │ RESEARCHER   │ Researcher123!   │
│ student@example.com                 │ STUDENT      │ Student123!      │
└─────────────────────────────────────┴──────────────┴──────────────────┘

# 10. Live bug reproduction (if fixing a bug)
#   → Reproduce the ORIGINAL failure scenario in the running container
#   → Confirm the fix is visible to real users
#   → Take screenshot for documentation
```

### Stage 7 — PUSH & CI VERIFICATION
```
# Push to remote
$ git push origin <branch>

# Verify CI triggered
$ gh run list --limit 3           # must show new workflow run

# Watch CI
$ gh run watch                    # live status

# If CI fails:
$ gh run view <run-id> --log-failed
#   → Fix → new commit → push → repeat
#   → NEVER --no-verify or skip hooks
```

### Stage 8 — DOCUMENTATION & COMPLETION
```
# Update OPEN_ISSUES.md with:
- Status: 🔴 → ✅ for each fixed item
- Files affected, root cause, solution, tests added
- Anti-recurrence note: regression test file:line
- Discovery List: complete list of affected files

# Update wave tracking table in this plan:
- Mark completed items ✅
- Record actual test counts
- Note any deferred items with reason

# Session Completion Gate (IRON RULE):
┌────┬─────────────────────────────────┬──────────────────────────┬───────────┐
│ #  │ Check                           │ Command                  │ Required  │
├────┼─────────────────────────────────┼──────────────────────────┼───────────┤
│ 0  │ Docker Up                       │ docker ps | grep healthy │ ≥5        │
│ 1  │ Unit Tests                      │ pnpm turbo test          │ 100% pass │
│ 2  │ TypeScript                      │ pnpm turbo typecheck     │ 0 errors  │
│ 3  │ Lint                            │ pnpm turbo lint          │ 0 errors  │
│ 4  │ Security Tests                  │ pnpm test:security       │ 0 fail    │
│ 5  │ E2E Playwright                  │ pnpm --filter web test:e2e│ all pass │
│ 6  │ Health Check                    │ ./scripts/health-check.sh│ all UP    │
│ 7  │ 5-User Auth                     │ Keycloak login × 5       │ all OK    │
│ 8  │ GitHub CI                       │ gh run list --limit 3    │ all green │
│ 9  │ Git Push                        │ git log --oneline -1     │ pushed    │
│ 10 │ OPEN_ISSUES.md                  │ updated + E2E files      │ status ✅ │
└────┴─────────────────────────────────┴──────────────────────────┴───────────┘

EVERY row must show ✅ before declaring wave complete.
If any row fails → fix → re-run ALL downstream checks.
```

---

## IMPLEMENTATION WAVES

---

### WAVE 1 — Security Hardening (GROUP A1 + A4 subset)
**Duration:** ~1 session | **Items:** 14 | **Risk if skipped:** Active exploit paths

| Task | Items | Agents | Deliverables |
|------|-------|--------|-------------|
| Fix Keycloak Client-ID everywhere | #3, OPS-7 | BE + DevOps | `KEYCLOAK_CLIENT_ID=edusphere-web` in all envs, supervisord.conf, K8s values |
| Harden auth fallback path | #1, #2, #5, #6 | Security + BE | Dual-guard on dev-token, strip SUPER_ADMIN from header fallback, header stripping NetworkPolicy, fallback rate-limit |
| NATS TLS/auth enforcement | #4 | BE | Replace 15 raw `connect()` with `buildNatsOptions()`. Semgrep rule to block new violations |
| PII key versioning | #7 | Security + DB | Add `v1:` prefix to ciphertext, `migrateEncryptedFields()` function, test for version mismatch |
| Cypher injection guard | #8 | Security | Semgrep rule + `cypher-injection.spec.ts` |
| APQ registry Redis-backed | #18 | BE + DevOps | Redis store when `REDIS_URL` present, fallback to in-memory |
| Alertmanager live routing | #27 | DevOps | Replace `"null"` receiver with Slack webhook. CI validates config |
| Operational runbooks | #32 | Documentation | 6 failure-mode runbooks in `docs/deployment/OPERATIONAL_RUNBOOKS.md` |

**Required tests (Stage 3):**
- `tests/security/runtime-jwt-validation.spec.ts` — malformed JWT, wrong audience, expired token (10 tests)
- `tests/security/runtime-cross-tenant.spec.ts` — query with wrong tenant_id (5 tests)
- `tests/security/runtime-header-spoofing.spec.ts` — direct subgraph call with spoofed headers (5 tests)
- `tests/security/nats-tls-enforcement.spec.ts` — verify TLS on all 15 services
- `tests/security/apq-cross-pod.spec.ts` — APQ registry with Redis
- `tests/security/pii-key-versioning.spec.ts` — encrypt/decrypt with key rotation
- `tests/security/cypher-injection.spec.ts` — parameterized Cypher enforcement
- `apps/web/e2e/auth-hardening.spec.ts` — E2E: dev-token blocked in production mode

**Fix rounds (Stage 4):** Run `pnpm test:security` + `pnpm turbo test`. Fix any failures. Repeat until 100% pass.

**Git commits (Stage 5):**
1. `fix(auth): harden dev-token bypass + remove SUPER_ADMIN from header fallback`
2. `fix(nats): enforce TLS/auth via buildNatsOptions() across 15 services`
3. `fix(security): add PII key versioning + Cypher injection guard`
4. `fix(gateway): Redis-backed APQ registry for horizontal scaling`
5. `chore(infra): alertmanager live routing + operational runbooks`

**Container deploy (Stage 6):** Full cycle — build → verify → switch → health-check → 5-user auth → verify JWT audience fix works in running container.

**Gate:** `pnpm test:security` (including 20+ new runtime tests) + `health-check.sh` + 5-user auth + `gh run list` green

---

### WAVE 2 — Data Integrity & Core Quality (GROUP A2 + A3)
**Duration:** ~1 session | **Items:** 19 | **Risk if skipped:** Data corruption, broken search, CI blind spots

| Task | Items | Agents | Deliverables |
|------|-------|--------|-------------|
| DB schema fixes | #12, #9, #13, #14 | DB | Delete `users.ts`/`courses.ts` duplicates, add `tenant_id` to annotations/agentSessions, fix 29 `withTimezone` files, merge `RELATES_TO` edges |
| HNSW indexes | #11 | DB | Migration `0034_hnsw_core_embeddings.sql` with `CREATE INDEX CONCURRENTLY` |
| BE memory safety | #15, #16, #17 | BE | `Promise.race` on AgentService, persistent NATS in MediaService, `COUNT(*)` in adminUsers |
| Mutation validation | #26 | BE | Zod schemas for createUser, updateUser, announcements, at-risk, billing resolvers |
| FE error boundaries | #22 | FE | Per-route `<ErrorBoundary>` wrapping each `<Suspense>` in `guarded()` |
| CI quality gates | #19, #20, #23, #24, #25 | QA + DevOps | Enable visual snapshots, build AGE Docker image for CI, make supergraph generated, require Hive token, add codegen drift check |
| Stubs → real implementations | #31 | BE | `resetUserPassword` → Keycloak Admin API. `enrichWithGraph` → real AGE query |
| Completion gate enforcement | #33 | Orchestrator | Row 0 (Docker) failure blocks all other rows. Hard stop, not advisory |

**Required tests (Stage 3):**
- `packages/db/src/rls/annotations-tenant.test.ts` — RLS with new `tenant_id` column (cross-tenant isolation)
- `packages/db/src/rls/agent-sessions-tenant.test.ts` — same for agentSessions
- `packages/db/src/migrations/0034_hnsw.test.ts` — HNSW index exists + vector search < 50ms on 10K rows
- `apps/subgraph-agent/src/agent/agent.service.memory.spec.ts` — verify `Promise.race` timeout fires at 5 min
- `apps/subgraph-content/src/media/media.service.memory.spec.ts` — verify persistent NATS connection + cleanup
- `apps/subgraph-core/src/user/user.service.spec.ts` — verify `COUNT(*)` instead of full row fetch
- `apps/subgraph-core/src/user/user.schemas.ts` + `user.resolver.spec.ts` — Zod validation on createUser/updateUser
- `apps/web/e2e/error-boundary-recovery.spec.ts` — crash in child page → shell survives
- `apps/gateway/src/test/supergraph-generated.spec.ts` — `pnpm compose` output matches committed file
- CI: `codegen-drift-check` step in `ci.yml` — `pnpm codegen && git diff --exit-code packages/graphql-types`
- `apps/subgraph-core/src/user/user.service.spec.ts` — `resetUserPassword` calls Keycloak Admin API

**Fix rounds (Stage 4):** Run full suite. Schema migrations may break downstream resolvers — run `pnpm turbo typecheck` first to catch type errors before test run. Fix in rounds until 100% pass.

**Git commits (Stage 5):**
1. `fix(db): remove duplicate users.ts/courses.ts schemas + add tenant_id to annotations/agentSessions`
2. `perf(db): add HNSW indexes on content/annotation/concept embeddings`
3. `fix(db): standardize withTimezone:true across 29 schema files + merge RELATES_TO edges`
4. `fix(agent): add Promise.race timeout + persistent NATS in MediaService + COUNT(*) in adminUsers`
5. `fix(core): add Zod validation to createUser/updateUser + wire resetUserPassword to Keycloak`
6. `feat(web): add per-route ErrorBoundary in guarded() helper`
7. `ci: enable visual snapshots + AGE Docker image + supergraph generated check + codegen drift check`

**Container deploy (Stage 6):** Full cycle including migration apply (`pnpm --filter @edusphere/db migrate`). Verify HNSW indexes exist via `mcp__postgres` or psql. Verify error boundary by navigating to a broken page URL.

**Gate:** `pnpm turbo test` + `pnpm turbo typecheck` + visual snapshots green (new baselines) + `health-check.sh` + 5-user auth

---

### WAVE 3 — Enterprise Product MVP (GROUP B1 subset)
**Duration:** ~2 sessions | **Items:** 12 | **Risk if skipped:** Failed enterprise pilot demos

| Task | Items | Agents | Deliverables |
|------|-------|--------|-------------|
| Admin Dashboard MVP | #34 | FE + BE + DB | 5 screens: Overview, User Management, Role Matrix, Audit Log, Announcements |
| Upload retry system | #4 (ORCH-4), UX-4, FE-5, PROD-7 | FE + BE | Shared `useFileUpload` hook, retry with backoff, structured logging, `UploadErrorState` component |
| Feature status audit | #37 | Product | Re-stamp all 21 PRD sections: Full / Partial / Not Started |
| Keyset pagination | #45 | BE + FE | Replace offset cursors with `(created_at, id)` composite across all paginated resolvers |
| Token expiry UX | #41 | FE | Session-expiring toast → re-auth modal before hard redirect |
| Instructor onboarding | #36 | FE + UX | "Create with AI" CTA on Courses page, first-run wizard, template paths |
| Onboarding re-entry | #38 | FE | "Complete your profile" card on Dashboard when `onboardingState.skipped` |
| Sidebar role grouping | #42 | FE + UX | 4 groups (Learning, Teaching, Analytics, Admin), role-filtered items, tooltips on collapse |
| Mock data indicators | #40 | FE | Replace mock cards with skeleton/empty-state, "beta" badge on synthetic metrics |
| HybridRAG tenant config | #43 | BE + DB | `vectorWeight`/`graphWeight` in `agent_definitions` JSONB. RRF fusion algorithm |
| Embedding orphan cleanup | #44 | BE + DB | NATS `knowledge.concept.deleted` consumer to cascade-delete embeddings |
| YAU enforcement | #35 | BE + DB + FE | Daily cron, 80% soft warning, 100% hard block, upgrade prompt, Stripe webhook |

**Required tests (Stage 3):**
- `apps/web/e2e/admin-dashboard-overview.spec.ts` — loads, shows tenant metrics, role-gated
- `apps/web/e2e/admin-user-management.spec.ts` — search, filter, bulk-enroll, deactivate
- `apps/web/e2e/admin-role-matrix.spec.ts` — view permissions, modify role
- `apps/web/e2e/admin-audit-log.spec.ts` — filter by date/user, export CSV
- `apps/web/e2e/admin-announcements.spec.ts` — create, schedule, preview
- `apps/web/e2e/upload-retry.spec.ts` — `page.route()` blocks presign → retry button → success
- `apps/web/e2e/token-expiry.spec.ts` — mock expired token → toast appears → re-auth modal
- `apps/web/e2e/sidebar-role-grouping.spec.ts` — student sees Learning group, admin sees all 4
- `apps/web/e2e/onboarding-reentry.spec.ts` — skip → dashboard card → click → onboarding loads
- `apps/subgraph-content/src/marketplace/pagination-keyset.spec.ts` — concurrent inserts, no duplicates
- `apps/subgraph-agent/src/knowledge/hybridrag-tenant-config.spec.ts` — custom weights per tenant
- `apps/subgraph-content/src/billing/yau-enforcement.spec.ts` — cron counts, soft/hard limit, upgrade prompt
- **Visual snapshots:** `toHaveScreenshot()` for each new admin screen (light + dark mode)

**Fix rounds (Stage 4):** Run `pnpm turbo test` + `pnpm --filter @edusphere/web test:e2e`. Admin screens likely fail on missing data — seed demo admin data first. Upload retry test may need `page.waitForResponse()` tuning. Fix in rounds.

**Git commits (Stage 5):**
1. `feat(web): Admin Dashboard MVP — 5 screens (overview, users, roles, audit, announcements)`
2. `feat(web): shared useFileUpload hook with retry + UploadErrorState component`
3. `fix(web): token expiry toast + re-auth modal before hard redirect`
4. `feat(web): sidebar role-based grouping + onboarding re-entry card`
5. `fix(web): replace mock data cards with skeleton/empty-state indicators`
6. `feat(agent): HybridRAG per-tenant weight config + RRF fusion`
7. `feat(knowledge): embedding orphan cleanup via NATS consumer`
8. `feat(billing): YAU enforcement — cron counter + soft/hard limits + Stripe webhook`
9. `fix(api): keyset pagination replacing offset cursors across all resolvers`

**Container deploy (Stage 6):** Full cycle. After deploy, manually verify:
- Navigate to `/admin` as `org.admin@example.com` → all 5 screens load
- Upload a file in CourseWizard → block network → retry button appears → unblock → upload succeeds
- Login as `student@example.com` → sidebar shows only Learning group
- Dashboard shows "Complete your profile" card (if onboarding was skipped)

**Gate:** Full test suite + 12 new E2E specs green + visual snapshots + 5-user auth across all admin screens

---

### WAVE 4 — Accessibility & Responsive (GROUP B2)
**Duration:** ~1 session | **Items:** 6 | **Risk if skipped:** WCAG compliance failure, tablet users blocked

| Task | Items | Agents | Deliverables |
|------|-------|--------|-------------|
| Keyboard DnD fallback | #46 | FE + UX | "Select then Place" mode for AgentStudio + PortalBuilder. Arrow keys + Enter |
| Responsive UnifiedLearningPage | #47 | FE + UX | Vertical stack below `lg:`, bottom sheet for panel tabs on narrow screens |
| OptimizedImage adoption | #48 | FE | Replace bare `<img>` in top 30 components (course cards, hero, profiles) |
| Client-side role guard | #50 | FE | `requiredRole` param in `guarded()`, immediate redirect for unauthorized roles |
| Interaction state snapshots | #49 | QA + UX | Error, empty, focus, modal states for Dashboard + UnifiedLearning + Courses |
| Mobile parity document | #51 | Product + UX | `docs/product/MOBILE_PARITY.md` with per-feature status matrix |

**Required tests (Stage 3):**
- `apps/web/e2e/agent-studio-keyboard.spec.ts` — tab to node type → Enter → placed on canvas → arrow keys move
- `apps/web/e2e/portal-builder-keyboard.spec.ts` — same keyboard interaction for blocks
- `apps/web/e2e/unified-learning-responsive.spec.ts` — viewport 768px, 820px, 1024px screenshots
- `apps/web/src/components/OptimizedImage.test.tsx` — renders with lazy, srcset, explicit width/height
- `apps/web/e2e/wcag-audit-wave4.spec.ts` — axe-core scan on modified pages: 0 violations
- `apps/web/e2e/role-guard-redirect.spec.ts` — student navigates to `/admin/users` → immediate redirect
- `apps/web/e2e/interaction-states.spec.ts` — screenshots: error, empty, focus, modal for 3 key pages
- **Visual snapshots:** responsive breakpoints (768px, 820px, 1024px) for UnifiedLearningPage

**Fix rounds (Stage 4):** axe-core violations are common on first pass — typically missing `aria-label`, insufficient contrast ratios, or missing heading hierarchy. Fix each violation category across ALL affected components (not just the page where axe found it). Re-run until 0 violations.

**Git commits (Stage 5):**
1. `feat(web): keyboard DnD fallback for AgentStudio + PortalBuilder (WCAG 2.1.1)`
2. `feat(web): responsive UnifiedLearningPage — vertical stack below lg breakpoint`
3. `perf(web): adopt OptimizedImage across top 30 components (lazy + WebP + explicit dims)`
4. `fix(web): client-side role guard in guarded() — immediate redirect for unauthorized roles`
5. `test(web): interaction state snapshots + axe-core audit for Wave 4 components`
6. `docs(product): MOBILE_PARITY.md — per-feature web/mobile status matrix`

**Container deploy (Stage 6):** Full cycle. After deploy:
- Open browser at 768px width → UnifiedLearningPage stacks vertically
- Tab through AgentStudio → place node with keyboard only
- Login as student → navigate to `/admin/users` → redirect to `/` immediately
- Run axe-core in DevTools on Dashboard, UnifiedLearning, Courses → 0 violations

**Gate:** axe-core 0 violations + responsive visual snapshots + keyboard E2E green + 5-user auth

---

### WAVE 5 — CI/CD & Testing Infrastructure (GROUP B3)
**Duration:** ~1 session | **Items:** 12 | **Risk if skipped:** Flaky CI, no perf guard, blind spots

| Task | Items | Agents | Deliverables |
|------|-------|--------|-------------|
| Eliminate `waitForTimeout` | #52 | QA | Replace 504 sites with `expect(locator).toBeVisible()`, `waitForResponse()`, etc. |
| Build `packages/test-utils` | #53 | QA + BE | `createAuthContext()`, `createMockDb()`, `createMockNatsClient()` shared factories |
| Cross-role authorization E2E | #54 | QA + Security | `graphql-authorization-e2e.spec.ts` — student calls admin mutations, asserts FORBIDDEN |
| Load test CI pipeline | #55 | DevOps + QA | Nightly k6 smoke: 10 VUs × 60s against gateway. p95 regression detection |
| DAST expand to all subgraphs | #56 | DevOps + Security | Add agent + knowledge subgraphs to ZAP workflow. Mocked Ollama for CI |
| Pin base image digests | #57 | DevOps | Replace floating tags. Add Renovate config for automated updates |
| Pre-deploy DB dry-run | #58 | DevOps + DB | `drizzle generate --dry-run` + diff in CI. Backward-compatibility flag on migrations |
| CI trend dashboard | #59 | DevOps | Test result aggregation + flakiness score per test file. Fail at >5% flake rate |
| Fix mounted guard | #60 | FE | Apply to all sibling route pages with shared urql queries |
| BUG-073 E2E guard | #61 | QA | Playwright spec for media upload with presign failure mock |
| Testability contracts | #62 | QA + Product | Template doc: required `data-testid`, error codes, mock seams per feature |
| Security shift-left | #63 | Security | Threat model stub required at Wave 1. Pre-commit check for new mutations without security test |

**Required tests (Stage 3):**
- `apps/web/e2e/media-upload-retry.spec.ts` — BUG-073 regression: presign failure → retry → success
- `apps/web/e2e/graphql-authorization-e2e.spec.ts` — student calls `createCourse` → FORBIDDEN
- `packages/test-utils/src/__tests__/factories.spec.ts` — verify factory types match real interfaces
- `tests/security/runtime-cross-role-mutations.spec.ts` — 5 roles × 10 mutations matrix
- `apps/web/e2e/` — verify 0 `waitForTimeout` remaining (grep-based lint rule)
- `infrastructure/load-testing/scenarios/smoke-ci.js` — 10 VUs × 60s, p95 < 2s
- `.github/workflows/dast.yml` — agent + knowledge subgraphs in ZAP scan
- `apps/web/src/pages/LessonDetailPage.test.tsx` — mounted guard present
- `apps/web/src/pages/LessonResultsPage.test.tsx` — mounted guard present

**Fix rounds (Stage 4):** The `waitForTimeout` elimination (504 sites) will cause some tests to fail that were hiding timing bugs with sleeps. These are REAL bugs exposed by the cleanup — fix the underlying timing issue (use `waitForResponse`, `waitForSelector`, etc.), don't re-add the sleep. Fix in rounds.

**Git commits (Stage 5):**
1. `refactor(e2e): eliminate 504 waitForTimeout calls — replace with deterministic waits`
2. `feat(test-utils): shared packages/test-utils with factory functions for AuthContext, Drizzle, NATS`
3. `test(security): cross-role mutation authorization E2E + runtime security probes`
4. `ci: nightly k6 load test smoke + DAST on all 6 subgraphs + base image digest pinning`
5. `ci: pre-deploy DB dry-run + test result aggregation + flakiness tracking`
6. `fix(web): apply mounted guard to all sibling route pages`
7. `test(e2e): BUG-073 media upload regression guard`
8. `docs: testability contract template + security shift-left protocol update`

**Container deploy (Stage 6):** Full cycle. After deploy:
- Run `pnpm --filter @edusphere/web test:e2e` against running container
- Verify load test runs: `k6 run infrastructure/load-testing/scenarios/smoke-ci.js`
- Check CI pipeline has all new gates: codegen drift, doc freshness, flakiness score

**Gate:** CI green with ALL new gates active + load test baseline established + 0 flaky tests + 5-user auth

---

### WAVE 6 — Documentation Debt (GROUP B4)
**Duration:** ~1 session | **Items:** 12 | **Risk if skipped:** Stale docs, lost institutional knowledge

| Task | Items | Agents | Deliverables |
|------|-------|--------|-------------|
| CHANGELOG catch-up | #64 | Documentation | Versions 0.45.0–0.64.0 from git log |
| API_CONTRACTS update | #65 | Documentation | All new types, mutations, subscriptions since Phase 27 |
| OPEN_ISSUES.md restructure | #66, #67 | Documentation | Status summary table at top. Extract 16 bugs to individual `docs/plans/bugs/` files |
| ROADMAP Phases 51-64 | #68 | Documentation | Add missing phases with ✅ status and acceptance criteria |
| TEST_REGISTRY update | #69 | QA + Documentation | Current counts from filesystem scan |
| docs/INDEX.md refresh | #70 | Documentation | Full `ls -R docs/` scan, add missing entries |
| SESSION_SUMMARY reconstruction | #71 | Documentation | Reconstruct from git log Co-Authored-By metadata |
| Doc freshness CI check | #72 | DevOps + Documentation | `docs-freshness-check.yml` — fail build if docs >7 days behind code |
| Doc pipeline restart | #73 | Orchestrator | Advance baseline to current HEAD. Run full D1-D5 pipeline |
| ADR format + auto-issue | #74 | Architecture + Documentation | ADR template in `docs/architecture/`. Gaps → OPEN_ISSUES.md entries |
| DB change propagation checklist | #75 | DB + Documentation | `docs/architecture/SCHEMA_CHANGE_CHECKLIST.md` |

**Required tests (Stage 3):**
- `.github/workflows/docs-freshness-check.yml` — CI job: fail if any of 8 monitored docs >7 days behind code
- `scripts/verify-changelog.sh` — parse CHANGELOG.md, verify all versions 0.1.0–0.64.0 present
- `scripts/verify-docs-index.sh` — diff INDEX.md entries vs `ls -R docs/` output
- `tests/docs/api-contracts-completeness.spec.ts` — supergraph types count matches API_CONTRACTS type count
- Manual verification: OPEN_ISSUES.md < 100KB after extraction (was 566KB)

**Fix rounds (Stage 4):** Documentation waves rarely have test failures — but the freshness CI check itself may fail on first run if dates are parsed incorrectly. Fix the check script, not the docs.

**Git commits (Stage 5):**
1. `docs: CHANGELOG versions 0.45.0–0.64.0 from git log`
2. `docs: API_CONTRACTS update — all new types/mutations/subscriptions since Phase 27`
3. `docs: OPEN_ISSUES.md restructure — status table + extract 16 bugs to individual files`
4. `docs: ROADMAP Phases 51-64 + TEST_REGISTRY update + INDEX.md refresh`
5. `docs: SESSION_SUMMARY reconstruction from git log + ADR template`
6. `ci: docs-freshness-check.yml + DB change propagation checklist`

**Container deploy (Stage 6):** Docs-only wave — container deploy is for CI validation only. Rebuild to verify freshness check runs correctly in the CI environment.

**Gate:** All docs updated + freshness CI green + INDEX.md matches filesystem + OPEN_ISSUES.md < 100KB

---

### WAVE 7 — Architecture & Scale Preparation (GROUP C1 + C2)
**Duration:** ~2 sessions | **Items:** 18 | **Risk if skipped:** Scale ceiling at <50K users

| Task | Items | Agents | Deliverables |
|------|-------|--------|-------------|
| PostgreSQL extraction plan | #76, #110 | Architecture | Trigger conditions + migration playbook document |
| PgBouncer auto-routing | #77 | Architecture + DB | `getOrCreatePool()` auto-selects pool based on query type |
| Content subgraph split plan | #78 | Architecture | ADR for `subgraph-assessment` + `subgraph-compliance` extraction |
| Connection budget model | #79 | Architecture + DB | `max_connections` budget across all direct paths documented |
| CRDT compaction job | #80, #108 | BE | NestJS `@Cron` in Collaboration subgraph with configurable threshold |
| WebSocket graceful shutdown | #81 | BE + DevOps | `preStop` hook, connection draining, NATS fan-out test |
| Load test corpus | #82 | Architecture + QA | k6 scripts for 5 critical user journeys with latency budgets |
| Canary deployment | #83, #109 | DevOps | Traefik weighted routing: 5% → 20% → 100% promotion script |
| Read replica singleton | #84 | DB | Lazy `readDb`/`writeDb` in `readReplica.ts` |
| Circuit breakers | #85 | BE | `cockatiel` retry + breaker for MinIO, JWKS, Ollama |
| Frontend error telemetry | #86 | FE | OpenTelemetry browser SDK → Jaeger with tenantId/userId |
| Tracing interceptor | #87 | BE | `TracingInterceptor` auto-spans every resolver. Deploy to Core + Knowledge |
| Schema drift detection | #88 | DB + DevOps | CI step: `information_schema` diff + `pg_stat_statements` weekly report |
| LCP differential budget | #89 | FE + DevOps | Lighthouse CI in `ci.yml` with per-build LCP comparison |
| Test taxonomy enforcement | #90 | QA | ESLint rule: `*.test.tsx` = mocked, `*.spec.ts` = real integration |
| Visual QA before completion | #91 | Orchestrator | Playwright against container required before declaring UI bug fixed |
| Outcome acceptance criteria | #92 | Product | "User Outcome Criterion" template added to roadmap format |
| Bug-to-PRD feedback loop | #93 | Product | 3+ file bug → automatic PRD section update in same sprint |

**Required tests (Stage 3):**
- `infrastructure/load-testing/scenarios/student-course-load.js` — student loads course page, p95 < 500ms at 1K VUs
- `infrastructure/load-testing/scenarios/hybrid-rag-search.js` — HybridRAG query, p95 < 1s at 500 VUs
- `infrastructure/load-testing/scenarios/instructor-upload.js` — file upload flow, p95 < 2s at 100 VUs
- `infrastructure/load-testing/scenarios/collab-editing.js` — CRDT sync, p95 < 200ms at 50 concurrent editors
- `infrastructure/load-testing/scenarios/agent-chat.js` — AI agent turn, p95 < 5s at 200 VUs
- `packages/db/src/helpers/readReplica.spec.ts` — singleton verification (same instance on multiple calls)
- `apps/subgraph-content/src/media/media.service.resilience.spec.ts` — circuit breaker opens after 5 failures
- `apps/subgraph-core/src/user/user.resolver.tracing.spec.ts` — verify span created per resolver
- `apps/web/src/lib/telemetry.test.ts` — OTel browser SDK sends error events to correct endpoint
- `apps/web/e2e/performance-lcp-budget.spec.ts` — Lighthouse CI comparison: LCP delta < 200ms
- ESLint rule: `*.test.tsx` = mocked unit, `*.spec.ts` = real integration (enforced in eslint config)

**Fix rounds (Stage 4):** Load test failures indicate real performance bottlenecks. Profile with `--heap-prof` if p95 exceeds budget. Circuit breaker tests may need timeout tuning. Fix in rounds.

**Git commits (Stage 5):**
1. `docs(architecture): PostgreSQL extraction plan + connection budget model`
2. `feat(db): PgBouncer auto-routing in getOrCreatePool() + read replica singleton`
3. `docs(architecture): ADR for content subgraph split (assessment + compliance)`
4. `feat(collab): CRDT compaction @Cron job with configurable threshold`
5. `fix(gateway): WebSocket graceful shutdown with preStop hook + NATS fan-out`
6. `feat(infra): k6 load test corpus for 5 critical user journeys`
7. `feat(infra): canary deployment — Traefik weighted routing 5%→20%→100%`
8. `feat(be): cockatiel circuit breakers for MinIO, JWKS, Ollama`
9. `feat(web): OpenTelemetry browser SDK → Jaeger error telemetry`
10. `feat(be): TracingInterceptor auto-spans every resolver in Core + Knowledge`
11. `ci: schema drift detection + Lighthouse CI LCP budget + test taxonomy ESLint rule`
12. `docs(product): User Outcome Criterion template + bug-to-PRD feedback protocol`

**Container deploy (Stage 6):** Full cycle. After deploy:
- Run k6 load test against running container: `k6 run scenarios/student-course-load.js`
- Open Jaeger UI → verify spans from Core + Knowledge subgraphs visible
- Trigger MinIO failure → verify circuit breaker opens → verify recovery after cooldown
- Check `docker stats` for memory — CRDT compaction should reduce Collaboration subgraph memory

**Gate:** Load test baseline (5 journeys within budget) + circuit breaker tests green + tracing in Jaeger + 5-user auth

---

### WAVE 8 — Process & Long-Term Vision (GROUP C3 + C4)
**Duration:** ~1 session | **Items:** 17 | **Risk if skipped:** Repeating mistakes, missing differentiation

| Task | Items | Agents | Deliverables |
|------|-------|--------|-------------|
| Discovery wave update | #94 | Orchestrator | Add `packages/` and Docker/env to mandatory Wave 2 targets |
| Inter-wave handoff docs | #95 | Orchestrator | "Wave 2 Input Document" template required from each Wave 1 agent |
| Feature Completeness Contract | #96 | Product | Template: nav entry + E2E + screenshot + QA sign-off |
| Upload as PRD requirement | #97 | Product | Non-functional requirements section in PRD File Upload contract |
| UX Spec Template | #98 | UX | `docs/reference/UX_SPEC_TEMPLATE.md` with user flow, states, WCAG, breakpoints |
| Storybook bootstrap | #99, #100 | FE + UX | Storybook config + top 20 components + CI build step |
| `useFileUpload` shared hook | #101 | FE | Presign-upload-confirm + retry + logging in one composable |
| Mobile test expansion | #102 | QA + FE | Install `@testing-library/react-native`, 5 critical screen tests |
| Security/QA in Wave 1 | #103 | Orchestrator | Protocol update: threat model stub + testability contract at Wave 1 |
| Knowledge graph student stories | #104 | Product + UX | 6 new user stories: prerequisite prompts, concept sidebar, adaptive quiz |
| HybridRAG per-tenant config | #105 | BE + Architecture | Already in Wave 3 (#43) — ensure Hebrew corpus test included |
| Mobile parity tracking | #106 | Product | Already in Wave 4 (#51) — add quarterly roadmap for `❌` items |
| Concept embedding lifecycle | #107 | DB + BE | Already in Wave 3 (#44) — ensure NATS consumer handles bulk deletes |
| GDPR export attestation | SEC-10 | Security + BE | SHA-256 hash of export in audit_log. `pii-bearing-tables.json` manifest |
| Content subgraph extraction | ARCH-4 | Architecture + BE | Already planned in Wave 7 (#78) — execute ADR |
| PostgreSQL extraction trigger | ARCH-1 | Architecture | Already planned in Wave 7 (#76) — document trigger conditions |
| CRDT compaction | ARCH-6 | BE | Already planned in Wave 7 (#80) — ensure tenant-scoped metrics |

**Required tests (Stage 3):**
- `apps/web/.storybook/` — Storybook config + `pnpm --filter @edusphere/web storybook:build` succeeds
- `apps/web/src/components/ui/*.stories.tsx` — top 20 components have stories
- `apps/web/src/hooks/useFileUpload.test.ts` — presign → upload → confirm → retry → logging
- `apps/mobile/src/screens/__tests__/HomeScreen.test.tsx` — renders with mock data
- `apps/mobile/src/screens/__tests__/CoursesScreen.test.tsx` — renders course list
- `apps/mobile/src/screens/__tests__/AITutorScreen.test.tsx` — renders chat interface
- `apps/mobile/src/screens/__tests__/ProfileScreen.test.tsx` — renders user info
- `apps/mobile/src/screens/__tests__/SettingsScreen.test.tsx` — renders settings
- `tests/security/gdpr-export-attestation.spec.ts` — SHA-256 hash in audit_log after export
- `tests/security/pii-manifest-completeness.spec.ts` — `pii-bearing-tables.json` covers all PII columns

**Fix rounds (Stage 4):** Storybook may have import resolution issues with path aliases (`@/*`). Mobile tests may fail on missing native module mocks. Fix in rounds.

**Git commits (Stage 5):**
1. `docs: update Discovery Wave checklist + inter-wave handoff template`
2. `docs: Feature Completeness Contract + upload NFR in PRD + UX Spec Template`
3. `feat(web): Storybook bootstrap — config + top 20 component stories + CI build step`
4. `feat(web): useFileUpload shared hook — presign/upload/confirm + retry + logging`
5. `test(mobile): install @testing-library/react-native + 5 critical screen tests`
6. `docs: protocol updates — security/QA shift to Wave 1 + testability contracts`
7. `feat(product): 6 knowledge graph student stories + mobile parity quarterly roadmap`
8. `feat(security): GDPR export attestation — SHA-256 hash + pii-bearing-tables.json manifest`

**Container deploy (Stage 6):** Full cycle. After deploy:
- Run `pnpm --filter @edusphere/web storybook:build` → verify clean build
- Run mobile tests: `pnpm --filter @edusphere/mobile test`
- Verify GDPR export: trigger Art.20 export for test user → check audit_log for hash entry

**Gate:** Storybook builds + mobile tests green + GDPR attestation test + all protocol docs updated + 5-user auth

---

## SUMMARY — Wave Execution Timeline

| Wave | Focus | Items | Sessions | Depends On |
|------|-------|-------|----------|-----------|
| **1** | Security Hardening | 14 | 1 | None |
| **2** | Data Integrity & Quality Gates | 19 | 1 | Wave 1 |
| **3** | Enterprise Product MVP | 12 | 2 | Wave 2 |
| **4** | Accessibility & Responsive | 6 | 1 | Wave 2 |
| **5** | CI/CD & Testing Infra | 12 | 1 | Wave 2 |
| **6** | Documentation Debt | 12 | 1 | Wave 3 |
| **7** | Architecture & Scale | 18 | 2 | Wave 5 |
| **8** | Process & Vision | 17 | 1 | Wave 6 |
| **TOTAL** | | **110** | **~10 sessions** | |

**Waves 3, 4, 5 can run in parallel** (no dependencies between them).
**Wave 6 depends on Wave 3** (docs reference new features).
**Wave 7 depends on Wave 5** (CI infra must exist before scale work).

```
Wave 1 ──→ Wave 2 ──┬──→ Wave 3 ──→ Wave 6 ──┐
                     ├──→ Wave 4               ├──→ Wave 8
                     └──→ Wave 5 ──→ Wave 7 ──┘
```

---

## FINAL VERIFICATION — After All 8 Waves Complete

### Session Completion Gate (run EVERY check — no exceptions)

```
┌────┬─────────────────────────────────┬──────────────────────────────────┬────────────┐
│ #  │ Check                           │ Command                          │ Required   │
├────┼─────────────────────────────────┼──────────────────────────────────┼────────────┤
│ 0  │ Docker Up                       │ docker ps | grep -c healthy      │ ≥5         │
│ 1  │ Unit Tests                      │ pnpm turbo test                  │ 100% pass  │
│ 2  │ TypeScript                      │ pnpm turbo typecheck             │ 0 errors   │
│ 3  │ Lint                            │ pnpm turbo lint                  │ 0 warnings │
│ 4  │ Security Tests (static+runtime) │ pnpm test:security               │ 0 failures │
│ 5  │ E2E Playwright                  │ pnpm --filter @edusphere/web test:e2e │ all pass   │
│ 6  │ Health Check                    │ ./scripts/health-check.sh        │ all UP     │
│ 7  │ 5-User Auth                     │ Keycloak login × 5 roles         │ all OK     │
│ 8  │ GitHub CI                       │ gh run list --limit 3            │ all green  │
│ 9  │ Git Push                        │ git log --oneline -1             │ pushed     │
│ 10 │ OPEN_ISSUES.md                  │ updated + E2E files listed       │ status ✅  │
│ 11 │ Visual Snapshots                │ pnpm --filter web test:e2e       │ 0 diff     │
│ 12 │ Load Test                       │ k6 run smoke-ci.js               │ p95 < 2s   │
│ 13 │ WCAG Audit                      │ axe-core on 10 key pages         │ 0 critical │
│ 14 │ DAST Scan                       │ ZAP against all 6 subgraphs      │ 0 high     │
│ 15 │ Doc Freshness                   │ docs-freshness-check CI          │ pass       │
│ 16 │ Storybook Build                 │ pnpm --filter web storybook:build│ success    │
│ 17 │ Mobile Tests                    │ pnpm --filter mobile test        │ all pass   │
└────┴─────────────────────────────────┴──────────────────────────────────┴────────────┘
```

### Expected Final Test Counts (post Wave 8)

| Suite | Current | New Tests Added | Expected Total |
|-------|---------|----------------|---------------|
| Web unit tests | ~4,424 | ~200 | ~4,624 |
| Security tests | ~1,370 | ~50 (runtime) | ~1,420 |
| E2E Playwright | ~134 | ~35 | ~169 |
| Mobile tests | ~119 | ~25 | ~144 |
| Load test scenarios | 0 active | 5 | 5 |
| **Total** | **~8,047** | **~310** | **~8,362** |

### Final Acceptance Criteria

After all 8 waves:
- [ ] All 110 items marked ✅ in this document
- [ ] OPEN_ISSUES.md updated with all fixes + anti-recurrence notes
- [ ] Load test baseline: 5 critical journeys within p95 budget at 1K VUs
- [ ] WCAG 2.2 AA audit: 0 critical violations across all pages
- [ ] OWASP ZAP: 0 high/critical findings across all 6 subgraphs + gateway
- [ ] All 18 checks in Session Completion Gate pass
- [ ] Documentation pipeline running automatically on every push
- [ ] Storybook builds with 20+ component stories
- [ ] Mobile test suite covers 5 critical screens
- [ ] GDPR export produces SHA-256 attested archive
- [ ] Circuit breakers active on MinIO, JWKS, Ollama
- [ ] Tracing spans visible in Jaeger for all 6 subgraphs
- [ ] Canary deployment script tested in staging
- [ ] All protocol updates (Discovery Wave, handoff docs, Feature Completeness Contract) documented
