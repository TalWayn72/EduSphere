# Memory Safety & OOM Prevention — EduSphere Implementation Plan

## Context

EduSphere targets 100,000+ concurrent users. Three parallel deep-dive exploration agents (backend subgraphs, frontend/packages, AI/ML infrastructure) uncovered **systemic memory leak patterns** across all layers of the stack. The issues compound: a single AI agent session can hold a NATS KV client + an open pg.Pool + an untracked async promise + an orphaned GraphQL pubSub listener simultaneously. Under production load these are multiplied across every active session.

**Scope:** Fix every identified memory leak, add comprehensive tests, enforce mandatory rules in CLAUDE.md so future development cannot reintroduce these issues.

---

## Verified Issues (Root Causes)

### 🔴 CRITICAL — Backend

| # | File | Issue | Lines |
|---|------|-------|-------|
| B1 | `apps/subgraph-agent/src/ai/ai.langgraph.ts` | `pg.Pool({ max:5 })` created at module scope, **never closed**. In dev, `MemorySaver` accumulates all thread state with zero eviction. | 38–52 |
| B2 | `apps/subgraph-agent/src/memory/memory.service.ts` | `new NatsKVClient()` as class field; `close()` exists but **never called** — no `OnModuleDestroy` | 44 |
| B3 | `apps/subgraph-agent/src/agent-session/agent-session.resolver.ts` | Module-level `pubSub = createPubSub(...)` accumulates orphaned GraphQL subscribers; no cleanup on session end | 32–34 |
| B4 | `apps/subgraph-agent/src/agent/agent.service.ts` | `processExecution()` fire-and-forget with no timeout; hanging AI calls persist forever | 68–72 |
| B5 | `apps/subgraph-knowledge/src/nats/nats.consumer.ts` | No `msg.ack()` on JetStream messages; stream created without `max_age`/`max_bytes` — NATS broker accumulates messages | 54–70 |

### 🔴 CRITICAL — Frontend

| # | File | Issue | Line |
|---|------|-------|------|
| F1 | `apps/web/src/lib/auth.ts` | `setInterval` in `setupTokenRefresh()` **never cleared** — runs every 60s for entire app lifetime, re-created on each call | 181 |
| F2 | `apps/web/src/pages/AgentsPage.tsx` | `streamRef.current = setInterval(...)` (every 18ms) — **no `useEffect` cleanup** | 262 |

### 🟡 HIGH — Backend

| # | File | Issue |
|---|------|-------|
| B6 | `packages/db/src/index.ts` | `createDatabaseConnection()` creates a **new `pg.Pool({ max:20 })`** on every call — 20+ services each with their own pool ≈ 400 connections. No `closeAllPools()`, no signal handlers |
| B7 | All 20 services across 6 subgraphs | Call `createDatabaseConnection()` in constructor with **no `OnModuleDestroy`** — DB connections never closed |
| B8 | `apps/subgraph-agent/src/nats/nats.service.ts` | Subscription cleanup functions returned to callers but not tracked internally; if caller forgets to invoke cleanup, subscription leaks | 73–91 |

### 🟡 HIGH — AI/ML

| # | File | Issue |
|---|------|-------|
| A1 | `packages/langgraph-workflows/src/tutorWorkflow.ts` | `conversationHistory` grows unbounded — each workflow step appends 2 entries, no pruning. At 100K sessions × 50 messages × ~1KB ≈ **5GB heap** |
| A2 | Same pattern in `debateWorkflow.ts`, `quizWorkflow.ts` | Same unbounded array growth |
| A3 | `apps/subgraph-agent/src/ai/ai.service.ts` | `executeStream()` returns stream with no `AbortSignal` — if client disconnects, LLM call continues |
| A4 | `packages/nats-client/src/kv.client.ts` | `stores: Map<string, KV>` grows without bound — no eviction; never cleared (close() never called — see B2) |

### 🟡 MEDIUM — Frontend

