# EduSphere — Testing Infrastructure Upgrade Plan

**Date:** 2026-02-24 | **Scope:** Comprehensive test quality uplift across all layers

---

## Context

EduSphere is a production-scale GraphQL Federation platform (100,000+ concurrent users) with a monorepo of 8 apps + 12+ packages. The existing test suite is substantial (276+ test files) but has significant structural gaps that create blind spots in CI and risk in production. This plan addresses those gaps systematically in priority-ordered waves.

**Post-plan-approval, first action:** Copy plan to `docs/plans/testing-infrastructure-upgrade-2026-02.md` per CLAUDE.md rule.

---

## Current State Assessment

### What Works Well ✅

| Area                                               | Status |
| -------------------------------------------------- | ------ |
| 276+ test files across all layers                  | ✅     |
| 32 security tests (SI-1..SI-10 + GDPR/SOC2)        | ✅     |
| 11 memory leak tests for critical services         | ✅     |
| 24 E2E Playwright scenarios                        | ✅     |
| 9 GitHub Actions workflows with quality gates      | ✅     |
| k6 smoke/load/stress configs defined               | ✅     |
| Federation contract tests for entity references    | ✅     |
| Full observability stack (Prometheus/Grafana/Loki) | ✅     |
| RLS policy tests with PostgreSQL container         | ✅     |
| Matrix parallelization for subgraph tests          | ✅     |

### Critical Gaps Identified ❌

| #    | Gap                                                        | Severity    | Risk                                        |
| ---- | ---------------------------------------------------------- | ----------- | ------------------------------------------- |
| G-1  | pnpm v9 in CI but project uses v10+                        | 🔴 Critical | Dependency resolution drift                 |
| G-2  | Apache AGE tests skipped in CI (`continue-on-error: true`) | 🔴 Critical | Knowledge graph untested in CI              |
| G-3  | subgraph-annotation: only 2 tests                          | 🔴 High     | Core feature untested                       |
| G-4  | subgraph-collaboration: CRDT/Hocuspocus untested           | 🔴 High     | Real-time feature untested                  |
| G-5  | No shared test factories/fixtures package                  | 🟡 Medium   | Test duplication, fragile mocks             |
| G-6  | Missing memory tests: annotation, collab, content          | 🟡 Medium   | Silent memory leaks                         |
| G-7  | No `test:integration` task separate from unit              | 🟡 Medium   | Slow local dev loop                         |
| G-8  | k6 LOAD/STRESS profiles never run in CI                    | 🟡 Medium   | Performance regressions undetected          |
| G-9  | No NATS subscription end-to-end tests                      | 🟡 Medium   | Event delivery untested                     |
| G-10 | No accessibility tests (a11y)                              | 🟡 Medium   | WCAG compliance risk (educational platform) |
| G-11 | No visual regression tests                                 | 🟢 Low      | UI drift undetected                         |
| G-12 | No log structure validation tests                          | 🟢 Low      | Observability blind spots                   |
| G-13 | No chaos/resilience tests                                  | 🟢 Low      | No circuit-breaker verification             |
| G-14 | No mutation error-shape contract tests                     | 🟢 Low      | Frontend error handling untested            |

---

## Implementation Plan (5 Waves)

---

### Wave 1 — Critical Fixes (execute first, unblock CI)

#### W1-1: Fix pnpm version in all CI workflows

**Files to modify:**

- `.github/workflows/ci.yml` — 3 occurrences
- `.github/workflows/test.yml` — 2 occurrences
- `.github/workflows/federation.yml` — 2 occurrences
- `.github/workflows/docker-build.yml` — 2 occurrences
- `.github/workflows/performance.yml` — 1 occurrence
- `.github/workflows/codeql.yml` — 1 occurrence
- `.github/workflows/pr-gate.yml` — 2 occurrences
- `.github/workflows/cd.yml` — 1 occurrence

**Change:** `pnpm/action-setup@v2` with `version: 9` → `version: 10`

```yaml
# BEFORE
- uses: pnpm/action-setup@v4
  with:
    version: 9
# AFTER
- uses: pnpm/action-setup@v4
  with:
    version: 10
```

