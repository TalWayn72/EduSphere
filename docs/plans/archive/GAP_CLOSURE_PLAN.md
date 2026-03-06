# EduSphere Development Gap Closure Plan

> **IMPORTANT (CLAUDE.md §Document Storage Rule):** Immediately after plan approval, move this file to `docs/plans/gap-closure-plan.md` before starting any implementation. Run: `mv C:\Users\P0039217\.claude\plans\temporal-sniffing-wirth.md docs/plans/gap-closure-plan.md`

---

## Context

The PRD was updated from v1.0 → v2.0 (March 4, 2026) after a comprehensive audit revealed 24+ implemented features not documented. Simultaneously, a reverse audit of implemented code vs. PRD-planned features revealed **10 confirmed development gaps** across 3 categories:

- **Category A — Feature Gaps (5):** Features planned in PRD that have no implementation
- **Category B — Infrastructure Gaps (3):** Security/infra items documented but not deployed
- **Category C — Protocol Gap (1):** CLAUDE.md Bug Fix Protocol missing "variation search" in Wave 2
- **Track D — Deployment Verification:** End-to-end local environment validation post-implementation

All gaps were confirmed by grep (zero results for `forkCourse`, `savedSearch`, `persistedExchange`) and file-system checks. Every implementation track includes full unit + integration + E2E + visual regression tests. No gap is declared closed until ALL three discovery waves pass and grep shows zero recurrence patterns.

---

## Track C — Bug Fix Protocol Update (DO THIS FIRST — 5 minutes)

### Problem
CLAUDE.md Bug Fix Protocol Wave 2 says "Search for variations in OTHER pages/components" but does NOT explicitly mandate searching for **the same logic with different variable names, prop names, or implementation structure** (what the user calls "שוני מסויים" — slight variation).

### File to Modify
- `CLAUDE.md` — Section "Bug Fix Protocol → Phase 1 Discovery → Wave 2"

### Change
Replace current Wave 2 text with an explicit mandate to search for:
1. Same logic, identical variable names (exact copies)
2. Same logic, different variable names (e.g., `annotationList` vs `annotations` vs `notesList`)
3. Same logic, different prop names (e.g., `onError` vs `handleError` vs `onFailure`)
4. Same pattern in sibling/parallel pages (if `CoursePage.tsx` has the bug, check `LessonPage.tsx`, `ProgramPage.tsx`, etc.)
5. Same pattern in mobile `apps/mobile/` equivalent screens
6. Same pattern in backend services if the bug has a server-side analog

**Updated Wave 2 text (exact replacement):**
```
**Wave 2 — Variations in OTHER pages/components (MANDATORY — "שוני מסויים"):**
Search for the same logic implemented differently. This includes:
- Same hook/function with different variable names (e.g., `annotationList` vs `annotations` vs `notesList`)
- Same pattern with different prop signatures (e.g., `onError` vs `handleError` vs `onFailure`)
- Same anti-pattern in parallel/sibling pages (if bug is in CoursePage, check LessonPage, ProgramPage)
- Same bug in mobile screens (`apps/mobile/`) if web equivalent is affected
- Same backend pattern if bug has server-side analog (e.g., if missing try/catch in service A, check all sibling services)
Explicitly search:
- Every page in `apps/web/src/pages/`
- Every hook in `apps/web/src/hooks/`
- Every component in `apps/web/src/components/`
- Equivalent mobile screens in `apps/mobile/src/`
- Backend services/resolvers if the bug is server-side
Build the Discovery List — a numbered list of every affected file + the exact issue. The bug is NOT finished until EVERY item is fixed.
```

---

## Track A1 — Course Forking

### Problem
PRD §4.4 specifies "Course Forking/Remixing" (CON-13/14). There is no `forkCourse` method anywhere in the codebase.

### Files to Create/Modify

**Backend — `apps/subgraph-content/src/course/`:**