| # | File | Issue | Line(s) |
|---|------|-------|---------|
| F3 | `apps/web/src/components/AIChatPanel.tsx` | Two nested `setTimeout` (800ms + 1000ms) per message, **no cleanup refs** | 60, 72 |
| F4 | `apps/web/src/pages/CollaborationPage.tsx` | 3 `setTimeout` calls in `handleStartMatching()`, **no cleanup** | 82–90 |
| F5 | `apps/web/src/pages/CourseDetailPage.tsx` | Toast `setTimeout` with no cleanup ref | 110 |
| F6 | `apps/web/src/pages/CourseList.tsx` | Toast `setTimeout` with no cleanup ref | 143 |
| F7 | `apps/web/src/hooks/useAgentChat.ts` | 30s timeout `setIsStreaming(false)` + 800ms mock timeout — both without cleanup | 144, 206 |
| F8 | `apps/web/src/pages/KnowledgeGraph.tsx` | `return () => clearTimeout(timer)` inside `useCallback` — return value is **discarded**; timer leaks | 235 |
| F9 | `apps/web/src/lib/urql-client.ts` | Module-level `wsClient` never disposed; no `beforeunload` handler | 6–12 |

### 🟡 MEDIUM — Infrastructure

| # | File | Issue |
|---|------|-------|
| I1 | `docker-compose.dev.yml` | PostgreSQL, NATS, Keycloak, Redis, Jaeger have **no memory limits**. Agent & Knowledge subgraphs have no entry at all |
| I2 | `docker-compose.yml` (prod) | Single container with **no `mem_limit`** whatsoever |
| I3 | All subgraph docker definitions | No `NODE_OPTIONS=--max-old-space-size` — Node.js will OOM the container before the OS kills it |

---

## Implementation Plan — 6 Waves (Parallel Execution)

```
Wave 1 (Backend Lifecycle)  ──────────────────────────────────────┐
Wave 2 (Frontend Timers)    ──────────────────────────────────────┤ → Wave 5 (Tests)
Wave 4 (Infrastructure)     ──────────────────────────────────────┤
Wave 6 (CLAUDE.md)          ──────────────────────────────────────┘
Wave 3 (AI/ML)              — depends on Wave 1-A (DB pool) → Wave 5
```

Waves 1, 2, 4, 6 are fully independent — launch in parallel. Wave 3 starts after Wave 1-A finishes. Wave 5 starts after all others.

---

## Wave 1 — Critical Backend Lifecycle (3 agents in parallel)

### Agent 1-A: DB Pool Singleton + Signal Handlers
**File:** `packages/db/src/index.ts`

Replace `createDatabaseConnection()` with a singleton-pool pattern:
```typescript
const _pools = new Map<string, Pool>();

export function getOrCreatePool(connectionString?: string): Pool {
  const key = connectionString ?? process.env.DATABASE_URL ?? 'default';
  if (!_pools.has(key)) {
    _pools.set(key, new Pool({ connectionString: key !== 'default' ? key : process.env.DATABASE_URL, max: 10, idleTimeoutMillis: 30000, connectionTimeoutMillis: 2000 }));
  }
  return _pools.get(key)!;
}

export function createDatabaseConnection(connectionString?: string) {
  return drizzle(getOrCreatePool(connectionString), { schema });
}

export async function closeAllPools(): Promise<void> {
  await Promise.allSettled([..._pools.values()].map((p) => p.end()));
  _pools.clear();
}

['SIGINT', 'SIGTERM', 'SIGUSR2'].forEach((sig) =>
  process.once(sig, async () => { await closeAllPools(); process.exit(0); })
);
```
- Export `closeAllPools` from package barrel (`packages/db/src/index.ts`)
- Reduces pool max from 20 → 10 per unique connection string
- All 6 subgraphs now share one pool per DATABASE_URL process-wide

### Agent 1-B: `OnModuleDestroy` Sweep — 20 Services
Add to every service that calls `createDatabaseConnection()` in its constructor:
```typescript
implements OnModuleDestroy
async onModuleDestroy(): Promise<void> { await closeAllPools(); }
```

