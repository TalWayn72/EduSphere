# EduSphere — Code Quality & Maintainability Improvement Plan

> **Target location after approval:** `docs/plans/code-quality-maintainability-2026-02.md`
> **Date:** 2026-02-23 | **Author:** Claude Sonnet 4.6
> **Scope:** Structural debt removal, parameterization, shared-code extraction, memory safety, type safety

---

## Context

EduSphere has grown through multiple implementation phases, each delivering working features. The structural debt left behind creates concrete operational and maintenance risks:

- **Environment deployments are fragile** — staging/production deploys require manual edits in 15+ source files because URL defaults are inline rather than centralized.
- **Bug fixes silently diverge** — `AuthMiddleware` and `MetricsInterceptor` are copy-pasted verbatim into all 6 subgraphs; a fix in one leaves the other five behind.
- **Memory leaks under load** — `TenantBrandingService` has an unbounded `Map` cache; the gateway rate-limiter has a `setInterval` with no `clearInterval` path.
- **File sizes block comprehension** — `cypher.service.ts` is 670 lines (4.5× the 150-line rule); `graph.service.ts` is 646 lines.
- **TypeScript `any` casts bypass the type system** — `role as any` in knowledge subgraph bypasses the tenant-role union.

After this plan executes: any environment change touches exactly one `.env` file; any auth fix touches one file in `packages/auth`; all services with timers/pools have `OnModuleDestroy` + memory specs; zero production `any`.

---

## Topic 1 — URL / Configuration Parameterization

### Problem
`process.env.KEYCLOAK_URL || 'http://localhost:8080'` is repeated in 10+ files. Subgraph URLs are fully hardcoded in `apps/gateway/compose.js` (no env override). Embedding dimension `768` is scattered across 5+ files.

### New Package: `packages/config`
Zero-dependency package exporting typed env config. All consumers import from `@edusphere/config`.

```
packages/config/
  package.json          name: @edusphere/config
  tsconfig.json
  src/
    index.ts            barrel export
    keycloak.ts         keycloakConfig — url, realm, clientId, jwksUrl (derived), issuer (derived)
    minio.ts            minioConfig — endpoint, bucket, region, accessKey, secretKey
    ollama.ts           ollamaConfig — url, model, embeddingDimension (EMBEDDING_DIM env var)
    graph.ts            graphConfig — graphName (AGE_GRAPH_NAME env var → default 'edusphere_graph')
    subgraphs.ts        subgraphUrls — map of 6 subgraph URLs from env vars with localhost defaults
    gateway.ts          gatewayConfig — port, corsOrigin array (parses comma-separated string)
```

Example pattern (same for all modules):
```typescript
// packages/config/src/keycloak.ts
export const keycloakConfig = {
  url:      process.env.KEYCLOAK_URL      ?? 'http://localhost:8080',
  realm:    process.env.KEYCLOAK_REALM    ?? 'edusphere',
  clientId: process.env.KEYCLOAK_CLIENT_ID,
  get jwksUrl() { return `${this.url}/realms/${this.realm}/protocol/openid-connect/certs`; },
  get issuer()  { return `${this.url}/realms/${this.realm}`; },
} as const;
```

### Files to modify (consumers)
| File | Change |
|------|--------|
| `apps/subgraph-{core,content,annotation,collaboration,agent,knowledge}/src/auth/auth.middleware.ts` (×6) | Replace inline `process.env.KEYCLOAK_*` defaults with `keycloakConfig` import |
| `apps/subgraph-collaboration/src/crdt/hocuspocus.service.ts` | Same Keycloak replacement |
| `apps/subgraph-content/src/media/media.service.ts` | Replace MinIO inline default with `minioConfig` |
| `apps/transcription-worker/src/transcription/minio.client.ts` | Same MinIO replacement |
| `apps/transcription-worker/src/hls/hls.service.ts` | Same MinIO replacement |
| `apps/transcription-worker/src/knowledge/concept-extractor.ts` | Replace Ollama inline default with `ollamaConfig` |
| `apps/transcription-worker/src/embedding/ollama.client.ts` | Replace `dimensions: 768` with `ollamaConfig.embeddingDimension` |
| `apps/gateway/src/index.ts` | Import from `@edusphere/config` (already uses env vars — simplify) |
| `apps/gateway/compose.js` | Replace 6 hardcoded subgraph URL strings with `process.env.SUBGRAPH_*_URL ?? 'http://localhost:400X/graphql'` |
| `apps/web/src/lib/auth.ts` | Replace inline Keycloak defaults with `import.meta.env.VITE_*` (already expected; remove code-level fallbacks) |
| `apps/web/src/components/CollaborativeEditor.tsx` | Replace `ws://localhost:1234` with `import.meta.env.VITE_HOCUSPOCUS_URL` |

### Verification
Start all subgraphs with `KEYCLOAK_URL=https://keycloak.staging.example.com` in env. Every subgraph startup log must show the staging URL, not `localhost:8080`.

---

## Topic 2 — Duplicate Code Across Subgraphs