1. **`course.service.ts`** (MODIFY — add method)
   - Add `forkCourse(courseId: string, newOwnerId: string, tenantId: string): Promise<Course>`
   - Pattern: `withTenantContext(tenantId, newOwnerId, 'INSTRUCTOR', async () => { ... })`
   - Copy course record: set `forkedFromId = courseId`, `status = 'DRAFT'`, new UUID
   - Copy all modules (deep copy with new IDs)
   - Copy all lessons per module (deep copy with new IDs, `status = 'DRAFT'`)
   - Publish NATS event: `content.course.forked` with `{ originalCourseId, forkedCourseId, tenantId }`
   - Log: `this.logger.info({ courseId, forkedCourseId, tenantId }, '[CourseService] Course forked')`

2. **`course.resolver.ts`** (MODIFY — add mutation)
   - Add `forkCourse(courseId: ID!, @CurrentUser() user): Course` mutation
   - Directive: `@authenticated @requiresScopes(scopes: ["course:write"])`
   - Call `courseService.forkCourse(courseId, user.id, user.tenantId)`

3. **`course.schemas.ts`** (MODIFY — add Zod schema)
   - Add `ForkCourseSchema = z.object({ courseId: z.string().uuid() })`

**Database — `packages/db/src/schema/courses.ts`** (MODIFY):
- Add `forkedFromId: uuid('forked_from_id').references(() => courses.id)` column
- Run migration: `pnpm --filter @edusphere/db generate && pnpm --filter @edusphere/db migrate`

**GraphQL SDL — `apps/subgraph-content/src/course/course.graphql`** (MODIFY):
- Add `forkCourse(courseId: ID!): Course!` to `Mutation` type
- Add `forkedFromId: ID` field to `Course` type

**Frontend — `apps/web/src/pages/CourseDetailPage.tsx`** (MODIFY):
- Add "Fork Course" button visible to INSTRUCTOR+ roles
- On click: call `forkCourse` mutation, navigate to forked course editor
- Error handling: `role="alert"` banner with i18n key `courses:forkError`
- Loading state: disable button + spinner

**i18n — `packages/i18n/src/locales/en/courses.json` + `he/courses.json`** (MODIFY):
- Add keys: `forkCourse`, `forkCourseSuccess`, `forkError`, `forkedFrom`

### Tests Required

**Unit (`apps/subgraph-content/src/course/course.service.spec.ts`):**
- `forkCourse creates a new course with forkedFromId`
- `forkCourse copies all modules and lessons`
- `forkCourse sets forked course status to DRAFT`
- `forkCourse publishes NATS content.course.forked event`
- `forkCourse throws NotFoundException when source course not found`
- `forkCourse throws ForbiddenException when user lacks course:write scope`

**Unit (`apps/web/src/pages/CourseDetailPage.test.tsx`):**
- `Fork Course button visible to INSTRUCTOR role`
- `Fork Course button hidden from STUDENT role`
- `Fork Course success navigates to new course`
- `Fork Course error shows alert banner without raw error`

**E2E (`apps/web/e2e/course-fork.spec.ts`):**
- Fork a course → verify new course in list → verify `forkedFromId` set
- Fork button absent for STUDENT → confirm with `expect(button).not.toBeVisible()`
- Network error during fork → clean error UI (no raw GraphQL strings)
- Screenshot assertion: `expect(page).toHaveScreenshot('course-fork-success.png')`

---

## Track A2 — Saved Searches

### Problem
PRD §4.2 specifies "Saved Searches". `Search.tsx` exists but has no save functionality. No `SavedSearch` DB table, no backend service/resolver.

### Files to Create/Modify

**Database — `packages/db/src/schema/saved-searches.ts`** (CREATE):
```typescript
export const savedSearches = pgTable('saved_searches', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id),
  tenantId: uuid('tenant_id').notNull(),
  name: varchar('name', { length: 100 }).notNull(),
  query: text('query').notNull(),
  filters: jsonb('filters'),
  createdAt: timestamp('created_at').defaultNow(),
}).withRLS();
```
- Add RLS policy: user can only see their own saved searches
- Generate + apply migration

