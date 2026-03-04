# MASTER COMPLETION PLAN — EduSphere All Pending Activities
**Plan ID:** cozy-sniffing-cerf
**Created:** 2026-03-04
**Scope:** All genuinely pending work across 26 plan files in docs/plans/
**Target:** Zero open items, full deployment verification, all 5 users operational

> **MANDATORY FIRST ACTION:** Move this file to `docs/plans/MASTER_COMPLETION_PLAN.md` before any other work
> ```bash
> mv C:\Users\P0039217\.claude\plans\cozy-sniffing-cerf.md \
>    C:\Users\P0039217\.claude\projects\EduSphere\docs\plans\MASTER_COMPLETION_PLAN.md
> ```

---

## 1. STATUS VERIFICATION MATRIX

Cross-referencing all 26 plan files against OPEN_ISSUES.md + live codebase:

| Plan File | Claimed Status | Actual Status | Action |
|-----------|----------------|---------------|--------|
| lesson-pipeline-builder.md | Pending | ✅ FULLY IMPLEMENTED (all 4 phases, 38+ files) | Archive only |
| WCAG22_ACCESSIBILITY_CHECKLIST.md | Pending | ✅ COMPLETE (all 8 WCAG 2.2 SCs done) | Archive only |
| REMAINING_WORK_PLAN.md | Pending | ✅ COMPLETE (all items done Feb 25) | Archive only |
| MCP_COMPLETION_VALIDATION_PLAN.md | Pending | ✅ COMPLETE (CLAUDE.md has full matrix) | Archive only |
| gap-closure-plan.md | Pending | ✅ COMPLETE (Session 14, all A1-D) | Archive only |
| I18N_IMPLEMENTATION_PLAN.md | Pending | ✅ COMPLETE (Feb 2026, 9 languages) | Archive only |
| ADMIN_UPGRADE_PLAN.md | Pending | ✅ COMPLETE (F-101–F-113) | Archive only |
| CICD_FIX_PLAN.md | Pending | ✅ COMPLETE (CI/CD green) | Archive only |
| COMPETITIVE_GAP_ANALYSIS_PLAN.md | Pending | ✅ COMPLETE (39 gaps closed) | Archive only |
| BUG-039-graphql-network-error-banner.md | In Progress | ✅ COMPLETE (= BUG-042) | Archive only |
| FEAT-knowledge-sources.md | Implemented | ✅ CONFIRMED | Archive only |
| MCP_TOOLS_SETUP.md | Configured | ✅ CONFIRMED | Archive only |
| DOCUMENT_NAMING_STANDARDS.md | Established | ✅ CONFIRMED | Archive only |
| SPRINT4_TECH_PLAN.md | Pending | ✅ COMPLETE (Hive, AGE, pgvector running) | Archive only |
| OPEN_SOURCE_TECHNOLOGY_AUDIT.md | Pending | ⚠️ PARTIAL — 3 gaps remain | Fix in Track 1 |
| STACK_CAPABILITIES_UPGRADE_PLAN.md | Pending | ⚠️ PARTIAL — security fixes needed | Fix in Track 1 |
| MEMORY_SAFETY_PLAN.md | Pending | ❌ NOT DONE — 21 patterns pending | Track 2 |
| CODE_QUALITY_IMPROVEMENT_PLAN.md | Pending | ❌ NOT DONE — 11 topics pending | Track 3 |
| TESTING_INFRASTRUCTURE_UPGRADE_PLAN.md | Pending | ❌ NOT DONE — 5 waves pending | Track 4 |
| PARALLEL_TESTING_PLAN.md | Pending | ❌ NOT DONE — 6 rounds pending | Track 4 |
| TEST_COVERAGE_PLAN.md | Pending | ❌ NOT DONE — 7 packages at 0 tests | Track 4 |
| TEST_ROUNDS_EXECUTION_PLAN.md | Pending | ❌ NOT DONE — 5-round protocol | Track 4 |
| FEAT-tenant-language-management.md | Pending | ❌ NOT DONE — 6 new files needed | Track 5 |
| word-style-annotations.md | Pending | ❌ NOT DONE — 9 new files needed | Track 5 |
| TIER3_IMPLEMENTATION_PLAN.md | Pending | ❌ NOT DONE — 15 features pending | Track 6 |

---

## 2. BUG FIX PROTOCOL UPDATE (CLAUDE.md Patch — Track 0)

This is a prerequisite for ALL other tracks. Update `CLAUDE.md` Phase 1 Discovery section.

### What Changes in CLAUDE.md

**Remove** the current Wave 2 text and **replace** with this stricter version:

```markdown
**Wave 2 — MANDATORY SIMILARITY SEARCH (NEVER SKIP — "שוני מסויים"):**
After finding the root cause pattern, STOP and execute ALL of the following before writing any fix code:

CHECKLIST (mark each ✓ as completed):
□ Every file in apps/web/src/pages/ — checked for same anti-pattern
□ Every file in apps/web/src/hooks/ — checked for same anti-pattern
□ Every file in apps/web/src/components/ — checked for same anti-pattern
□ Every screen in apps/mobile/src/ — checked for same anti-pattern
□ Every service in ALL 6 backend subgraphs — checked if bug is server-side
□ All resolver files across all subgraphs — checked for same pattern
□ Mobile equivalent of affected web component — explicitly checked

Build a numbered DISCOVERY LIST before writing a single line of fix code.
Wave 2 is NOT complete until every checkbox above is ✓.

**Round Completion Gate (MANDATORY after EVERY fix round):**
A round is NOT done until ALL of the following pass:
1. pnpm turbo test passes 100% for ALL affected packages
2. pnpm turbo typecheck — zero TypeScript errors
3. Visual browser verification — open DevTools, reproduce failure, confirm clean UI
4. New regression test guards against the bad string/state reappearing
5. Console.error/Pino log added so bug is observable if it recurs
6. ./scripts/health-check.sh passes
7. All 5 test users can authenticate:
   | User | Role | Password |
   |------|------|----------|
   | superadmin@example.com | SUPER_ADMIN | SuperAdmin123! |
   | instructor@example.com | INSTRUCTOR | Instructor123! |
   | orgadmin@example.com | ORG_ADMIN | OrgAdmin123! |
   | researcher@example.com | RESEARCHER | Researcher123! |
   | student@example.com | STUDENT | Student123! |

**IRON RULE:** Never announce completion until:
- Discovery List is 100% empty
- All 3 waves exhausted
- All rounds complete
- health-check.sh passes
- All 5 users verified
```

**Files to modify:** `CLAUDE.md` (Phase 1 Discovery section, Wave 2 + Round Completion Gate)

---

## 3. EXECUTION ARCHITECTURE

### Dependency Graph
```
Track 0 (Protocol Update) ──► All other tracks depend on it
Track 1 (Security)        ──► Must complete before Track 2,3
Track 2 (Memory Safety)   ──┐
Track 3 (Code Quality)    ──┤ Parallel, no file conflicts
Track 4 (Testing Infra)   ◄─┘ After Tracks 2+3
Track 5 (Features)        ── Parallel with Track 4
Track 6 (TIER3)           ── After Track 5 backend completes
Track 7 (Final Verify)    ── After ALL tracks complete
```

### Parallel Agent Topology (Maximum Concurrency)
```
Day 1:
  Agent 0  — Track 0: CLAUDE.md Bug Fix Protocol update
  Agent 1A — Track 1: LangChain version fix + @langchain/community explicit pin
  Agent 1B — Track 1: TypeScript version unification (root v5.9.3 ← web v6.0.3)
  Agent 1C — Track 1: Zod version unification (web ^3.x → ^4.x)

Days 1-3 (after Track 1 complete):
  Agent 2A — Track 2 Wave 1: DB pool singleton + closeAllPools, 20 OnModuleDestroy services
  Agent 2B — Track 2 Wave 2: Frontend timer cleanup (useRef + useEffect + token refresh)
  Agent 2C — Track 2 Wave 3: LangGraph wrapping, AbortSignal, workflow history pruning
  Agent 2D — Track 2 Wave 4: Docker mem_limit + NODE_OPTIONS + NATS retention
  Agent 3A — Track 3 Topics 1+2: packages/config + duplicate code extraction
  Agent 3B — Track 3 Topics 3+4: Magic numbers → constants, file size splits
  Agent 3C — Track 3 Topics 5+6+7: Memory gaps, TypeScript any, Docker limits
  Agent 3D — Track 3 Topics 8+9+10+11: Tests, DB indexes, Turbo pipeline, N+1

Days 3-5 (after Tracks 2+3):
  Agent 2E — Track 2 Wave 5: 11 memory test files
  Agent 4A — Track 4 Wave 1: pnpm CI fix, Apache AGE, test:integration task
  Agent 4B — Track 4 Wave 2: packages/test-utils, annotation/collab tests
  Agent 4C — Track 4 Wave 3: k6 performance tests
  Agent 4D — Track 4 Wave 4: Accessibility CI, visual regression, chaos tests
  Agent 5A — Track 5: Tenant Language Management (backend)
  Agent 5B — Track 5: Word-Style Annotations (backend)

Days 5-7 (parallel with Track 4 completion):
  Agent 4E — Track 4 Wave 5: Coverage badges, Grafana dashboard
  Agent 5C — Track 5: Tenant Language Management (frontend)
  Agent 5D — Track 5: Word-Style Annotations (frontend)
  Agent 4F — Track 4: TEST_COVERAGE_PLAN (8 parallel sub-agents)

Days 7-10:
  Agent 6A — Track 6 Sprint A: BI export, Social following, CPD credits
  Agent 6B — Track 6 Sprint B: xAPI/LRS, SCORM export
  Agent 6C — Track 6 Sprint C: OpenBadges 3.0 enhancement
  Agent 6D — Track 6 Sprint D: Social recommendations
  Agent 6E — Track 6 Sprint E: Portal builder (basic)

Day 10-11:
  Agent 7  — Track 7: Final verification, deployment, 5-user check
```

---

## 4. TRACK 0 — Bug Fix Protocol Update (Day 1, ~30 min)

**Agent:** Single sequential agent
**File:** `CLAUDE.md`

### Changes:
1. Replace Wave 2 description with 7-checkbox mandatory checklist (see §2 above)
2. Add "Round Completion Gate" section with 7 mandatory gates
3. Add Pino logging requirement per fix (structured `[ServiceName]` prefix)
4. Strengthen Iron Rules: add "never announce completion without health-check.sh passing AND all 5 users verified"

### Verification:
- Read CLAUDE.md back and confirm all 7 checkboxes appear
- Run `grep -n "Wave 2" CLAUDE.md` to confirm update landed

---

## 5. TRACK 1 — Security & Dependency Fixes (Day 1, ~2 hours, 3 parallel agents)

