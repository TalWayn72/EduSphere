# Phase 28 PRD — Live Sessions Completeness, Offline Sync, Skill Tree Data, Accessibility

**Status:** Draft
**Date:** 2026-03-06
**Phase:** 28 (follows Phase 27 — LiveSessions UI, OfflineBanner, KnowledgeGraph, SkillTree stub)
**Author:** PM + Architecture + UX Research Agent

---

## 1. Overview

Phase 27 built the UI shell for live sessions and the offline queue hook, but left several critical blockers and missing backend mutations unimplemented. Phase 28 closes all outstanding gaps:

| Task | Area | Priority |
|------|------|----------|
| T1 | Critical blockers (migration, Husky, Service Worker) | P0 — must land first |
| T2 | Live sessions backend completeness | P1 |
| T3 | Offline sync auto-flush on reconnect + TTL eviction | P1 |
| T4 | Skill tree real data via Drizzle + AGE Cypher | P1 |
| T5 | ARIA / accessibility gaps | P2 |

**Constraint:** T1 must merge before any other task because migration 0012 unblocks T2 (the service layer references the renamed columns) and the Husky fix unblocks all CI gates.

---

## 2. Background and Current State

### Live Sessions (apps/subgraph-agent)

The GraphQL schema (`live-sessions.graphql`) exposes only `startLiveSession`. The service (`live-sessions.service.ts`) implements `startLiveSession` with full NATS event publishing and proper RLS, but the following mutations are absent:
- `endLiveSession` — no status transition LIVE → ENDED
- `joinLiveSession` — no room URL returned to students
- `cancelLiveSession` — no SCHEDULED → CANCELLED path
- `getSessionAttendees` — no paginated attendee list for instructors

The database schema (`packages/db/src/schema`) added `attendeePasswordEnc` and `moderatorPasswordEnc` columns (SI-3 compliance) but the migration renaming the old plaintext columns has not been written.

### Offline Queue (apps/web/src/hooks/useOfflineQueue.ts)

`useOfflineQueue` already:
- Stores up to 100 items in localStorage with LRU eviction
- Listens to `storage` events for cross-tab sync
- Exposes `flush(handler)` for manual replay

Missing:
- `window.addEventListener('online', ...)` auto-flush on reconnect (no cleanup = memory leak)
- 48-hour TTL eviction on items older than `Date.now() - 48 * 60 * 60 * 1000` (the `createdAt` field already exists on `QueuedItem`)

### Skill Tree (apps/subgraph-knowledge/src/graph/skill-tree.service.ts)

The service is already real — it queries `content_items` via Drizzle and `user_skill_mastery` via raw SQL with a proper fallback. The fallback topology is a linear chain. The T4 work replaces the fallback with Apache AGE `PREREQUISITE_OF` edge traversal when the graph is available, and adds a UUID validation mount guard in the frontend.

### Husky Pre-commit

`.husky/pre-commit` begins with:
```sh
#!/usr/bin/env sh
. "$(dirname "$0")/_/husky.sh"
```
Husky v10 removed the `_/husky.sh` shim. These two lines cause every pre-commit run to fail with `husky.sh: not found`. They must be removed and replaced with the v10-compatible header (`#!/usr/bin/env sh` only, no sourcing).

### Service Worker

`apps/web/src/main.tsx` does not register a service worker. The `pwa.ts` file (if present) is not imported, leaving the offline banner with no underlying SW to intercept requests.

---

## 3. Task Specifications

### T1 — Critical Blockers (P0)

#### T1-A: Migration 0012 — Rename Password Columns

**File:** `packages/db/src/migrations/0012_live_session_enc_columns.sql`

The `live_sessions` table must rename:
- `attendee_password` → `attendee_password_enc`
- `moderator_password` → `moderator_password_enc`

The Drizzle schema in `packages/db/src/schema/` must reflect the renamed columns. Both old and new column names must remain functional during the migration window via a `DO $$ ... $$` block that checks for the old name before renaming.