Also update `pnpm/action-setup@v2` → `@v4` (v2 is deprecated, v4 is current).

---

#### W1-2: Add Apache AGE support in CI

**Problem:** `pgvector/pgvector:pg16` image doesn't include Apache AGE, so all graph query tests are skipped in CI with `continue-on-error: true`.

**Solution:** Use a custom Docker image with both pgvector AND Apache AGE pre-installed. Build it from `infrastructure/docker/postgres-age/` and push to GHCR.

**New file:** `infrastructure/docker/postgres-age/Dockerfile`

```dockerfile
FROM pgvector/pgvector:pg16
RUN apt-get update && apt-get install -y postgresql-16-age && rm -rf /var/lib/apt/lists/*
```

**New file:** `.github/workflows/build-postgres-image.yml`

- Trigger: push to `infrastructure/docker/postgres-age/**`
- Build + push to `ghcr.io/edusphere/postgres-age-pgvector:pg16`
- Manual dispatch for forced rebuild

**Modify:** `.github/workflows/test.yml`

```yaml
# BEFORE
postgres:
  image: pgvector/pgvector:pg16
# AFTER
postgres:
  image: ghcr.io/edusphere/postgres-age-pgvector:pg16
```

Remove `continue-on-error: true` from migration step.

Add to Enable extensions step:

```bash
psql ... -c "LOAD 'age';" -c "CREATE EXTENSION IF NOT EXISTS age;"
```

---

#### W1-3: Add `test:integration` Turbo task

**Problem:** Unit tests (pure mocks) and integration tests (require DB/NATS) run in the same `test` task. No way to run just unit tests locally for fast feedback.

**Files to modify:**

`turbo.json` — Add new task:

```json
"test:integration": {
  "dependsOn": ["^build"],
  "outputs": [],
  "cache": false,
  "env": ["DATABASE_URL", "NATS_URL", "REDIS_URL"]
}
```

`package.json` (root) — Add script:

```json
"test:unit": "turbo test -- --testPathPattern='(?<!integration)(\\.spec|\\.test)\\.(ts|tsx)$'",
"test:integration": "turbo test:integration"
```

**Each subgraph `package.json`** — Add:

```json
"test:integration": "vitest run --config vitest.integration.config.ts"
```

**New file per subgraph:** `apps/subgraph-*/vitest.integration.config.ts`

```ts
import { defineConfig } from 'vitest/config';
export default defineConfig({
  test: {
    include: ['src/test/integration/**/*.spec.ts'],
    environment: 'node',
    testTimeout: 30000,
  },
});
```

---

### Wave 2 — Coverage Gaps (core business logic protection)

#### W2-1: Create `packages/test-utils` — shared test factories

**New package:** `packages/test-utils/`

**Purpose:** Centralize all test mock factories, builders, and fixtures to eliminate per-file mock duplication.

**Structure:**

```
packages/test-utils/
  src/
    factories/
      tenant.factory.ts       # createTenant(), createTenantContext()
      user.factory.ts         # createUser(), createAuthContext()
      course.factory.ts       # createCourse(), createCourseModule()
      annotation.factory.ts   # createAnnotation(), createAnnotationLayer()
      agent-session.factory.ts # createAgentSession(), createMessage()
      knowledge.factory.ts    # createConcept(), createTerm(), createPerson()
    mocks/
      db.mock.ts             # createMockDb(), createMockTx(), mockDrizzleChain()
      nats.mock.ts           # createMockNatsClient(), createMockKVStore()
      pino.mock.ts           # createMockLogger()
      auth.mock.ts           # createMockAuthContext(), mockJwt()
    index.ts
  package.json
  tsconfig.json
```

**Factory pattern (example):**

```ts
// packages/test-utils/src/factories/user.factory.ts
import type { AuthContext } from '@edusphere/auth';
export const createAuthContext = (
  overrides?: Partial<AuthContext>
): AuthContext => ({
  userId: 'user-test-001',
  tenantId: 'tenant-test-001',
  role: 'STUDENT',
  scopes: ['course:read'],
  ...overrides,
});
```

**Dependencies:** `@faker-js/faker` (for realistic data generation)

---

