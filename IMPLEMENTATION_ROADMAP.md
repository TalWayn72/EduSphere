# EduSphere — Document 4: Implementation Roadmap

## Phased Build Plan for Claude Code

> **Purpose**: This document is the **execution blueprint** for Claude Code.
> Each phase builds on the previous one. **Never skip ahead.**
> Every phase has hard acceptance criteria — the phase is not "done" until ALL criteria pass.
> Claude Code must run the test/validation commands listed and show green output before proceeding.

> **Scale Target**: 100,000+ concurrent users. Every architectural decision must consider
> horizontal scaling, connection pooling, caching, and fault isolation from Phase 0.

> **Reference Documents** (must be loaded before any phase begins):
>
> - `docs/database/DATABASE_SCHEMA.md` — single source of truth for all tables, RLS, graph, embeddings
> - `API_CONTRACTS_GRAPHQL_FEDERATION.md` — single source of truth for all GraphQL types, queries, mutations, subscriptions
> - `EduSphere_Claude.pdf` — architecture guide and technology decisions
> - `EduSphere_DB.pdf` — database design deep-dive

---

## Technology Stack — Validated & Locked

Before any code is written, Claude Code must acknowledge these **locked** technology choices.
These have been validated for production viability, MIT/Apache licensing, and ecosystem maturity.

| Layer                     | Technology                  | Version                                          | License    | Validation Status                                                                                                        |
| ------------------------- | --------------------------- | ------------------------------------------------ | ---------- | ------------------------------------------------------------------------------------------------------------------------ |
| **Gateway**               | Hive Gateway v2             | latest (v2.x)                                    | MIT        | ✅ 100% Federation v2.7 compliance (189/189 tests). Event-driven distributed subscriptions. Runtime log-level switching. |
| **Gateway (Prod Option)** | Hive Router (Rust)          | latest                                           | MIT        | ✅ ~1830 RPS, p95 ~48ms. Consider for production upgrade path.                                                           |
| **Subgraph Runtime**      | GraphQL Yoga + NestJS       | Yoga 5.x + `@graphql-yoga/nestjs-federation` 3.x | MIT        | ✅ `YogaFederationDriver` actively maintained (last publish: weeks ago).                                                 |
| **Framework**             | NestJS                      | 11.x                                             | MIT        | ✅ Enterprise-grade DI, module system, guards, interceptors.                                                             |
| **ORM**                   | Drizzle ORM                 | 1.x (beta → stable)                              | Apache 2.0 | ✅ Native RLS support via `pgTable.withRLS()`. `defineRelations()` API. Native pgvector support.                         |
| **Database**              | PostgreSQL 16+              | 16.x                                             | PostgreSQL | ✅ With Apache AGE 1.5+ and pgvector 0.8+                                                                                |
| **Graph DB**              | Apache AGE                  | 1.5.0 (PG16)                                     | Apache 2.0 | ✅ Cypher queries within PostgreSQL                                                                                      |
| **Vector Search**         | pgvector                    | 0.8.0                                            | PostgreSQL | ✅ HNSW indexes, 768-dim nomic-embed-text                                                                                |
| **Auth**                  | Keycloak                    | v26.x                                            | Apache 2.0 | ✅ OIDC/JWT, multi-tenant realms, JWKS                                                                                   |
| **Messaging**             | NATS JetStream              | latest                                           | Apache 2.0 | ✅ Event-driven subscriptions, at-least-once delivery                                                                    |
| **Object Storage**        | MinIO                       | latest                                           | AGPLv3     | ✅ S3-compatible presigned URLs                                                                                          |
| **CRDT/Collab**           | Yjs + Hocuspocus            | latest                                           | MIT        | ✅ Real-time collaborative editing                                                                                       |
| **AI Layer 1**            | Vercel AI SDK               | v6.x                                             | Apache 2.0 | ✅ Unified LLM abstraction (Ollama ↔ OpenAI/Anthropic)                                                                   |
| **AI Layer 2**            | LangGraph.js                | latest                                           | MIT        | ✅ State-machine agent workflows                                                                                         |
| **AI Layer 3**            | LlamaIndex.TS               | latest                                           | MIT        | ✅ RAG pipeline, knowledge graph indexing                                                                                |
| **Transcription**         | faster-whisper              | latest                                           | MIT        | ✅ GPU-accelerated speech-to-text                                                                                        |
| **Frontend**              | React + Vite                | React 19 + Vite 6                                | MIT        | ✅ TanStack Query v5 for data layer                                                                                      |
| **Mobile**                | Expo SDK 54                 | 54.x                                             | MIT        | ✅ Offline-first patterns                                                                                                |
| **Reverse Proxy**         | Traefik                     | v3.6                                             | MIT        | ✅ Auto-discovery, Let's Encrypt, rate limiting                                                                          |
| **Schema Registry**       | GraphQL Hive                | latest                                           | MIT        | ✅ Breaking change detection, composition                                                                                |
| **Telemetry**             | OpenTelemetry → Jaeger      | latest                                           | Apache 2.0 | ✅ Distributed tracing, Hive Gateway v2 native integration                                                               |
| **Monorepo**              | pnpm workspaces + Turborepo | latest                                           | MIT        | ✅ Efficient dependency hoisting, parallel builds                                                                        |

---

## Monorepo Structure (Target)

```
edusphere/
├── apps/
│   ├── gateway/                 # Hive Gateway v2 configuration
│   ├── subgraph-core/           # Port 4001 — Tenants & Users
│   ├── subgraph-content/        # Port 4002 — Courses, Media, Transcripts
│   ├── subgraph-annotation/     # Port 4003 — Annotation layers
│   ├── subgraph-collaboration/  # Port 4004 — CRDT, real-time
│   ├── subgraph-agent/          # Port 4005 — AI agents
│   ├── subgraph-knowledge/      # Port 4006 — Graph, embeddings, search
│   ├── web/                     # React + Vite SPA
│   ├── mobile/                  # Expo SDK 54
│   └── transcription-worker/    # faster-whisper NATS consumer
├── packages/
│   ├── db/                      # Drizzle schema, migrations, seed, graph helpers
│   ├── graphql-shared/          # Shared SDL (scalars, enums, directives, pagination)
│   ├── graphql-types/           # Generated TypeScript types (codegen output)
│   ├── graphql-codegen/         # GraphQL Code Generator configuration
│   ├── eslint-config/           # Shared ESLint rules
│   ├── tsconfig/                # Shared TypeScript configs
│   ├── nats-client/             # Shared NATS JetStream client wrapper
│   └── auth/                    # JWT validation, context extraction, guards
├── infrastructure/
│   ├── docker/
│   │   ├── postgres-age/        # Custom PG16 + AGE + pgvector Dockerfile
│   │   └── keycloak/            # Keycloak realm import
│   ├── docker-compose.yml       # Full local development stack
│   ├── docker-compose.test.yml  # CI/CD test environment
│   └── k8s/                     # Kubernetes manifests (Phase 7)
├── scripts/
│   ├── health-check.sh          # Validates all services are up
│   ├── smoke-test.sh            # E2E smoke tests
│   └── seed.ts                  # Database seeding
├── turbo.json
├── pnpm-workspace.yaml
└── .env.example
```

---

## Agent Orchestration Protocol for Claude Code

Claude Code should operate with the following multi-agent patterns when executing phases:

### Progress Reporting (Every 3 minutes)

```
═══════════════════════════════════════════════════
📊 PROGRESS REPORT — Phase X.Y — [timestamp]
═══════════════════════════════════════════════════
🔵 Active Agents:
   Agent-1 [Architecture]: Building docker-compose.yml — 80% complete
   Agent-2 [Schema]:       Generating Drizzle migrations — running
   Agent-3 [Testing]:      Writing health-check tests — queued

✅ Completed this cycle:
   - Custom PostgreSQL Dockerfile built and tested
   - Keycloak realm configuration imported

⏳ Next actions:
   - Validate all containers start cleanly
   - Run health-check.sh

📈 Phase progress: 65% → estimated 8 min remaining
═══════════════════════════════════════════════════
```

### Agent Roles

| Agent Role    | Responsibility                                           | Active Phases |
| ------------- | -------------------------------------------------------- | ------------- |
| **Architect** | File structure, configs, docker-compose, monorepo setup  | 0–1           |
| **Schema**    | Drizzle schemas, migrations, RLS policies, graph setup   | 1–2           |
| **API**       | GraphQL SDL, resolvers, guards, context                  | 2–4           |
| **Test**      | Unit tests, integration tests, E2E, load tests           | ALL           |
| **Security**  | RLS validation, JWT flow, scope enforcement, penetration | ALL           |
| **Frontend**  | React components, hooks, routing, state management       | 4–6           |
| **AI/ML**     | Embeddings, RAG pipeline, agent workflows                | 5–6           |
| **DevOps**    | CI/CD, monitoring, scaling, K8s manifests                | 6–7           |

### Quality Gates (Enforced at every phase boundary)

```bash
# 1. TypeScript compilation (zero errors)
pnpm turbo build --filter='./apps/*' --filter='./packages/*'

# 2. Linting (zero warnings in CI mode)
pnpm turbo lint

# 3. Unit tests (100% pass, coverage thresholds met)
pnpm turbo test -- --coverage

# 4. Schema validation (supergraph composes without errors)
pnpm --filter @edusphere/gateway exec hive-gateway compose

# 5. Docker health (all containers healthy)
./scripts/health-check.sh

# 6. Security scan
pnpm audit --audit-level=high
```

---

## Phase 0: Foundation — "Hello World"

**Goal**: `docker-compose up` brings up the entire infrastructure stack, and a simple GraphQL query returns a health-check response.

**Duration estimate**: 1–2 days

### Phase 0.1: Monorepo Scaffolding

**Tasks**:

1. Initialize pnpm workspace with `pnpm-workspace.yaml`
2. Create `turbo.json` with build/lint/test/dev pipelines
3. Set up shared TypeScript config (`packages/tsconfig/`)
4. Set up shared ESLint config (`packages/eslint-config/`) with:
   - `@typescript-eslint/strict-type-checked`
   - `eslint-plugin-drizzle` (prevent N+1 footguns)
   - `eslint-plugin-import` (enforce module boundaries)
5. Create `.env.example` with all environment variables documented
6. Create `packages/graphql-shared/` with:
   - `src/scalars.graphql` — all custom scalars (DateTime, UUID, JSON, Cursor, etc.)
   - `src/enums.graphql` — all shared enums (UserRole, MediaType, etc.)
   - `src/directives.graphql` — @authenticated, @requiresScopes, @policy, @public, @requiresRole, @ownerOnly, @rateLimit
   - `src/pagination.graphql` — PageInfo, ConnectionArgs

**Acceptance Criteria**:

```bash
# All workspace packages resolve
pnpm install --frozen-lockfile  # exits 0

# TypeScript configs chain correctly
pnpm turbo build --dry-run  # shows correct topology

# Shared GraphQL package builds
pnpm --filter @edusphere/graphql-shared build  # exits 0
```

### Phase 0.2: Infrastructure Docker Stack

**Tasks**:

1. Build custom PostgreSQL image (`infrastructure/docker/postgres-age/Dockerfile`):
   ```dockerfile
   FROM postgres:16-bookworm
   # Install Apache AGE 1.5.0 for PG16
   # Install pgvector 0.8.0
   # Configure shared_preload_libraries = 'age'
   ```