### Critical Fixes Found:

#### Agent 1A — LangChain Version Alignment
**Problem:** `package.json` has `^0.2.28` but lock has both `0.2.74` AND `1.1.5` — runtime type mismatch risk
**Files:** `apps/subgraph-agent/package.json`

```json
// CHANGE:
"@langchain/langgraph": "^0.2.28"
// TO:
"@langchain/langgraph": "^0.2.74"

// ADD explicit declaration:
"@langchain/community": "^1.1.16"
"@langchain/core": "^0.3.80"
```

After change: `pnpm install --filter @edusphere/subgraph-agent`
Test: `pnpm --filter @edusphere/subgraph-agent typecheck`

#### Agent 1B — TypeScript Version Unification
**Problem:** Root uses `5.9.3`, `apps/web` uses `6.0.3` — different type checkers
**File:** `apps/web/package.json`

```json
// CHANGE devDependencies:
"typescript": "^5.9.3"  // was ^6.0.3
```

After change: `pnpm install && pnpm turbo typecheck`
Verify: zero TS errors

#### Agent 1C — Zod Version Unification
**Problem:** `apps/web` uses `zod@^3.25.76`, all services use `^4.3.6` — validation schema incompatibility
**File:** `apps/web/package.json`

```json
// CHANGE:
"zod": "^4.3.6"  // was ^3.25.76
```

After change: `pnpm install --filter @edusphere/web`
Check for Zod v3 → v4 API breakages in web files (`.parse()` vs `.safeParse()`, etc.)
Run: `pnpm --filter @edusphere/web test` — must stay green

### Track 1 Completion Criteria:
- `pnpm audit --audit-level=high` — zero HIGH/CRITICAL advisories
- All subgraph tests pass
- TypeScript 0 errors monorepo-wide

---

## 6. TRACK 2 — Memory Safety (Days 1-3, 4 parallel agents)

Based on `docs/plans/MEMORY_SAFETY_PLAN.md` — 28 patterns across 6 waves.

### Wave 1 — DB Pools + Service Lifecycle (Agent 2A)
**Critical Issues:**
- DB pools never closed on shutdown
- 20 services missing `OnModuleDestroy`
- NatsKVClient not destroyed in services

**Implementation:**
1. Create `packages/db/src/pool-registry.ts` — `getOrCreatePool()` singleton + `closeAllPools()`
2. Update every `@Injectable()` service that uses DB: add `implements OnModuleDestroy` + `onModuleDestroy() { await closeAllPools(); }`
3. Services to update (20): all subgraph services that open DB connections
4. `NatsKVClient` pattern: add `close()` call in `onModuleDestroy`

**Test required (per service):**
```typescript
// packages/db/src/pool-registry.memory.spec.ts
it('closes all pools on module destroy', async () => {
  const module = await Test.createTestingModule({ ... }).compile();
  const service = module.get(SomeService);
  const spy = jest.spyOn(service, 'closeAllPools');
  await module.close();
  expect(spy).toHaveBeenCalled();
});
```

**Files:** `packages/db/src/pool-registry.ts` (new), 20 service files (modify)

### Wave 2 — Frontend Timer Cleanup (Agent 2B)
**Critical Issues:**
- Token refresh `setInterval` in `useAuth` — never cleared
- Streaming animation `setInterval` in pipeline components
- Module-level WebSocket client not disposed on `beforeunload`

**Pattern for all timer fixes:**
```typescript
// WRONG (current):
const interval = setInterval(refreshToken, 5 * 60 * 1000);

// RIGHT (fix):
const intervalRef = useRef<ReturnType<typeof setInterval>>();
useEffect(() => {
  intervalRef.current = setInterval(refreshToken, 5 * 60 * 1000);
  return () => clearInterval(intervalRef.current);
}, []);
```

**Files:** All hooks with `setInterval`, all components with `setTimeout`
**Discovery Wave (mandatory):** Grep ALL `setInterval|setTimeout` in `apps/web/src/` before fixing
**Test per fix:**
```typescript
it('clears interval on unmount', () => {
  const { unmount } = render(<Component />);
  const spy = jest.spyOn(global, 'clearInterval');
  unmount();
  expect(spy).toHaveBeenCalled();
});
```

### Wave 3 — LangGraph + AbortSignal (Agent 2C)
- Wrap `LangGraphService` in `@Injectable()` with `OnModuleInit`/`OnModuleDestroy`
- Cap workflow history at 20 entries (LRU eviction)
- Propagate `AbortSignal` through all LLM calls
- KV store buckets: add `max_age: 7 * 24 * 3600` retention

**Files:** `apps/subgraph-agent/src/langgraph/`, `packages/langgraph-workflows/src/`

### Wave 4 — Infrastructure Limits (Agent 2D)
Every Docker service MUST have:
```yaml
mem_limit: "512m"
mem_reservation: "128m"
environment:
  NODE_OPTIONS: "--max-old-space-size=384"  # 75% of mem_limit
```

Services missing limits: `gateway`, `subgraph-core`, `subgraph-content`, `subgraph-annotation`, `subgraph-collaboration`, `subgraph-agent`, `subgraph-knowledge`, monitoring stack
**Files:** `docker-compose.yml`, `docker-compose.gvisor.yml`

NATS streams: add `max_age: 7 * 24 * 3600` + `max_bytes: 100 * 1024 * 1024` to all stream definitions