#### W2-2: Expand subgraph-annotation tests

**Current:** 2 tests (service.spec.ts, resolver.spec.ts)
**Target:** 10 tests

**New test files to create:**

```
apps/subgraph-annotation/src/
  annotation/annotation.rls.spec.ts      # RLS: tenant isolation, layer visibility per role
  annotation/annotation.gdpr.spec.ts     # GDPR: erasure cascade, personal annotation visibility
  annotation/annotation.nats.spec.ts     # NATS: annotation.added event published correctly
  annotation/annotation.layer.spec.ts    # Layer filtering: personal/instructor/public layers
  annotation/annotation.thread.spec.ts   # Thread: reply chains, resolution status
  annotation/annotation.memory.spec.ts   # Memory: DB pool + NATS cleanup on OnModuleDestroy
  auth/auth.middleware.spec.ts           # Auth middleware (file exists but needs content)
  metrics/metrics.interceptor.spec.ts    # Metrics interceptor records annotation latency
```

**Key scenarios to cover:**

- `annotation.rls.spec.ts`: A student cannot see INSTRUCTOR-layer annotations
- `annotation.gdpr.spec.ts`: GDPR erasure removes annotation text but keeps audit trail
- `annotation.nats.spec.ts`: Publishing `annotation.added` event with correct payload
- `annotation.layer.spec.ts`: Layer visibility matrix by role
- `annotation.memory.spec.ts`: `onModuleDestroy()` calls `closeAllPools()` and `kv.close()`

---

#### W2-3: Expand subgraph-collaboration tests

**Current:** 4 tests (discussion schemas, resolver, service, auth)
**Target:** 10 tests

**New test files to create:**

```
apps/subgraph-collaboration/src/
  crdt/hocuspocus.service.spec.ts        # Hocuspocus: document load, auth hook, sync
  crdt/hocuspocus.memory.spec.ts         # Memory: WebSocket connections closed on destroy
  discussion/discussion.rls.spec.ts      # RLS: discussion thread tenant isolation
  discussion/discussion.nats.spec.ts     # NATS: discussion.created event published
  discussion/discussion.pagination.spec.ts # Relay cursor pagination correctness
  metrics/metrics.interceptor.spec.ts    # Metrics interceptor coverage
```

**Key scenarios:**

- `hocuspocus.memory.spec.ts`: verify all WebSocket connections are closed when `OnModuleDestroy` fires
- `discussion.rls.spec.ts`: Tenant A cannot see Tenant B discussions (cross-tenant isolation)
- `hocuspocus.service.spec.ts`: document auth hook rejects invalid JWT

---

#### W2-4: Add missing memory tests

**Files to create:**

| New File                                                                    | Validates                               |
| --------------------------------------------------------------------------- | --------------------------------------- |
| `apps/subgraph-annotation/src/annotation/annotation.memory.spec.ts`         | DB pool + NATS cleanup                  |
| `apps/subgraph-collaboration/src/crdt/hocuspocus.memory.spec.ts`            | WebSocket connection cleanup            |
| `apps/subgraph-content/src/content-item/content-item.loader.memory.spec.ts` | DataLoader cache doesn't grow unbounded |
| `apps/web/src/hooks/useCollaboration.memory.test.ts`                        | Hocuspocus provider cleanup on unmount  |
| `packages/redis-pubsub/src/redis-pubsub.memory.spec.ts`                     | Redis subscriber cleanup                |

**Pattern (backend):**

```ts
it('closes all pools on module destroy', async () => {
  const moduleRef = await Test.createTestingModule({...}).compile();
  const service = moduleRef.get(AnnotationService);
  await service.onModuleDestroy();
  expect(mockCloseAllPools).toHaveBeenCalledOnce();
  expect(mockNatsClose).toHaveBeenCalledOnce();
});
```

**Pattern (frontend):**

```ts
it('clears interval on unmount', () => {
  const clearSpy = vi.spyOn(globalThis, 'clearInterval');
  const { unmount } = renderHook(() => useCollaboration('doc-1'));
  unmount();
  expect(clearSpy).toHaveBeenCalled();
});
```

---

#### W2-5: Add NATS event delivery end-to-end tests