**Backend — `apps/subgraph-core/src/search/`** (CREATE directory + files):

1. **`saved-search.service.ts`** — `SavedSearchService` with:
   - `createSavedSearch(userId, tenantId, name, query, filters)`
   - `listSavedSearches(userId, tenantId): Promise<SavedSearch[]>`
   - `deleteSavedSearch(id, userId, tenantId)`
   - All wrapped in `withTenantContext()`
   - `OnModuleDestroy` for DB pool cleanup
   - Pino logger calls for all operations

2. **`saved-search.resolver.ts`** — mutations + queries:
   - `savedSearches: [SavedSearch!]!` — `@authenticated`
   - `createSavedSearch(input: CreateSavedSearchInput!): SavedSearch!` — `@authenticated @requiresScopes(scopes: ["search:write"])`
   - `deleteSavedSearch(id: ID!): Boolean!` — `@authenticated`

3. **`saved-search.graphql`** — SDL with `SavedSearch` type, `CreateSavedSearchInput`

4. **`saved-search.module.ts`** — NestJS module

**Frontend — `apps/web/src/pages/Search.tsx`** (MODIFY):
- Add "Save Search" button in search bar area
- On click: open modal to name the search, then call `createSavedSearch` mutation
- Add "My Saved Searches" sidebar panel showing `savedSearches` query results
- Click saved search → populate filters + query → run search
- Delete saved search button per item

**i18n keys in `en/common.json` + `he/common.json`:** `saveSearch`, `savedSearches`, `deleteSavedSearch`, `savedSearchSuccess`

### Tests Required

**Unit (`apps/subgraph-core/src/search/saved-search.service.spec.ts`):**
- `createSavedSearch persists with correct userId + tenantId`
- `listSavedSearches returns only current user's searches`
- `deleteSavedSearch succeeds for owner, throws for non-owner`
- `OnModuleDestroy calls closeAllPools`

**Unit (`apps/web/src/pages/Search.test.tsx`):**
- `Save Search button visible after typing query`
- `Save Search opens naming modal`
- `Saved Searches panel lists saved items`
- `Clicking saved search populates filters`
- `Delete saved search removes from list`

**E2E (`apps/web/e2e/saved-search.spec.ts`):**
- Full save → list → restore → delete flow
- Cross-user isolation: user A cannot see user B's saved searches
- Screenshot: `expect(page).toHaveScreenshot('saved-searches-panel.png')`

---

## Track A3 — KnowledgeGraphPage Standalone Route

### Problem
`apps/web/src/pages/KnowledgeGraph.test.tsx` tests exist for a page called `KnowledgeGraphPage` but the component is not in `App.tsx` routes and the standalone page component is missing.

### Files to Create/Modify

**Frontend — `apps/web/src/pages/KnowledgeGraphPage.tsx`** (CREATE):
- Thin wrapper around existing `<KnowledgeGraph />` component
- Add page-level breadcrumb nav: `Dashboard > Knowledge Graph`
- URL params: optional `?courseId=` to pre-filter
- Error boundary wrapping `<KnowledgeGraph />`
- Loading skeleton using `<Skeleton />` from shadcn/ui
- Page title: `{t('knowledge:graphTitle')}`

**Frontend — `apps/web/src/App.tsx`** (MODIFY):
- Add route: `<Route path="/knowledge-graph" element={<KnowledgeGraphPage />} />`
- Add route: `<Route path="/knowledge-graph/:courseId" element={<KnowledgeGraphPage />} />`
- Lazy-load: `const KnowledgeGraphPage = lazy(() => import('./pages/KnowledgeGraphPage'))`

**Frontend — `apps/web/src/components/Sidebar.tsx` or Nav** (MODIFY if exists):
- Add "Knowledge Graph" nav item with icon, linking to `/knowledge-graph`
- Visible to INSTRUCTOR+ roles