**Acceptance Criteria:**
- [ ] Migration file `0012_live_session_enc_columns.sql` exists and is idempotent
- [ ] `pnpm --filter @edusphere/db migrate` runs without error on a clean DB and on a DB that already has the old column names
- [ ] Drizzle schema reflects `attendeePasswordEnc` / `moderatorPasswordEnc`
- [ ] `pnpm turbo typecheck` passes with 0 errors after schema update
- [ ] RLS policy on `live_sessions` is preserved after rename

#### T1-B: Husky v10 Pre-commit Fix

**Files:** `.husky/pre-commit`, `.husky/pre-push`, `.husky/post-commit`, `.husky/post-checkout`, `.husky/post-merge`

Remove the `#!/usr/bin/env sh` shebang + `. "$(dirname -- "$0")/_/husky.sh"` sourcing lines from ALL Husky hook files. Husky v10 hooks are plain shell scripts with no shim.

**Acceptance Criteria:**
- [ ] No hook file contains `husky.sh`
- [ ] `git commit --dry-run` executes without "husky.sh: not found" error
- [ ] The root artifact check logic in `pre-commit` is preserved
- [ ] CI `pnpm test:security` still passes (hooks do not affect security tests)

#### T1-C: Service Worker Registration

**File:** `apps/web/src/main.tsx`

Import and call the Vite PWA service worker registration helper. If `pwa.ts` does not exist, create it with `navigator.serviceWorker.register('/sw.js')` guarded by `'serviceWorker' in navigator`. Add `beforeunload` cleanup:

```typescript
// apps/web/src/pwa.ts
export function registerSW(): void {
  if (!('serviceWorker' in navigator)) return;
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .catch((err) => console.error('[SW] Registration failed:', err));
  });
}
```

In `main.tsx`, call `registerSW()` after `createRoot(...).render(...)`.

**Acceptance Criteria:**
- [ ] `apps/web/src/pwa.ts` exists with SW registration logic
- [ ] `registerSW()` is called in `main.tsx`
- [ ] No uncaught promise rejection when SW file is absent (registration is wrapped in `.catch`)
- [ ] `pnpm turbo typecheck` passes
- [ ] Unit test covers: `registerSW` skips when `serviceWorker` not in navigator

---

### T2 — Live Sessions Completeness (P1)

#### T2-A: GraphQL Schema Extensions

**File:** `apps/subgraph-agent/src/live-sessions/live-sessions.graphql`

Add to the schema:

```graphql
extend type Mutation {
  endLiveSession(sessionId: ID!): EndLiveSessionResult! @authenticated
  joinLiveSession(sessionId: ID!): JoinLiveSessionResult! @authenticated
  cancelLiveSession(sessionId: ID!): CancelLiveSessionResult! @authenticated
}

extend type Query {
  sessionAttendees(sessionId: ID!, limit: Int, offset: Int): SessionAttendeesResult! @authenticated
}

type EndLiveSessionResult {
  sessionId: ID!
  status: String!
  endedAt: String!
  durationSeconds: Int
}

type JoinLiveSessionResult {
  sessionId: ID!
  roomUrl: String!
  role: String!
}

type CancelLiveSessionResult {
  sessionId: ID!
  status: String!
  cancelledAt: String!
}

type SessionAttendee {
  userId: ID!
  joinedAt: String!
  role: String!
}

type SessionAttendeesResult {
  attendees: [SessionAttendee!]!
  total: Int!
}
```

#### T2-B: Service Implementation

**File:** `apps/subgraph-agent/src/live-sessions/live-sessions.service.ts`

Implement the following methods (all follow the existing pattern with `withTenantContext`, Pino logging, and NATS event publishing):

**`endLiveSession(sessionId, tenantId, userId, userRole)`**
- Roles: INSTRUCTOR, ORG_ADMIN, SUPER_ADMIN
- Transition: LIVE → ENDED only (throw `BadRequestException` if current status is not LIVE)
- Set `endedAt = NOW()`
- Compute `durationSeconds` from `startedAt` to `endedAt`
- Publish `EDUSPHERE.sessions.ended` (reuse existing `publishSessionEnded`)
- Return: `{ sessionId, status: 'ENDED', endedAt, durationSeconds }`