**New file:** `tests/integration/nats-events.spec.ts` (in new `tests/integration/` workspace)

**Scenarios:**

- `content.created` event is published when content item is created
- `annotation.added` event triggers knowledge graph update
- `agent.message` event is published and consumed correctly
- NATS reconnection: subscriber reconnects after broker restart simulation
- Dead letter queue: malformed events go to `EDUSPHERE.DLQ`

**New turbo task:** `test:events` (runs in test.yml alongside integration-tests)

---

### Wave 3 — Performance & Load Testing

#### W3-1: Add scheduled nightly performance workflow

**New file:** `.github/workflows/performance-nightly.yml`

```yaml
name: Nightly Performance Tests
on:
  schedule:
    - cron: '0 2 * * *' # 2am UTC daily
  workflow_dispatch:
    inputs:
      profile:
        type: choice
        options: [smoke, load, stress]
        default: load

jobs:
  k6-load:
    runs-on: ubuntu-latest
    steps:
      # ... spin up full Docker Compose stack
      # Run k6 with LOAD_OPTIONS (500 VU, 9 min)
      # Store results in InfluxDB / Prometheus
      # Compare p95 against previous run baseline
      # Fail if p95 regressed >20%
      # Post results summary to PR / Slack
```

**Scenarios to add (new k6 files):**

```
tests/performance/scenarios/
  06-knowledge-graph.k6.js    # Cypher queries, concept traversal
  07-collaboration-ws.k6.js   # WebSocket load (Hocuspocus)
  08-transcription.k6.js      # Upload + transcription pipeline
  09-agent-concurrent.k6.js   # Concurrent AI agent sessions
```

**Performance baseline storage:** InfluxDB container in nightly workflow + Grafana k6 dashboard.

---

#### W3-2: Performance regression detection

**New file:** `tests/performance/__tests__/baseline-comparison.test.ts`

Logic:

- After each k6 run, store `{ scenario, p95, p99, errorRate, timestamp }` as JSON artifact
- Compare against rolling 7-day average baseline
- Fail if p95 increased >20% or errorRate increased >50%

**Modify:** `tests/performance/__tests__/k6-config.test.ts` — add validation that all 9 scenario files exist and export required options.

---

### Wave 4 — Advanced Testing

#### W4-1: Accessibility tests (a11y) — CI BLOCKING

**Policy: Zero violations — PRs blocked on any WCAG 2.1 AA violation.**

**New dependency:** `@axe-core/playwright` (Playwright plugin)

**New file:** `apps/web/e2e/accessibility.spec.ts`

```ts
import AxeBuilder from '@axe-core/playwright';
test('course page has no WCAG 2.1 AA violations', async ({ page }) => {
  await page.goto('/courses/test-course');
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
  expect(results.violations).toEqual([]);
});
```

**Pages to audit (8 critical paths):**

1. `/login` — authentication form
2. `/courses` — course list
3. `/courses/:id` — course viewer (video + transcript + annotations)
4. `/courses/:id/annotations` — annotations panel
5. `/agent` — AI agent chat
6. `/knowledge-graph` — graph visualization
7. `/admin` — admin dashboard
8. All pages in RTL mode (Hebrew locale)

**Mobile viewport:** add `{ viewport: { width: 375, height: 812 } }` test variants for mobile layouts.

**CI integration:** `ci.yml` — new `accessibility-tests` job, parallel with `e2e-tests`, **required** by `pr-gate.yml`.

**Turbo task added:** `test:a11y` in `turbo.json`.

---

#### W4-2: Visual regression tests

**Approach:** Playwright built-in screenshot comparison (Local Git, no external service).

**Snapshots stored in:** `apps/web/e2e/snapshots/` committed to git (per platform: linux-chromium baseline in CI)

**New file:** `apps/web/e2e/visual-regression.spec.ts`

```ts
test('course page matches snapshot', async ({ page }) => {
  await page.goto('/courses');
  await expect(page).toHaveScreenshot('courses-list.png', {
    maxDiffPixels: 100,
    animations: 'disabled', // disable CSS animations for stable snapshots
  });
});
```

**CI integration:**