**Files to update** (all confirmed to have `createDatabaseConnection()` in constructor):
- `apps/subgraph-agent/src/agent/agent.service.ts`
- `apps/subgraph-agent/src/agent-session/agent-session.service.ts`
- `apps/subgraph-agent/src/agent-message/agent-message.service.ts`
- `apps/subgraph-agent/src/template/template.service.ts`
- `apps/subgraph-core/src/user/user.service.ts`
- `apps/subgraph-core/src/user/user-preferences.service.ts`
- `apps/subgraph-core/src/user/user-stats.service.ts`
- `apps/subgraph-core/src/tenant/tenant.service.ts`
- `apps/subgraph-annotation/src/annotation/annotation.service.ts`
- `apps/subgraph-content/src/course/course.service.ts`
- `apps/subgraph-content/src/course/enrollment.service.ts`
- `apps/subgraph-content/src/content-item/content-item.service.ts`
- `apps/subgraph-content/src/module/module.service.ts`
- `apps/subgraph-content/src/media/media.service.ts`
- `apps/subgraph-content/src/translation/translation.service.ts`
- `apps/subgraph-knowledge/src/embedding/embedding.service.ts`
- `apps/subgraph-knowledge/src/graph/cypher.service.ts`
- `apps/subgraph-knowledge/src/graph/graph.service.ts`
- `apps/subgraph-collaboration/src/discussion/discussion.service.ts`
- `apps/subgraph-agent/src/memory/memory.service.ts` (see also Agent 1-C)

`closeAllPools()` is idempotent — the first service to call it closes pools; subsequent calls are no-ops. NestJS calls `OnModuleDestroy` in reverse DI order.

### Agent 1-C: Agent-Specific Critical Fixes
**5 targeted fixes:**

**1. `memory.service.ts` — NatsKVClient cleanup**
```typescript
implements OnModuleDestroy
async onModuleDestroy(): Promise<void> {
  await this.kv.close();   // closes NATS connection + clears stores Map
  await closeAllPools();
}
```

**2. `agent-session.resolver.ts` — pubSub terminal sentinel**
- Move `pubSub` from module scope into class property
- In `endSession` mutation, after `complete()`, publish a terminal message:
  ```typescript
  pubSub.publish(`messageStream_${id}`, {
    messageStream: { id: '__end__', sessionId: id, role: 'SYSTEM', content: '', createdAt: new Date().toISOString() }
  });
  ```
- Frontend (Wave 2): treat `id === '__end__'` as signal to pause subscription

**3. `agent.service.ts` — 5-minute execution timeout**
```typescript
const TIMEOUT_MS = 5 * 60 * 1000;
void Promise.race([
  this.processExecution(execution.id),
  new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Execution timeout')), TIMEOUT_MS)),
]).catch(async (err) => {
  this.logger.error(`Execution ${execution.id} failed: ${err.message}`);
  await this.db.update(schema.agent_executions)
    .set({ status: 'FAILED', output: { error: err.message }, completed_at: new Date() })
    .where(eq(schema.agent_executions.id, execution.id));
});
```

**4. `nats.service.ts` — Track subscription cleanup refs**
```typescript
private readonly subscriptions: Array<() => void> = [];
// In subscribe(): push cleanup → return cleanup
// In onModuleDestroy(): forEach cleanup, then drain()
```

**5. `nats.consumer.ts` — JetStream ack + stream retention**
- Convert from core NATS `subscribe()` to JetStream durable consumer with `ack_policy: 'explicit'`
- In `ensureStream()` add: `max_age: 86400 * 1e9` (24h ns), `max_bytes: 100 * 1024 * 1024`
- Call `msg.ack()` after success, `msg.nak()` after failure

**Wave 1 DoD:**
- [ ] `packages/db` exports `closeAllPools()`, pool is singleton per connection string
- [ ] All 20 services implement `OnModuleDestroy`
- [ ] `memory.service.ts` calls `this.kv.close()` on destroy
- [ ] `agent.service.ts` wraps execution with 5-min timeout + DB failure update
- [ ] `nats.consumer.ts` uses JetStream durable consumer with ack
- [ ] `pnpm turbo test --filter=@edusphere/db` passes
- [ ] `pnpm turbo test --filter=@edusphere/subgraph-agent` passes

---

## Wave 2 — Frontend Timer & Subscription Fixes (2 agents in parallel)

**Pattern for all timer fixes:** store handle in `useRef`, clear it in `useEffect(() => () => clearTimeout/clearInterval(ref.current), [])`.