**`joinLiveSession(sessionId, tenantId, userId, userRole)`**
- Any authenticated role (including STUDENT)
- Validate session `status === 'LIVE'` — throw `BadRequestException('Session is not live')` otherwise
- Record attendee row in `live_session_attendees` (or upsert) with `joinedAt = NOW()`
- Publish `EDUSPHERE.sessions.participant.joined` (reuse existing `publishParticipantJoined`)
- Return: `{ sessionId, roomUrl: buildRoomUrl(sessionId, tenantId), role: userRole }`
- `buildRoomUrl`: returns `${process.env['LIVEKIT_URL'] ?? 'https://meet.edusphere.dev'}/room/${sessionId}`

**`cancelLiveSession(sessionId, tenantId, userId, userRole)`**
- Roles: INSTRUCTOR, ORG_ADMIN, SUPER_ADMIN
- Transition: SCHEDULED → CANCELLED only (throw if not SCHEDULED)
- Set `cancelledAt = NOW()` on the row
- Publish `EDUSPHERE.sessions.cancelled`
- Return: `{ sessionId, status: 'CANCELLED', cancelledAt }`

**`getSessionAttendees(sessionId, tenantId, userId, userRole, limit, offset)`**
- Roles: INSTRUCTOR, ORG_ADMIN, SUPER_ADMIN only
- Query `live_session_attendees` with pagination
- Return `{ attendees: [...], total }`

#### T2-C: Rate Limiting for startLiveSession

**File:** `apps/subgraph-agent/src/live-sessions/live-sessions.resolver.ts` (or module)

Add a NestJS `ThrottlerGuard`-based check or an in-memory sliding window (Map with TTL) on `startLiveSession`:
- Max 5 calls per instructor per hour
- Key: `${tenantId}:${userId}`
- On exceed: throw `TooManyRequestsException` with message `"Maximum 5 sessions per hour per instructor"`
- The in-memory map MUST have a max-size guard (1000 entries, LRU eviction) per CLAUDE.md unbounded-Map rule
- The map MUST be cleared in `onModuleDestroy`

**Acceptance Criteria (T2 full):**
- [ ] `endLiveSession` transitions LIVE → ENDED only; idempotent `ENDED → ENDED` throws
- [ ] `joinLiveSession` returns a room URL for LIVE sessions; throws for non-LIVE sessions
- [ ] `cancelLiveSession` transitions SCHEDULED → CANCELLED only
- [ ] `getSessionAttendees` is paginated and INSTRUCTOR-only
- [ ] All 4 new operations publish the correct NATS event
- [ ] `startLiveSession` rate limiter: 6th call within 1 hour returns 429
- [ ] Rate limiter map cleaned in `onModuleDestroy`
- [ ] Unit tests cover all role authorization paths (forbidden for wrong role)
- [ ] Unit tests cover all invalid-state transitions (bad status → exception)
- [ ] `pnpm turbo typecheck` passes with 0 errors
- [ ] `pnpm turbo lint` passes with 0 warnings

---

### T3 — Offline Sync (P1)

#### T3-A: Auto-flush on Reconnect

**File:** `apps/web/src/hooks/useOfflineQueue.ts`

The hook must accept an optional `onReconnect` callback that is called when the browser fires the `online` event. Internally, the hook registers a single `window.addEventListener('online', ...)` listener and removes it on unmount.

**Interface extension:**

```typescript
export interface OfflineQueueOptions {
  onReconnect?: (flush: OfflineQueue['flush']) => void;
}

export function useOfflineQueue(options?: OfflineQueueOptions): OfflineQueue
```

Internal implementation:

```typescript
useEffect(() => {
  if (!options?.onReconnect) return;
  const handler = () => options.onReconnect!(flush);
  window.addEventListener('online', handler);
  return () => window.removeEventListener('online', handler);
}, [flush, options?.onReconnect]);
```