**i18n — `packages/i18n/src/locales/en/knowledge.json` + `he/knowledge.json`** (MODIFY):
- Add `graphTitle: "Knowledge Graph"`, `graphPageBreadcrumb: "Knowledge Graph"`

### Tests Required

**Unit (`apps/web/src/pages/KnowledgeGraph.test.tsx`)** (UPDATE existing):
- `renders KnowledgeGraphPage with breadcrumb`
- `passes courseId param to KnowledgeGraph component`
- `shows error boundary on KnowledgeGraph crash`
- `nav item visible to INSTRUCTOR, hidden to STUDENT`

**E2E (`apps/web/e2e/knowledge-graph.spec.ts`):**
- Navigate to `/knowledge-graph` → page renders
- Navigate to `/knowledge-graph/course-123` → graph filtered
- Screenshot: `expect(page).toHaveScreenshot('knowledge-graph-page.png')`

---

## Track A4 — K-means Topic Clustering Algorithm

### Problem
`apps/subgraph-knowledge/src/graph/cypher-topic-cluster.service.ts` provides CRUD for `TopicCluster` nodes in Apache AGE but has no clustering algorithm. PRD §4.6 specifies k-means clustering for topic discovery.

### Files to Create

**`apps/subgraph-knowledge/src/graph/topic-cluster-kmeans.service.ts`** (CREATE):
- `clusterConceptsByCourse(courseId: string, k: number, tenantId: string): Promise<TopicCluster[]>`
- Algorithm:
  1. Fetch all concepts for course (from `pgvector` — 768-dim embeddings via `SELECT * FROM concepts WHERE course_id = $1`)
  2. Run k-means on embeddings using pure TypeScript implementation (no external ML deps to avoid bundle bloat):
     - Initialize centroids: k-means++ initialization for better convergence
     - Iterate: assign each concept to nearest centroid (cosine similarity)
     - Update centroids: mean of assigned points
     - Stop: when assignments don't change or max 100 iterations
  3. Name each cluster: use centroid's 3 nearest concept names as cluster label
  4. Persist clusters to Apache AGE via `cypher-topic-cluster.service.ts`
  5. Create `BELONGS_TO` edges: concept → topic cluster
  6. Publish NATS event: `knowledge.topics.clustered` with cluster count + courseId
  7. Log: `this.logger.info({ courseId, clusterCount: k }, '[TopicClusterKMeans] Clustering complete')`
- Must implement `OnModuleDestroy` with `closeAllPools()`

**`apps/subgraph-knowledge/src/graph/topic-cluster.resolver.ts`** (MODIFY or CREATE):
- Add mutation: `clusterTopics(courseId: ID!, k: Int): [TopicCluster!]!`
- Directive: `@authenticated @requiresScopes(scopes: ["knowledge:write"])`

**`apps/subgraph-knowledge/src/graph/topic-cluster-kmeans.service.spec.ts`** (CREATE — tests inline):
- k-means converges on toy dataset
- handles k > n_concepts (returns n_concepts clusters)
- handles empty concept list
- `OnModuleDestroy` calls cleanup

### Tests Required

**Unit (`topic-cluster-kmeans.service.spec.ts`):**
- k-means converges (5 concepts → 2 clusters, stable assignment)
- cosine distance calculation correct for known vectors
- k-means++ initialization selects diverse centroids
- handles k=1 (all concepts in one cluster)
- handles k > concepts count (clamps to concept count)
- publishes NATS event after clustering

**Integration (`apps/subgraph-knowledge/src/test/integration/clustering.spec.ts`):**
- End-to-end: seed 20 concepts → cluster into 4 groups → verify AGE graph has `BELONGS_TO` edges

---

## Track A5 — Persisted Queries Client Wiring

