# Phase 28 Security Audit Report

**Auditor:** Security & Compliance Division (Division 8)
**Date:** 2026-03-06
**Scope:** All new/modified files introduced in Phase 28

---

## Files Audited

### Backend
- `apps/subgraph-agent/src/live-sessions/live-sessions.service.ts`
- `apps/subgraph-agent/src/live-sessions/live-sessions.resolver.ts`
- `apps/subgraph-knowledge/src/graph/skill-tree.service.ts`

### Frontend
- `apps/web/src/hooks/useOfflineQueue.ts`
- `apps/web/src/pages/SkillTreePage.tsx`

---

## Findings Summary

| Severity | Count |
|----------|-------|
| HIGH     | 0     |
| MEDIUM   | 3     |
| LOW      | 1     |
| INFO     | 2     |

---

## Per-File Audit Results

---

### `apps/subgraph-agent/src/live-sessions/live-sessions.service.ts`

| Check | Result | Notes |
|-------|--------|-------|
| SI-1: RLS var `app.current_user_id` | N/A | No raw SQL / `current_setting` calls in this file |
| SI-3: No plaintext PII stored | PASS | Service stores no PII fields; passwords not handled here |
| SI-9: All DB queries via `withTenantContext()` | FAIL (MEDIUM) | See Finding M-1 below |
| OWASP A1: SQL injection — Drizzle only | PASS | All DB access via Drizzle ORM with parameterized bindings |
| NATS (SI-7): TLS + authenticator | FAIL (MEDIUM) | See Finding M-2 below |
| Memory safety: `OnModuleDestroy` | PASS | Drains NATS, calls `closeAllPools()` |
| Rate limiting on `startLiveSession` | FAIL (LOW) | See Finding L-1 below |
| No raw `new Pool()` (SI-8) | PASS | Uses `createDatabaseConnection()` from `@edusphere/db` |

#### Finding M-1 (MEDIUM): DB queries not wrapped in `withTenantContext()`

**File:** `apps/subgraph-agent/src/live-sessions/live-sessions.service.ts:94-103`

**Issue:** The `startLiveSession` method performs a `db.update(schema.liveSessions).where(and(...))` call directly on the raw `this.db` connection without using `withTenantContext()`. CLAUDE.md SI-9 mandates that every tenant-scoped DB query use the `withTenantContext()` wrapper to set the `SET LOCAL app.current_tenant` session variable, which is required for Row Level Security enforcement. The current implementation relies solely on the Drizzle `WHERE` clause for tenant isolation, which means RLS policies are NOT active for this query — if a policy were misconfigured or missing, cross-tenant data leakage would be possible.

**Risk:** If the `live_sessions` RLS policy is disabled or misconfigured in any environment, the tenant isolation in `startLiveSession` depends only on the Drizzle `WHERE (tenant_id = $1)` clause — which is correct but not defense-in-depth.

**Recommendation:** Wrap the DB update in `withTenantContext(this.db, { tenantId, userId, userRole }, async (tx) => { ... })`. This requires importing `withTenantContext` and `toUserRole` from `@edusphere/db`.

**Status:** OPEN — fix required before production deployment.

---

#### Finding M-2 (MEDIUM): NATS connection lacks TLS and authenticator (SI-7 violation)

**File:** `apps/subgraph-agent/src/live-sessions/live-sessions.service.ts:46`

```typescript
this.natsConn = await connect({ servers: url });
```

**Issue:** The NATS connection is established with a bare `{ servers: url }` options object — no `tls` configuration, no `authenticator`. CLAUDE.md SI-7 mandates: `connect({ servers, tls, authenticator })`. In a development environment this may be acceptable, but the code path has no guard for `NODE_ENV`. If deployed to production without additional configuration, NATS messages (including session events) would travel unencrypted and unauthenticated.

**Recommendation:** Add environment-aware TLS and authenticator:
```typescript
this.natsConn = await connect({
  servers: url,
  ...(process.env['NODE_ENV'] === 'production' && {
    tls: { caFile: process.env['NATS_CA_CERT'] },
    authenticator: credsAuthenticator(
      new TextEncoder().encode(process.env['NATS_CREDS'])
    ),
  }),
});
```

**Status:** OPEN — required before production deployment.

---

### `apps/subgraph-agent/src/live-sessions/live-sessions.resolver.ts`

| Check | Result | Notes |
|-------|--------|-------|
| SI-1: RLS var `app.current_user_id` | N/A | No raw SQL in resolver |
| SI-3: No plaintext PII | PASS | Resolver logs userId/sessionId only — no password or email in logs |
| SI-9: withTenantContext | N/A | Resolver delegates to service (see Finding M-1) |
| Auth guard: unauthenticated requests rejected | PASS | `extractAuthContext` throws `UnauthorizedException` when `authContext` is absent |
| Role enforcement | PASS | Role check delegated to service; resolver passes `userRole` correctly |
| Input validation: sessionId | INFO | No UUID format validation at resolver layer; relies on DB returning NotFoundException for invalid IDs |
| Rate limiting on mutations | FAIL (LOW) | See Finding L-1 below |
| Error message leakage | PASS | NestJS exceptions produce standard HTTP status bodies; raw DB errors not propagated |