2. Create `docker-compose.yml` with all services:
   - `postgres` — Custom PG16 + AGE + pgvector (port 5432)
   - `keycloak` — v26 with dev realm import (port 8080)
   - `nats` — JetStream enabled (port 4222)
   - `minio` — S3-compatible storage (port 9000, console 9001)
   - `jaeger` — Distributed tracing UI (port 16686)
   - Networks: `edusphere-net` (bridge)
   - Volumes: Named volumes for postgres data, minio data, keycloak data
3. Create Keycloak realm import JSON:
   - Realm: `edusphere`
   - Client: `edusphere-app` (public OIDC client)
   - Roles: `super_admin`, `org_admin`, `instructor`, `student`, `researcher`
   - Test users: admin@edusphere.dev / student@edusphere.dev
   - Client scopes mapping to API scopes: `org:manage`, `org:users`, `course:write`, `media:upload`, `annotation:write`, `agent:write`, `agent:execute`, `knowledge:write`
4. Create `scripts/health-check.sh`:
   ```bash
   # Checks: PG accepts connections, AGE extension loads, pgvector loads,
   # edusphere_graph exists, Keycloak realm accessible, NATS healthy,
   # MinIO reachable, Jaeger UI responds
   ```
5. Create SQL init script (`infrastructure/docker/postgres-age/init.sql`):
   - Per docs/database/DATABASE_SCHEMA.md §2: Create extensions (uuid-ossp, pgcrypto, age, vector)
   - Create `edusphere_graph` via `SELECT create_graph('edusphere_graph')`
   - Create `edusphere_app` role
   - Grant AGE permissions

**Acceptance Criteria**:

```bash
# Full stack starts
docker-compose up -d  # all containers reach "healthy" state within 60s

# PostgreSQL + extensions verified
docker exec edusphere-postgres psql -U postgres -c "
  SELECT extname FROM pg_extension
  WHERE extname IN ('age', 'vector', 'uuid-ossp', 'pgcrypto')
" | grep -c 'age\|vector\|uuid-ossp\|pgcrypto'  # outputs 4

# AGE graph exists
docker exec edusphere-postgres psql -U postgres -c "
  LOAD 'age';
  SET search_path = ag_catalog;
  SELECT * FROM ag_graph WHERE name = 'edusphere_graph';
" | grep edusphere_graph  # found

# Keycloak realm accessible
curl -sf http://localhost:8080/realms/edusphere/.well-known/openid-configuration | jq .issuer
# → "http://localhost:8080/realms/edusphere"

# NATS healthy
curl -sf http://localhost:8222/healthz  # exits 0

# MinIO reachable
curl -sf http://localhost:9000/minio/health/live  # exits 0

# Health check script passes all checks
./scripts/health-check.sh  # exits 0, all green
```

### Phase 0.3: First Subgraph — Core "Hello World"

**Tasks**:

1. Scaffold `apps/subgraph-core/` as NestJS application:
   - Install: `@nestjs/graphql`, `graphql-yoga`, `@graphql-yoga/nestjs-federation`, `graphql`
   - Configure `YogaFederationDriver` with schema-first approach
   - Minimal schema: `type Query { _health: String! }`
2. Scaffold `apps/gateway/` as Hive Gateway v2 config:
   - `gateway.config.ts` pointing to subgraph-core at `http://localhost:4001/graphql`
   - Supergraph composed from local SDL
3. Add both to `docker-compose.yml` or use `turbo dev`
4. Verify the full path: Client → Gateway (port 4000) → Core subgraph (port 4001)

**Acceptance Criteria**:

```bash
# Gateway responds to health query
curl -sf http://localhost:4000/graphql \
  -H "Content-Type: application/json" \
  -d '{"query":"{ _health }"}' | jq .data._health
# → "ok"

# Gateway introspection works
curl -sf http://localhost:4000/graphql \
  -H "Content-Type: application/json" \
  -d '{"query":"{ __schema { queryType { name } } }"}' | jq .data.__schema.queryType.name
# → "Query"
```

---

## Phase 1: Data Layer — Schema, Migrations, RLS

**Goal**: Complete database layer with all 16 tables, RLS policies, Drizzle relations, Apache AGE graph ontology, and pgvector embedding tables. Seeded with development data.

**Duration estimate**: 2–3 days

### Phase 1.1: Drizzle Schema Package

**Tasks**:

1. Create `packages/db/` with Drizzle ORM configuration
2. Implement **every table** from docs/database/DATABASE_SCHEMA.md §4–§8:
   - `packages/db/src/schema/_shared.ts` — pk(), tenantId(), timestamps(), softDelete(), enums
   - `packages/db/src/schema/core.ts` — tenants, users
   - `packages/db/src/schema/content.ts` — courses, modules, media_assets, transcripts, transcript_segments
   - `packages/db/src/schema/annotation.ts` — annotations
   - `packages/db/src/schema/collaboration.ts` — collab_documents, crdt_updates, collab_sessions
   - `packages/db/src/schema/agent.ts` — agent_definitions, agent_executions
   - `packages/db/src/schema/embeddings.ts` — content_embeddings, annotation_embeddings, concept_embeddings
3. Enable RLS on all user-facing tables using `pgTable.withRLS()`
4. Define all indexes per docs/database/DATABASE_SCHEMA.md:
   - B-tree indexes on `tenant_id` + commonly filtered columns
   - GIN indexes on `tags` (jsonb), `metadata` (jsonb)
   - HNSW indexes on embedding vectors (cosine distance, m=16, ef_construction=64)
   - Partial index on `deleted_at IS NULL` for all soft-delete tables

**Reference**: docs/database/DATABASE_SCHEMA.md §3–§8 (exact column names, types, constraints)

**Acceptance Criteria**:

```bash
# Schema compiles without errors
pnpm --filter @edusphere/db build  # exits 0

# Migration generates successfully
pnpm --filter @edusphere/db exec drizzle-kit generate  # produces migration files

# Migration applies to database
pnpm --filter @edusphere/db exec drizzle-kit migrate  # exits 0

# All 16 tables exist
docker exec edusphere-postgres psql -U postgres -d edusphere -c "
  SELECT COUNT(*) FROM information_schema.tables
  WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
" | grep 16
```

### Phase 1.2: Row-Level Security Policies

**Tasks**:

1. Implement RLS policies per docs/database/DATABASE_SCHEMA.md §9:
   - Every tenant-isolated table: `USING (tenant_id = current_setting('app.current_tenant')::uuid)`
   - Users table additional policy: super_admin sees all tenants
   - Annotations: owner-only for PERSONAL layer, shared for SHARED/INSTRUCTOR/AI_GENERATED
2. Create `packages/db/src/rls/withTenantContext.ts`:
   ```typescript
   // Wraps every resolver DB call:
   // SET LOCAL app.current_tenant = '<uuid>';
   // SET LOCAL app.current_user_id = '<uuid>';
   // SET LOCAL app.current_user_role = '<role>';
   ```
3. Write RLS integration tests that verify:
   - Tenant A cannot read Tenant B's data
   - Student cannot access instructor-only annotations
   - Soft-deleted records are invisible

**Acceptance Criteria**:

```bash
# RLS enabled on all 16 tables
docker exec edusphere-postgres psql -U postgres -d edusphere -c "
  SELECT relname, relrowsecurity FROM pg_class
  JOIN pg_namespace ON pg_namespace.oid = relnamespace
  WHERE nspname = 'public' AND relkind = 'r'
  ORDER BY relname
" # ALL show relrowsecurity = true

# RLS tests pass
pnpm --filter @edusphere/db test -- --testPathPattern=rls  # all green

# Cross-tenant isolation verified
pnpm --filter @edusphere/db test -- --testPathPattern=tenant-isolation  # all green
```

### Phase 1.3: Apache AGE Graph Ontology

**Tasks**:

1. Create `packages/db/src/graph/` with helpers from docs/database/DATABASE_SCHEMA.md §15:
   - `client.ts` — `executeCypher()`, `addVertex()`, `addEdge()`
   - `ontology.ts` — graph creation, vertex label setup
2. Initialize vertex labels: Concept, Person, Term, Source, TopicCluster
3. Initialize edge labels: RELATED_TO, CONTRADICTS, PREREQUISITE_OF, MENTIONS, CITES, AUTHORED_BY, INFERRED_RELATED, REFERS_TO, DERIVED_FROM, BELONGS_TO
4. All vertices carry: `id` (UUID), `tenant_id`, `created_at`, `updated_at`
5. Edge-specific properties per docs/database/DATABASE_SCHEMA.md §10

**Acceptance Criteria**:

```bash
# Graph ontology loads without errors
pnpm --filter @edusphere/db exec tsx src/graph/ontology.ts  # exits 0

# Vertex labels exist
docker exec edusphere-postgres psql -U postgres -d edusphere -c "
  LOAD 'age'; SET search_path = ag_catalog;
  SELECT * FROM ag_label WHERE graph = (SELECT graphid FROM ag_graph WHERE name = 'edusphere_graph')
" | grep -c 'Concept\|Person\|Term\|Source\|TopicCluster'  # outputs 5

# Graph CRUD operations work
pnpm --filter @edusphere/db test -- --testPathPattern=graph  # all green
```

### Phase 1.4: Seed Data

**Tasks**:

1. Implement seed script per docs/database/DATABASE_SCHEMA.md §14:
   - Default tenant with known UUID
   - Admin user + student user
   - Sample course with modules
   - Sample media assets
   - Sample knowledge graph vertices and edges
2. Make seed idempotent (uses `onConflictDoNothing`)

**Acceptance Criteria**:

```bash
# Seed runs without errors
pnpm --filter @edusphere/db exec tsx src/seed.ts  # exits 0

# Seed is idempotent
pnpm --filter @edusphere/db exec tsx src/seed.ts  # exits 0 (second run)

# Data exists
docker exec edusphere-postgres psql -U postgres -d edusphere -c "
  SELECT COUNT(*) FROM tenants
" | grep 1
```

---

## Phase 2: Core Subgraphs — Auth + Content

**Goal**: Core and Content subgraphs fully operational with JWT authentication, all queries/mutations per API-CONTRACTS, federation entity resolution working through the gateway.

**Duration estimate**: 3–5 days

### Phase 2.1: Auth Infrastructure

**Tasks**:

1. Create `packages/auth/`:
   - `jwt-validator.ts` — JWKS fetching from Keycloak, JWT verification
   - `context-extractor.ts` — Extract `tenantId`, `userId`, `role`, `scopes` from JWT claims
   - `graphql-context.ts` — Type-safe GraphQL context interface:
     ```typescript
     interface GraphQLContext {
       tenantId: string;
       userId: string;
       userRole: UserRole;
       scopes: string[];
       isAuthenticated: boolean;
     }
     ```
   - `guards/` — NestJS guards for `@requiresRole`, `@ownerOnly`, `@requiresScopes`
2. Configure Hive Gateway JWT validation:
   - JWKS endpoint: `http://keycloak:8080/realms/edusphere/protocol/openid-connect/certs`
   - `@authenticated` enforcement at gateway level
   - `x-tenant-id` header propagation to subgraphs
   - `@requiresScopes` evaluation against JWT claims
3. Create dev token generation script for testing:
   ```bash
   # scripts/get-dev-token.sh — gets JWT from Keycloak for dev users
   ```