#### T3-B: 48-Hour TTL Eviction

The `readQueue()` function must filter out items where `Date.now() - item.createdAt > 48 * 60 * 60 * 1000` before returning. This eviction runs on every queue read, preventing stale items from accumulating across sessions.

```typescript
const TTL_MS = 48 * 60 * 60 * 1000;

function readQueue(): QueuedItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as QueuedItem[];
    const now = Date.now();
    return parsed.filter((item) => now - item.createdAt < TTL_MS);
  } catch {
    return [];
  }
}
```

After filtering, write the pruned list back to localStorage so stale items do not accumulate.

#### T3-C: SkillTreePage UUID Validation Mount Guard

**File:** `apps/web/src/pages/SkillTreePage.tsx` (or wherever the page component is)

The `courseId` URL param must be validated as a UUID before the skill tree query fires. If invalid, show an error state without making a network request.

```typescript
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const { courseId } = useParams<{ courseId: string }>();
const isValidCourseId = courseId ? UUID_RE.test(courseId) : false;

const [skillTreeResult] = useQuery({
  query: SKILL_TREE_QUERY,
  variables: { courseId: courseId ?? '' },
  pause: !isValidCourseId,
});

if (!isValidCourseId) {
  return <ErrorState message="Invalid course ID format" />;
}
```

**Acceptance Criteria (T3 full):**
- [ ] `useOfflineQueue` listens to `online` event only when `onReconnect` option is provided
- [ ] `online` listener is removed on component unmount (no memory leak)
- [ ] Memory test: `unmount()` of hook calls `removeEventListener` (verified via spy)
- [ ] Items older than 48h are evicted from `readQueue()` and not written back
- [ ] TTL unit test: enqueue item with `createdAt = Date.now() - 49 * 3600 * 1000`, read queue, assert item is absent
- [ ] SkillTreePage with non-UUID `courseId` renders error state, fires 0 network requests
- [ ] SkillTreePage with valid UUID fires the query

---

### T4 — Skill Tree Real Data (P1)

#### T4-A: AGE Cypher Edge Traversal

**File:** `apps/subgraph-knowledge/src/graph/skill-tree.service.ts`

Replace the linear-chain edge fallback with a real Apache AGE `PREREQUISITE_OF` edge query. The Cypher query must run through `withTenantContext` and use the existing `tx.execute(sql`...`)` pattern.

```sql
SELECT * FROM cypher('edusphere_graph', $$
  MATCH (a:Concept)-[:PREREQUISITE_OF]->(b:Concept)
  WHERE a.tenant_id = $tenantId
  RETURN a.id AS source_id, b.id AS target_id
$$, $1) AS (source_id agtype, target_id agtype)
```

Where `$1` is `JSON.stringify({ tenantId })` passed as the `params` argument to the AGE query helper.

If the AGE query fails (extension not loaded, graph not initialized), fall back to the existing linear-chain topology and log a warning at `warn` level with `[SkillTreeService] AGE unavailable — using linear chain fallback`.

#### T4-B: Drizzle Query for user_skill_mastery

The existing service already queries `user_skill_mastery` via raw SQL. Replace with a proper Drizzle query using the `schema.userSkillMastery` table (assuming migration 0011 created it and the Drizzle schema exports it). If the schema is not yet exported from `packages/db/src/schema/index.ts`, add the export.

**Acceptance Criteria (T4 full):**
- [ ] AGE Cypher traversal is attempted first; linear chain used only as fallback
- [ ] Fallback is logged at `warn` with `[SkillTreeService]` prefix and `tenantId`/`courseId` context
- [ ] `user_skill_mastery` query uses Drizzle schema reference (not raw SQL string)
- [ ] Integration test: seed 3 concepts with PREREQUISITE_OF edges in AGE, call `getSkillTree`, assert edges match AGE data
- [ ] Integration test: seed 2 mastery rows, assert returned nodes have correct `masteryLevel`
- [ ] TypeScript: 0 errors, 0 `any` casts