---

### `apps/subgraph-knowledge/src/graph/skill-tree.service.ts`

| Check | Result | Notes |
|-------|--------|-------|
| SI-1: RLS var `app.current_user_id` | N/A | No raw `current_setting` calls; service uses `withTenantContext()` |
| SI-3: No plaintext PII | PASS | Only `concept_id`, `mastery_level` stored — not PII |
| SI-9: withTenantContext() wrapping | PASS | Both `getSkillTree` and `updateMasteryLevel` fully wrapped in `withTenantContext()` |
| OWASP A1: SQL injection | PASS | All SQL via Drizzle `sql` template tag with parameterized `${value}` bindings; no string concatenation |
| Input validation: `courseId` parameter | FAIL (MEDIUM) | See Finding M-3 below |
| `toUserRole` validates role | PASS | Enum coercion prevents arbitrary role strings from reaching DB context |
| Memory safety | PASS | Stateless service; no intervals, subscriptions, or connections to close |
| Error handling: non-fatal fallback | PASS | `user_skill_mastery` table absence is caught and degraded gracefully |

#### Finding M-3 (MEDIUM): No UUID validation on `courseId` before use in SQL

**File:** `apps/subgraph-knowledge/src/graph/skill-tree.service.ts:83`

```typescript
AND (c.course_id = ${courseId}::uuid OR ${courseId} = 'all')
```

**Issue:** The `courseId` parameter is cast via `::uuid` in PostgreSQL, which will cause a `22P02 invalid input syntax for type uuid` DB error if a non-UUID value is passed. However:
1. The error is caught and degraded to an empty tree at the service level (line 88), meaning malformed UUIDs silently return empty data rather than a validation error.
2. The `'all'` bypass path (`OR ${courseId} = 'all'`) allows the literal string `'all'` to skip the UUID cast entirely. This is intentional but means any non-UUID input that equals `'all'` returns all-tenant concepts — which could be used to enumerate content if the caller is not properly restricted.
3. There is no input validation before the query: XSS payloads, path traversal strings, or oversized inputs are all passed directly to PostgreSQL (which safely rejects non-UUID inputs via the cast, but the error path silently swallows the rejection).

**Recommendation:** Add a UUID regex guard at the service entry points:
```typescript
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
if (courseId !== 'all' && !UUID_RE.test(courseId)) {
  throw new BadRequestException('Invalid courseId format');
}
```

**Status:** OPEN — medium priority; parameterized SQL prevents injection but silent failure path masks invalid input.

---

### `apps/web/src/hooks/useOfflineQueue.ts`

| Check | Result | Notes |
|-------|--------|-------|
| SI-1: N/A (frontend) | N/A | Frontend hook |
| SI-3: No PII in localStorage | INFO | `variables` field is caller-controlled; callers must not store secrets (documented in Phase 27 audit) |
| OWASP A3: `action.type` rendered as HTML/JSX | PASS | `operationName` is NOT rendered in JSX anywhere in this file; only passed to a handler |
| localStorage JSON injection | PASS | `JSON.parse` with try/catch; result is consumed as typed data, not `eval`'d or rendered as HTML |
| Memory safety: event listeners | PASS | Both `storage` and `online` listeners cleaned up in `useEffect` return |
| Unbounded queue | PASS | LRU eviction at 100 items |
| `console.info` in production code | FAIL (INFO) | Line 92: `console.info('[useOfflineQueue] auto-syncing item:', item.operationName)` — minor; does not expose secrets, but violates CLAUDE.md no-console rule |

**Note on OWASP A3 (XSS via localStorage restore):** The `operationName` field from the queue is NOT rendered as HTML or JSX in `useOfflineQueue.ts` itself. However, callers that display `operationName` in the UI must escape it. Current callers pass items to a `handler` function — no direct DOM rendering detected. Risk is LOW.

---

### `apps/web/src/pages/SkillTreePage.tsx`

| Check | Result | Notes |
|-------|--------|-------|
| SI-1: N/A (frontend) | N/A | Frontend page |
| SI-3: No PII stored | PASS | Only `courseId` and mastery levels handled; no PII |
| OWASP A3: XSS via `courseId` in DOM | PASS (INFO) | `courseId` from `useParams` is rendered only as React text node on line 189 (`Course: ${courseId}`); React auto-escapes — no raw HTML injection |
| Input validation: `courseId` UUID regex | FAIL (MEDIUM) | See Finding M-3 (shared with backend); SkillTreePage passes any `useParams` value directly to the GraphQL query without UUID validation |
| Error message leakage | PASS | Error states use generic user-facing messages; no `error.message` rendered directly |
| Mutation error exposure | PASS | `updateResult.error` renders generic "Failed to update mastery level" — no raw error internals |
| `console.error` in production | INFO | Line 160: `console.error('[SkillTreePage] updateMasteryLevel failed:', result.error.message)` — structured prefix present; acceptable for error observability |
| Auth guard | PASS | Page wrapped in `<Layout>` component which enforces authentication |
| Memory safety | PASS | No timers; urql `useQuery` paused until mounted (mounted guard pattern correct) |
| Optimistic update rollback | PASS | Mastery override reverted on mutation failure (line 163-168) |