### Problem
Three classes are copy-pasted verbatim across all 6 subgraphs (318 + 540 + 102 = 960 redundant lines):
- `auth.middleware.ts` — 53 lines × 6 — `GraphQLContext` interface + `AuthMiddleware` class
- `metrics.interceptor.ts` — ~90 lines × 6 — `handleHttp()` + `handleGraphql()` 100% identical
- `metrics.controller.ts` — 17 lines × 6 — `@Get('metrics')` identical

### Fix A — AuthMiddleware → `packages/auth`
New file `packages/auth/src/middleware.ts` with the shared `AuthMiddleware` + `GraphQLContext`. Export from `packages/auth/src/index.ts`. Each subgraph's `auth.middleware.ts` becomes a 2-line re-export (or the import in `app.module.ts` changes directly to `@edusphere/auth`).

### Fix B — Metrics → `packages/metrics` factory
```typescript
// packages/metrics/src/module-factory.ts
export function createMetricsModule(serviceName: string): DynamicModule {
  // Creates Registry, Histogram, Counter with serviceName label
  // Returns DynamicModule providing MetricsController + MetricsInterceptor
}
```

Each subgraph's `metrics.module.ts` becomes:
```typescript
import { createMetricsModule } from '@edusphere/metrics';
export const MetricsModule = createMetricsModule('core'); // 3 lines
```

### Files to create
```
packages/auth/src/middleware.ts
packages/metrics/src/module-factory.ts
packages/metrics/src/interceptor.ts   (shared interceptor class)
packages/metrics/src/controller.ts    (shared controller class)
```

### Files to modify
- `packages/auth/src/index.ts` — add export
- `packages/metrics/src/index.ts` — add `createMetricsModule` export
- All 6 `apps/subgraph-*/src/auth/auth.middleware.ts` — thin re-exports
- All 6 `apps/subgraph-*/src/metrics/metrics.module.ts` — call `createMetricsModule()`
- All 6 `apps/subgraph-*/src/metrics/metrics.interceptor.ts` — **delete** (factory provides it)
- All 6 `apps/subgraph-*/src/metrics/metrics.controller.ts` — **delete** (factory provides it)

### Verification
`pnpm turbo typecheck`. Start one subgraph; `GET /metrics` must return Prometheus-format data with correct service label.

---

## Topic 3 — Magic Numbers / Constants

### Problem
Sentinel values repeated with no named constant:
- `15 * 60 * 1000` (rate-limit window) in `apps/gateway/src/middleware/rate-limit.ts`
- `30 * 60 * 1000` / `24 * 60 * 60 * 1000` (session ages) in `apps/subgraph-agent/src/agent-session/session-cleanup.service.ts`
- `5 * 60 * 1000` (LangGraph cleanup interval) in `apps/subgraph-agent/src/ai/langgraph.service.ts`
- `'edusphere_graph'` inline string in `apps/subgraph-knowledge/src/graph/cypher.service.ts`
- `safeLimit = Math.min(200, ...)` and default `20` in `apps/subgraph-knowledge/src/graph/`

### Fix
Create per-app constants files + move graph name to `packages/config/src/graph.ts` (env-overridable for test environments).

### Files to create
```
apps/gateway/src/constants.ts
apps/subgraph-knowledge/src/constants.ts
apps/subgraph-agent/src/constants.ts
packages/config/src/graph.ts          (graphName: process.env.AGE_GRAPH_NAME ?? 'edusphere_graph')
```

### Files to modify
- `apps/gateway/src/middleware/rate-limit.ts` — import from `../constants`
- `apps/subgraph-knowledge/src/graph/cypher.service.ts` — import `graphName` from `@edusphere/config`, limits from `../../constants`
- `apps/subgraph-knowledge/src/graph/graph.service.ts` — import limits from `../../constants`
- `apps/subgraph-agent/src/ai/langgraph.service.ts` — import from `../../constants`
- `apps/subgraph-agent/src/agent-session/session-cleanup.service.ts` — import from `../../constants`

### Verification
Set `AGE_GRAPH_NAME=edusphere_test_graph` in `.env.test`. Run graph integration tests. Cypher queries must target the test graph without code changes.

---

## Topic 4 — File Size Violations

### Problem
Four files exceed the 150-line limit significantly:
| File | Lines | Multiplier |
|------|-------|-----------|
| `apps/subgraph-knowledge/src/graph/cypher.service.ts` | 670 | 4.5× |
| `apps/subgraph-knowledge/src/graph/graph.service.ts` | 646 | 4.3× |
| `apps/subgraph-knowledge/src/embedding/embedding.service.ts` | 358 | 2.4× |
| `apps/subgraph-agent/src/ai/ai.service.ts` | 417 | 2.8× |

### Split Plan