- Run only on PRs touching `apps/web/src/` (path filter)
- Upload diff PNGs as artifacts on failure
- `playwright.config.ts`: add `snapshotDir: './e2e/snapshots'` and `updateSnapshots: 'none'` in CI

**Key pages:** Login, Course List, Course Viewer, Knowledge Graph, Agent Chat, Admin Dashboard, RTL (Hebrew) layout

**Update snapshots:** `pnpm --filter @edusphere/web test:e2e -- --update-snapshots` (manual, committer responsibility)

---

#### W4-3: Mutation error-shape contract tests

**Problem:** GraphQL mutations return structured errors with `extensions: { code, details }`. There are no tests validating these shapes.

**New file:** `tests/contract/mutation-errors.test.ts`

```ts
describe('Mutation error shapes', () => {
  it('unauthenticated mutation returns UNAUTHENTICATED code', async () => {
    const result = await executeGraphQL(
      CREATE_COURSE,
      { input: {} },
      { noAuth: true }
    );
    expect(result.errors[0].extensions.code).toBe('UNAUTHENTICATED');
  });
  it('validation error returns BAD_USER_INPUT with details', async () => {
    const result = await executeGraphQL(CREATE_COURSE, {
      input: { title: '' },
    });
    expect(result.errors[0].extensions.code).toBe('BAD_USER_INPUT');
    expect(result.errors[0].extensions.details).toBeDefined();
  });
});
```

**Coverage:** All 20+ mutations in API_CONTRACTS_GRAPHQL_FEDERATION.md.

---

#### W4-4: Chaos/resilience tests

**New file:** `tests/resilience/circuit-breaker.spec.ts`

**Scenarios:**

- PostgreSQL connection lost: service returns graceful error (not crash)
- NATS unavailable: service queues events locally, reconnects
- Redis down: service falls back to in-memory cache
- LLM provider timeout: `CONSENT_REQUIRED` path honored even under timeout
- Rate limiter under concurrent load: `429` returned correctly

**Tool:** Use `docker pause/unpause` to simulate service failures in integration tests.

**New turbo task:** `test:resilience` (manual/scheduled only, not in PR gate)

---

### Wave 5 — Developer Experience

#### W5-1: Log structure validation tests

**New file:** `tests/observability/log-structure.spec.ts`

**Validates:**

- All Pino logs include `{ level, time, msg, tenantId, requestId }` fields
- No `console.log` calls exist in production code (static source analysis)
- Loki query returns logs for test request ID
- Alert rules syntax is valid Prometheus YAML

---

#### W5-2: Coverage badges in README

**New files:**

- `.github/badges/coverage-backend.svg` (generated in CI)
- `.github/badges/coverage-frontend.svg` (generated in CI)

**Modify:** `README.md` — add coverage badges, test count badge, CI status badge.

**CI step in `ci.yml`:** After `unit-tests` job, generate badge SVGs and commit to `gh-pages` branch.

---

#### W5-3: Test metrics Grafana dashboard

**New file:** `infrastructure/monitoring/grafana/dashboards/tests.json`

**Panels:**

- Test run duration over time (all workflows)
- Test failure rate by subgraph
- k6 p95 latency over time (nightly runs)
- Coverage % over time (backend + frontend)
- Security test pass rate

**Data source:** GitHub Actions API (via Alloy → Prometheus) + k6 InfluxDB results

---

## CI Workflow Modifications Summary

| Workflow                                     | Change                                                                                   |
| -------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `ci.yml`                                     | Fix pnpm v10, add `accessibility-tests` job                                              |
| `test.yml`                                   | Fix pnpm v10, use AGE+pgvector image, add `test:events` job, add NATS subscription tests |
| `federation.yml`                             | Fix pnpm v10                                                                             |
| `performance.yml`                            | Fix pnpm v10                                                                             |
| `docker-build.yml`                           | Fix pnpm v10                                                                             |
| `codeql.yml`                                 | Fix pnpm v10                                                                             |
| `pr-gate.yml`                                | Fix pnpm v10                                                                             |
| `cd.yml`                                     | Fix pnpm v10                                                                             |
| `.github/workflows/performance-nightly.yml`  | **NEW** — nightly k6 load/stress runs                                                    |
| `.github/workflows/build-postgres-image.yml` | **NEW** — build AGE+pgvector image                                                       |