### Agent 2-A: Critical Timers
**`apps/web/src/lib/auth.ts`** — token refresh interval (B1/F1)
```typescript
let _tokenRefreshInterval: ReturnType<typeof setInterval> | null = null;
function setupTokenRefresh(): void {
  if (_tokenRefreshInterval) clearInterval(_tokenRefreshInterval);
  _tokenRefreshInterval = setInterval(() => { ... }, 60000);
}
export function clearTokenRefresh(): void {
  if (_tokenRefreshInterval) { clearInterval(_tokenRefreshInterval); _tokenRefreshInterval = null; }
}
// Call clearTokenRefresh() inside logout() before redirect
```

**`apps/web/src/pages/AgentsPage.tsx`** — streaming interval (F2)
```typescript
// Add streamTimeoutRef alongside existing streamRef
const streamTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
// Add cleanup useEffect (runs only on unmount):
useEffect(() => () => {
  if (streamRef.current !== undefined) clearInterval(streamRef.current);
  if (streamTimeoutRef.current !== undefined) clearTimeout(streamTimeoutRef.current);
}, []);
```

### Agent 2-B: Remaining Component Timers + WebSocket
Apply `useRef` + cleanup `useEffect` pattern to:
- `apps/web/src/components/AIChatPanel.tsx` — `outerTimeoutRef` + `innerTimeoutRef` for nested setTimeouts (lines 60, 72)
- `apps/web/src/pages/CollaborationPage.tsx` — `matchTimeoutRef1` + `matchTimeoutRef2` for 3 setTimeout calls (lines 82–90)
- `apps/web/src/pages/CourseDetailPage.tsx` — `toastTimeoutRef` in `showToast()` (line 110)
- `apps/web/src/pages/CourseList.tsx` — `toastTimeoutRef` in `showToast()` (line 143)
- `apps/web/src/hooks/useAgentChat.ts` — `streamingTimeoutRef` (30s, line 206) + `mockTimeoutRef` (800ms, line 144)
- `apps/web/src/pages/KnowledgeGraph.tsx` — replace `return () => clearTimeout()` inside `useCallback` with `mockPathTimerRef` + cleanup useEffect
- `apps/web/src/lib/urql-client.ts`:
  ```typescript
  export function disposeWsClient(): void { wsClient.dispose(); }
  if (typeof window !== 'undefined') window.addEventListener('beforeunload', () => wsClient.dispose());
  ```

**Wave 2 DoD:**
- [ ] `auth.ts` returns and stores interval handle; `clearTokenRefresh()` exported and called in `logout()`
- [ ] All 7 component/hook files use ref+cleanup pattern — no bare `setTimeout`/`setInterval`
- [ ] `KnowledgeGraph.tsx` no longer uses `return () =>` inside `useCallback` to express cleanup
- [ ] `urql-client.ts` disposes wsClient on `beforeunload`
- [ ] `pnpm --filter @edusphere/web test` passes

---

## Wave 3 — AI/ML Memory Management (2 agents in parallel, after Wave 1-A)

### Agent 3-A: LangGraphService — NestJS Injectable Wrapping checkpointer
**New file:** `apps/subgraph-agent/src/ai/langgraph.service.ts`

```typescript
@Injectable()
export class LangGraphService implements OnModuleInit, OnModuleDestroy {
  private checkpointer: MemorySaver | PostgresSaver | null = null;
  private pool: pg.Pool | null = null;
  private cleanupInterval: ReturnType<typeof setInterval> | null = null;
  private readonly logger = new Logger(LangGraphService.name);

  async onModuleInit(): Promise<void> {
    const dbUrl = process.env.DATABASE_URL;
    if (dbUrl) {
      try {
        this.pool = new pg.Pool({ connectionString: dbUrl, max: 3 });
        const saver = new PostgresSaver(this.pool);
        await saver.setup();
        this.checkpointer = saver;
      } catch { this.checkpointer = new MemorySaver(); this.scheduleMemoryTrim(); }
    } else {
      this.checkpointer = new MemorySaver(); this.scheduleMemoryTrim();
    }
  }

  private scheduleMemoryTrim(): void {
    const MAX = 1000;
    this.cleanupInterval = setInterval(() => {
      const storage = (this.checkpointer as unknown as { storage?: Map<string,unknown> }).storage;
      if (storage && storage.size > MAX) {
        [...storage.keys()].slice(0, storage.size - MAX).forEach((k) => storage.delete(k));
        this.logger.warn(`MemorySaver trimmed to ${MAX} sessions`);
      }
    }, 5 * 60 * 1000);
  }

  async onModuleDestroy(): Promise<void> {
    if (this.cleanupInterval) clearInterval(this.cleanupInterval);
    if (this.pool) { await this.pool.end(); this.pool = null; }
    this.checkpointer = null;
  }

  getCheckpointer() { return this.checkpointer!; }
}
```