**cypher.service.ts → 6 domain files + facade:**
```
cypher-concept.service.ts         ~130 lines — Concept CRUD + linkByName + findRelated
cypher-person.service.ts          ~60 lines  — Person find/create
cypher-term.service.ts            ~60 lines  — Term find/create
cypher-source.service.ts          ~60 lines  — Source find/create
cypher-topic-cluster.service.ts   ~60 lines  — TopicCluster find/create
cypher-learning-path.service.ts   ~150 lines — shortestPath + collectRelated + agtype parsers
cypher.service.ts                 ~50 lines  — Facade injecting all 5 domain services
```

**graph.service.ts → 3 files + facade:**
```
graph-concept.service.ts          ~150 lines — Concept operations wrapping CypherService
graph-search.service.ts           ~100 lines — semanticSearch + HybridRAG fusion
graph-person-term.service.ts      ~120 lines — Person, Term, Source, TopicCluster passthrough
graph.service.ts                  ~30 lines  — Facade
```

**embedding.service.ts → 2 files + facade:**
```
embedding-store.service.ts        ~140 lines — DB read/write of embeddings
embedding-provider.service.ts     ~100 lines — HTTP calls to Ollama/OpenAI
embedding.service.ts              ~20 lines  — Facade
```

**ai.service.ts → 2 runners + dispatcher:**
```
ai-langgraph-runner.service.ts    ~80 lines  — LangGraph debate/quiz/tutor dispatch
ai-legacy-runner.service.ts       ~100 lines — Vercel AI SDK streamText/generateText
ai.service.ts                     ~120 lines — Main dispatcher + execute()
```

Add `index.ts` barrel files in each directory to preserve import compatibility.

### Files to modify (become thin facades)
- `apps/subgraph-knowledge/src/graph/cypher.service.ts`
- `apps/subgraph-knowledge/src/graph/graph.service.ts`
- `apps/subgraph-knowledge/src/embedding/embedding.service.ts`
- `apps/subgraph-agent/src/ai/ai.service.ts`
- `apps/subgraph-knowledge/src/graph/graph.module.ts` (register new providers)
- `apps/subgraph-knowledge/src/embedding/embedding.module.ts` (register new providers)

### Verification
`wc -l apps/subgraph-knowledge/src/graph/*.ts` — all individual files ≤ 150 lines. `pnpm turbo typecheck --filter=@edusphere/subgraph-knowledge`.

---

## Topic 5 — Memory Safety Gaps

### Problem (3 confirmed gaps)

**A) TenantBrandingService** (`apps/subgraph-core/src/tenant/tenant-branding.service.ts` line 38):
`private readonly cache = new Map<string, {...}>()` — unbounded, no LRU, no `OnModuleDestroy`.

**B) Gateway rate-limiter** (`apps/gateway/src/middleware/rate-limit.ts`):
Module-level `setInterval` with `.unref()` but no `clearInterval` path. Gateway is NOT a NestJS app — no `OnModuleDestroy` available.

**C) Missing memory specs** for `LangGraphService`, `SessionCleanupService`, `TenantBrandingService` — required by CLAUDE.md iron rule.

### Fixes

**Fix A:**
```typescript
// tenant-branding.service.ts — add after cache.set():
if (this.cache.size > BRANDING_CACHE_MAX_SIZE) {   // constant = 500
  const oldest = this.cache.keys().next().value;
  if (oldest) this.cache.delete(oldest);
}
// Add: implements OnModuleDestroy
onModuleDestroy(): void { this.cache.clear(); }
```

**Fix B (pragmatic — gateway is not NestJS):**
```typescript
// apps/gateway/src/middleware/rate-limit.ts — add:
export function stopRateLimitCleanup(): void { clearInterval(cleanupInterval); }
// apps/gateway/src/index.ts — in shutdown():
stopRateLimitCleanup();
```

### Files to modify
- `apps/subgraph-core/src/tenant/tenant-branding.service.ts`
- `apps/gateway/src/middleware/rate-limit.ts` (add `stopRateLimitCleanup` export)
- `apps/gateway/src/index.ts` (call `stopRateLimitCleanup()` in shutdown)

### Files to create (memory specs)
```
apps/subgraph-core/src/tenant/tenant-branding.service.memory.spec.ts
apps/subgraph-agent/src/ai/langgraph.service.memory.spec.ts
apps/subgraph-agent/src/agent-session/session-cleanup.service.memory.spec.ts
apps/gateway/src/middleware/rate-limit.spec.ts
```

### Verification
`pnpm turbo test:memory` — all new memory specs pass. No leaked handles.

---

## Topic 6 — TypeScript `any` in Production Code

### Problem (3 categories)
- `apps/subgraph-knowledge/src/app.module.ts` lines 20, 30: `(req: any)` and `({ req }: any)`
- `apps/subgraph-knowledge/src/graph/graph.service.ts` lines 31,50,72+: `role as any` (should be `TenantContext['userRole']`)
- `apps/subgraph-knowledge/src/graph/graph.service.ts`: `mapConceptFromGraph(graphNode: any)` — untyped AGE node

### Fix