**Acceptance Criteria**:

```bash
# Token generation works
TOKEN=$(./scripts/get-dev-token.sh admin@edusphere.dev)
echo $TOKEN | cut -d'.' -f2 | base64 -d | jq .sub  # shows user ID

# Authenticated query works
curl -sf http://localhost:4000/graphql \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"query":"{ me { id email } }"}' | jq .data.me
# → returns user object

# Unauthenticated query fails
curl -sf http://localhost:4000/graphql \
  -H "Content-Type: application/json" \
  -d '{"query":"{ me { id email } }"}' | jq .errors[0].extensions.code
# → "UNAUTHENTICATED"
```

### Phase 2.2: Core Subgraph — Full Implementation

**Tasks**:

1. Implement ALL Core subgraph types per API-CONTRACTS §7:
   - `Tenant` entity with `@key(fields: "id")`
   - `User` entity with `@key(fields: "id")`
   - All queries: `me`, `user(id)`, `users(filter, orderBy, pagination)`, `currentTenant`, `tenantBySlug(slug)`
   - All mutations: `updateMyProfile`, `updateUserRole`, `deactivateUser`, `reactivateUser`, `updateTenantSettings`
2. Implement Relay cursor pagination for `users` query
3. Implement all input types, filters, ordering per API-CONTRACTS
4. Wire resolvers to Drizzle via `withTenantContext()`
5. Unit test every resolver

**Acceptance Criteria**:

```bash
# All Core queries respond correctly
pnpm --filter @edusphere/subgraph-core test -- --coverage  # >90% line coverage

# Federation entity resolution works
curl -sf http://localhost:4000/graphql \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"query":"{ me { id displayName role tenant { id name plan } } }"}' | jq .data.me
# → returns complete user with tenant

# Pagination works
curl -sf http://localhost:4000/graphql \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"query":"{ users(first: 2) { edges { node { id } cursor } pageInfo { hasNextPage endCursor } } }"}'
# → returns paginated results
```

### Phase 2.3: Content Subgraph — Full Implementation

**Tasks**:

1. Implement ALL Content subgraph types per API-CONTRACTS §8:
   - `Course`, `Module`, `MediaAsset`, `Transcript`, `TranscriptSegment` entities
   - Entity extensions: `User.createdCourses`, `Tenant.courses`
2. All queries: `course(id)`, `courses(filter)`, `module(id)`, `mediaAsset(id)`, `mediaAssets(filter)`, `segmentsForTimeRange`, `searchTranscripts`
3. All mutations: CRUD for Course, Module, MediaAsset + `forkCourse`, `toggleCoursePublished`, `retriggerTranscription`
4. File upload via multipart (per API-CONTRACTS §14):
   - `initiateMediaUpload` → returns presigned MinIO URL
   - `completeMediaUpload` → confirms upload, triggers transcription pipeline
5. Subscription: `transcriptionStatusChanged(assetId)` via NATS
6. NATS integration:
   - Publish `edusphere.{tenant}.media.uploaded` on upload complete
   - Publish `edusphere.{tenant}.transcription.status` on status change

**Acceptance Criteria**:

```bash
# All Content queries respond correctly
pnpm --filter @edusphere/subgraph-content test -- --coverage  # >90%

# Course CRUD works end-to-end
# Create → Read → Update → SoftDelete → Verify invisible

# Presigned URL generation works
curl -sf http://localhost:4000/graphql \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"query":"mutation { initiateMediaUpload(input: { courseId: \"...\", filename: \"lecture.mp4\", mimeType: \"video/mp4\", size: 1024000 }) { uploadUrl assetId } }"}' | jq .data
# → returns uploadUrl (MinIO presigned) and assetId

# Federation cross-subgraph resolution works
# Query from gateway that touches both Core (User) and Content (Course)
curl -sf http://localhost:4000/graphql \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"query":"{ courses(first: 5) { edges { node { id title creator { id displayName } } } } }"}' | jq .data
# → returns courses with resolved creator from Core subgraph

# Supergraph composes without errors
pnpm --filter @edusphere/gateway compose  # exits 0
```

---

## Phase 3: Annotation + Collaboration Subgraphs

**Goal**: Complete annotation system with spatial comments, layers, and thread support. Real-time collaboration via CRDT with presence awareness.

**Duration estimate**: 3–4 days

### Phase 3.1: Annotation Subgraph

**Tasks**:

1. Implement ALL Annotation types per API-CONTRACTS §9:
   - `Annotation` entity with all types: text, sketch, link, bookmark, spatial_comment
   - `AnnotationLayer` filtering (PERSONAL, SHARED, INSTRUCTOR, AI_GENERATED)
   - Thread support: `parentId`, `annotationThread(rootId)` query
2. All queries: `annotation(id)`, `annotations(filter)`, `annotationThread(rootId)`
3. All mutations: `createAnnotation`, `updateAnnotation`, `deleteAnnotation`, `toggleAnnotationPin`, `resolveAnnotation`, `moveAnnotationsToLayer`
4. Subscription: `annotationChanged(assetId, layers)` via NATS
5. Entity extensions: `User.annotations`, `MediaAsset.annotations`
6. Owner-only enforcement for PERSONAL layer mutations

**Acceptance Criteria**:

```bash
# Annotation CRUD with layer filtering works
pnpm --filter @edusphere/subgraph-annotation test -- --coverage  # >90%

# Layer-based access control verified
# Student A cannot see Student B's PERSONAL annotations
# Student A CAN see SHARED and INSTRUCTOR annotations

# Thread queries return correct nesting
# Subscription fires on annotation changes
```

### Phase 3.2: Collaboration Subgraph

**Tasks**:

1. Implement ALL Collaboration types per API-CONTRACTS §10:
   - `CollabDocument` entity
   - `CollabSession` entity (presence tracking)
2. All queries: `collabDocument(id)`, `collabDocumentByName`, `collabDocumentsForEntity`, `collabConnectionInfo`
3. Mutations: `createCollabDocument`, `compactCollabDocument`
4. Subscription: `collaboratorPresenceChanged(documentId)`
5. Integrate Hocuspocus server:
   - WebSocket endpoint for Yjs CRDT sync
   - Authentication via JWT
   - Persistence to `crdt_updates` table
   - `collabConnectionInfo` returns WebSocket URL + auth token
6. CRDT compaction logic for `compactCollabDocument`

**Acceptance Criteria**:

```bash
# Collaboration CRUD works
pnpm --filter @edusphere/subgraph-collaboration test -- --coverage  # >90%

# Hocuspocus WebSocket server accepts connections
# Two clients can connect and see real-time sync
# Presence subscription shows connected users
# Document compaction reduces CRDT update count

# Full supergraph composes (4 subgraphs)
pnpm --filter @edusphere/gateway compose  # exits 0
```

---

## Phase 4: Knowledge Subgraph — Graph + Embeddings + Search

**Goal**: Full knowledge graph with semantic search, hybrid search (vector + graph), concept extraction, and contradiction detection.

**Duration estimate**: 4–5 days

### Phase 4.1: Knowledge Graph Resolvers

**Tasks**:

1. Implement ALL Knowledge subgraph types per API-CONTRACTS §12:
   - `Concept`, `Person`, `Term`, `Source`, `TopicCluster` entities
   - `KnowledgeRelation`, `ConceptMention`, `Contradiction`, `PrerequisiteLink`
2. All CRUD mutations for Concept, Person, Term, Source
3. Relation mutations: `createRelation`, `deleteRelation`, `createContradiction`
4. Graph traversal queries:
   - `relatedConcepts(conceptId, maxDepth)` — Apache AGE Cypher query with configurable depth
   - `contradictions(conceptId)` — find CONTRADICTS edges
   - `learningPath(conceptId, maxDepth)` — PREREQUISITE_OF chain traversal
5. `topicClusters(pagination)` — cluster browsing
6. `reviewInferredRelation` — accept/reject AI-inferred relations

**Acceptance Criteria**:

```bash
# Graph queries return correct results
pnpm --filter @edusphere/subgraph-knowledge test -- --testPathPattern=graph  # all green

# Multi-hop traversal works (2-hop from concept)
# Contradiction detection returns correct edges
# Learning path follows prerequisite chains correctly
```

### Phase 4.2: Embedding Pipeline + Semantic Search

**Tasks**:

1. Implement embedding generation service:
   - Uses Vercel AI SDK → `embed()` function
   - Dev: nomic-embed-text via Ollama (768 dimensions)
   - Prod: OpenAI text-embedding-3-small or equivalent
2. Content embedding pipeline:
   - On transcript segment creation → generate & store embedding in `content_embeddings`
   - On annotation creation → generate & store in `annotation_embeddings`
   - On concept creation → generate & store in `concept_embeddings`
3. Implement `semanticSearch(query, pagination)`:
   - Embed query text → HNSW index search on content_embeddings
   - Return ranked results with similarity scores
4. Implement `hybridSearch(query, graphDepth)`:
   - Parallel: pgvector semantic search + Apache AGE graph traversal (2-hop from vector hits)
   - Fusion: rank by combined vector similarity + graph centrality score
   - Return `HybridSearchResult` with `graphContext[]`
   - Per API-CONTRACTS §19 HybridRAG pattern
5. `reindexAssetEmbeddings` mutation for re-processing
6. Subscription: `conceptsExtracted(assetId)` via NATS

**Acceptance Criteria**:

```bash
# Embedding generation works
pnpm --filter @edusphere/subgraph-knowledge test -- --testPathPattern=embedding  # all green

# Semantic search returns relevant results
# Query "Rambam's view on divine attributes" returns related segments

# Hybrid search fuses vector + graph results
# graphContext[] populated with related concepts and connections

# Full supergraph composes (5 subgraphs)
pnpm --filter @edusphere/gateway compose  # exits 0

# Search latency < 200ms for p95 (with HNSW index)
```

---

## Phase 5: Agent Subgraph — AI Orchestration

**Goal**: Full AI agent system with LangGraph.js state machines, streaming responses, MCP tool integration, and sandboxed execution.

**Duration estimate**: 4–5 days

### Phase 5.1: Agent CRUD + Execution Engine

**Tasks**:

1. Implement ALL Agent subgraph types per API-CONTRACTS §11:
   - `AgentDefinition` entity with `AgentConfig` (systemPrompt, toolsEnabled, modelOverride)
   - `AgentExecution` entity with status lifecycle: QUEUED → RUNNING → COMPLETED/FAILED/CANCELLED
2. All queries: `agentDefinition(id)`, `agentDefinitions(filter)`, `agentTemplates`, `agentExecution(id)`, `agentExecutions(filter)`
3. All mutations: `createAgentDefinition`, `updateAgentDefinition`, `deleteAgentDefinition`, `executeAgent`, `cancelAgentExecution`
4. Execution engine:
   - `executeAgent` mutation creates execution record (QUEUED) → publishes to NATS
   - Worker picks up from NATS → runs LangGraph.js workflow → updates status
   - Token-by-token streaming via NATS subjects
5. Subscriptions:
   - `agentExecutionUpdated(executionId)` — status changes
   - `agentResponseStream(executionId)` — real-time token stream

**Acceptance Criteria**:

```bash
# Agent CRUD works
pnpm --filter @edusphere/subgraph-agent test -- --coverage  # >90%

# Execution lifecycle: QUEUED → RUNNING → COMPLETED
# Cancellation: RUNNING → CANCELLED

# Token streaming via subscription verified
# Status subscription fires on state changes
```

### Phase 5.2: LangGraph.js Agent Workflows

**Tasks**:

1. Implement pre-built LangGraph.js state machines per API-CONTRACTS §19:
   - `chavruta-debate-graph` — Dialectical debate using CONTRADICTS edges
   - `summarize-graph` — Progressive summarization of transcript segments
   - `quiz-assess-graph` — Adaptive quizzing using PREREQUISITE_OF edges
   - `research-scout-graph` — Cross-reference finder with contradiction detection
   - `explain-graph` — Adaptive explanation with prerequisite chains
   - `custom` — User-defined via JSON config
2. Integrate Vercel AI SDK for LLM calls:
   - Dev: Ollama (phi4:14b / llama3.1:8b)
   - Prod: OpenAI / Anthropic (configurable per tenant)
3. MCP tool integration per API-CONTRACTS §19:
   - `knowledge_graph` — Query/create concepts, relations
   - `semantic_search` — Vector search
   - `transcript_reader` — Read segments by time range
   - `annotation_writer` — Create annotations
   - `web_search` — External search (sandboxed)
   - `calculator` / `citation_formatter`

**Acceptance Criteria**:

```bash
# Each agent template produces valid output
pnpm --filter @edusphere/subgraph-agent test -- --testPathPattern=workflows  # all green

# Chavruta agent finds contradictions and debates both sides
# Summarizer produces progressive summaries
# Quiz master adapts difficulty based on responses

# MCP tools are correctly sandboxed (no direct DB access)
# Agent execution respects tenant resource limits
```

### Phase 5.3: Agent Sandboxing

**Tasks**:

1. Implement resource limits per tenant plan:
   - FREE: 10 executions/day, 30s timeout, 256MB memory
   - STARTER: 100 executions/day, 60s timeout, 512MB
   - PROFESSIONAL: 1000 executions/day, 120s timeout, 1GB
   - ENTERPRISE: unlimited, 300s timeout, 2GB
2. MCP proxy mediation — agents cannot directly access databases
3. Rate limiting at gateway level per `@rateLimit` directive

**Acceptance Criteria**:

```bash
# Resource limits enforced
# Free tier user gets blocked after 10 executions
# Execution timeout kills runaway agent

# Full supergraph composes (6 subgraphs — ALL subgraphs now running)
pnpm --filter @edusphere/gateway compose  # exits 0

# Full API contract coverage:
# 44 queries implemented ✓
# 44 mutations implemented ✓
# 7 subscriptions implemented ✓
```

---

## Phase 6: Frontend — Web Application

**Goal**: Complete React SPA consuming the federated supergraph with full authentication flow, course management, video player with annotations, semantic search, and AI agent chat.

**Duration estimate**: 5–7 days

### Phase 6.1: React Application Shell

**Tasks**:

1. Scaffold `apps/web/` with Vite + React 19 + TypeScript
2. Set up TanStack Query v5 with GraphQL client
3. Run GraphQL Code Generator (per API-CONTRACTS §18):
   - Generate TypeScript types from supergraph SDL
   - Generate TanStack Query hooks for all operations
4. Implement authentication flow:
   - Keycloak OIDC redirect login
   - Token refresh cycle
   - Protected routes
5. Core layout: navigation, sidebar, tenant context

### Phase 6.2: Course & Content Management

**Tasks**:

1. Course list with cursor pagination
2. Course detail view with modules
3. Media upload flow (presigned URL → direct MinIO upload → completeMediaUpload)
4. Video player (Video.js v8) with:
   - HLS streaming
   - Transcript display synced to playback
   - Time-range seeking from search results

### Phase 6.3: Annotation Layer

**Tasks**:

1. Annotation sidebar with layer filtering
2. Sketch canvas overlay (Konva.js v10) on video player
3. Text annotation creation/editing
4. Spatial comment placement
5. Thread view for annotation replies
6. Real-time annotation updates via subscription

### Phase 6.4: Knowledge & Search

**Tasks**:

1. Semantic search interface with hybrid search support
2. Knowledge graph visualization (D3.js or Cytoscape.js)
3. Concept detail view with relations, contradictions, prerequisites
4. Learning path visualization

### Phase 6.5: AI Agent Interface

**Tasks**:

1. Agent chat panel with real-time token streaming
2. Agent template selector (Chavruta, Summarizer, Quiz Master, etc.)
3. Agent execution history
4. Side-panel / overlay rendering based on `outputFormat`

**Phase 6 Acceptance Criteria**:

```bash
# Frontend builds
pnpm --filter @edusphere/web build  # exits 0

# E2E tests pass (Playwright)
pnpm --filter @edusphere/web test:e2e  # all green

# Lighthouse scores
# Performance: >80
# Accessibility: >90
# Best Practices: >90

# Core user flows work:
# Login → Browse courses → Open course → Play video →
# Create annotation → Search content → Chat with AI agent → Logout
```

---

## Phase 7: Production Hardening (✅ PARTIALLY COMPLETED — 18 Feb 2026)

**Goal**: The system is production-ready for 100,000+ concurrent users with monitoring, autoscaling, security hardening, and performance optimization.

**Duration estimate**: 5–7 days

**✅ Completed (18 Feb 2026):**

- Phase 7.4: Kubernetes deployment — Helm chart (22 manifests), Traefik IngressRoute + 4 Middlewares, ExternalSecret CRD, Kustomize overlays (production/staging)
- Phase 7.5: Load testing — k6 smoke/load/stress scenarios + Keycloak auth utils
- GraphQL Subscriptions — `graphql-ws` + `subscriptionExchange` in urql-client, `MESSAGE_STREAM_SUBSCRIPTION` wired in AgentsPage
- Security hardening: runAsNonRoot, readOnlyRootFilesystem, all Linux capabilities dropped in all containers
- Traefik rate-limit (1000 req/min per tenant), CORS, HSTS, CSP, compression middlewares

**⏳ Remaining Phase 7 tasks:**

- Phase 7.1: PgBouncer, CDN, read replicas, persisted queries
- Phase 7.2: OpenTelemetry spans, Prometheus metric endpoints, PagerDuty alerting
- Phase 7.3: Query complexity analysis, persisted-only queries in production
- CD pipeline: GitHub Actions `cd.yml` deploying Helm to staging → production

### Phase 7.1: Performance Optimization

**Tasks**:

1. **Gateway caching**: Persisted queries, response caching at gateway level
2. **Database optimization**:
   - Connection pooling (PgBouncer or built-in pool sizing)
   - Query analysis and index optimization
   - Read replicas for search-heavy queries
3. **CDN/Caching**:
   - Static asset CDN configuration
   - GraphQL response caching headers
   - MinIO CDN integration for media delivery
4. **Subscription optimization**:
   - NATS JetStream consumer groups
   - Subscription deduplication (Hive Gateway v2 feature)

### Phase 7.2: Observability & Monitoring

**Tasks**:

1. **OpenTelemetry instrumentation**:
   - Gateway → all subgraphs → database spans
   - Custom spans for embedding generation, graph queries
2. **Metrics**:
   - Prometheus endpoints on all services
   - Grafana dashboards: QPS, latency p50/p95/p99, error rates, active subscriptions
3. **Alerting**:
   - Error rate > 1% → PagerDuty
   - p95 latency > 500ms → warning
   - Database connection pool exhaustion → critical
4. **Logging**:
   - Structured JSON logging (Pino)
   - Log aggregation (ELK or Loki)
   - Runtime log-level switching (Hive Gateway v2 feature)

### Phase 7.3: Security Hardening

**Tasks**:

1. **Rate limiting**: Per-tenant, per-IP, per-operation limits at gateway
2. **Query complexity analysis**: Block expensive queries (depth > 10, breadth > 100)
3. **Persisted queries only** in production (block arbitrary queries)
4. **CORS**: Strict origin whitelist
5. **CSP headers**: Content Security Policy for web app
6. **Dependency audit**: `pnpm audit --audit-level=high` in CI
7. **Secret management**: Vault or cloud-native secrets (no .env in production)
8. **gVisor sandboxing** for agent executions per API-CONTRACTS §19

### Phase 7.4: Kubernetes Deployment

**Tasks**:

1. Kubernetes manifests (`infrastructure/k8s/`):
   - Deployments for each subgraph (min 2 replicas)
   - HPA: CPU 70% → scale up, min 2, max 20 replicas per subgraph
   - Gateway: min 3 replicas for high availability
   - PostgreSQL: StatefulSet with PVC or managed (RDS/CloudSQL)
   - NATS: JetStream cluster (3 nodes)
   - Keycloak: HA mode (2+ replicas)
2. Traefik v3.6 as ingress controller:
   - Auto TLS via Let's Encrypt
   - Rate limiting middleware
   - Circuit breaker for subgraph failures
3. Helm charts for parameterized deployment
4. CI/CD pipeline (GitHub Actions):
   - Build → Test → Lint → Security scan → Docker build → Deploy to staging → Integration tests → Deploy to production

### Phase 7.5: Load Testing

**Tasks**:

1. k6 or Artillery load test scripts:
   - 10K concurrent users: login → browse → search → chat
   - 50K concurrent users: sustained read queries
   - 100K concurrent users: mixed read/write/subscription
2. Chaos engineering: Kill random pods, verify recovery
3. Database failover testing

**Phase 7 Acceptance Criteria**:

```bash
# Load test: 100K concurrent users
k6 run scripts/load-test-100k.js
# → p95 latency < 500ms
# → error rate < 0.1%
# → zero dropped subscriptions

# Security scan clean
pnpm audit --audit-level=high  # zero high/critical vulnerabilities

# All monitoring dashboards populated
# Grafana shows all metrics with 24h retention

# Zero downtime deployment verified
# Rolling update with zero failed requests

# Chaos test: Kill 1 of 3 gateway pods
# → zero dropped requests (load balancer reroutes)

# Full E2E test suite passes on staging
pnpm turbo test:e2e  # all green in staging environment
```

---

## Phase 8: Mobile + Advanced Features

**Goal**: Expo mobile app with offline-first patterns, transcription worker pipeline, and Chavruta (partner learning) real-time features.

**Duration estimate**: 5–7 days

### Phase 8.1: Expo Mobile Application

**Tasks**:

1. Scaffold `apps/mobile/` with Expo SDK 54
2. Offline-first architecture:
   - SQLite local cache for viewed courses/annotations
   - Queue mutations when offline → sync on reconnect
   - Optimistic UI updates
3. Core screens: Login, Course list, Video player, Annotations, Search, AI Chat
4. Push notifications for agent completion, annotation replies

### Phase 8.2: Transcription Worker Pipeline

**Tasks**:

1. Implement `apps/transcription-worker/`:
   - NATS consumer listening to `edusphere.*.media.uploaded`
   - Downloads media from MinIO
   - Runs faster-whisper for speech-to-text
   - Writes `TranscriptSegment` records with timestamps
   - Triggers embedding generation for each segment
   - Publishes `transcription.status` updates
2. GPU support configuration for faster-whisper
3. Batch processing for multiple concurrent uploads

### Phase 8.3: Chavruta (Partner Learning) Features

**Tasks**:

1. Real-time paired study session:
   - Match two users on the same content
   - Shared annotation canvas via Yjs CRDT
   - AI Chavruta agent mediating discussion
   - Debate mode: present thesis → AI finds contradictions → users argue → synthesize
2. Session recording and summary generation
3. Progress tracking and learning analytics

**Phase 8 Acceptance Criteria**:

```bash
# Mobile app builds for iOS and Android
pnpm --filter @edusphere/mobile expo build  # exits 0

# Offline mode: create annotation while disconnected
# → reconnect → annotation syncs to server

# Transcription pipeline: upload video → segments appear within 2 minutes
# → embeddings generated for all segments

# Chavruta session: two users see real-time shared canvas
# → AI agent responds to both users' annotations
# → Session summary generated on close
```

---

## Phase 9: Dashboard Analytics (✅ Completed — Feb 2026)

**Delivered:**

- ActivityHeatmap: GitHub-style 12-week study activity grid
- LearningStats: course progress bars + weekly sparkline chart
- ActivityFeed: typed activity items with color-coded icons (study/quiz/annotation/ai/discussion)
- Dashboard stats: Learning Streak, Study Time, Concepts Mastered cards

---

## Phase 10: Video Player + Transcript Sync (✅ COMPLETED — Mar 2026)

**Problem:** Users cannot watch any video content. The core learning loop is broken.

### Phase 10.1: Video Player with HLS Streaming

**Tasks:**

1. Install Video.js + `@videojs/http-streaming` (HLS support)
2. Build `VideoPlayerCore.tsx` component:
   - HLS stream from MinIO presigned URLs
   - Playback controls: play/pause, seek, speed (0.5x–2x), fullscreen
   - Quality selector (360p / 720p / 1080p)
   - Keyboard shortcuts: Space=play, ←/→=seek 5s, F=fullscreen
3. Integrate into existing `ContentViewer.tsx` replacing placeholder

### Phase 10.2: Transcript Panel with Sync

**Tasks:**

1. Build `TranscriptPanel.tsx`:
   - Fetch segments from Knowledge subgraph (`transcriptSegments` query)
   - Auto-scroll to active segment based on `currentTime`
   - Click segment → seek video to that timestamp
   - Highlight current word (word-level timestamps from Whisper)
2. Two-column layout: Video (left 60%) | Transcript (right 40%)
3. Toggle transcript panel visibility

### Phase 10.3: Transcript Search → Video Jump

**Tasks:**

1. Search input in transcript panel header
2. Filter segments by text match
3. Click result → seek to timestamp
4. "Found N results" indicator

**Acceptance Criteria:**

```bash
# Video loads and plays HLS stream
# Transcript scrolls automatically as video plays
# Clicking a transcript line seeks video to that time
# Search in transcript filters and jumps to result
```

---

## Phase 11: Semantic Search UI (✅ COMPLETED — Mar 2026)

**Problem:** No search bar exists anywhere in the UI. The Knowledge subgraph is fully built but inaccessible.

### Phase 11.1: Global Search Bar

**Tasks:**

1. Add search input to Layout header (top navigation)
2. Keyboard shortcut: `Cmd+K` / `Ctrl+K` opens search modal
3. Debounced search (300ms) as user types
4. Show recent searches from localStorage

### Phase 11.2: Search Results Page (`/search?q=...`)

**Tasks:**

1. New `SearchPage.tsx` route at `/search`
2. Call `hybridSearch` GraphQL query (Knowledge subgraph)
3. Results display:
   - Course title + module title + snippet with highlighted match
   - Timestamp badge for video segments (e.g., "2:34")
   - Similarity score badge
   - Click → navigate to `/learn/:contentId?t=<seconds>`
4. Filter sidebar: by course, content type (video/PDF), date range
5. Toggle: Semantic / Keyword search mode

### Phase 11.3: Search Results → Video Timestamp

**Tasks:**

1. Pass `t` query param to `ContentViewer.tsx`
2. Auto-seek video to timestamp on load
3. Highlight matching transcript segment

**Acceptance Criteria:**

```bash
# Cmd+K opens search modal from any page
# Typing returns results from Knowledge subgraph within 500ms
# Clicking a video result opens ContentViewer at correct timestamp
# Transcript segment is highlighted
```

---

## Phase 12: AI Agent Chat Interface (✅ COMPLETED — Mar 2026)

**Problem:** `AgentsPage.tsx` exists but there is zero chat UI. The entire AI layer (LangGraph, Vercel AI SDK) is backend-only.

### Phase 12.1: Agent Chat Panel

**Tasks:**

1. Build `AgentChatPanel.tsx`:
   - Message list with user/assistant bubbles
   - Input textarea with `Enter` to send, `Shift+Enter` for newline
   - Send button with loading spinner
   - Streaming tokens display (SSE from Agent subgraph)
   - Copy message button
   - Markdown rendering in assistant messages (react-markdown)
2. Connect to `executeAgent` mutation + `agentMessageStream` subscription
3. Show agent name + avatar in header

### Phase 12.2: Agent Template Selector

**Tasks:**

1. Sidebar or modal with 4 templates:
   - 🎓 **Chavruta** (debate partner)
   - 📝 **Summarizer** (content summary)
   - ❓ **Quiz Master** (adaptive quiz)
   - 🔍 **Research Scout** (sources + citations)
2. Each template: name, description, icon, example prompt
3. Select template → pre-fill system prompt → start session

### Phase 12.3: Agent History

**Tasks:**

1. Session list sidebar: past conversations
2. Click session → load message history
3. "New Chat" button → clear and start fresh

**Acceptance Criteria:**

```bash
# User selects Chavruta template → chat opens with greeting
# User sends message → streaming response appears token by token
# User can start a Quiz → receives quiz questions
# Session is saved and retrievable from history
```

---

## Phase 13: Knowledge Graph Visualization (✅ COMPLETED — Mar 2026)

**Problem:** `KnowledgeGraph.tsx` renders an empty page. Backend graph data exists but no visualization.

### Phase 13.1: Graph Canvas

**Tasks:**

1. Install `cytoscape` + `react-cytoscapejs` (or D3.js force-directed)
2. Build `GraphCanvas.tsx`:
   - Fetch concepts from `conceptsByTenant` + `getRelatedConcepts` queries
   - Render nodes: Concept (blue), Term (green), Source (orange), Person (purple)
   - Render edges: RELATES_TO, PART_OF, MENTIONED_IN
   - Pan, zoom, fit-to-screen controls
   - Node click → open detail panel

### Phase 13.2: Concept Detail Panel

**Tasks:**

1. Slide-in right panel on node click:
   - Concept name + type badge
   - Description
   - Related concepts list (clickable → navigate graph)
   - Linked content items (click → open ContentViewer)
2. "Explore from here" button → re-center graph on this concept

### Phase 13.3: Learning Path Overlay

**Tasks:**

1. Highlight mastered concepts (based on user progress) in green
2. Show "next recommended" concept in orange
3. Progress percentage overlay on graph

**Acceptance Criteria:**

```bash
# Graph renders within 2 seconds with 50+ nodes
# Clicking a node shows detail panel
# User's mastered concepts are visually distinct
# Clicking linked content opens ContentViewer
```

---

## Phase 14: Annotation System — Full Integration (✅ COMPLETED — Feb 2026)

**Problem:** Annotation backend is complete (Phase 3) but frontend has only a demo page. No annotation during video playback.

### Phase 14.1: Annotation Overlay on Video

**Tasks:**

1. Render annotation markers on video progress bar (colored dots at timestamps)
2. Click marker → jump to that time + show annotation popup
3. "Add annotation at current time" button during playback
4. Annotation form: text input + type selector (NOTE/HIGHLIGHT/BOOKMARK/QUESTION)

### Phase 14.2: Layer Filtering

**Tasks:**

1. Layer toggle buttons: PERSONAL / SHARED / INSTRUCTOR / AI_GENERATED
2. Show count per layer
3. Filter affects both progress bar markers and list view
4. Persist filter preference in localStorage

### Phase 14.3: Thread Replies

**Tasks:**

1. Click annotation → expand thread
2. Reply input at bottom of thread
3. Reply count badge on annotation marker

**Acceptance Criteria:**

```bash
# Annotation markers visible on video progress bar
# Can create annotation at current video timestamp
# Layer toggles filter annotations correctly
# Thread replies load and can be added
```

---

## Phase 15: Authentication Completion + User Menu (✅ COMPLETED — Feb 2026)

**Problem:** No logout button exists. Users cannot log out or view their profile.

**Tasks:**

1. Add user avatar + dropdown menu to Layout header:
   - Display name + email
   - "Profile" link → `/profile` page
   - "Settings" link → `/settings` page
   - "Logout" button → Keycloak logout + redirect to `/login`
2. Build `ProfilePage.tsx`:
   - Edit display name, avatar upload
   - Notification preferences
   - Learning statistics summary
3. Route guards: redirect unauthenticated users to `/login`
4. Role-based navigation: hide admin links from students

**Acceptance Criteria:**

```bash
# Logout button visible and functional in all authenticated pages
# Clicking logout clears Keycloak session and redirects to /login
# Profile page loads and shows user data
# Unauthenticated users redirected to /login from any protected route
```

---

## Phase 16: Course Management UI (✅ COMPLETED — Feb 2026)

**Problem:** Instructors have no UI to create or manage courses. Only students see (read-only) course list.

**Tasks:**

1. "New Course" button on CourseList page (visible to INSTRUCTOR+ roles only)
2. Course creation wizard (3 steps): metadata → modules → publish
3. Module management: drag-and-drop reorder, add/remove
4. Course settings page: description, prerequisites, thumbnail upload
5. Publish / Unpublish toggle with confirmation dialog
6. Student enrollment: "Enroll" button on course card

**Acceptance Criteria:**

```bash
# Instructor can create a course with title, description, thumbnail
# Can add modules and reorder them
# Can publish course and see it appear in student's course list
# Student can enroll in a published course
```

---

## Phase 17: Collaboration Real-Time Editor (✅ COMPLETED — Feb 2026)

**Problem:** CollaborationPage.tsx is a stub. Yjs/Hocuspocus backend exists but no frontend editor.

**Tasks:**

1. Install `@tiptap/react` + Yjs extension for collaborative editing
2. Build `CollaborativeEditor.tsx`:
   - Rich text editing (bold/italic/lists/headings)
   - Real-time cursor presence (colored per user)
   - User avatar list (active participants)
   - Document title editing
3. Integrate with Collaboration subgraph WebSocket endpoint
4. Offline queue: buffer changes locally, sync on reconnect

**Acceptance Criteria:**

```bash
# Two browser tabs see each other's cursors in real-time
# Text changes sync within 200ms
# Disconnecting and reconnecting syncs buffered changes
```

---

## Phase 18 — Admin Dashboard Upgrade + LessonResults (✅ Complete)
**Status:** ✅ Complete | **Session:** Session 18–21 | **Date:** 2026-03-02 to 2026-03-05

### What Was Built
- `LessonResultsPage` with all 10 pipeline output types (transcript, summary, quiz, flashcards, annotations, embeddings, entities, topics, video chapters, SCORM)
- Admin Phase 1–3: User Management CRUD with role confirm modal + toasts, Org Settings, Analytics dashboard
- Custom Pipeline Builder ("Build from Scratch") — visual node editor
- `useOptimistic` pattern for instant UI feedback on mutations
- OpenBadges federation moved from Core → Content subgraph