- Add `LangGraphService` to `apps/subgraph-agent/src/ai/ai.module.ts` providers
- Remove module-level `_checkpointer` and `getCheckpointer()` from `ai.langgraph.ts`
- Update the 4 adapter functions (`runLangGraphDebate/Quiz/Tutor/Assessment`) to accept checkpointer as a parameter, injected from `AIService` via `LangGraphService.getCheckpointer()`

### Agent 3-B: Workflow Pruning, Stream Cancellation, Session Cleanup

**Workflow history pruning** — `packages/langgraph-workflows/src/tutorWorkflow.ts`, `debateWorkflow.ts`, `quizWorkflow.ts`

In each workflow's `StateAnnotation`, update the `conversationHistory` reducer:
```typescript
const MAX_HISTORY = 20;
conversationHistory: Annotation<ConversationEntry[]>({
  value: (existing, incoming) => {
    const merged = [...existing, ...incoming];
    return merged.length > MAX_HISTORY ? merged.slice(merged.length - MAX_HISTORY) : merged;
  },
  default: () => [],
}),
```
Nodes return delta arrays (new entries only); the reducer merges and prunes.

**Stream AbortSignal** — `apps/subgraph-agent/src/ai/ai.service.ts`
```typescript
async executeStream(agent, input, locale = 'en', abortSignal?: AbortSignal) {
  // pass abortSignal to streamText() and workflow.stream()
}
```
In `apps/subgraph-agent/src/agent-session/agent-session.resolver.ts`:
- Add `private readonly sessionAbortControllers = new Map<string, AbortController>()`
- On `sendMessage`: create `AbortController`, store by sessionId, pass `signal` to `executeStream`
- On `endSession`: abort + delete the controller

**kv.client LRU eviction** — `packages/nats-client/src/kv.client.ts`
```typescript
// After stores.set():
if (this.stores.size > 1000) {
  const firstKey = this.stores.keys().next().value;
  if (firstKey) this.stores.delete(firstKey);
}
```

**Stale session cleanup** — New file: `apps/subgraph-agent/src/agent-session/session-cleanup.service.ts`
```typescript
@Injectable()
export class SessionCleanupService implements OnModuleInit, OnModuleDestroy {
  private interval: ReturnType<typeof setInterval> | null = null;
  onModuleInit() { this.interval = setInterval(() => void this.cleanup(), 30 * 60 * 1000); }
  onModuleDestroy() { if (this.interval) clearInterval(this.interval); }
  private async cleanup() {
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
    await this.db.update(schema.agentSessions)
      .set({ status: 'COMPLETED', endedAt: new Date() })
      .where(and(eq(schema.agentSessions.status, 'ACTIVE'), lt(schema.agentSessions.createdAt, cutoff)));
  }
}
```

**Wave 3 DoD:**
- [ ] `LangGraphService` is NestJS injectable with `OnModuleInit` + `OnModuleDestroy`
- [ ] `pg.Pool` in langgraph is managed by service lifecycle
- [ ] `MemorySaver` trimmed every 5 min to ≤1000 sessions
- [ ] All 3 workflow files cap `conversationHistory` at 20 entries
- [ ] `executeStream` accepts and propagates `AbortSignal`
- [ ] `kv.client.ts` evicts oldest store beyond 1000 entries
- [ ] `SessionCleanupService` registered in `agent-session.module.ts`
- [ ] `pnpm turbo test --filter=@edusphere/langgraph-workflows` passes
- [ ] `pnpm turbo test --filter=@edusphere/subgraph-agent` passes

---

## Wave 4 — Infrastructure Memory Limits (2 agents in parallel)

### Agent 4-A: `docker-compose.dev.yml` — Add ALL Missing Limits