### Wave 5 — Memory Test Files (Agent 2E, after Waves 1-4)
Create 11 new `*.memory.spec.ts` files:
- `apps/subgraph-*/src/**/*.memory.spec.ts` — for each service with DB/NATS
- `apps/web/src/hooks/*.memory.test.ts` — for each hook with timers

### Logging Requirement (all Waves):
Every fixed memory issue MUST add a Pino log on cleanup:
```typescript
this.logger.info('[ServiceName] onModuleDestroy: pools closed, nats disconnected');
```

### Track 2 Completion Criteria:
- `pnpm turbo test` — all memory tests green
- `docker stats` — all services within mem_limit after 10 min idle
- Grep `new Pool()` (outside pool-registry) → zero results
- Grep `setInterval` in components without corresponding `clearInterval` → zero results

---

## 7. TRACK 3 — Code Quality (Days 1-3, 4 parallel agents)

Based on `docs/plans/CODE_QUALITY_IMPROVEMENT_PLAN.md` — 11 topics.

### Agent 3A — Topics 1+2: Config Package + Duplicate Code
**Topic 1:** Create `packages/config/src/index.ts`:
```typescript
export const CONFIG = {
  keycloak: { url: process.env.KEYCLOAK_URL ?? 'http://localhost:8080', ... },
  minio: { endpoint: process.env.MINIO_ENDPOINT ?? 'localhost', ... },
  graph: { name: process.env.AGE_GRAPH_NAME ?? 'edusphere_graph', ... },
  subgraphs: { core: process.env.SUBGRAPH_CORE_URL ?? 'http://localhost:4001', ... },
};
```
Replace all hardcoded URLs in 6 subgraphs with `CONFIG.*` imports.

**Topic 2:** Extract duplicate `AuthMiddleware` into `packages/auth/src/middleware/`:
- Remove copy from each subgraph that duplicates it
- Import from `@edusphere/auth` instead

**Files:** New `packages/config/`, 6 subgraph files, `packages/auth/`

### Agent 3B — Topics 3+4: Constants + File Size Splits
**Topic 3:** Move magic numbers to constants:
```typescript
// packages/config/src/constants.ts
export const RATE_LIMIT = { WINDOW_MS: 60_000, MAX_REQUESTS: 100 };
export const SESSION_AGE = 86_400; // seconds
export const GRAPH_MAX_DEPTH = 5;
```

**Topic 4:** Split oversized files (max 150 lines rule):
- `cypher.service.ts` (670 lines) → 6 files: `cypher-concept.service.ts`, `cypher-relation.service.ts`, `cypher-traversal.service.ts`, `cypher-search.service.ts`, `cypher-cluster.service.ts`, `index.ts`
- `graph.service.ts` (646 lines) → 3 files
- `embedding.service.ts` (358 lines) → 2 files
- `ai.service.ts` (417 lines) → 2 files

Each split must preserve public API via `index.ts` barrel.

### Agent 3C — Topics 5+6+7: Memory Gaps + TypeScript any + Docker
**Topic 5:** LRU eviction in `TenantBrandingService` (unbounded Map):
```typescript
// WRONG: this.cache.set(tenantId, data)  [unbounded]
// RIGHT: if (this.cache.size >= 1000) this.cache.delete(this.cache.keys().next().value)
```

**Topic 6:** Replace all `any` types:
```typescript
// WRONG: const node: any = result.rows[0];
// RIGHT:
interface GraphNode { id: string; properties: Record<string, unknown>; }
const node = result.rows[0] as GraphNode;
```

**Topic 7:** Add `mem_limit` to monitoring stack in docker-compose.yml:
- `jaeger`, `prometheus`, `grafana`, `cadvisor`, `loki` — all need limits

### Agent 3D — Topics 8+9+10+11: Tests + Indexes + Turbo + N+1
**Topic 8:** Create 8 missing test files:
- `apps/subgraph-core/src/gdpr/gdpr.service.spec.ts`
- `apps/subgraph-core/src/gdpr/gdpr-erasure.service.spec.ts`
- ... (6 more per plan)

**Topic 9:** Add composite DB indexes:
```sql
-- annotations: tenant_id + asset_id + layer (frequent query pattern)
CREATE INDEX CONCURRENTLY idx_annotations_tenant_asset_layer
  ON annotations(tenant_id, asset_id, layer);
```
Add via Drizzle migration: `pnpm --filter @edusphere/db generate && migrate`

**Topic 10:** Add to `turbo.json`:
```json
"test:memory": { "cache": false },
"test:rls": { "cache": false },
"test:security": { "cache": false }
```

**Topic 11:** Fix N+1 queries — use DataLoader pattern for `contentItems` batch loading.

### Track 3 Completion Criteria:
- `pnpm turbo lint` → zero warnings
- `pnpm turbo typecheck` → zero errors
- No file > 150 lines (except allowed exceptions)
- `pnpm turbo test` → all green

---

## 8. TRACK 4 — Testing Infrastructure (Days 3-5, 5 parallel agents)

Based on `TESTING_INFRASTRUCTURE_UPGRADE_PLAN.md`, `PARALLEL_TESTING_PLAN.md`, `TEST_COVERAGE_PLAN.md`.

### Wave 1 — CI Fixes (Agent 4A, ~2 hours)
**Critical CI Gaps:**
- pnpm version mismatch in CI (v9 vs project v10.30.1)
- Apache AGE tests skipped in CI (no postgres + AGE service)
- Missing `test:integration` turbo task