---

## Finding L-1 (LOW): No rate limiting on `startLiveSession` / `endLiveSession` mutations

**Files:**
- `apps/subgraph-agent/src/live-sessions/live-sessions.resolver.ts` (all mutations)

**Issue:** The `startLiveSession` mutation has no per-user rate limit decorator (`@Throttle` or `@RateLimit`). A malicious instructor could call `startLiveSession` thousands of times per second, causing DB write load, NATS event storms, or exhausting connection pools. Gateway-level rate limiting applies globally per tenant/IP but does not enforce per-operation limits at the subgraph level.

**Recommendation:** Apply `@Throttle({ default: { limit: 10, ttl: 60000 } })` on `startLiveSession` and any other write mutations in the resolver.

**Status:** OPEN — low priority; gateway rate limiting provides partial mitigation.

---

## Security Invariants Checklist

| SI | Invariant | Status |
|----|-----------|--------|
| SI-1 | No `current_setting('app.current_user', TRUE)` | PASS — not used in any Phase 28 file |
| SI-2 | No `origin: '*'` CORS | PASS — no CORS config in Phase 28 files |
| SI-3 | PII fields not in plaintext | PASS — no PII credential fields in Phase 28 schema changes |
| SI-4 | Keycloak bruteForceProtected | N/A — no Keycloak config in Phase 28 |
| SI-5 | No `--insecure` curl / SSL bypass | PASS — no HTTP client code in Phase 28 files |
| SI-6 | No plain `http://` inter-service in prod | PASS — no inter-service URL config in Phase 28 files |
| SI-7 | NATS connects with TLS + authenticator | FAIL (MEDIUM) — `live-sessions.service.ts` uses bare `connect({ servers })` |
| SI-8 | No `new Pool()` / raw pg client | PASS — uses `createDatabaseConnection()` from `@edusphere/db` |
| SI-9 | All DB queries via `withTenantContext()` | FAIL (MEDIUM) — `live-sessions.service.ts` queries bypass `withTenantContext()` |
| SI-10 | No LLM calls without consent | N/A — no LLM calls in Phase 28 files |

---

## OWASP Top 10 Frontend Checks

| Check | Result |
|-------|--------|
| XSS — `dangerouslySetInnerHTML` | PASS — not used in any Phase 28 frontend file |
| XSS — user input rendered unsanitized | PASS — all strings rendered as React text nodes (auto-escaped) |
| XSS — `operationName` from localStorage rendered as HTML | PASS — not rendered in JSX |
| Injection — user input into GraphQL variables | PASS — typed GraphQL variables; no string concatenation into query body |
| Injection — `courseId` into SQL | PASS (backend) — PostgreSQL `::uuid` cast rejects invalid input; but silent failure path masks validation |
| Sensitive data exposure — error internals to UI | PASS — all error states use generic messages |
| Missing auth — unauthenticated GraphQL mutations | PASS — `extractAuthContext` throws `UnauthorizedException` |
| IDOR — cross-tenant session access | PASS — tenant ID from JWT (not request body) enforced in WHERE clause |

---

## Memory Safety Checks

| Component | Check | Result |
|-----------|-------|--------|
| `live-sessions.service.ts` | NATS drained in `onModuleDestroy` | PASS |
| `live-sessions.service.ts` | DB pools closed in `onModuleDestroy` | PASS |
| `skill-tree.service.ts` | No timers or subscriptions to clean up | PASS — stateless |
| `useOfflineQueue.ts` | `storage` listener cleaned up | PASS |
| `useOfflineQueue.ts` | `online` listener cleaned up | PASS |
| `useOfflineQueue.ts` | Queue bounded at 100 items | PASS |
| `SkillTreePage.tsx` | urql query paused until mounted | PASS |
| `SkillTreePage.tsx` | No timers or subscriptions | PASS |

---

## Open Items (Require Fix Before Production)

| ID | Severity | File | Description |
|----|----------|------|-------------|
| M-1 | MEDIUM | `live-sessions.service.ts` | Wrap DB update in `withTenantContext()` |
| M-2 | MEDIUM | `live-sessions.service.ts` | Add TLS + authenticator to NATS connection |
| M-3 | MEDIUM | `skill-tree.service.ts`, `SkillTreePage.tsx` | Add UUID regex validation for `courseId` before DB query |
| L-1 | LOW | `live-sessions.resolver.ts` | Add `@Throttle` rate limiting to write mutations |
| INFO-1 | INFO | `useOfflineQueue.ts:92` | Remove `console.info` from production code |