New helper:
```typescript
// apps/subgraph-knowledge/src/graph/graph-types.ts
const VALID_ROLES = new Set(['SUPER_ADMIN','ORG_ADMIN','INSTRUCTOR','STUDENT','RESEARCHER']);
export function toUserRole(role: string | null | undefined): TenantContext['userRole'] {
  if (role && VALID_ROLES.has(role)) return role as TenantContext['userRole'];
  return 'STUDENT';
}

export interface GraphConceptNode {
  id: string; tenant_id: string; name: string;
  definition?: string; source_ids?: string;
  created_at: number | string; updated_at: number | string;
}
```

### Files to create
```
apps/subgraph-knowledge/src/graph/graph-types.ts
```

### Files to modify
- `apps/subgraph-knowledge/src/app.module.ts` — replace `any` with `Request` (import from `express`)
- `apps/subgraph-knowledge/src/graph/graph.service.ts` — all `role as any` → `toUserRole(role)`, `graphNode: any` → `GraphConceptNode`
- `apps/subgraph-knowledge/src/graph/cypher.service.ts` — type AGE return objects with per-domain interfaces

### Verification
`pnpm turbo typecheck` — zero errors. `pnpm test:security` — no regressions.

---

## Topic 7 — Docker Memory Limits (Monitoring Stack)

### Problem
`docker-compose.monitoring.yml`: `prometheus`, `grafana`, `loki`, `alertmanager` have no `mem_limit` or `mem_reservation`. Only `alloy` has limits. Violates CLAUDE.md iron rule.

### Required additions
| Service | `mem_limit` | `mem_reservation` |
|---------|-------------|-------------------|
| prometheus | 1g | 512m |
| grafana | 512m | 256m |
| loki | 512m | 256m |
| alertmanager | 256m | 128m |

### Files to modify
- `docker-compose.monitoring.yml` — add `mem_limit` + `mem_reservation` to 4 service blocks

### Verification
`docker-compose -f docker-compose.monitoring.yml config` parses cleanly. After `docker-compose up`, `docker stats` shows non-zero `MEM LIMIT` for all 4 services.

---

## Topic 8 — Missing Test Files

### Problem
CLAUDE.md requires memory specs for every service with timers/pools, and business logic tests for all services. The following files are confirmed missing:

| Missing Test | Service | Reason Required |
|---|---|---|
| `session-cleanup.service.memory.spec.ts` | `apps/subgraph-agent/src/agent-session/` | `setInterval` + DB pool |
| `langgraph.service.memory.spec.ts` | `apps/subgraph-agent/src/ai/` | `setInterval` + `pg.Pool` |
| `tenant-branding.service.spec.ts` | `apps/subgraph-core/src/tenant/` | Business logic untested |
| `tenant-branding.service.memory.spec.ts` | `apps/subgraph-core/src/tenant/` | Unbounded Map (post T5 fix: LRU) |
| `content-item.service.spec.ts` | `apps/subgraph-content/src/content-item/` | DB service untested |
| `media.service.spec.ts` | `apps/subgraph-content/src/media/` | DB + S3 + NATS untested |
| `user-export.service.spec.ts` | `apps/subgraph-core/src/user/` | GDPR Art.20 critical path |
| `user-stats.service.spec.ts` | `apps/subgraph-core/src/user/` | Analytics queries untested |

### Memory spec pattern (all memory specs follow this):
```typescript
// service.memory.spec.ts pattern
it('onModuleDestroy clears interval and closes pool', async () => {
  jest.useFakeTimers();
  const service = await Test.createTestingModule({ providers: [...] }).compile();
  const clearIntervalSpy = jest.spyOn(global, 'clearInterval');
  await service.get(ServiceUnderTest).onModuleDestroy();
  expect(clearIntervalSpy).toHaveBeenCalled();
});
```

### Files to create (all new)
```
apps/subgraph-agent/src/agent-session/session-cleanup.service.memory.spec.ts
apps/subgraph-agent/src/ai/langgraph.service.memory.spec.ts
apps/subgraph-core/src/tenant/tenant-branding.service.spec.ts
apps/subgraph-core/src/tenant/tenant-branding.service.memory.spec.ts
apps/subgraph-content/src/content-item/content-item.service.spec.ts
apps/subgraph-content/src/media/media.service.spec.ts
apps/subgraph-core/src/user/user-export.service.spec.ts
apps/subgraph-core/src/user/user-stats.service.spec.ts
```

### Verification
`pnpm turbo test --filter=@edusphere/subgraph-core --filter=@edusphere/subgraph-agent --filter=@edusphere/subgraph-content` — all 8 new test files pass. Coverage thresholds met.

---

## Topic 9 — Database Indexing Gaps

### Problem
`packages/db/src/schema/annotation.ts` (authoritative schema with `tenant_id`) has no composite index for the most common query pattern: `WHERE tenant_id = X AND user_id = Y AND created_at >= Z` (used in `user-stats.service.ts` `fetchWeeklyActivity`).

Additionally: two annotation schema files exist (`annotation.ts` with `tenant_id` and `annotations.ts` without) — the legacy file must be removed or consolidated.