```yaml
# Infrastructure services (currently no limits):
postgres:    { mem_limit: 2g,   mem_reservation: 512m }
nats:        { mem_limit: 256m, mem_reservation: 64m  }
redis:       { mem_limit: 256m, mem_reservation: 64m  }
keycloak:    { mem_limit: 1g,   mem_reservation: 256m }
jaeger:      { mem_limit: 512m, mem_reservation: 128m }

# Application subgraphs — add or update:
subgraph-core:          { mem_limit: 512m, mem_reservation: 256m, NODE_OPTIONS: --max-old-space-size=384 }
subgraph-content:       { mem_limit: 512m, mem_reservation: 256m, NODE_OPTIONS: --max-old-space-size=384 }
subgraph-annotation:    { mem_limit: 512m, mem_reservation: 256m, NODE_OPTIONS: --max-old-space-size=384 }
subgraph-collaboration: { mem_limit: 512m, mem_reservation: 256m, NODE_OPTIONS: --max-old-space-size=384 }
subgraph-agent:         { mem_limit: 1g,   mem_reservation: 512m, NODE_OPTIONS: --max-old-space-size=768  }  # AI/ML
subgraph-knowledge:     { mem_limit: 1g,   mem_reservation: 512m, NODE_OPTIONS: --max-old-space-size=768  }  # embeddings
gateway:                { mem_limit: 512m, mem_reservation: 256m, NODE_OPTIONS: --max-old-space-size=384 }
```

### Agent 4-B: `docker-compose.yml` (prod) + NATS Retention Config

**`docker-compose.yml`:**
```yaml
services:
  edusphere:
    mem_limit: 8g
    mem_reservation: 4g
    environment:
      NODE_OPTIONS: --max-old-space-size=6144
```

**NATS stream retention** — New file: `infrastructure/nats/jetstream.conf`
```conf
streams: [
  { name: KNOWLEDGE, subjects: ["knowledge.*"], max_age: 86400s, max_bytes: 104857600, storage: file },
  { name: AGENT_EVENTS, subjects: ["agent.*"], max_age: 3600s, max_bytes: 52428800, storage: memory }
]
```
Mount in `docker-compose.dev.yml` under the `nats` service volumes.

**Wave 4 DoD:**
- [ ] All 11 Docker services have `mem_limit` + `mem_reservation`
- [ ] All 7 Node.js services have `NODE_OPTIONS=--max-old-space-size` ≤ 75% of `mem_limit`
- [ ] `docker-compose.yml` prod has memory limits
- [ ] NATS jetstream.conf mounted and referenced
- [ ] `docker-compose config` validates without errors

---

## Wave 5 — Comprehensive Memory Leak Tests (4 agents in parallel, after Waves 1–4)

### New test files to create

| Agent | Test File | Tests |
|-------|-----------|-------|
| 5-A | `packages/db/src/pool.memory.spec.ts` | Singleton pool returns same instance; `closeAllPools` drains all |
| 5-A | `apps/subgraph-agent/src/nats/nats.service.memory.spec.ts` | Subscription array tracked; `onModuleDestroy` empties array + drains |
| 5-A | `apps/subgraph-agent/src/memory/memory.service.memory.spec.ts` | `kv.close()` called on destroy; `closeAllPools()` called |
| 5-A | `apps/subgraph-agent/src/ai/ai.langgraph.memory.spec.ts` | `pool.end()` called on destroy; MemorySaver trimmed at >1000 sessions |
| 5-B | `apps/subgraph-agent/src/agent/agent.service.memory.spec.ts` | `vi.useFakeTimers()`: advance 5m+1ms → DB updated with status FAILED |
| 5-B | `apps/subgraph-knowledge/src/nats/nats.consumer.memory.spec.ts` | `msg.ack()` called; stream created with `max_age`+`max_bytes`; `onModuleDestroy` drains |
| 5-C | `apps/web/src/hooks/useAgentChat.memory.test.ts` | `clearTimeout` called on unmount for both timeouts (fake timers) |
| 5-C | `apps/web/src/pages/AgentsPage.memory.test.tsx` | `clearInterval` called on unmount (fake timers, streaming active) |
| 5-C | `apps/web/src/hooks/useAnnotations.memory.test.ts` | Subscription pause state is `true` after unmount |
| 5-D | `packages/nats-client/src/kv.client.memory.spec.ts` | Adding 1001 buckets evicts oldest; `close()` drains connection + clears map |
| 5-D | `packages/langgraph-workflows/src/workflow.memory.spec.ts` | After 15 tutor workflow invocations, `conversationHistory.length <= 20` |