### Problem
Gateway is configured with `allowArbitraryDocuments: false` (production) and the `persisted-queries/` directory has a complete README, but `apps/web/src/lib/urql.ts` does NOT include `persistedExchange` or SHA-256 document hashing. This means production builds will fail.

### Files to Modify

**`apps/web/src/lib/urql.ts`** (MODIFY):
- Import: `import { persistedExchange } from '@urql/exchange-persisted'`
- Add `persistedExchange({ preferGetForPersistedQueries: true, enableForMutation: false })` to exchange chain
- Position: BEFORE `fetchExchange` and AFTER `cacheExchange`
- Only activate in `NODE_ENV === 'production'` (dev keeps arbitrary documents for iteration speed)

**`apps/web/package.json`** (MODIFY — add dep):
- Add `"@urql/exchange-persisted": "^4.x"` to dependencies

**CI — `apps/web/vite.config.ts` or build script** (MODIFY):
- Add `graphql-codegen` persisted-documents plugin to generate `persisted-documents.json` at build time
- Ensure `sha256` hashes match gateway's persisted query store

**`apps/gateway/src/hive-gateway.config.ts`** (VERIFY — should already have `allowArbitraryDocuments` env-gated):
- Confirm: `allowArbitraryDocuments: process.env.NODE_ENV !== 'production'`

### Tests Required

**Unit (`apps/web/src/lib/urql.test.ts`):**
- `persistedExchange present in production exchange chain`
- `persistedExchange absent in development exchange chain`
- `SHA-256 hash matches for known query document`

**E2E (`apps/web/e2e/persisted-queries.spec.ts`):**
- Mock gateway to return 400 for non-hashed query → verify client retries with hash
- Successful persisted query response received and rendered

---

## Track B1 — gVisor Agent Sandbox

### Problem
CLAUDE.md and PRD mention gVisor for multi-tenant agent execution safety, but `docker-compose.yml` has no `runtime: runsc` configuration and no K8s `RuntimeClass` exists.

### Scope (Limited — Runbook + Docker Override Only)

**`docs/security/gvisor-setup.md`** (CREATE — comprehensive runbook):
- gVisor installation steps (Ubuntu/Debian): `sudo apt-get install runsc`
- Docker daemon config: `/etc/docker/daemon.json` → add `"runtimes": { "runsc": { "path": "/usr/sbin/runsc" } }`
- K8s RuntimeClass manifest for containerd
- Which services need gVisor: `agent-runner` containers only (AI code execution)
- Services that MUST NOT use gVisor: PostgreSQL, Redis (performance-critical)

**`docker-compose.gvisor.yml`** (CREATE — override file):
```yaml
# Apply with: docker-compose -f docker-compose.yml -f docker-compose.gvisor.yml up
services:
  subgraph-agent:
    runtime: runsc
```

**`CLAUDE.md`** Infrastructure section (MODIFY — note gVisor status):
- Mark gVisor as "Runbook Available — activate in production via docker-compose.gvisor.yml"

> **Note:** gVisor is NOT enabled in local development `docker-compose.yml` because `runsc` requires manual host installation. The override file + runbook is the deliverable for this gap.

---

## Track B2 — PostgreSQL Column-Level Encryption (TDE)

### Problem
PRD §6.4 mentions Transparent Data Encryption. PII fields (email, name, annotation content) should be encrypted at rest via `pgcrypto` column-level encryption per CLAUDE.md SI-3.

### Scope

**`packages/db/src/helpers/encrypt.ts`** (VERIFY EXISTS — if not, CREATE):
- `encryptField(value: string, tenantKey: string): string` using `pgcrypto.pgp_sym_encrypt()`
- `decryptField(ciphertext: string, tenantKey: string): string` using `pgcrypto.pgp_sym_decrypt()`
- Must be called before every PII write (enforced by SI-3 Iron Rule)