### Index additions needed
```sql
CREATE INDEX idx_annotations_tenant       ON annotations(tenant_id);
CREATE INDEX idx_annotations_tenant_user  ON annotations(tenant_id, user_id);
CREATE INDEX idx_annotations_tenant_date  ON annotations(tenant_id, created_at);
```

Add via Drizzle migration (generate then apply).

### Files to modify
- `packages/db/src/schema/annotation.ts` — add `index()` definitions using Drizzle helpers
- `packages/db/src/schema/annotations.ts` — **delete or archive** (legacy diverged copy)

### Verification
After migration: `EXPLAIN ANALYZE` on weekly-activity query shows `Index Scan` on `idx_annotations_tenant_user`. `pnpm test:rls` passes.

---

## Topic 10 — Turbo Pipeline Gaps

### Problem
`turbo.json` is missing `test:memory`, `test:rls`, `test:security` pipeline tasks. These test types exist as `pnpm` scripts but cannot be run with `--filter` per package or benefit from Turbo caching.

### Additions to `turbo.json`
```json
"test:memory":   { "dependsOn": ["^build"], "outputs": [],          "cache": false },
"test:rls":      { "dependsOn": ["^build"], "outputs": [],          "cache": false },
"test:security": { "dependsOn": ["^build"], "outputs": [],          "cache": false }
```

Each package that has memory tests adds a `"test:memory"` script to its `package.json`:
```json
"test:memory": "vitest run --reporter=verbose **/*.memory.spec.ts **/*.memory.test.ts"
```

### Files to modify
- `turbo.json` — add 3 task definitions
- `apps/subgraph-agent/package.json` — add `test:memory` script
- `apps/subgraph-core/package.json` — add `test:memory` script
- `apps/subgraph-content/package.json` — add `test:memory` script
- `apps/gateway/package.json` — add `test:memory` script

### Verification
`pnpm turbo test:memory --filter=@edusphere/subgraph-core` — runs only memory specs in that package and exits with correct code.

---

## Topic 11 — N+1 Query Risks

### Problem
Two confirmed locations:

**A)** `apps/subgraph-knowledge/src/graph/graph.service.ts` `linkConcepts()`: After creating a relationship, calls `cypherService.findConceptById(fromId)` + `findConceptById(toId)` — 2 redundant re-fetches of concepts that were already known.

**B)** No DataLoader exists for `contentItems` by `moduleId`. If a list query returns N modules each resolved with `findByModule(id)`, this is N separate DB calls.

### Fix A — Eliminate 2 redundant re-fetches in `linkConcepts()`
Return the relationship confirmation from the Cypher MERGE result instead of re-fetching. 5-line change in `graph.service.ts`.

### Fix B — DataLoader for contentItems
```
apps/subgraph-content/src/content-item/content-item.loader.ts   — DataLoader<string, ContentItem[]>
apps/subgraph-content/src/content-item/content-item.loader.spec.ts
```
Resolver changes from `findByModule(id)` to `ctx.loaders.contentItems.load(id)`. Batches N calls into one `WHERE module_id IN (...)`.

### Files to create
```
apps/subgraph-content/src/content-item/content-item.loader.ts
apps/subgraph-content/src/content-item/content-item.loader.spec.ts
```

### Files to modify
- `apps/subgraph-knowledge/src/graph/graph.service.ts` — remove 2 redundant re-fetches in `linkConcepts()`
- `apps/subgraph-content/src/content-item/content-item.resolver.ts` — use DataLoader
- `apps/subgraph-content/src/content-item/content-item.module.ts` — register loader as provider
- `apps/subgraph-content/src/app.module.ts` — add loader to GraphQL context factory

### Verification
Enable Drizzle query logging. Query `{ modules { contentItems { id } } }`. Log must show 1 `SELECT ... WHERE module_id IN (...)` not N separate queries.

---

## Parallel Execution Protocol — MANDATORY

**Iron rule:** Every phase must be decomposed into independent sub-tasks and dispatched to parallel Agents using the `Task` tool. Sequential execution is forbidden when parallelism is possible.

### Agent Decomposition Rules

1. **Analyze dependencies first** — map which sub-tasks are independent before launching any agent.
2. **One Agent per independent unit** — one subgraph, one package, one file group.
3. **Maximum 6 agents in parallel** — reduce by 20% on first OOM event.
4. **Each agent gets a self-contained brief** — file paths, what to read, what to write, what constraints apply.
5. **Synchronize only at phase boundaries** — collect all agent results before starting the next phase.

### Progress Reporting — MANDATORY EVERY 3 MINUTES

Every 3 minutes during execution, output the following report block (no exceptions):