---

## New Files Summary

### Packages

- `packages/test-utils/` — shared factories + mocks (new package)

### Infrastructure

- `infrastructure/docker/postgres-age/Dockerfile` — PostgreSQL + AGE + pgvector image

### Test Files — Subgraph Annotation (8 new)

- `apps/subgraph-annotation/src/annotation/annotation.rls.spec.ts`
- `apps/subgraph-annotation/src/annotation/annotation.gdpr.spec.ts`
- `apps/subgraph-annotation/src/annotation/annotation.nats.spec.ts`
- `apps/subgraph-annotation/src/annotation/annotation.layer.spec.ts`
- `apps/subgraph-annotation/src/annotation/annotation.thread.spec.ts`
- `apps/subgraph-annotation/src/annotation/annotation.memory.spec.ts`
- `apps/subgraph-annotation/src/auth/auth.middleware.spec.ts`
- `apps/subgraph-annotation/src/metrics/metrics.interceptor.spec.ts`

### Test Files — Subgraph Collaboration (6 new)

- `apps/subgraph-collaboration/src/crdt/hocuspocus.service.spec.ts`
- `apps/subgraph-collaboration/src/crdt/hocuspocus.memory.spec.ts`
- `apps/subgraph-collaboration/src/discussion/discussion.rls.spec.ts`
- `apps/subgraph-collaboration/src/discussion/discussion.nats.spec.ts`
- `apps/subgraph-collaboration/src/discussion/discussion.pagination.spec.ts`
- `apps/subgraph-collaboration/src/metrics/metrics.interceptor.spec.ts`

### Test Files — Memory (5 new)

- `apps/subgraph-content/src/content-item/content-item.loader.memory.spec.ts`
- `apps/web/src/hooks/useCollaboration.memory.test.ts`
- `packages/redis-pubsub/src/redis-pubsub.memory.spec.ts`

### Test Files — Cross-cutting (8 new)

- `tests/integration/nats-events.spec.ts`
- `tests/integration/vitest.config.ts`
- `tests/integration/package.json`
- `tests/contract/mutation-errors.test.ts`
- `tests/resilience/circuit-breaker.spec.ts`
- `tests/resilience/vitest.config.ts`
- `tests/resilience/package.json`
- `tests/observability/log-structure.spec.ts`

### Test Files — E2E (2 new)

- `apps/web/e2e/accessibility.spec.ts`
- `apps/web/e2e/visual-regression.spec.ts`

### k6 Performance (4 new scenarios)

- `tests/performance/scenarios/06-knowledge-graph.k6.js`
- `tests/performance/scenarios/07-collaboration-ws.k6.js`
- `tests/performance/scenarios/08-transcription.k6.js`
- `tests/performance/scenarios/09-agent-concurrent.k6.js`

### GitHub Workflows (2 new)

- `.github/workflows/performance-nightly.yml`
- `.github/workflows/build-postgres-image.yml`

### Grafana (1 new)

- `infrastructure/monitoring/grafana/dashboards/tests.json`

---

## Turbo.json Additions

```json
"test:integration": {
  "dependsOn": ["^build"],
  "outputs": [],
  "cache": false,
  "env": ["DATABASE_URL", "NATS_URL", "REDIS_URL"]
},
"test:events": {
  "dependsOn": ["^build"],
  "outputs": [],
  "cache": false
},
"test:resilience": {
  "dependsOn": ["^build"],
  "outputs": [],
  "cache": false
},
"test:a11y": {
  "dependsOn": ["^build"],
  "outputs": [],
  "cache": false
}
```

---

## pnpm-workspace.yaml Addition

```yaml
packages:
  - 'apps/*'
  - 'packages/*'
  - 'tests/*' # already includes security, performance, contract
  # tests/integration and tests/resilience will be under tests/* automatically
```

---

## Execution Order (parallel where possible)