**`docs/security/tde-column-encryption.md`** (CREATE):
- Which columns are PII-encrypted: `users.email`, `users.first_name`, `users.last_name`, `annotations.content` (when annotation body contains PII)
- Key management: per-tenant key from `tenantKey` claim in JWT
- Drizzle column type: use `text` column with application-level encrypt/decrypt hooks
- How to verify: `SELECT pgp_sym_decrypt(email, 'key') FROM users WHERE id = '...'`
- Migration strategy for existing plaintext data

**Tests:**
- `packages/db/src/helpers/encrypt.test.ts`: encrypt→decrypt roundtrip, wrong key returns error

---

## Track B3 — Vault Infrastructure

### Problem
Secrets are managed via `.env` files. PRD §6 mentions HashiCorp Vault for production secret management. No Vault service in `docker-compose.yml`.

### Scope

**`docker-compose.vault.yml`** (CREATE — optional override):
```yaml
services:
  vault:
    image: hashicorp/vault:1.17
    ports: ["8200:8200"]
    environment:
      VAULT_DEV_ROOT_TOKEN_ID: "dev-token"
      VAULT_DEV_LISTEN_ADDRESS: "0.0.0.0:8200"
    cap_add: [IPC_LOCK]
    mem_limit: 256m
    mem_reservation: 128m
```

**`docs/security/vault-setup.md`** (CREATE — runbook):
- Dev setup: `docker-compose -f docker-compose.yml -f docker-compose.vault.yml up`
- Secret paths: `secret/edusphere/db`, `secret/edusphere/keycloak`, `secret/edusphere/nats`
- App integration: `@nestjs/config` with Vault provider OR `vault` npm package
- Secret rotation procedure

**`packages/vault-client/`** (CREATE — thin wrapper, optional):
- Only implement if integration is needed beyond runbook; otherwise docs-only is sufficient for this gap

> **Note:** Vault is a production infrastructure concern. For local dev, `.env` files remain. The deliverable is the docker-compose override + runbook.

---

## Track D — Deployment Verification

### After All Tracks Complete

Run this sequence to confirm the full local environment is operational:

```bash
# 1. Build all packages
pnpm turbo build

# 2. TypeScript zero errors
pnpm turbo typecheck

# 3. Lint zero warnings
pnpm turbo lint

# 4. All tests pass
pnpm turbo test -- --coverage

# 5. GraphQL federation composes
pnpm --filter @edusphere/gateway compose

# 6. Start infrastructure
docker-compose up -d

# 7. Health check
./scripts/health-check.sh

# 8. E2E tests
pnpm --filter @edusphere/web test:e2e

# 9. Verify 5 Keycloak users (if passwords reset needed)
node scripts/reset-keycloak-passwords.cjs

# 10. Smoke test
./scripts/smoke-test.sh
```

### 5 User Verification Checklist
| User | Email | Role | Password | Verify Login |
|------|-------|------|----------|--------------|
| Super Admin | super.admin@edusphere.dev | SUPER_ADMIN | SuperAdmin123! | ✅ |
| Instructor | instructor@example.com | INSTRUCTOR | Instructor123! | ✅ |
| Org Admin | org.admin@example.com | ORG_ADMIN | OrgAdmin123! | ✅ |
| Researcher | researcher@example.com | RESEARCHER | Researcher123! | ✅ |
| Student | student@example.com | STUDENT | Student123! | ✅ |

### Service Health Verification
| Service | Port | Check |
|---------|------|-------|
| Gateway | 4000 | `curl http://localhost:4000/graphql` |
| Core | 4001 | health query |
| Content | 4002 | health query |
| Annotation | 4003 | health query |
| Collaboration | 4004 | health query |
| Agent | 4005 | health query |
| Knowledge | 4006 | health query |
| Frontend | 5173 | `curl http://localhost:5173` |
| Keycloak | 8080 | realm accessible |
| NATS | 4222 | JetStream healthy |
| MinIO | 9000 | bucket accessible |

---

## Execution Order