### Vitest config updates

Update all vitest configs to add process isolation:
```typescript
// packages/langgraph-workflows/vitest.config.ts, packages/nats-client/vitest.config.ts
pool: 'forks',
poolOptions: { forks: { execArgv: ['--max-old-space-size=512'] } },
```

Update `apps/web` test config:
```typescript
restoreAllMocks: true,
clearMocks: true,
```

**Wave 5 DoD:**
- [ ] All 11 test files created and passing
- [ ] `pnpm turbo test` passes (≥2213 tests total)
- [ ] `@edusphere/nats-client` coverage ≥80%
- [ ] `@edusphere/langgraph-workflows` coverage ≥80%
- [ ] `@edusphere/subgraph-agent` coverage ≥90%
- [ ] `@edusphere/web` memory tests all pass

---

## Wave 6 — CLAUDE.md Memory Safety Rules (independent)

Add **"Memory Safety (Mandatory)"** section to `CLAUDE.md` after "Core Rules":

```markdown
## Memory Safety (Mandatory)

### Backend Rules
| Rule | Pattern |
|------|---------|
| Every `@Injectable()` service with `createDatabaseConnection()` MUST implement `OnModuleDestroy` calling `closeAllPools()` | `implements OnModuleDestroy` |
| Every `@Injectable()` service with `new NatsKVClient()` MUST call `this.kv.close()` in `OnModuleDestroy` | Lifecycle hook |
| Every `setInterval`/`setTimeout` in a service MUST store the handle and `clearInterval/clearTimeout` it in `OnModuleDestroy` | Handle ref |
| All async `for await` subscription loops MUST be closeable via the subscription's `unsubscribe()` tracked in service | Subscription tracking |
| Fire-and-forget async MUST use `Promise.race(task, timeout)` with DB failure update on timeout | 5-min default |
| Unbounded `Map`/`Array` MUST have max-size eviction (LRU for Map, `slice(-N)` for array) | Size guard |

### Frontend Rules
| Rule | Pattern |
|------|---------|
| Every `setInterval` in component/hook MUST have `clearInterval` in `useEffect` cleanup return | `useRef` + `useEffect(() => () => clearInterval(ref.current), [])` |
| Every `setTimeout` in component/hook MUST use `useRef` handle + `clearTimeout` in `useEffect` cleanup | Same pattern |
| NEVER `return () => cleanup()` inside `useCallback` — return value is discarded by React | Use `useEffect` instead |
| GraphQL subscriptions MUST set `pause: true` when the consuming component unmounts | `pause` flag on `useSubscription` |
| Module-level WebSocket clients MUST be disposed on `window.beforeunload` | `disposeWsClient()` |

### Infrastructure Rules
| Rule | Pattern |
|------|---------|
| ALL Docker services MUST have `mem_limit` AND `mem_reservation` | docker-compose schema check in CI |
| All Node.js services MUST set `NODE_OPTIONS=--max-old-space-size` ≤ 75% of `mem_limit` | Environment block |
| ALL NATS JetStream streams MUST declare `max_age` AND `max_bytes` at creation | Stream factory helper |
| Database pools MUST use `getOrCreatePool()` from `@edusphere/db` — never `new Pool()` directly | Import from `@edusphere/db` |

### Testing Rules (required for every new service/hook)
| Change Type | Required Test |
|-------------|---------------|
| New NestJS service with DB/NATS | `*.memory.spec.ts` verifying `onModuleDestroy` calls cleanup functions |
| New React hook with timers | `*.memory.test.ts` verifying `unmount` triggers `clearTimeout/clearInterval` |
| New unbounded Map/array | Test verifying eviction fires at max size |
| New async subscription loop | Test verifying loop exits on `unsubscribe()` |
| New `setInterval` in any service | Test that `clearInterval` is called on destroy |
```

**Wave 6 DoD:**
- [ ] CLAUDE.md updated with Memory Safety section
- [ ] All 4 rule tables present (Backend, Frontend, Infrastructure, Testing)

---

## Complete Agent Assignment Table