### Acceptance Criteria
- [x] `LessonResultsPage` renders all 10 pipeline output types (E2E 28/28)
- [x] Admin User Management CRUD works for all 5 roles
- [x] Custom Pipeline Builder saves and runs custom workflows
- [x] `pnpm turbo test` passes 100%
- [x] TypeScript: 0 errors

### Key Files
- `apps/web/src/pages/LessonResultsPage.tsx`
- `apps/web/src/pages/AdminDashboardPage.tsx`
- `apps/web/src/pages/PipelineBuilderPage.tsx`
- `apps/web/e2e/lesson-results.spec.ts`

---

## Phase 19 — Media Upload + i18n Infrastructure (✅ Complete)
**Status:** ✅ Complete | **Session:** Session 18–19 | **Date:** 2026-03-02

### What Was Built
- MinIO media upload pipeline: bucket auto-creation, presigned URL generation, S3 CRC32 fix, `.doc` content-type
- 15 i18n namespaces (EN + HE): added `srs` namespace, translated AdminSidebar, LTI/SCIM nav labels
- Lighthouse CI Core Web Vitals gate + bundle-size-check
- Vite `manualChunks`: split 523 kB entry bundle into cacheable vendor layers
- pnpm security overrides: `tar >=7.5.10`, `rollup >=4.59.0`, `minimatch >=9.0.7`, `serialize-javascript >=7.0.3`

### Acceptance Criteria
- [x] Media upload end-to-end: file → MinIO → lesson asset → video player
- [x] 15 i18n namespaces pass assertion test
- [x] Lighthouse Performance score gate in CI
- [x] Zero high vulnerabilities (`pnpm audit --audit-level=high`)
- [x] pnpm lockfile consistent across all packages

### Key Files
- `apps/subgraph-content/src/media/media.service.ts`
- `packages/i18n/src/locales/en/` (15 namespace files)
- `packages/i18n/src/locales/he/` (15 namespace files)
- `apps/web/vite.config.ts`

---

## Phase 20 — Security Compliance (G-01 to G-22) (✅ Complete)
**Status:** ✅ Complete | **Session:** Session 19–20 | **Date:** 2026-03-03

### What Was Built
- CQI-003: Eliminated all `no-explicit-any` from production code across all 6 subgraphs, web, and mobile
- CodeQL critical/high vulnerability fixes (12 issues resolved)
- Keycloak UUID alignment: all 5 demo users have consistent UUIDs across Keycloak + DB
- BUG-037/038: SourceManager Unauthorized + Lesson page Unauthorized errors permanently fixed
- HIVE-001: GraphQL Hive schema composition CI gate enforced on every PR
- Visual QA: 53/53 routes verified zero-error across all 5 user roles

### Acceptance Criteria
- [x] `pnpm test:security` passes all 813 security tests
- [x] CodeQL: 0 critical/high alerts
- [x] `no-explicit-any`: 0 violations in production code
- [x] All 5 demo users authenticate successfully
- [x] Hive CI gate blocks breaking schema changes

### Key Files
- `tests/security/` (32 spec files, 813 tests)
- `infrastructure/keycloak/realm-export.json`
- `apps/subgraph-knowledge/src/source/source.service.ts`
- `apps/web/src/lib/urql/` (auth exchange hardening)

---

## Phase 21 — Memory Safety (OnModuleDestroy + Frontend Timers) (✅ Complete)
**Status:** ✅ Complete | **Session:** Session 20–21 | **Date:** 2026-03-05

### What Was Built
- `OnModuleDestroy` implemented on all 20+ NestJS services with DB/NATS connections
- `clearInterval`/`clearTimeout` in all React hooks and components using timers
- `useOfflineQueue` precursor: max-size eviction for unbounded Maps and arrays
- Frontend subscription cleanup: `pause: true` guard on all `useSubscription` hooks
- Memory testing: `*.memory.spec.ts` and `*.memory.test.ts` for all new services and hooks

### Acceptance Criteria
- [x] All 20+ services implement `OnModuleDestroy` with `closeAllPools()` / `close()` calls
- [x] All `setInterval` usages in components have corresponding `clearInterval` in `useEffect` cleanup
- [x] `*.memory.spec.ts` tests verify cleanup is called on `onModuleDestroy()`
- [x] No unbounded Maps or Arrays (all have max-size eviction or `slice(-N)` guards)

### Key Files
- `apps/subgraph-agent/src/agent/agent.service.ts` (`implements OnModuleDestroy`)
- `apps/subgraph-knowledge/src/knowledge/knowledge.service.ts`
- `apps/web/src/hooks/useOfflineQueue.ts`
- `apps/web/src/hooks/useOfflineStatus.ts`

---

## Phase 22 — i18n Completion + Admin Phase 7 + Gateway v2.5 (✅ Complete)
**Status:** ✅ Complete | **Session:** Session 22 | **Date:** 2026-03-05

### What Was Built
- Hive Gateway upgraded to v2.5.1: improved performance, federation v2.7 compliance
- Admin Phase 7 — Notification Templates: template editor with variable interpolation, preview, channel selector
- Code Quality Initiative (CQI): T2 (no-explicit-any), T4 (file splitting <150 lines), T6 (barrel files), T8 (service extraction), T9 (test isolation), T11 (memory safety hooks)
- E2E expansion: Playwright specs for 10 additional admin routes
- BUG-047: Language persistence fixed (Hebrew UI setting survives page refresh)
- BUG-048: Drizzle schema drift identified and resolved (`courses.ts` was dead; `content.ts` is the real schema)
- BUG-052: React concurrent-mode `useUserPreferences` + `SRSWidget` — `mounted` guard added

### Acceptance Criteria
- [x] Hive Gateway v2.5.1 composes supergraph without errors
- [x] Admin Notification Templates — create, edit, preview, delete
- [x] Language setting (HE/EN) persists across page refreshes
- [x] `pnpm turbo test` — 100% pass
- [x] TypeScript: 0 errors across 26 packages

### Key Files
- `apps/gateway/` (v2.5.1 config)
- `apps/web/src/pages/NotificationTemplatesPage.tsx`
- `apps/web/src/hooks/useUserPreferences.ts`
- `packages/i18n/src/locales/` (EN + HE, 15 namespaces)

---

## Phase 23 — Mobile Polish + LoggerModule + TIME Constants (✅ Complete)
**Status:** ✅ Complete | **Session:** Session 23 | **Date:** 2026-03-05

### What Was Built
- `LoggerModule` extraction: shared NestJS Pino logger module — consistent structured logging across all 6 subgraphs
- `TIME` constants (`packages/config`): `SECONDS`, `MINUTES`, `HOURS` — replaces magic number durations
- Mobile TypeScript hardening: all remaining `any` types replaced with proper interfaces in mobile screens and services
- `@ts-expect-error` descriptions enforced for all suppressed errors (CI pipeline requirement)
- `apps/mobile/src/lib/ai-consent.ts`: AI consent utilities for third-party LLM calls (SI-10)
- `apps/mobile/src/lib/stats-utils.ts`: learning statistics utility functions

### Acceptance Criteria
- [x] All 6 subgraphs use `LoggerModule` for structured Pino logging (no `console.log`)
- [x] `TIME` constants used for all duration magic numbers
- [x] Mobile TypeScript: 0 `no-explicit-any` violations
- [x] `pnpm turbo typecheck` — 0 errors across all 26 packages

### Key Files
- `packages/config/src/time.ts`
- `apps/mobile/src/lib/ai-consent.ts`
- `apps/mobile/src/lib/stats-utils.ts`
- `apps/mobile/src/screens/AITutorScreen.tsx`

---

## Phase 24 — PRD Gap Closure G1+G2+G3+G5+G6+G8 (✅ Complete)
**Status:** ✅ Complete | **Session:** Session 24 | **Date:** 2026-03-05

### What Was Built
- **G1 — Context Panel**: Debounced HybridRAG sidebar inside `UnifiedLearningPage` — shows Related Concepts (amber) + Related Segments (green) from active transcript segment
- **G2 — Video Sketch Overlay**: HTML5 Canvas freehand annotation over video; normalized coordinate paths saved as `SketchPath[]`; SVG overlay shows sketches within ±3s window
- **G3 — Annotation Promote**: `promoteAnnotation` mutation (backend + frontend); INSTRUCTOR-layer promotion button in `CommentCard`
- **G5 — Agent Studio**: No-code drag-and-drop LangGraph workflow builder with 6 node types, SVG bezier edges, properties panel
- **G6 — Deep Linking**: `SemanticResult.startTime` field; search → `/learn/:entityId?t=<seconds>` direct video timestamp links
- **G8 — Auto-Flashcards**: Annotation → SRS one-click flashcard creation (reuses `createReviewCard` mutation)

### Acceptance Criteria
- [x] Context Panel shows semantic results for current video segment
- [x] Video Sketch overlay canvas draws, saves, and displays paths at correct timestamps
- [x] `promoteAnnotation` mutation passes unit + integration tests
- [x] Agent Studio drag-and-drop works; Save/Deploy disabled when canvas empty
- [x] Search results for transcripts link to correct video timestamp
- [x] Flashcard created from annotation appears in SRS queue
- [x] Playwright E2E specs for all 6 features pass

### Key Files
- `apps/web/src/components/ContextPanel.tsx`
- `apps/web/src/components/VideoSketchOverlay.tsx`
- `apps/web/src/pages/AgentStudioPage.tsx`
- `apps/subgraph-annotation/src/annotation/annotation.service.ts` (`promote()`)
- `apps/web/e2e/agent-studio.spec.ts`
- `apps/web/e2e/video-sketch-overlay.spec.ts`

---

## Phase 25 — UI/UX Revolution (Design System + Accessibility + Learning Experience) (✅ Complete)
**Status:** ✅ Complete | **Session:** Session 25 Phases 1–4 | **Date:** 2026-03-05 to 2026-03-06

### What Was Built
- **Phase 25.1 — Design System**: Indigo `#6366F1` primary palette, mastery level tokens, `ThemeProvider` (3-tier: globals → tenant → user), `LandingPage`, `MasteryBadge`
- **Phase 25.2 — Navigation + Dashboard**: `AppSidebar` (240px/64px collapsible, 6 nav groups, hover tooltips), `DashboardPage` (5 sections), `CoursesDiscoveryPage`, `CourseCard`; tenant-themes DB migration (`0010`)
- **Phase 25.3 — Learning Experience**: `VideoPlayerWithCurriculum` (320px sidebar), `KnowledgeSkillTree` (BFS + SVG bezier edges)
- **Phase 25.4 — Accessibility (WCAG 2.2 AAA)**: `SkipLinks`, `useFocusTrap`, `useAnnounce` (dual live region), `useReducedMotion`, `ThemeSettingsPage`; FOUC prevention script in `index.html`

### Acceptance Criteria
- [x] `ThemeProvider` renders without flash of unstyled content (FOUC prevention)
- [x] `AppSidebar` collapses to 64px icon-only; expands to 240px on hover/click
- [x] `VideoPlayerWithCurriculum` curriculum sidebar scrolls independently
- [x] `KnowledgeSkillTree` BFS traversal renders all reachable nodes with SVG bezier edges
- [x] `SkipLinks` navigate to `#main-content` and `#main-nav` (keyboard accessible)
- [x] `useFocusTrap` traps Tab/Shift+Tab within modals
- [x] `useAnnounce` dual live region announces changes to screen readers
- [x] `ThemeSettingsPage` persists font size, color scheme, reduced motion, high contrast to `localStorage`
- [x] TypeScript: 0 errors | Lint: 0 warnings | Tests: 100% pass