---

### T5 — Accessibility (P2)

#### T5-A: LiveSessionsPage Tab ARIA

**File:** `apps/web/src/pages/LiveSessionsPage.tsx`

The tab container already has `role="tablist"` and each button has `role="tab"` and `aria-selected`. Verify and add missing attributes:
- `aria-controls="tab-panel-upcoming"` / `aria-controls="tab-panel-past"` on each tab button
- `id="tab-upcoming"` / `id="tab-past"` on each tab button
- The tab panel div must have `role="tabpanel"`, `id="tab-panel-upcoming"` (or `"tab-panel-past"`), `aria-labelledby="tab-upcoming"` (or `"tab-past"`)
- Keyboard: `ArrowLeft`/`ArrowRight` keys cycle focus between tabs

#### T5-B: AdminActivityFeed aria-live

**File:** wherever `AdminActivityFeed` is rendered (likely `apps/web/src/components/AdminActivityFeed.tsx`)

The auto-refreshing feed container must have `aria-live="polite"` and `aria-atomic="false"` so screen readers announce new items without re-reading the whole list.

#### T5-C: SkillTreePage Suspense Wrapper

**File:** `apps/web/src/router.tsx` (or wherever the route is registered)

Wrap the `SkillTreePage` lazy import in a `<Suspense fallback={<PageSkeleton />}>` boundary. This prevents the entire router from crashing if the chunk fails to load.

```typescript
const SkillTreePage = lazy(() =>
  import('./pages/SkillTreePage').then((m) => ({ default: m.SkillTreePage }))
);

// In route definition:
{
  path: '/skill-tree/:courseId',
  element: (
    <Suspense fallback={<PageSkeleton />}>
      <SkillTreePage />
    </Suspense>
  ),
}
```

**Acceptance Criteria (T5 full):**
- [ ] axe-core report: 0 critical violations on LiveSessionsPage tabs (both tabs rendered)
- [ ] `aria-controls`/`aria-labelledby` pairing passes automated ARIA validator
- [ ] Keyboard: tabbing to tab list, ArrowRight moves focus to next tab and activates it
- [ ] AdminActivityFeed has `aria-live="polite"` (verified by DOM query in unit test)
- [ ] SkillTreePage has `<Suspense>` wrapper in router; chunk load error shows fallback, not blank page
- [ ] Playwright E2E: navigate to `/skill-tree/invalid-id` — error state visible, no network request fired

---

## 4. API Contracts

### 4.1 New Mutations

#### `endLiveSession`

```graphql
mutation EndLiveSession($sessionId: ID!) {
  endLiveSession(sessionId: $sessionId) {
    sessionId
    status      # "ENDED"
    endedAt     # ISO 8601
    durationSeconds
  }
}
```

**Authorization:** `@authenticated` + role check in resolver (INSTRUCTOR | ORG_ADMIN | SUPER_ADMIN)
**Error codes:**
- `FORBIDDEN` — caller lacks required role
- `NOT_FOUND` — session not found for tenant
- `BAD_USER_INPUT` — session is not in LIVE status

#### `joinLiveSession`

```graphql
mutation JoinLiveSession($sessionId: ID!) {
  joinLiveSession(sessionId: $sessionId) {
    sessionId
    roomUrl     # wss://... or https://...
    role        # caller's role string
  }
}
```

**Authorization:** `@authenticated` (any role)
**Error codes:**
- `NOT_FOUND` — session not found for tenant
- `BAD_USER_INPUT` — session is not LIVE (`"Session is not live"`)

#### `cancelLiveSession`

```graphql
mutation CancelLiveSession($sessionId: ID!) {
  cancelLiveSession(sessionId: $sessionId) {
    sessionId
    status       # "CANCELLED"
    cancelledAt  # ISO 8601
  }
}
```