```
═══════════════════════════════════════════════════════════════
📊 PROGRESS REPORT — Phase X.Y — [HH:MM timestamp]
═══════════════════════════════════════════════════════════════
🔵 Active Agents:
   Agent-1 [Config]:      packages/config skeleton          — 80% ████████░░
   Agent-2 [Auth]:        packages/auth/middleware.ts        — 60% ██████░░░░
   Agent-3 [Metrics]:     packages/metrics/module-factory    — 40% ████░░░░░░
   Agent-4 [Constants]:   gateway + knowledge + agent consts — 100% ██████████ ✅

✅ Completed this cycle:
   - P0-1: docker-compose.monitoring.yml mem_limit added
   - P0-2: turbo.json 3 new tasks added

⚠️  Blockers:
   - None

⏳ Next 3-minute window:
   - Finalize packages/config, start consumer migration (P2)

📈 Overall phase progress:  P0 100% | P1 55% | P2 0% | P3 0%
   Estimated remaining: ~35 min
═══════════════════════════════════════════════════════════════
```

The progress percentage per agent is calculated as: `(files completed / total files assigned) × 100`.

---

## Execution Order

### P0 — Infrastructure Fixes (no code risk, execute first)
**Launch all 4 P0 tasks in parallel (no dependencies between them).**

| # | Task | Agent | Depends On |
|---|------|-------|-----------|
| P0-1 | Add `mem_limit`/`mem_reservation` to `docker-compose.monitoring.yml` | Agent-1 | — |
| P0-2 | Add 3 Turbo pipeline tasks (`test:memory`, `test:rls`, `test:security`) | Agent-2 | — |
| P0-3 | Add `test:memory` scripts to affected `package.json` files | Agent-2 | P0-2 (same agent, sequential) |
| P0-4 | Create `packages/config` skeleton (all 6 config modules) | Agent-3 | — |

### P1 — Shared Code Creation (create before modifying consumers)
**Launch P1-1, P1-2, P1-3 in parallel — no inter-dependencies.**

| # | Task | Agent | Depends On |
|---|------|-------|-----------|
| P1-1 | Create `packages/auth/src/middleware.ts` + export from index | Agent-1 | P0-4 ✅ |
| P1-2 | Create `packages/metrics/src/module-factory.ts` + controller + interceptor | Agent-2 | — |
| P1-3 | Create constants files (gateway, knowledge, agent) | Agent-3 | P0-4 ✅ |

### P2 — Consumer Migration (parallel per subgraph — up to 6 agents)
**Each subgraph is fully independent. Launch 6 agents simultaneously.**

| # | Task | Agent | Depends On |
|---|------|-------|-----------|
| P2-1a | `subgraph-core` auth.middleware → `@edusphere/auth` | Agent-1 | P1-1 ✅ |
| P2-1b | `subgraph-content` auth.middleware → `@edusphere/auth` | Agent-2 | P1-1 ✅ |
| P2-1c | `subgraph-annotation` auth.middleware → `@edusphere/auth` | Agent-3 | P1-1 ✅ |
| P2-1d | `subgraph-collaboration` auth.middleware → `@edusphere/auth` | Agent-4 | P1-1 ✅ |
| P2-1e | `subgraph-agent` auth.middleware → `@edusphere/auth` | Agent-5 | P1-1 ✅ |
| P2-1f | `subgraph-knowledge` auth.middleware → `@edusphere/auth` | Agent-6 | P1-1 ✅ |

After auth migration completes, launch next parallel batch:

| # | Task | Agent | Depends On |
|---|------|-------|-----------|
| P2-2 | Update all 6 `metrics/metrics.module.ts` → `createMetricsModule()` (6 agents) | Agents 1-6 | P1-2 ✅ |
| P2-3 | Update `apps/gateway/compose.js` subgraph URLs to env vars | Agent-1 | P0-4 ✅ |
| P2-4 | Update MinIO + Ollama consumers (content, transcription-worker) | Agent-2 | P0-4 ✅ |
| P2-5 | Update all magic numbers to import from constants files | Agent-3 | P1-3 ✅ |
| P2-6 | Fix 3 TypeScript `any` in `app.module.ts` and middlewares | Agent-4 | P1-1 ✅ |
| P2-7 | Add `mem_limit` + `stopRateLimitCleanup` fixes (Topics 5 & 7) | Agent-5 | — |
| P2-8 | Add annotation indexes migration | Agent-6 | — |

### P3 — Structural Refactors (higher complexity, isolated)
**P3-1 through P3-5 are independent — launch in parallel. P3-6 (tests) depends on P2-7.**

| # | Task | Agent | Depends On |
|---|------|-------|-----------|
| P3-1 | Split `cypher.service.ts` → 6 domain files | Agent-1 | P1-3 ✅ |
| P3-2 | Split `graph.service.ts` → 3 sub-services + fix `role as any` | Agent-2 | P3-1, P2-6 ✅ |
| P3-3 | Split `embedding.service.ts` → store + provider | Agent-3 | P0-4 ✅ |
| P3-4 | Split `ai.service.ts` → langgraph + legacy runners | Agent-4 | — |
| P3-5 | Add `ContentItemLoader` DataLoader (Topic 11) | Agent-5 | — |
| P3-6 | Write all 8 missing test files (Topic 8) | Agent-6 | P2-7 ✅ |

---

## New Packages / Files Summary

### New Package
- `packages/config/` — `@edusphere/config` — zero-dependency env config