**Fixes:**
1. `.github/workflows/test.yml`: update `pnpm/action-setup@v4` to `version: 10.30.1`
2. `.github/workflows/test.yml`: add `postgres` service with `ghcr.io/apache/age:PG16_1.5.0`
3. `turbo.json`: add `"test:integration": { "dependsOn": ["build"], "cache": false }`

**Files:** `.github/workflows/test.yml`, `turbo.json`

### Wave 2 — packages/test-utils + Coverage (Agent 4B, ~4 hours)
Create `packages/test-utils/src/`:
- `mock-db.ts` — Drizzle mock factory
- `mock-nats.ts` — NATS JetStream mock
- `test-tenant.ts` — tenant context helper
- `graphql-test-client.ts` — GraphQL test client with auth

Expand test files:
- `apps/subgraph-annotation/src/` — currently only 2 tests → add 20+ tests
- `apps/subgraph-collaboration/src/` — CRDT untested → add CRDT sync tests

### Wave 3 — Performance Tests (Agent 4C, ~3 hours)
- Create `.github/workflows/performance.yml` (nightly k6 run)
- Add k6 scenarios: `lesson-pipeline-load.k6.js` (100 concurrent pipeline runs)
- Threshold: p95 < 500ms for all GraphQL queries

### Wave 4 — Accessibility + Visual Regression (Agent 4D, ~4 hours)
**Accessibility tests (CI-blocking):**
```typescript
// apps/web/e2e/accessibility.spec.ts
import { checkA11y } from 'axe-playwright';
test('CourseDetailPage passes WCAG 2.2 AA', async ({ page }) => {
  await page.goto('/courses/test-id');
  await checkA11y(page, null, { runOnly: ['wcag2a', 'wcag2aa', 'wcag22aa'] });
});
```

**Visual regression (Playwright):**
```typescript
// Each page: expect(page).toHaveScreenshot(`page-name.png`, { maxDiffPixelRatio: 0.01 });
```

### Wave 5 — Coverage + Badges (Agent 4E, after Waves 1-4)
- Add Istanbul coverage thresholds to vitest.config.ts: `{ lines: 80, branches: 70 }`
- 7 packages currently at 0 tests: `packages/auth`, `packages/langgraph-workflows`, `packages/rag`, `packages/metrics`, `packages/redis-pubsub`, `packages/health`, `packages/frontend-client`
- Per `TEST_COVERAGE_PLAN.md`: assign 8 agents to fill coverage gaps

### TEST_COVERAGE Parallel Execution (Agent 4F, orchestrates 8 sub-agents)
```
G1: packages/db + packages/auth
G2: packages/langgraph-workflows + packages/rag
G3: packages/metrics + packages/redis-pubsub + packages/health
G4: apps/subgraph-core + apps/subgraph-content
G5: apps/subgraph-annotation + apps/subgraph-collaboration
G6: apps/subgraph-agent + apps/subgraph-knowledge
G7: apps/web (components + E2E)
G8: apps/mobile + apps/gateway
```

### Track 4 Completion Criteria:
- All packages > 80% line coverage (RLS packages: 100%)
- Visual regression baseline screenshots committed
- Accessibility: zero axe violations on all 10 main pages
- CI: all GitHub Actions workflows green (`mcp__github__list_pull_requests` to verify)

---

## 9. TRACK 5 — Feature Implementation (Days 3-7, 4 parallel agents)

### Feature A: Tenant Language Management (Agents 5A + 5C)

**Backend (Agent 5A):**

New files:
- `apps/subgraph-core/src/tenant/tenant-language.schemas.ts`
  ```typescript
  export const UpdateTenantLanguagesSchema = z.object({
    supportedLanguages: z.array(z.enum(SUPPORTED_LOCALES)).min(1),
    defaultLanguage: z.enum(SUPPORTED_LOCALES),
  });
  ```
- `apps/subgraph-core/src/tenant/tenant-language.service.ts`
  - LRU cache (max 500 tenants)
  - `getTenantLanguages(tenantId)`: reads `tenants.settings.supportedLanguages`
  - `updateTenantLanguages(tenantId, langs, defaultLang)`: validates, updates DB
  - `onModuleDestroy()`: clear LRU cache
- `apps/subgraph-core/src/tenant/tenant-language.service.spec.ts` (20+ tests)
- `apps/subgraph-core/src/tenant/tenant-language.service.memory.spec.ts`

Modify files:
- `apps/subgraph-core/src/core.graphql` — add `TenantLanguageSettings` type + `updateTenantLanguages` mutation (`@requiresRole(roles: [ORG_ADMIN])`)
- `apps/subgraph-core/src/tenant/tenant.resolver.ts` — add resolver methods

**Frontend (Agent 5C, after 5A):**

New files:
- `apps/web/src/pages/LanguageSettingsPage.tsx` — toggle grid of 9 languages, default selector
- `apps/web/src/lib/graphql/tenant-language.queries.ts`

Modify files:
- `apps/web/src/components/LanguageSelector.tsx` — accept `availableLocales: string[]` prop
- `apps/web/src/hooks/useUserPreferences.ts` — fetch tenant settings, filter selector options, auto-fallback if current lang disabled
- `apps/web/src/lib/router.tsx` — add `/admin/language` route

Tests:
- `LanguageSettingsPage.test.tsx` (15+ tests)
- `LanguageSelector.test.tsx` (5+ tests for filtering)
- `useUserPreferences.test.ts` update (auto-fallback test)