**Authorization:** `@authenticated` + role check (INSTRUCTOR | ORG_ADMIN | SUPER_ADMIN)
**Error codes:**
- `FORBIDDEN`
- `NOT_FOUND`
- `BAD_USER_INPUT` — session is not in SCHEDULED status

### 4.2 New Query

#### `sessionAttendees`

```graphql
query SessionAttendees($sessionId: ID!, $limit: Int, $offset: Int) {
  sessionAttendees(sessionId: $sessionId, limit: $limit, offset: $offset) {
    attendees {
      userId
      joinedAt
      role
    }
    total
  }
}
```

**Authorization:** `@authenticated` + role check (INSTRUCTOR | ORG_ADMIN | SUPER_ADMIN)
**Pagination defaults:** `limit: 20`, `offset: 0`, max limit: 100

### 4.3 NATS Events

| Event | Subject | Payload |
|-------|---------|---------|
| Session ended | `EDUSPHERE.sessions.ended` | `{ sessionId, tenantId, endedAt, durationSeconds }` |
| Participant joined | `EDUSPHERE.sessions.participant.joined` | `{ sessionId, tenantId, userId }` |
| Session cancelled | `EDUSPHERE.sessions.cancelled` | `{ sessionId, tenantId, cancelledAt }` |

All events use `StringCodec` JSON encoding. All streams must have `max_age` and `max_bytes` declared per CLAUDE.md infrastructure rules.

---

## 5. Security Considerations

### SI-3 (PII Encryption) — Migration 0012

The rename to `_enc` suffix makes the encryption intent explicit in the column name. The service layer must not read these columns directly into response DTOs. The `joinLiveSession` response returns a generated room URL — it never returns the attendee or moderator password to any caller.

### SI-9 (Cross-tenant queries)

All new service methods must use `withTenantContext(tenantId, userId, role, fn)`. The `sessionAttendees` query must validate that the `sessionId` belongs to the calling tenant before returning results — do not trust the session ID alone.

### Rate Limiting (startLiveSession)

The in-memory sliding window map:
- Key: `${tenantId}:${userId}` (tenant-scoped to prevent cross-tenant key collisions)
- Value: `Array<number>` of timestamps, max last 5 entries, pruned to last 1h on each access
- Max map size: 1000 entries with insertion-order LRU eviction
- The map reference is a class field cleared in `onModuleDestroy`

### Input Validation

All new mutations must validate `sessionId` as a UUID string before querying the database (Zod schema: `z.string().uuid()`). Invalid UUIDs throw `BadRequestException` before any DB round-trip.

---

## 6. Database Changes

### Migration 0012 — live_session_enc_columns

```sql
-- Idempotent rename with existence check
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'live_sessions' AND column_name = 'attendee_password'
  ) THEN
    ALTER TABLE live_sessions
      RENAME COLUMN attendee_password TO attendee_password_enc;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'live_sessions' AND column_name = 'moderator_password'
  ) THEN
    ALTER TABLE live_sessions
      RENAME COLUMN moderator_password TO moderator_password_enc;
  END IF;
END $$;

-- Add cancelledAt column if not present
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'live_sessions' AND column_name = 'cancelled_at'
  ) THEN
    ALTER TABLE live_sessions ADD COLUMN cancelled_at TIMESTAMPTZ;
  END IF;
END $$;

-- Create live_session_attendees if not present
CREATE TABLE IF NOT EXISTS live_session_attendees (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id  UUID NOT NULL REFERENCES live_sessions(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL,
  tenant_id   UUID NOT NULL,
  joined_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  role        TEXT NOT NULL DEFAULT 'STUDENT',
  UNIQUE (session_id, user_id)
);

ALTER TABLE live_session_attendees ENABLE ROW LEVEL SECURITY;

CREATE POLICY live_session_attendees_tenant_isolation
  ON live_session_attendees
  USING (tenant_id::text = current_setting('app.current_tenant', TRUE));
```

---

## 7. Test Requirements

### Unit Tests Required