### Phase 0 — Protocol (5 min, sequential)
- Track C: Update CLAUDE.md Wave 2 language

### Phase 1 — Feature Gaps (parallel, 4 workstreams)
| Workstream | Track | Est. Files |
|------------|-------|-----------|
| WS-1 | A1 Course Forking | 8 files (service, resolver, schema, SDL, UI, i18n, migration, tests) |
| WS-2 | A2 Saved Searches | 10 files (service, resolver, SDL, module, UI, i18n, migration, tests) |
| WS-3 | A3 KnowledgeGraphPage | 4 files (page, App.tsx route, nav, tests) |
| WS-4 | A4 K-means Clustering | 4 files (service, resolver update, tests) |

### Phase 2 — Infrastructure & Client (parallel)
| Workstream | Track | Est. Files |
|------------|-------|-----------|
| WS-5 | A5 Persisted Queries | 3 files (urql.ts, package.json, test) |
| WS-6 | B1 gVisor | 2 files (docker override, runbook) |
| WS-7 | B2 TDE | 2 files (verify encrypt helper, runbook) |
| WS-8 | B3 Vault | 2 files (docker override, runbook) |

### Phase 3 — Verification
- All tests green, deployment verified, 5 users confirmed

---

## Key Files Reference

| File | Track | Action |
|------|-------|--------|
| `CLAUDE.md` | C | Modify Wave 2 text |
| `apps/subgraph-content/src/course/course.service.ts` | A1 | Add `forkCourse()` |
| `apps/subgraph-content/src/course/course.resolver.ts` | A1 | Add `forkCourse` mutation |
| `apps/subgraph-content/src/course/course.graphql` | A1 | Add mutation + field |
| `packages/db/src/schema/courses.ts` | A1 | Add `forkedFromId` column |
| `apps/web/src/pages/CourseDetailPage.tsx` | A1 | Add Fork button |
| `apps/web/e2e/course-fork.spec.ts` | A1 | Create E2E test |
| `packages/db/src/schema/saved-searches.ts` | A2 | Create table |
| `apps/subgraph-core/src/search/saved-search.service.ts` | A2 | Create service |
| `apps/subgraph-core/src/search/saved-search.resolver.ts` | A2 | Create resolver |
| `apps/web/src/pages/Search.tsx` | A2 | Add save functionality |
| `apps/web/e2e/saved-search.spec.ts` | A2 | Create E2E test |
| `apps/web/src/pages/KnowledgeGraphPage.tsx` | A3 | Create page component |
| `apps/web/src/App.tsx` | A3 | Add routes |
| `apps/subgraph-knowledge/src/graph/topic-cluster-kmeans.service.ts` | A4 | Create k-means |
| `apps/web/src/lib/urql.ts` | A5 | Add persistedExchange |
| `docker-compose.gvisor.yml` | B1 | Create override |
| `docs/security/gvisor-setup.md` | B1 | Create runbook |
| `docs/security/tde-column-encryption.md` | B2 | Create runbook |
| `docker-compose.vault.yml` | B3 | Create override |
| `docs/security/vault-setup.md` | B3 | Create runbook |

---

## Non-Negotiable Completion Criteria

A track is CLOSED only when ALL of the following pass:
1. `pnpm turbo test -- --coverage` — 100% pass for affected packages
2. `pnpm turbo typecheck` — zero TypeScript errors
3. `pnpm turbo lint` — zero ESLint warnings
4. Visual browser verification — reproduce scenario, confirm clean UI (no raw error strings)
5. E2E Playwright tests green — including screenshot assertions
6. Grep for removed anti-pattern returns zero matches outside test files
7. `OPEN_ISSUES.md` updated with status, root cause, fix rounds, regression test file:line
8. Logging confirmed: Pino `this.logger.error(...)` calls in all new service error paths

---

*Plan created: March 4, 2026 | EduSphere Session 13 | Gap count: 10 (A1-A5, B1-B3, C, D)*
