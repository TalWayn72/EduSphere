# GraphQL Query Hardening

**Phase 7.3 -- Production Query Security**  
**Version:** 1.0 | **Last Updated:** 2026-02-22  
**SOC2:** CC6.6, CC6.7 | **API Contract:** MAX_DEPTH=10, MAX_COMPLEXITY=1000

---

## Overview

EduSphere GraphQL gateway implements multiple layers of query hardening to prevent:
- **DoS attacks** via deeply nested or computationally expensive queries
- **Data exfiltration** via overly broad queries
- **Abuse** via excessive API usage

---
## 1. Query Depth Limiting (G-10)

**Implementation:** `apps/gateway/src/middleware/query-complexity.ts` -- `depthLimitRule()`

**Default limit:** `MAX_DEPTH = 10` (configurable via `GRAPHQL_MAX_DEPTH` env var)

```graphql
# Rejected query (depth = 12, exceeds limit of 10):
{ user { courses { lessons { annotations { author { courses { lessons { annotations { author { courses { id } } } } } } } } } } }
```

Error response: `Query depth 12 exceeds maximum allowed depth of 10`

---

## 2. Query Complexity Limiting (G-10)

**Implementation:** `apps/gateway/src/middleware/query-complexity.ts` -- `complexityLimitRule()`

**Default limit:** `MAX_COMPLEXITY = 1000` (configurable via `GRAPHQL_MAX_COMPLEXITY` env var)

**Complexity scoring:**
- Each field: 1 complexity unit
- List fields (name ends with "s"): subtree cost x10 multiplier
- Prevents worst-case cardinality attacks

```typescript
// { courses { id title } } = 21 complexity units
// (courses is list: 1 + (1+1)*10 = 21)
```

---
## 3. Rate Limiting (G-09)

**Implementation:** `apps/gateway/src/middleware/rate-limit.ts`

**Limits:**
| Tier | Limit | Window |
|------|-------|--------|
| Per IP (unauthenticated) | 60 req/min | 1 minute |
| Per tenant (authenticated) | 1000 req/min | 1 minute |
| Mutation operations | 30 req/min | 1 minute |

**Response on limit exceeded:** HTTP 429 with `Retry-After` header

---

## 4. CORS Security (SI-2)

**Implementation:** `apps/gateway/src/index.ts`

```typescript
cors: {
  // Fail-closed: empty array if CORS_ORIGIN not set
  origin: process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(",").map(o => o.trim())
    : [], // NEVER wildcard in production
  credentials: true,
}
```

**Production configuration:**
```bash
# apps/gateway/.env (production)
CORS_ORIGIN=https://app.edusphere.dev,https://tenant1.edusphere.dev
```

No wildcard (`*`) CORS is possible -- fail-closed empty array prevents
all cross-origin requests if `CORS_ORIGIN` is not configured.

---
## 5. Persisted Queries (Phase 7.3 -- Planned)

**Goal:** Allow only pre-registered query hashes in production, rejecting
arbitrary GraphQL from untrusted clients.

**Approach:** Hive Gateway APQ (Automatic Persisted Queries):
1. Client sends persistedQuery extension with sha256Hash
2. Gateway looks up hash in registry
3. Unknown hashes return 404 (first request), client sends full query
4. Full query registered in hash store for future use

**Status:** Planned; currently all authenticated queries allowed.

**Future implementation:** `apps/gateway/src/persisted-queries/registry.ts`

---

## 6. Schema Validation (schema-lint)

`apps/gateway/tests/schema-lint.test.ts` validates:
- All mutations use `@authenticated` directive
- Sensitive mutations use `@requiresScopes`
- Admin mutations use `@requiresRole`
- No `@deprecated` fields in active use without migration path

---

## 7. Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `GRAPHQL_MAX_DEPTH` | `10` | Maximum query nesting depth |
| `GRAPHQL_MAX_COMPLEXITY` | `1000` | Maximum query complexity score |
| `CORS_ORIGIN` | (fail-closed) | Comma-separated allowed origins |
| `RATE_LIMIT_MAX` | `1000` | Requests per window per tenant |

---

## 8. Testing

```bash
# Run all security tests
pnpm test:security

# Run gateway-specific hardening tests
pnpm --filter @edusphere/gateway test

# Run query hardening static analysis
pnpm vitest run tests/security/query-hardening.spec.ts --reporter=verbose
```