### New Files in Existing Packages
- `packages/auth/src/middleware.ts` — shared NestJS `AuthMiddleware`
- `packages/metrics/src/module-factory.ts`, `controller.ts`, `interceptor.ts` — shared metrics factory

### New Files in Apps
```
apps/gateway/src/constants.ts
apps/subgraph-knowledge/src/constants.ts
apps/subgraph-knowledge/src/graph/graph-types.ts
apps/subgraph-knowledge/src/graph/cypher-concept.service.ts
apps/subgraph-knowledge/src/graph/cypher-person.service.ts
apps/subgraph-knowledge/src/graph/cypher-term.service.ts
apps/subgraph-knowledge/src/graph/cypher-source.service.ts
apps/subgraph-knowledge/src/graph/cypher-topic-cluster.service.ts
apps/subgraph-knowledge/src/graph/cypher-learning-path.service.ts
apps/subgraph-knowledge/src/graph/graph-concept.service.ts
apps/subgraph-knowledge/src/graph/graph-search.service.ts
apps/subgraph-knowledge/src/graph/graph-person-term.service.ts
apps/subgraph-knowledge/src/embedding/embedding-store.service.ts
apps/subgraph-knowledge/src/embedding/embedding-provider.service.ts
apps/subgraph-agent/src/ai/ai-langgraph-runner.service.ts
apps/subgraph-agent/src/ai/ai-legacy-runner.service.ts
apps/subgraph-agent/src/constants.ts
apps/subgraph-content/src/content-item/content-item.loader.ts
apps/gateway/src/middleware/rate-limit.spec.ts
apps/subgraph-agent/src/agent-session/session-cleanup.service.memory.spec.ts
apps/subgraph-agent/src/ai/langgraph.service.memory.spec.ts
apps/subgraph-core/src/tenant/tenant-branding.service.spec.ts
apps/subgraph-core/src/tenant/tenant-branding.service.memory.spec.ts
apps/subgraph-content/src/content-item/content-item.service.spec.ts
apps/subgraph-content/src/media/media.service.spec.ts
apps/subgraph-core/src/user/user-export.service.spec.ts
apps/subgraph-core/src/user/user-stats.service.spec.ts
apps/subgraph-content/src/content-item/content-item.loader.spec.ts
```

---

## Test Fix Cycle Protocol — Run Until All Tests Green

**Goal:** After all implementation phases complete, enter an iterative fix cycle until 100% of the existing + new test suite passes. No phase is "done" while any test is red.

### Cycle Structure

Each cycle runs the full test battery, collects failures, assigns fix agents in parallel, and re-runs. Repeat until zero failures.

```
CYCLE N
  ├── Step 1: Run full test battery (parallel per package)
  ├── Step 2: Collect failure report
  ├── Step 3: Triage failures → assign to parallel fix agents
  ├── Step 4: Fix agents execute in parallel
  ├── Step 5: Re-run only the previously-failing tests (fast validation)
  └── If failures remain → CYCLE N+1
      If all green → EXIT ✅
```

### Step 1 — Full Test Battery (run all in parallel)

```bash
# Launch these 6 in parallel (separate agents or pnpm --parallel):
pnpm turbo typecheck                                              # TS errors
pnpm turbo test -- --reporter=verbose --passWithNoTests          # unit + integration
pnpm turbo test:memory                                            # memory leak specs
pnpm turbo test:rls                                               # RLS tenant isolation
pnpm test:security                                                # 249+ security tests
pnpm --filter @edusphere/gateway compose                          # federation composition
```

Report format after Step 1:

```
┌─────────────────────────────────────────────────────────────┐
│ TEST CYCLE N — BATTERY RESULTS — [timestamp]                │
├────────────────────────┬────────┬──────────┬────────────────┤
│ Suite                  │ Total  │ Passing  │ Failing        │
├────────────────────────┼────────┼──────────┼────────────────┤
│ TypeScript typecheck   │  —     │  ✅ / ❌ │ N errors       │
│ Unit + Integration     │  NNN   │  NNN ✅  │ NN ❌          │
│ Memory specs           │  NN    │  NN  ✅  │ N  ❌          │
│ RLS validation         │  NN    │  NN  ✅  │ N  ❌          │
│ Security tests         │  249   │  249 ✅  │ N  ❌          │
│ Federation compose     │  —     │  ✅ / ❌ │ N errors       │
├────────────────────────┼────────┼──────────┼────────────────┤
│ TOTAL                  │  NNN   │  NNN     │ NN ❌          │
└────────────────────────┴────────┴──────────┴────────────────┘
Overall: NN% passing — Cycle N+1 required
```

### Step 2 — Failure Triage Categories

Classify every failure into one of these categories to determine the fix agent:

