# Database Schema Change Propagation Checklist

> **Purpose:** Ensures that every database schema change propagates correctly through
> all layers of the EduSphere stack. A missed step can cause silent runtime failures.

---

## When to Use This Checklist

Use this checklist for ANY change to `packages/db/src/schema/*.ts` that affects:
- Column additions, renames, or removals
- Type changes (e.g., `text` → `varchar`, `integer` → `bigint`)
- New tables or dropped tables
- Index changes (HNSW, btree, unique)
- RLS policy changes

---

## Propagation Steps

### 1. Schema Layer (`packages/db/`)

- [ ] Update Drizzle schema file in `packages/db/src/schema/`
- [ ] Run `pnpm --filter @edusphere/db generate` to create migration
- [ ] Verify migration SQL is correct (check `packages/db/drizzle/` output)
- [ ] Run `pnpm --filter @edusphere/db migrate` to apply locally
- [ ] If table has RLS: update policy in schema file + add/update RLS test
- [ ] If new table: add `withRLS()` and create RLS test file
- [ ] Update `packages/db/src/schema/index.ts` barrel export if new file

### 2. GraphQL SDL Layer (`apps/subgraph-*/src/`)

- [ ] Update the owning subgraph's `.graphql` SDL file
- [ ] If new type/field: add resolver implementation
- [ ] If renamed field: update SDL + resolver + any `@key` stubs in other subgraphs
- [ ] If removed field: mark `@deprecated` first, remove in next version

### 3. Resolver Layer

- [ ] Update resolver to use new column name / type
- [ ] Update Zod validation schema if mutation inputs changed
- [ ] Update service layer if business logic affected
- [ ] Add/update unit tests for resolver

### 4. Gateway Composition

- [ ] Run `pnpm --filter @edusphere/gateway compose` — must succeed
- [ ] Commit updated `supergraph.graphql` if it changed
- [ ] Run `pnpm --filter @edusphere/gateway schema:check` for breaking changes

### 5. GraphQL Codegen

- [ ] Run `pnpm codegen` to regenerate `packages/graphql-types/`
- [ ] Verify `git diff packages/graphql-types/` shows expected changes
- [ ] Commit regenerated types

### 6. Frontend Layer (`apps/web/`)

- [ ] Update GraphQL queries/mutations in `apps/web/src/lib/graphql/`
- [ ] Update any components that reference changed fields
- [ ] Update any TypeScript types that reference the changed schema
- [ ] Run `pnpm --filter @edusphere/web test` to catch type errors

### 7. Mobile Layer (`apps/mobile/`)

- [ ] Update GraphQL queries in mobile app if it uses the changed type
- [ ] Run `pnpm --filter @edusphere/mobile test`

### 8. Seed Data

- [ ] Update `packages/db/src/seed.ts` if new columns need seed values
- [ ] Verify `pnpm --filter @edusphere/db seed` succeeds

### 9. Documentation

- [ ] Update `docs/database/DATABASE_SCHEMA.md` if table structure changed
- [ ] Update `API_CONTRACTS_GRAPHQL_FEDERATION.md` if GraphQL types changed
- [ ] Update `OPEN_ISSUES.md` if change is related to a tracked issue

### 10. Verification

- [ ] `pnpm turbo typecheck` — 0 errors
- [ ] `pnpm turbo test` — all pass
- [ ] `pnpm test:security` — RLS tests pass
- [ ] `pnpm --filter @edusphere/gateway compose` — supergraph valid

---

## Common Failure Modes

| Failure | Root Cause | Prevention |
|---------|-----------|-----------|
| `column "old_name" does not exist` | Resolver references old column name | Step 3: update resolver |
| `Cannot query field "x" on type "Y"` | SDL not updated after schema change | Step 2: update SDL |
| `Type 'X' is not assignable to type 'Y'` | Codegen not re-run after SDL change | Step 5: run codegen |
| `Federation composition failed` | `@key` stub references removed field | Step 2: update stubs |
| `RLS violation` | New table missing RLS policy | Step 1: add withRLS() |

---

## Rollback Protocol

If a schema change causes issues after deployment:

1. **Do NOT** drop the migration — this loses data
2. Create a new reverse migration: `pnpm --filter @edusphere/db generate`
3. Apply the reverse migration
4. Revert SDL, resolver, codegen, and frontend changes
5. Document in `OPEN_ISSUES.md` why the change was reverted

---

*Last updated: March 2026 — Enterprise Audit Wave 6*