| Agent | Wave | Files Modified | Estimated Time |
|-------|------|----------------|----------------|
| 1-A | W1 | `packages/db/src/index.ts` | 45 min |
| 1-B | W1 | 20 service files (add `OnModuleDestroy`) | 90 min |
| 1-C | W1 | `memory.service.ts`, `agent.service.ts`, `nats.service.ts`, `nats.consumer.ts`, `agent-session.resolver.ts` | 90 min |
| 2-A | W2 | `auth.ts`, `AgentsPage.tsx` | 45 min |
| 2-B | W2 | `AIChatPanel.tsx`, `CollaborationPage.tsx`, `CourseDetailPage.tsx`, `CourseList.tsx`, `useAgentChat.ts`, `KnowledgeGraph.tsx`, `urql-client.ts` | 90 min |
| 3-A | W3 | `langgraph.service.ts` (new), `ai.langgraph.ts`, `ai.module.ts`, `ai.service.ts` | 90 min |
| 3-B | W3 | `tutorWorkflow.ts`, `debateWorkflow.ts`, `quizWorkflow.ts`, `kv.client.ts`, `session-cleanup.service.ts` (new) | 90 min |
| 4-A | W4 | `docker-compose.dev.yml` | 30 min |
| 4-B | W4 | `docker-compose.yml`, `infrastructure/nats/jetstream.conf` (new) | 30 min |
| 5-A | W5 | 4 backend spec files (new) | 120 min |
| 5-B | W5 | 2 backend spec files + 1 frontend test (new) | 90 min |
| 5-C | W5 | 2 frontend test files (new) | 60 min |
| 5-D | W5 | `packages/*/vitest.config.ts`, `apps/web` test config | 30 min |
| 6   | W6 | `CLAUDE.md` | 30 min |

**Peak parallelism:** 8 agents simultaneously (Waves 1+2+4+6 all running at once)

---

## Risk & Rollback

| Change | Risk | Rollback |
|--------|------|----------|
| Pool singleton (`packages/db`) | MEDIUM — tests mocking `createDatabaseConnection` must mock `@edusphere/db` module | `git revert` single file; all callers still compile |
| `OnModuleDestroy` on 20 services | LOW — additive; `closeAllPools` is idempotent | Remove `implements OnModuleDestroy` per file |
| `LangGraphService` extraction | HIGH — changes module wiring | Restore module-level `getCheckpointer()` in `ai.langgraph.ts`; remove service from providers |
| MemorySaver trim | MEDIUM — only in dev; prod uses PostgresSaver | Remove `scheduleMemoryTrim()` call |
| Workflow history pruning | MEDIUM — changes AI context window | Revert reducer to `(_, u) => u` pattern |
| Docker mem_limits | MEDIUM — may OOM-kill under burst load | Increase limits or remove temporarily; monitor `docker stats` |
| NatsConsumer JetStream migration | HIGH — changes message delivery semantics | Revert to core `connection.subscribe()` if JetStream not supported |

---

## End-to-End Verification

After all waves complete:

```bash
# 1. Baseline test suite
pnpm turbo test -- --coverage
# Expected: ≥2213 tests pass, new memory tests included

# 2. TypeScript compilation
pnpm turbo build --filter='./apps/*' --filter='./packages/*'

# 3. Lint
pnpm turbo lint

# 4. Federation composition
pnpm --filter @edusphere/gateway compose

# 5. Docker memory limits validation
docker-compose -f docker-compose.dev.yml config | grep -E 'mem_limit|mem_reservation'
# Expected: All 11 services show values

# 6. Node.js heap ceiling validation
docker-compose -f docker-compose.dev.yml config | grep 'max-old-space-size'
# Expected: All 7 subgraph services show values

# 7. Pool singleton validation (new test)
pnpm --filter @edusphere/db test -- --run
# Expected: pool.memory.spec.ts passes

# 8. Startup health check
docker-compose up -d && ./scripts/health-check.sh
# Expected: all services healthy

# 9. Manual OOM stress test
# Run 100 concurrent agent sessions via curl, monitor docker stats
# Expected: no container exceeds mem_limit
```

---

*Generated: 2026-02-22 | Issues found: 28 (5 Critical, 10 High, 13 Medium) | Files to modify: 45 | New files: 14*