### Key Files
- `apps/web/src/lib/theme.ts`
- `apps/web/src/components/ThemeProvider.tsx`
- `apps/web/src/components/AppSidebar.tsx`
- `apps/web/src/components/SkipLinks.tsx`
- `apps/web/src/hooks/useFocusTrap.ts`
- `apps/web/src/hooks/useAnnounce.ts`
- `apps/web/src/hooks/useReducedMotion.ts`
- `apps/web/src/pages/KnowledgeSkillTree.tsx`
- `apps/web/src/pages/ThemeSettingsPage.tsx`
- `packages/db/src/migrations/0010_tenant_themes.sql`

---

## Phase 26 — Mobile Design System Alignment + SkillTree Backend (✅ Complete)
**Status:** ✅ Complete | **Session:** Session 25 Phase 5 | **Date:** 2026-03-06

### What Was Built
- `apps/mobile/src/lib/theme.ts`: unified design tokens (`COLORS.primary = #6366F1`, `SPACING`, `RADIUS`, `FONT`, `SHADOW`)
- Mobile `MasteryBadge` component: 5-level badge with semantic colors, `testID` for test targeting
- Mobile screens redesigned with `COLORS.primary`: `HomeScreen` (streak row, 4 stat cards), `CoursesScreen` (search + left-accent cards), `ProfileScreen`, `SettingsScreen`
- Navigation `tabBarActiveTintColor` unified to `COLORS.primary`
- Backend SkillTree: `skill-tree.service.ts`, `skill-tree.resolver.ts` — Drizzle queries on `user_skill_mastery` table
- DB migration `0011_user_skill_mastery.sql`: `user_skill_mastery` table with RLS, mastery level enum, timestamps

### Acceptance Criteria
- [x] All mobile screens use `COLORS.primary` from `theme.ts` (no hardcoded `#007AFF` or `#2563EB`)
- [x] `MasteryBadge` renders all 5 levels with correct colors (unit test with `testID`)
- [x] `skill-tree.service` returns skill tree from DB (Drizzle mock in spec)
- [x] Migration `0011` applies without errors
- [x] Mobile vitest: `__DEV__: true` define prevents `ReferenceError`

### Key Files
- `apps/mobile/src/lib/theme.ts`
- `apps/mobile/src/screens/HomeScreen.tsx`
- `apps/mobile/src/screens/CoursesScreen.tsx`
- `apps/mobile/src/screens/ProfileScreen.tsx`
- `apps/subgraph-knowledge/src/graph/skill-tree.service.ts`
- `apps/subgraph-knowledge/src/graph/skill-tree.resolver.ts`
- `packages/db/src/schema/user-skill-mastery.ts`
- `packages/db/src/migrations/0011_user_skill_mastery.sql`

---

## Phase 27: Live Sessions, Offline Web, Course Discovery, KG Context (✅ COMPLETED — Mar 2026)

**Goal:** Wire live session CRUD, add offline web PWA capabilities, build CoursesDiscovery UI, and connect KnowledgeGraph to courseId context.

**Tasks:**
1. Route fix: /explore, /discover, /courses/discover
2. Live Sessions FE + BE + NATS (startLiveSession, LiveSessionsPage, NATS events)
3. Offline Web: ServiceWorker + IndexedDB + OfflineBanner
4. KnowledgeGraph courseId context + AdminActivityFeed

**Acceptance Criteria:** All tests pass, E2E Playwright for live sessions + offline scenarios.

### What Was Built
- `LiveSessionsPage` + `LiveSessionDetailPage` with NATS JetStream event integration
- `OfflineLessonCache` (IndexedDB), `OfflineBanner`, `useOfflineStatus`, `useOfflineQueue` (100-item LRU)
- `AdminActivityFeed` with 30-second auto-refresh and `clearInterval` cleanup
- `KnowledgeGraphPage` passes `courseId` from URL params to graph queries
- Routes: `/explore`, `/discover`, `/courses/discover`, `/sessions`, `/skill-tree` fully wired
- Security: `attendeePasswordEnc`/`moderatorPasswordEnc` AES-256-GCM encryption (SI-3)
- BUG-054: `<Progress>` `indicatorClassName` prop added — `barColor` now on inner div only
- 175 new tests (109 unit + 66 E2E), 44 visual regression screenshots

### Key Files
- `apps/web/src/pages/LiveSessionsPage.tsx`
- `apps/web/src/pages/LiveSessionDetailPage.tsx`
- `apps/web/src/services/OfflineLessonCache.ts`
- `apps/web/src/components/OfflineBanner.tsx`
- `apps/web/src/hooks/useOfflineStatus.ts`
- `apps/web/src/hooks/useOfflineQueue.ts`
- `apps/web/src/components/AdminActivityFeed.tsx`
- `apps/web/e2e/live-sessions.spec.ts`
- `apps/web/e2e/offline-mode.spec.ts`

---

## Phase 28 — Live Sessions Mutations + Offline Sync + PWA + SI-3 Fix
**Status:** ✅ Complete | **Session:** Session 28 | **Date:** 2026-03-06 | **Commits:** `fddb6c0`, `1cc2469`, `a94a5d6`

### What Was Built
- Live Session mutations: end/join/cancel/start fully implemented with `useLiveSessionActions` hook
- SI-3 security fix: `encryptField()`/`decryptField()` in `live-session.service.ts` (plaintext never stored)
- `useOfflineQueue`: online-event flush + 48h TTL + 100-item LRU + onFlush callback
- PWA: `pwa.ts` service worker callbacks, hourly update poll, `vite.config.ts` Indigo theme_color
- `CoursesDiscovery` filters: Category + Level + Sort + ARIA (`aria-pressed`, `role="group"`)
- DB migration 0012: idempotent custom_migrations runner
- NATS SI-7 fix: TLS via environment variables
- Husky v10 pre-commit hook fix

### Acceptance Criteria
- [x] All 4 Live Session mutations working with role-based guards
- [x] SI-3: no plaintext passwords ever written to DB
- [x] Offline queue flushes automatically on reconnect
- [x] PWA installable with Indigo theme
- [x] `pnpm turbo test` 100% pass

### Key Files
- `apps/subgraph-agent/src/live-sessions/live-sessions.service.ts`
- `apps/web/src/hooks/useLiveSessionActions.ts`
- `apps/web/src/hooks/useOfflineQueue.ts`
- `apps/web/src/pwa.ts`
- `packages/db/src/migrations/0012_live_sessions_enc_rename.sql`

---

## Phase 29 — Stripe Checkout Flow (PRD §8.4)
**Status:** ✅ Complete | **Session:** Session 28 | **Date:** 2026-03-06 | **Commit:** `be3705a`

### What Was Built
- `CheckoutPage.tsx`: Stripe Elements with `clientSecret` from URL, success redirect, graceful fallbacks
- `PurchaseCourseButton`: URL-based secret passing, `/checkout` route (lazy-loaded, guarded)
- Packages: `@stripe/stripe-js`, `@stripe/react-stripe-js`
- Security: `clientSecret` never stored in `localStorage` or exposed in DOM

### Acceptance Criteria
- [x] Stripe checkout page renders with Elements
- [x] Success redirect after payment
- [x] `clientSecret` never in localStorage or DOM text
- [x] 8 unit + 8 E2E tests pass

### Key Files
- `apps/web/src/pages/CheckoutPage.tsx`
- `apps/web/src/components/PurchaseCourseButton.tsx`
- `apps/web/e2e/checkout-flow.spec.ts`

---

## Phase 30 — Personal Knowledge Graph Wiki + Annotation Merge Request (PRD §4.3+§4.4)
**Status:** ✅ Complete | **Session:** Session 28 | **Date:** 2026-03-06 | **Commit:** `4ae6614`

### What Was Built
- `PersonalGraphView.tsx`: SVG wiki of personal annotations across all courses (6 nodes, 7 edges, course colour legend, detail panel)
- `KnowledgeGraph.tsx`: Global / My Wiki tab toggle with `viewMode: 'global' | 'personal'`
- `AnnotationMergeRequestModal.tsx`: propose annotation to official knowledge base (0/500 char counter)
- `AnnotationItem.tsx`: "Propose to Official" button (PERSONAL layer + own-user guard)
- `InstructorMergeQueuePage.tsx`: diff view, approve/reject, resolved section; route `/instructor/merge-queue`

### Acceptance Criteria
- [x] Personal graph shows annotations linked across courses
- [x] Tab toggle between global and personal views
- [x] Annotation merge request modal with char counter
- [x] Instructor merge queue with approve/reject
- [x] 44 unit + 15 E2E tests pass

### Key Files
- `apps/web/src/components/PersonalGraphView.tsx`
- `apps/web/src/components/AnnotationMergeRequestModal.tsx`
- `apps/web/src/pages/InstructorMergeQueuePage.tsx`
- `apps/web/e2e/annotation-merge-request.spec.ts`

---

## Phase 31 — Video Sketch Overlay Enhancement (PRD §4.2 P-1)
**Status:** ✅ Complete | **Session:** Session 28 | **Date:** 2026-03-06 | **Commit:** `2c9d178`

### What Was Built
- `useSketchCanvas.ts`: 6 drawing tools — freehand, eraser (destination-out), rect, arrow, ellipse, text
- `VideoSketchToolbar.tsx`: tool buttons with `aria-pressed`, color picker swatch, Save/Clear/Cancel
- Text tool: positioned `<input>` on canvas click, commits on Enter/blur
- Shape preview during mousemove via `shapeEndRef` pattern
- Backward-compatible `SketchPath` re-export preserved

### Acceptance Criteria
- [x] All 6 tools functional with canvas rendering
- [x] Color picker changes tool color
- [x] Text tool creates canvas text
- [x] Eraser uses `destination-out` composite operation
- [x] 34 total sketch tests pass (21 new + 13 existing)

### Key Files
- `apps/web/src/hooks/useSketchCanvas.ts`
- `apps/web/src/components/VideoSketchToolbar.tsx`
- `apps/web/src/components/VideoSketchOverlay.tsx`
- `apps/web/e2e/video-sketch.spec.ts`

---

## Phase 32 — Real-time AI Subtitle Translation (PRD §3.4 G-2)
**Status:** ✅ Complete | **Session:** Session 28 | **Date:** 2026-03-06 | **Commit:** `720b7c9`

### What Was Built
- `TranslationService`: LibreTranslate HTTP client, VTT generation, MinIO upload, NATS event
- `SubtitleTrack` GraphQL type; `subtitleTracks` field on `MediaAsset`
- `VideoSubtitleSelector`: CC button, language dropdown, Off option, ARIA attributes
- `VideoPlayer`: multi-language `<track>` element support
- DB migration 0013: `transcripts.vtt_key` column
- Env vars: `TRANSLATION_TARGETS`, `LIBRE_TRANSLATE_URL`