```
Wave 1 (sequential — unblocks CI):
  W1-1: Fix pnpm version (all 8 workflows)          — 1 agent
  W1-2: Build postgres-age Docker image + workflow   — 1 agent (parallel with W1-1)
  W1-3: Add test:integration turbo task              — 1 agent (parallel)

Wave 2 (parallel — 3 agents):
  Agent-A: packages/test-utils factory library
  Agent-B: subgraph-annotation tests (8 files)
  Agent-C: subgraph-collaboration tests (6 files) + memory tests (5 files)

Wave 3 (parallel — 2 agents):
  Agent-A: performance-nightly workflow + 4 k6 scenarios
  Agent-B: baseline comparison + k6-config test update

Wave 4 (parallel — 2 agents):
  Agent-A: accessibility tests + visual regression
  Agent-B: mutation error contracts + NATS events integration tests

Wave 5 (parallel — 2 agents):
  Agent-A: resilience/chaos tests
  Agent-B: log structure tests + Grafana dashboard + README badges
```

---

## User Decisions

| Decision          | Choice                                                                 |
| ----------------- | ---------------------------------------------------------------------- |
| Scope             | All 5 Waves (complete uplift)                                          |
| Visual Regression | Local Git — Playwright built-in snapshots in `apps/web/e2e/snapshots/` |
| Accessibility     | **CI Blocking** — zero WCAG 2.1 AA violations, PRs blocked on failure  |

---

## Acceptance Criteria

After all waves complete:

```bash
# 1. All tests pass
pnpm turbo test            # no failures

# 2. Unit tests run fast (no DB needed)
pnpm test:unit             # completes in <2 min

# 3. Integration tests run with DB
pnpm test:integration      # requires running services

# 4. Memory tests all pass
pnpm turbo test:memory     # all OnModuleDestroy verified

# 5. Security tests still pass
pnpm test:security         # all 32+ tests pass

# 6. Accessibility audit
pnpm test:a11y             # zero WCAG 2.1 AA violations on key pages

# 7. CI pnpm version correct
grep 'version: 10' .github/workflows/*.yml  # all show v10

# 8. Apache AGE tested in CI
# test.yml migration step has no continue-on-error: true

# 9. Coverage thresholds met
pnpm turbo test -- --coverage  # ≥80% backend, ≥80% frontend

# 10. Nightly performance workflow exists
ls .github/workflows/performance-nightly.yml
```

---

## Risk & Mitigation

| Risk                                            | Mitigation                                                                      |
| ----------------------------------------------- | ------------------------------------------------------------------------------- |
| AGE Docker image build takes long               | Pre-build on schedule, cache in GHCR                                            |
| test-utils adds coupling                        | Factory functions return plain objects, no DI dependencies                      |
| Accessibility tests are flaky                   | Run with `--retries=2`, exclude animation-heavy pages initially                 |
| Nightly performance tests are flaky             | `--abort-on-fail` only for p99>5000ms; p95 regressions are warnings first cycle |
| Visual regression snapshots pollute git history | Store in separate `test-snapshots` branch or use Argos cloud                    |

---

## Files Modified (existing)

| File                                 | Change                                                         |
| ------------------------------------ | -------------------------------------------------------------- |
| `turbo.json`                         | Add 4 new test tasks                                           |
| `package.json` (root)                | Add test:unit, test:events, test:resilience, test:a11y scripts |
| `.github/workflows/ci.yml`           | pnpm v10, add accessibility job                                |
| `.github/workflows/test.yml`         | pnpm v10, AGE image, test:events job                           |
| `.github/workflows/federation.yml`   | pnpm v10                                                       |
| `.github/workflows/performance.yml`  | pnpm v10                                                       |
| `.github/workflows/docker-build.yml` | pnpm v10                                                       |
| `.github/workflows/codeql.yml`       | pnpm v10                                                       |
| `.github/workflows/pr-gate.yml`      | pnpm v10                                                       |
| `.github/workflows/cd.yml`           | pnpm v10                                                       |
| `pnpm-workspace.yaml`                | No change needed (tests/\* already there)                      |
| `apps/web/vitest.config.ts`          | Add visual regression snapshot dir                             |
| `README.md`                          | Add coverage badges                                            |
| `OPEN_ISSUES.md`                     | Document this upgrade task                                     |