### Feature B: Word-Style Annotations (Agents 5B + 5D)

**Backend (Agent 5B):**
- Add `INLINE_COMMENT` and `SUGGESTION` to `AnnotationType` enum in annotation subgraph SDL
- Add `textRange: TextRange` field to annotation type
- Migration: add `text_start`, `text_end`, `range_type` columns to annotations table

**Frontend (Agent 5D):**

New files (9):
- `apps/web/src/components/annotations/AnnotationDecorationsPlugin.ts` — ProseMirror plugin, colored inline spans
- `apps/web/src/components/annotations/AnnotatedDocumentViewer.tsx` — Tiptap viewer with decoration plugin
- `apps/web/src/components/annotations/SelectionCommentButton.tsx` — floating "Add Comment" button
- `apps/web/src/components/annotations/CommentForm.tsx` — new comment form
- `apps/web/src/components/annotations/CommentCard.tsx` — single comment display
- `apps/web/src/components/annotations/WordCommentPanel.tsx` — right panel, scrolls to match cursor
- `apps/web/src/hooks/useDocumentAnnotations.ts` — bidirectional focus sync
- `apps/web/src/pages/DocumentAnnotationPage.tsx` — 3-panel layout (doc + inline + panel)
- `apps/web/src/components/ui/resizable.tsx` — resizable panels wrapper

Modify (5):
- `apps/web/src/lib/annotation.store.ts` — add zoom, panel width, focused annotation state
- `apps/web/src/types/annotations.ts` — add `TextRange` type
- `apps/web/src/components/RichContentViewer.tsx` — add extensions + selection callback
- `apps/web/src/lib/router.tsx` — register `/documents/:id/annotate` route
- `apps/web/vite.config.ts` — add aliases for tiptap extensions

Tests:
- `DocumentAnnotationPage.test.tsx` (20+ tests: panel sync, comment creation, layer filtering)
- `useDocumentAnnotations.test.ts` (10+ tests: bidirectional focus, text range selection)

### Track 5 Completion Criteria:
- Both features fully functional in browser
- Visual browser verification: add comment, verify panel sync
- All tests green
- GraphQL mutations tested via `mcp__graphql__query-graphql`

---

## 10. TRACK 6 — TIER3 Features (Days 7-10, 5 parallel agents)

Based on `docs/plans/TIER3_IMPLEMENTATION_PLAN.md`. Features F-025 to F-039.

### Priority Ordering (by PRD priority + complexity):

**Sprint A (Agent 6A) — F-029 BI Export + F-035 Social Following**
- `F-029`: OData v4 endpoint at `/api/odata/` for Power BI/Tableau
  - New file: `apps/subgraph-core/src/bi/bi-export.service.ts`
  - Scoped API token generation
- `F-035`: Social following system
  - DB: `follows` table (follower_id, followee_id, tenant_id)
  - GraphQL: `followUser`, `unfollowUser`, `following`, `followers` queries
  - Mutual-follower detection via AGE graph query

**Sprint B (Agent 6B) — F-028 xAPI/LRS + F-038 CPD Enhancement**
- `F-028`: Generate xAPI statements for learning events
  - Statement template: `{ actor, verb, object, result, context }`
  - LRS push via NATS JetStream
  - Configurable LRS URL per tenant

**Sprint C (Agent 6C) — F-025 OpenBadges 3.0 Enhancement**
- Review current `apps/subgraph-content/src/open-badge/` status
- Add verifiable credential support (W3C VC format)
- Public verification endpoint (no auth required)
- Badge revocation list