### Acceptance Criteria
- [x] Translation runs after transcription (non-blocking)
- [x] VTT files stored in MinIO with presigned URLs
- [x] Video player shows CC button + language selector
- [x] Empty `TRANSLATION_TARGETS` disables translation
- [x] 11 + 9 unit + 10 E2E + 3 visual tests pass

### Key Files
- `apps/subgraph-content/src/translation/translation.service.ts`
- `apps/web/src/components/VideoSubtitleSelector.tsx`
- `packages/db/src/migrations/0013_transcripts_vtt_key.sql`

---

## Phase 33 — Remote Proctoring (PRD §7.2 G-4)
**Status:** ✅ Complete | **Session:** Session 28 | **Date:** 2026-03-06 | **Commit:** `0d51873`

### What Was Built
- `ProctoringOverlay.tsx`: WebRTC webcam preview, tab-switch detection via `visibilitychange`, flag badge
- `ProctoringReportCard.tsx`: status badge + flag timeline list
- `ProctoringSession`, `ProctoringFlag`, `ProctoringFlagType` enum (GraphQL + DB)
- Mutations: `startProctoringSession`, `flagProctoringEvent`, `endProctoringSession`
- Queries: `proctoringSession`, `proctoringReport`
- DB migration 0014: `proctoring_sessions` table with JSONB flags, RLS tenant isolation
- Memory safety: `visibilitychange` listener removed + `MediaStream.getTracks().stop()` on unmount

### Acceptance Criteria
- [x] Webcam preview starts on session start
- [x] Tab-switch triggers flag automatically
- [x] Session lifecycle (start → flag → end) fully testable
- [x] RLS: tenants cannot access each other's sessions
- [x] 16 service + 23 component + 6 E2E + 3 visual tests pass

### Key Files
- `apps/subgraph-agent/src/proctoring/proctoring.service.ts`
- `apps/web/src/components/ProctoringOverlay.tsx`
- `packages/db/src/migrations/0014_proctoring_sessions.sql`
- `apps/web/e2e/proctoring.spec.ts`

---

## Phase 34 — 3D Models & Simulations (PRD §3.3 G-1)
**Status:** ✅ Complete | **Session:** Session 28 | **Date:** 2026-03-06 | **Commit:** `1e3314b`

This phase closes the last remaining PRD gap — ALL G and P items are now complete.

### What Was Built
- `Model3DViewer.tsx`: Three.js WebGL viewer via dynamic `import()`, OrbitControls, loading/error/unavailable states
- Full memory safety: `renderer.dispose()`, geometry/material/texture dispose, `OrbitControls.dispose()`, `cancelAnimationFrame()`, `ResizeObserver.disconnect()` in `useEffect` cleanup
- `Model3DInfo` type, `ModelAnimation` type, `AssetType.MODEL_3D` enum value
- `uploadModel3D` mutation: validates format (gltf/glb/obj/fbx), MinIO presigned PUT URL
- DB migration 0015: `model_format`, `model_animations` (JSONB), `poly_count` on `media_assets`
- Three.js vitest stubs for CI (three-stub, three-gltf-stub, three-orbit-stub)
- Package: `three` added to web dependencies

### Acceptance Criteria
- [x] 3D model renders in WebGL with orbit controls
- [x] Upload validates format (gltf/glb/obj/fbx only)
- [x] Memory fully cleaned up on component unmount (4 memory-safety tests)
- [x] CI passes with Three.js stubs (no WebGL in test environment)
- [x] 14 service + 18 component + 5 E2E + 2 visual tests pass

### Key Files
- `apps/web/src/components/Model3DViewer.tsx`
- `apps/subgraph-content/src/media/media.service.ts` (uploadModel3D)
- `packages/db/src/migrations/0015_model3d.sql`
- `apps/web/e2e/model3d-viewer.spec.ts`

---

## Phase 35 — Performance, Analytics & Mobile Parity (Planned)
**Status:** 🔵 Planned | **Target Session:** Session 29

### Planned Scope
- **Performance:** Lighthouse score >= 90 on all major pages (code splitting, lazy loading, image optimization)
- **PWA:** Install prompt, push notifications (Keycloak events -> NATS -> mobile)
- **Mobile parity:** Live Sessions + SkillTree + Offline + 3D viewer on Expo SDK 54
- **Analytics dashboard:** Learning velocity, completion rates, mastery progression per tenant
- **AI recommendations:** Personalized learning paths from `UserSkillMastery` graph traversal

### Acceptance Criteria
- [ ] Lighthouse Performance >= 90 on Dashboard + Courses + Lesson pages
- [ ] PWA installable on Chrome, Safari, Firefox
- [ ] Mobile app: Live Sessions screen, SkillTree screen, Offline sync
- [ ] Analytics: 10+ metrics per tenant with time-range filters
- [ ] AI recommendations: skill gap identification + suggested next courses

### Prerequisites
- All PRD gaps closed (Phases 28-34) ✅
- UserSkillMastery data model (migration 0011) ✅
- Offline queue + ServiceWorker (Phase 28) ✅

---

## Cross-Cutting Concerns (Active in ALL Phases)

### Testing Strategy

| Test Type             | Tool                    | Coverage Target                               | When Run            |
| --------------------- | ----------------------- | --------------------------------------------- | ------------------- |
| **Unit Tests**        | Vitest                  | >90% line coverage per package                | Every commit        |
| **Integration Tests** | Vitest + Testcontainers | All DB operations, RLS, graph queries         | Every PR            |
| **API Tests**         | SuperTest + GraphQL     | All 44 queries, 44 mutations, 7 subscriptions | Every PR            |
| **E2E Tests**         | Playwright              | Core user flows (10+ scenarios)               | Pre-merge, nightly  |
| **Load Tests**        | k6                      | 100K concurrent users                         | Weekly, pre-release |
| **Security Tests**    | OWASP ZAP + custom      | No critical/high vulnerabilities              | Weekly              |
| **Schema Tests**      | Hive CLI                | No breaking changes                           | Every schema change |

### Code Quality Standards

- **TypeScript**: `strict: true`, `noUncheckedIndexedAccess: true`, `exactOptionalPropertyTypes: true`
- **ESLint**: `@typescript-eslint/strict-type-checked` with zero warnings in CI
- **Prettier**: Consistent formatting enforced by pre-commit hook
- **Commit convention**: Conventional Commits (`feat:`, `fix:`, `chore:`, etc.)
- **Branch protection**: Require passing CI + code review before merge
- **Dependency updates**: Renovate bot with auto-merge for patch/minor

### Security Checklist (Every Phase)

- [ ] No secrets in code or git history
- [ ] RLS policies verified for new tables
- [ ] JWT scopes checked for new mutations
- [ ] Input validation on all user-provided data (via Zod schemas)
- [ ] SQL injection prevented (parameterized queries via Drizzle)
- [ ] GraphQL query depth/complexity limits configured
- [ ] CORS properly configured
- [ ] Rate limiting applied to sensitive operations
- [ ] Audit logging for admin actions

### Documentation Requirements (Every Phase)

- [ ] README.md updated for new packages/apps
- [ ] API-CONTRACTS.md updated for schema changes
- [ ] docs/database/DATABASE_SCHEMA.md updated for table changes
- [ ] OpenAPI/GraphQL introspection endpoint accessible
- [ ] Architecture Decision Records (ADRs) for significant decisions

---

## Phase Dependency Graph

```
Phase 0 (Foundation)
  ├── 0.1 Monorepo ──→ 0.2 Docker ──→ 0.3 Hello World
  │
Phase 1 (Data Layer) [depends on Phase 0]
  ├── 1.1 Drizzle Schema ──→ 1.2 RLS ──→ 1.3 AGE Graph ──→ 1.4 Seed
  │
Phase 2 (Core + Content) [depends on Phase 1]
  ├── 2.1 Auth Infrastructure ──→ 2.2 Core Subgraph ──→ 2.3 Content Subgraph
  │
Phase 3 (Annotation + Collab) [depends on Phase 2]
  ├── 3.1 Annotation ──→ 3.2 Collaboration (parallel possible with 3.1)
  │
Phase 4 (Knowledge) [depends on Phase 2, can parallel with Phase 3]
  ├── 4.1 Graph Resolvers ──→ 4.2 Embeddings + Search
  │
Phase 5 (Agents) [depends on Phase 4]
  ├── 5.1 Agent CRUD ──→ 5.2 LangGraph Workflows ──→ 5.3 Sandboxing
  │
Phase 6 (Frontend) [depends on Phase 2; iterative with Phases 3–5]
  ├── 6.1 Shell ──→ 6.2 Content ──→ 6.3 Annotations ──→ 6.4 Knowledge ──→ 6.5 Agents
  │
Phase 7 (Production) [depends on ALL previous phases]
  ├── 7.1 Performance ──→ 7.2 Observability ──→ 7.3 Security ──→ 7.4 K8s ──→ 7.5 Load Test
  │
Phase 8 (Mobile + Advanced) [depends on Phase 7]
  └── 8.1 Expo Mobile ──→ 8.2 Transcription ──→ 8.3 Chavruta
```

### Parallelization Opportunities

- **Phase 3 + Phase 4**: Annotation and Knowledge subgraphs can be developed in parallel (both depend on Phase 2 but not each other)
- **Phase 6.1–6.2 + Phase 3–5**: Frontend shell and content UI can start while remaining subgraphs are built
- **Phase 7.2 (Observability)**: Can start alongside Phase 5–6 for incremental monitoring setup
- **Phase 8.1 (Mobile) + Phase 8.2 (Transcription)**: Fully parallel development paths

---

## Quick Start Command for Claude Code

When starting a new session, Claude Code should run:

```bash
# 1. Load all reference documents
cat docs/database/DATABASE_SCHEMA.md API_CONTRACTS_GRAPHQL_FEDERATION.md

# 2. Check current progress
git log --oneline -20
ls -la apps/ packages/

# 3. Determine current phase by checking acceptance criteria
./scripts/health-check.sh 2>/dev/null
pnpm turbo build 2>/dev/null
pnpm turbo test 2>/dev/null

# 4. Resume from the first failing acceptance criterion
```

---

## Estimated Total Duration

| Phase                        | Duration | Cumulative |
| ---------------------------- | -------- | ---------- |
| Phase 0: Foundation          | 1–2 days | 1–2 days   |
| Phase 1: Data Layer          | 2–3 days | 3–5 days   |
| Phase 2: Core + Content      | 3–5 days | 6–10 days  |
| Phase 3: Annotation + Collab | 3–4 days | 9–14 days  |
| Phase 4: Knowledge           | 4–5 days | 13–19 days |
| Phase 5: Agents              | 4–5 days | 17–24 days |
| Phase 6: Frontend            | 5–7 days | 22–31 days |
| Phase 7: Production          | 5–7 days | 27–38 days |
| Phase 8: Mobile + Advanced   | 5–7 days | 32–45 days |

**Total: 32–45 working days** (with parallelization: ~25–35 days)

---

> **CRITICAL REMINDER FOR CLAUDE CODE**:
>
> - **Never skip phases.** Each phase builds on the previous one.
> - **Run acceptance criteria before proceeding.** Green output = permission to advance.
> - **Report progress every 3 minutes** using the format above.
> - **Reference API-CONTRACTS and DATABASE_SCHEMA** for every type, field, and resolver.
> - **No deviation** from the locked technology stack without updating this document.
> - **Test everything.** No untested code enters the repository.