| File | Tests |
|------|-------|
| `live-sessions.service.spec.ts` | `endLiveSession`: correct transition, forbidden role, wrong-status error; `joinLiveSession`: returns roomUrl, non-LIVE error; `cancelLiveSession`: correct transition, wrong-status error; `getSessionAttendees`: pagination, INSTRUCTOR-only |
| `live-sessions.service.spec.ts` (rate limit) | 5 calls succeed, 6th throws `TooManyRequestsException`; map evicts at 1001 entries; `onModuleDestroy` clears map |
| `useOfflineQueue.test.ts` | `online` event triggers `onReconnect`; `removeEventListener` called on unmount; items older than 48h evicted; items exactly 47h59m old retained |
| `pwa.test.ts` | `registerSW` no-ops when `serviceWorker` not in navigator; calls `register('/sw.js')` when available |
| `SkillTreePage.test.tsx` | Invalid courseId shows error, no query fired; valid UUID fires query |
| `skill-tree.service.spec.ts` | AGE edges returned when graph available; falls back to linear chain on AGE error; mastery levels match DB rows |

### Playwright E2E Tests Required

| Spec | Scenario | Assertion |
|------|----------|-----------|
| `live-sessions.spec.ts` | Instructor ends a LIVE session | Status badge changes to "Ended"; `endLiveSession` mutation fired |
| `live-sessions.spec.ts` | Student joins a LIVE session | Redirected to room URL; `joinLiveSession` mutation fired |
| `live-sessions.spec.ts` | Instructor cancels a SCHEDULED session | Session disappears from upcoming list |
| `live-sessions.spec.ts` | Tab keyboard navigation | ArrowRight moves to "Past" tab; tabpanel content updates |
| `offline-queue.spec.ts` | Enqueue mutation offline, reconnect | `onReconnect` fires flush; mutation replayed |
| `skill-tree.spec.ts` | Navigate to `/skill-tree/not-a-uuid` | Error state visible; 0 GraphQL requests |
| `skill-tree.spec.ts` | Navigate to `/skill-tree/<valid-uuid>` | Nodes rendered with mastery indicators |

### Memory Tests Required

| File | Coverage |
|------|----------|
| `useOfflineQueue.memory.test.ts` | `unmount()` removes `online` listener (spy on `removeEventListener`) |
| `live-sessions.service.memory.spec.ts` | `onModuleDestroy` clears rate-limit map and drains NATS |

---

## 8. Dependency Order

```
T1-A (migration) ──► T2-B (service) ──► T2-A (schema) ──► T2-C (rate limit)
T1-B (husky) ─────────────────────────────────────────────────────────────────► CI gates pass
T1-C (SW) ──────► T3-A (online listener) ──► T3-B (TTL eviction)
                  T3-C (UUID guard) [independent]
T4-A (AGE query) + T4-B (Drizzle schema) [parallel, both depend on T1-A migration being applied]
T5-A + T5-B + T5-C [all independent, can run in parallel with T2-T4]
```

Recommended parallel execution plan:
- **Agent-1:** T1-A + T1-B + T1-C (blockers, sequential within agent)
- **Agent-2:** T2 (after T1-A lands)
- **Agent-3:** T3 (independent)
- **Agent-4:** T4 (after T1-A lands, can run parallel with T2)
- **Agent-5:** T5 (fully independent)

---

## 9. Acceptance Criteria Summary

A task is done when ALL of the following pass:

1. `pnpm turbo test --filter=<affected-package>` — 100% pass, 0 failures
2. `pnpm turbo typecheck` — 0 errors
3. `pnpm turbo lint` — 0 warnings
4. `pnpm --filter @edusphere/web test:e2e` — all new Playwright specs pass
5. `./scripts/health-check.sh` — all services healthy
6. `pnpm --filter @edusphere/db migrate` — migration 0012 applied without error
7. All 5 test users authenticate successfully (see CLAUDE.md credentials)
8. `OPEN_ISSUES.md` updated with Phase 28 task statuses

---

*Last updated: 2026-03-06 | Phase 28 | EduSphere v1.0.0*