| Category | Symptom | Fix Agent Assignment |
|----------|---------|---------------------|
| **TYPE** | `TS2345`, `TS7006`, `TS2339` TypeScript errors | Agent assigned to the failing file's package |
| **IMPORT** | `Cannot find module '@edusphere/config'` after package creation | Agent-Config: verify `pnpm-workspace.yaml` + rebuild |
| **MOCK** | Test expects old class that was renamed/moved | Agent assigned to the test file's package |
| **RLS** | `SET LOCAL app.current_tenant` session variable mismatch (SI-1) | Agent-RLS: fix the session variable name in the affected query |
| **MEMORY** | Test detects leaked `setInterval` or open handle | Agent assigned to the service's package |
| **COMPOSE** | Federation schema composition fails after split | Agent-Gateway: fix the subgraph SDL or entity stub |
| **MIGRATE** | Drizzle migration fails (index already exists, etc.) | Agent-DB: fix the migration SQL / schema definition |
| **SECURITY** | Security test finds `any`, `console.log`, or `curl --insecure` pattern | Agent assigned to the failing file's package |

### Step 3 — Parallel Fix Agent Assignment

For each failing test, assign to an agent by package boundary. Multiple failures in the same package → same agent. Agents fix in parallel:

```
Cycle N Fix Round:
├── Agent-1 [subgraph-knowledge]  — fix TYPE + MOCK failures in knowledge
├── Agent-2 [subgraph-core]       — fix MEMORY failures in tenant-branding
├── Agent-3 [gateway]             — fix COMPOSE + IMPORT failures
├── Agent-4 [packages/config]     — fix IMPORT failures from missing exports
└── Agent-5 [subgraph-content]    — fix MOCK failures after loader extraction
```

**Rule:** Each fix agent must:
1. Read the full failing test output before touching any file.
2. Fix only what is failing — no unrelated cleanup.
3. Run `pnpm turbo typecheck --filter=<package>` locally before reporting done.

### Step 4 — Re-run Targeted Tests (fast validation)

After fix agents report done, re-run only the previously-failing suites:

```bash
# Re-run only affected packages (not full suite — faster feedback):
pnpm turbo test --filter=@edusphere/subgraph-knowledge --filter=@edusphere/gateway
pnpm turbo typecheck --filter=@edusphere/subgraph-core
pnpm turbo test:memory --filter=@edusphere/subgraph-core
```

If targeted re-run is green → run full battery (Step 1) to confirm no regression.

### Cycle Exit Criteria

| Condition | Action |
|-----------|--------|
| Full battery: 0 failures, 0 TypeScript errors, compose succeeds | ✅ **EXIT — work complete** |
| Failures reduced but > 0 remain | Start Cycle N+1 immediately |
| Same failures in 2 consecutive cycles (no progress) | **STOP** — escalate to user with failure details; do not loop indefinitely |
| New failures introduced by fix agents | Roll back the offending change; assign dedicated fix agent |

### Maximum Cycles Before Escalation

- **Cycles 1-3:** Normal fix progress expected — parallel agents, full autonomy.
- **Cycle 4:** If failures persist, log root cause analysis per failure and report to user before continuing.
- **Cycle 5+:** Each additional cycle requires explicit user confirmation to continue.

---

## Full Integration Verification Sequence

Run in this order as the **final Cycle 0** check (before entering the fix cycle loop):

```bash
# 1. TypeScript — zero errors (strict mode)
pnpm turbo typecheck

# 2. Unit tests — all pass
pnpm turbo test

# 3. Memory tests — all new specs pass, no leaked handles
pnpm turbo test:memory

# 4. RLS validation — tenant isolation intact
pnpm turbo test:rls

# 5. Security tests — all 249+ security tests pass
pnpm test:security

# 6. Federation composition — no breaking changes
pnpm --filter @edusphere/gateway compose

# 7. Docker health check — all containers healthy
./scripts/health-check.sh

# 8. Smoke test — end-to-end flow passes
./scripts/smoke-test.sh
```

**If any step fails → enter Test Fix Cycle Protocol above.**
**All 8 steps must be green before this work is considered complete.**

---

## OPEN_ISSUES.md Entries to Add at Completion

| Topic | Entry | Status |
|-------|-------|--------|
| T1 | `packages/config` created — centralized env defaults | ✅ Fixed |
| T2 | `AuthMiddleware` + `MetricsModule` factory extracted to shared packages | ✅ Fixed |
| T3 | Magic numbers replaced with named constants per subgraph | ✅ Fixed |
| T4 | `cypher.service`, `graph.service`, `embedding.service`, `ai.service` split | ✅ Fixed |
| T5 | `TenantBrandingService` LRU + `OnModuleDestroy`; gateway `stopRateLimitCleanup` | ✅ Fixed |
| T6 | Zero `any` in production code — `toUserRole()` helper added | ✅ Fixed |
| T7 | `docker-compose.monitoring.yml` memory limits added | ✅ Fixed |
| T8 | 8 missing test files added (GDPR + memory + business logic) | ✅ Fixed |
| T9 | Annotation `tenant_id` composite index migration applied | ✅ Fixed |
| T10 | Turbo pipeline: `test:memory`, `test:rls`, `test:security` tasks added | ✅ Fixed |
| T11 | N+1 fixed: `linkConcepts` re-fetch removed; `ContentItemLoader` added | ✅ Fixed |