**Sprint D (Agent 6D) — F-031 Instructor Marketplace Foundation**
- Course marketplace listing (not payment processing — that's deferred)
- Revenue tracking stub (Stripe integration deferred per PRD §9.5)
- Instructor earnings dashboard

**Sprint E (Agent 6E) — F-037 Portal Builder (basic)**
- Drag-drop layout builder for tenant homepage
- Pre-built components: hero, featured-courses, announcements
- JSON schema stored in `tenants.settings.portalLayout`

### For EACH TIER3 Feature:
After implementing, run 3-Wave Discovery for any related bugs:
1. Wave 1: Exact pattern grep
2. Wave 2: Check all pages/hooks/components for related patterns
3. Wave 3: Class-of-bug sweep

### Track 6 Completion Criteria:
- All 5 sprints complete
- Integration tests for each feature
- E2E Playwright test for each user-facing feature

---

## 11. TRACK 7 — Final Verification (Days 10-11)

### Step 1: Full Test Suite
```bash
pnpm turbo test -- --coverage
# Target: >90% backend, >80% frontend, 100% RLS
```

### Step 2: TypeScript Strict
```bash
pnpm turbo typecheck
# Target: 0 errors
```

### Step 3: Supergraph Composition
```bash
pnpm --filter @edusphere/gateway compose
# Must succeed without breaking changes
```

### Step 4: Security Scan
```bash
pnpm audit --audit-level=high
# Zero HIGH/CRITICAL advisories
```

### Step 5: Memory Verification
```bash
docker stats --no-stream
# All services within mem_limit
# No service above 90% of limit after 10 min idle
```

### Step 6: Pattern Clean (Zero Recurrence)
```bash
grep -r "new Pool()" apps/ packages/ --include="*.ts" | grep -v pool-registry
# Must return zero results

grep -r "setInterval" apps/web/src/ --include="*.ts" --include="*.tsx"
# All must have corresponding clearInterval in cleanup
```

### Step 7: Visual Browser Verification
- [ ] CourseDetailPage — lessons section visible
- [ ] CreateLessonPage — 3-step wizard functional
- [ ] LessonPipelinePage — pipeline canvas + config panel
- [ ] LessonResultsPage — citations + notes displayed
- [ ] DocumentAnnotationPage — Word-style 3-panel layout
- [ ] LanguageSettingsPage — per-tenant language toggles
- [ ] KnowledgeGraphPage — graph visualization no raw errors
- [ ] Search — saved searches functional
- [ ] All pages with DevTools throttling — no raw error.message shown

### Step 8: Health Check
```bash
./scripts/health-check.sh
# All services PASS
```

### Step 9: All 5 Users Authentication
```
superadmin@example.com / SuperAdmin123! → SUPER_ADMIN dashboard accessible
instructor@example.com / Instructor123! → Course creation accessible
orgadmin@example.com / OrgAdmin123!     → Admin portal accessible
researcher@example.com / Researcher123! → Knowledge graph accessible
student@example.com / Student123!       → Enrollment flow accessible
```

### Step 10: MCP Verification
```
mcp__postgres__pg_execute_query("SELECT COUNT(*) FROM pg_policies WHERE schemaname='public'")
# Must return > 16 RLS policies

mcp__graphql__introspect-schema()
# Must return complete supergraph schema without errors

mcp__nats__nats_stream_list()
# All EDUSPHERE.* streams present
```

### Step 11: GitHub CI Verification
```
mcp__github__list_pull_requests() or gh run list --limit 5
# All workflows green after final push
```

### Step 12: OPEN_ISSUES.md Update
- Mark all completed plans as ✅ with session date
- Update test counts
- Archive completed plan files to `docs/plans/archive/`

---

## 12. CRITICAL FILES REFERENCE

### Files to Create (New):
| File | Track | Purpose |
|------|-------|---------|
| `packages/config/src/index.ts` | 3 | Centralized config constants |
| `packages/config/src/constants.ts` | 3 | Magic number constants |
| `packages/db/src/pool-registry.ts` | 2 | DB pool singleton + closeAllPools |
| `packages/test-utils/src/*.ts` | 4 | Shared test utilities |
| `apps/subgraph-core/src/tenant/tenant-language.service.ts` | 5 | Per-tenant lang service |
| `apps/subgraph-core/src/tenant/tenant-language.schemas.ts` | 5 | Zod validation |
| `apps/web/src/pages/LanguageSettingsPage.tsx` | 5 | Admin language toggles |
| `apps/web/src/pages/DocumentAnnotationPage.tsx` | 5 | Word-style annotation page |
| `apps/web/src/components/annotations/AnnotationDecorationsPlugin.ts` | 5 | ProseMirror plugin |
| `apps/web/src/components/annotations/AnnotatedDocumentViewer.tsx` | 5 | Tiptap viewer |
| `apps/web/src/components/annotations/WordCommentPanel.tsx` | 5 | Right-side comment panel |
| `apps/web/src/hooks/useDocumentAnnotations.ts` | 5 | Bidirectional focus hook |
| `apps/subgraph-core/src/bi/bi-export.service.ts` | 6 | BI OData export |
| `*.memory.spec.ts` (×11) | 2 | Memory safety tests |
| `apps/web/e2e/accessibility.spec.ts` | 4 | WCAG 2.2 axe tests |

### Files to Modify (Critical):
| File | Track | Change |
|------|-------|--------|
| `CLAUDE.md` | 0 | Bug Fix Protocol Wave 2 + Round Gates |
| `apps/subgraph-agent/package.json` | 1 | LangChain version align |
| `apps/web/package.json` | 1 | TS + Zod version align |
| `docker-compose.yml` | 2 | mem_limit all services |
| `docker-compose.gvisor.yml` | 2 | mem_limit all services |
| `apps/subgraph-knowledge/src/graph/cypher.service.ts` | 3 | Split into 6 files |
| `.github/workflows/test.yml` | 4 | pnpm v10, AGE service |
| `turbo.json` | 4 | Add test:memory, test:rls tasks |
| `apps/subgraph-core/src/core.graphql` | 5 | TenantLanguageSettings |
| `apps/web/src/hooks/useUserPreferences.ts` | 5 | Tenant lang filtering |
| `packages/db/migrations/` | 5 | annotations text_range columns |

---

## 13. MCP TOOL USAGE PER TRACK

| Track | MCP Tools |
|-------|-----------|
| 0 (Protocol) | `mcp__memory__create_entities` (log protocol change) |
| 1 (Security) | `mcp__typescript-diagnostics__get_all_diagnostics`, `mcp__eslint__lint-files` |
| 2 (Memory) | `mcp__postgres__pg_execute_query` (verify pool cleanup), `mcp__nats__nats_stream_info` |
| 3 (Quality) | `mcp__eslint__lint-files` (after every file write), `mcp__typescript-diagnostics__*` |
| 4 (Testing) | `mcp__playwright__browser_snapshot`, `mcp__github__list_pull_requests` |
| 5 (Features) | `mcp__graphql__query-graphql` (test mutations), `mcp__playwright__browser_*` |
| 6 (TIER3) | `mcp__postgres__pg_manage_schema`, `mcp__graphql__introspect-schema` |
| 7 (Verify) | ALL MCP tools — comprehensive verification |

**Iron Rule:** After every file write → `mcp__eslint__lint-files` immediately. Never batch lint at the end.

---

## 14. AGENT TRACKING TABLE

| Agent | Track | Responsibility | Estimated Duration |
|-------|-------|---------------|--------------------|
| Agent 0 | 0 | CLAUDE.md Bug Fix Protocol update | 30 min |
| Agent 1A | 1 | LangChain version alignment | 1 hour |
| Agent 1B | 1 | TypeScript version unification | 30 min |
| Agent 1C | 1 | Zod version unification | 30 min |
| Agent 2A | 2 | Wave 1: DB pools + 20 OnModuleDestroy | 3 hours |
| Agent 2B | 2 | Wave 2: Frontend timer cleanup | 2 hours |
| Agent 2C | 2 | Wave 3: LangGraph + AbortSignal | 2 hours |
| Agent 2D | 2 | Wave 4: Docker limits + NATS retention | 1 hour |
| Agent 2E | 2 | Wave 5: 11 memory test files | 2 hours |
| Agent 3A | 3 | Topics 1+2: Config pkg + duplicate extract | 3 hours |
| Agent 3B | 3 | Topics 3+4: Constants + file splits | 4 hours |
| Agent 3C | 3 | Topics 5+6+7: Memory gaps + TS any + Docker | 2 hours |
| Agent 3D | 3 | Topics 8+9+10+11: Tests + indexes + turbo + N+1 | 3 hours |
| Agent 4A | 4 | Wave 1: CI pnpm + AGE + turbo tasks | 2 hours |
| Agent 4B | 4 | Wave 2: test-utils + annotation/collab tests | 4 hours |
| Agent 4C | 4 | Wave 3: k6 performance tests | 2 hours |
| Agent 4D | 4 | Wave 4: Accessibility CI + visual regression | 3 hours |
| Agent 4E | 4 | Wave 5: Coverage badges + Grafana | 1 hour |
| Agent 4F | 4 | TEST_COVERAGE orchestration (8 sub-agents) | 5 hours |
| Agent 5A | 5 | Tenant Language Management (backend) | 3 hours |
| Agent 5B | 5 | Word-Style Annotations (backend) | 2 hours |
| Agent 5C | 5 | Tenant Language Management (frontend) | 3 hours |
| Agent 5D | 5 | Word-Style Annotations (frontend) | 4 hours |
| Agent 6A | 6 | Sprint A: BI export + Social following | 4 hours |
| Agent 6B | 6 | Sprint B: xAPI/LRS + CPD | 3 hours |
| Agent 6C | 6 | Sprint C: OpenBadges 3.0 enhancement | 3 hours |
| Agent 6D | 6 | Sprint D: Instructor marketplace | 3 hours |
| Agent 6E | 6 | Sprint E: Portal builder | 4 hours |
| Agent 7 | 7 | Final verification (all 12 steps) | 2 hours |

**Total estimated duration (parallel):** ~10-11 working days
**Total estimated duration (sequential):** ~35+ days
**Parallelization savings:** ~70% time reduction

---

## 15. COMPLETION DECLARATION CHECKLIST

Only declare ALL DONE when every item below is ✓:

```
□ CLAUDE.md Bug Fix Protocol — Wave 2 checklist present + Round Gates present
□ pnpm audit --audit-level=high → zero HIGH/CRITICAL
□ LangChain version lock aligned
□ TypeScript unified to 5.9.x
□ Zod unified to 4.x
□ All 20 services have OnModuleDestroy
□ All timers have useEffect cleanup
□ All Docker services have mem_limit
□ All NATS streams have max_age + max_bytes
□ Grep "new Pool()" → 0 results outside pool-registry
□ Grep "setInterval" without cleanup → 0 results
□ cypher.service.ts split into 6 files (≤150 lines each)
□ packages/config/ created and used in all subgraphs
□ packages/test-utils/ created
□ pnpm v10 in GitHub Actions CI
□ Apache AGE in CI service containers
□ All packages >80% line coverage
□ All packages >90% branch coverage (backend)
□ Visual regression baseline committed
□ WCAG 2.2 axe tests passing
□ LanguageSettingsPage live + tested
□ DocumentAnnotationPage live + tested
□ All 5 TIER3 sprints complete
□ pnpm turbo test → 100% green
□ pnpm turbo typecheck → 0 errors
□ pnpm --filter @edusphere/gateway compose → success
□ ./scripts/health-check.sh → all PASS
□ All 5 users authenticate successfully
□ All GitHub Actions workflows green
□ OPEN_ISSUES.md updated with all completions
□ Completed plan files archived to docs/plans/archive/
□ MEMORY.md updated with key patterns from this session
```

---

## 16. ROLLBACK STRATEGY

| Phase | Rollback Trigger | Action |
|-------|-----------------|--------|
| Track 1 (Zod v4) | Web tests fail due to API change | Revert to ^3.25.76, fix Zod v3→v4 compat layer |
| Track 1 (TS unify) | Type errors appear | Keep web at v6.0.3, add override in root |
| Track 2 (pool-registry) | Connection refused in tests | Keep existing pool pattern, add closeAllPools wrapper |
| Track 3 (file splits) | Import resolution breaks | Restore monolith file, fix barrel exports |
| Track 6 (TIER3) | Federation composition fails | Revert SDL changes, investigate entity conflicts |

---

*Plan complete. Implement starting with Track 0 (CLAUDE.md update) then launch all Day 1 agents in parallel.*
