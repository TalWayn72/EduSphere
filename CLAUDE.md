# EduSphere - AI Assistant Configuration

## Project Context

- **Type:** Knowledge Graph Educational Platform - Production Scale (100,000+ concurrent users)
- **Architecture:** GraphQL Federation (6 subgraphs) + Apache AGE + pgvector + AI Agents
- **Stack:** NestJS + GraphQL Yoga | React 19 + Vite 6 | Expo SDK 54 | Drizzle ORM + PostgreSQL 18 + Apache AGE + pgvector
- **Monorepo:** pnpm workspaces + Turborepo - `apps/*`, `packages/*`, `infrastructure/`
- **Repository:** [Internal/Private]
- **Node:** >=20.0.0 | **pnpm:** >=10.0.0

## Boundaries

| Path                                           | Reason                              |
| ---------------------------------------------- | ----------------------------------- |
| `C:\Users\P0039217\.claude\projects\EduSphere` | **ACTIVE PROJECT - WORK HERE ONLY** |
| All other paths                                | **DO NOT ACCESS**                   |

**Active project only:** `C:\Users\P0039217\.claude\projects\EduSphere`

## Document Storage Rule — MANDATORY

> **ALL project documents MUST be saved inside the project folder or its sub-folders only.**
> **NEVER** save plans, docs, specs, or any project artifact to `C:\Users\P0039217\.claude\plans\` or any path outside the project directory.
>
> **Correct locations within the project:**
>
> - Plans & implementation specs → `docs/plans/`
> - Security & compliance docs → `docs/security/`
> - Architecture decisions → `docs/architecture/`
> - ISMS & ISO documents → `docs/isms/`
> - API contracts → `API_CONTRACTS_GRAPHQL_FEDERATION.md` (root)
> - All others → `docs/<relevant-subfolder>/`
>
> **Enforcement:** When plan mode writes a plan file, immediately move it to the project before any other work. Check with `ls docs/plans/` that the file is in the correct location.

## Language & Permissions

- **Communication:** Hebrew | **Code & Docs:** English
- **Auto-approved:** File ops (Read, Write), Git (all operations including commit/push), pnpm, Bash, Docker, VS Code extensions, MCP tool calls
- **No approval needed:** Execute directly without asking - Bash commands, Write operations, Git commits, MCP server tests, Docker operations, file edits
- **CRITICAL — IRON RULE — NEVER VIOLATE:** DO NOT ask "Can I do X?" or "Should I do Y?" or "האם לבצע?" or "האם להפעיל?" — Just execute immediately. No exceptions. This applies to ALL operations: MCP tests, Docker, git, file writes, Bash commands, running servers, making API calls. If in doubt — execute, don't ask.
- **VIOLATION EXAMPLE (FORBIDDEN):** "האם לבצע Reload Window?" / "Should I run the tests?" / "רוצה שאפעיל?"
- **CORRECT BEHAVIOR:** Detect what needs to be done → execute it → report results.

## Architecture & Patterns

### GraphQL Federation (Hive Gateway v2 + GraphQL Yoga)

- **Gateway:** Hive Gateway v2 (port 4000) - MIT-licensed Federation v2.7 gateway
- **6 Subgraphs:** Core (4001), Content (4002), Annotation (4003), Collaboration (4004), Agent (4005), Knowledge (4006)
- **Pattern:** Schema-first SDL → Resolvers implement contract
- **Entity ownership:** Each entity owned by exactly one subgraph, others extend with `@key` stubs
- **Transport:** JWT with `tenant_id` → Gateway propagates `x-tenant-id` header → Subgraphs enforce RLS
- **Schema Registry:** GraphQL Hive for breaking change detection

### Backend (Subgraphs - NestJS + GraphQL Yoga)

- **Pattern:** Controllers (thin) → Services (business logic) → Drizzle ORM → PostgreSQL
- **GraphQL:** `@graphql-yoga/nestjs-federation` with `YogaFederationDriver` (schema-first)
- **Validation:** Zod schemas on all mutations, input sanitization middleware globally
- **Auth:** JWT via Keycloak (OIDC), `@authenticated` / `@requiresScopes` / `@requiresRole` directives
- **Logging:** Pino logger (NOT console.log) - levels: trace/debug/info/warn/error/fatal
- **Event-driven:** NATS JetStream for async messaging (content.created, annotation.added, agent.message)
- **Middleware stack:** security → logging → auth → RLS context → rate-limit → resolver

### Database (PostgreSQL 16 + Apache AGE + pgvector)

- **PostgreSQL 16+** with extensions: uuid-ossp, pgcrypto, age (1.5.0), vector (0.8.0)
- **Apache AGE:** Cypher graph queries for knowledge graph (Concept, Person, Term, Source, TopicCluster)
- **pgvector:** HNSW indexes for semantic search (768-dim nomic-embed-text embeddings)
- **Multi-tenancy:** Row-level security (RLS) with `SET LOCAL app.current_tenant = '<uuid>'`
- **ORM:** Drizzle ORM v1 with native RLS support (`pgTable.withRLS()`)
- **All DB queries via Drizzle only** - never raw SQL except for Apache AGE Cypher queries

### Frontend (`apps/web` - React + Vite)

- **State:** TanStack Query v5 for server state, Zustand v5 for client UI state
- **Forms:** React Hook Form + Zod resolvers
- **API Client:** GraphQL client with `graphql-request` or `urql` + service layer
- **Routing:** React Router v6
- **UI:** shadcn/ui (Radix UI primitives) + Tailwind CSS
- **Path alias:** `@/*` maps to `src/*`

### Mobile (`apps/mobile` - Expo SDK 54)

- **Framework:** Expo SDK 54 (React Native 0.81)
- **Offline-first:** expo-sqlite + TanStack Query for offline data patterns
- **Code sharing:** ~70-80% shared with web app
- **Commands:** `pnpm cap:sync`, `pnpm cap:build`

### AI/ML Architecture (3 Layers)

- **Layer 1:** Vercel AI SDK v6 - LLM abstraction (Ollama dev ↔ OpenAI/Anthropic prod)
- **Layer 2:** LangGraph.js - State-machine agent workflows (assess → quiz → explain → debate)
- **Layer 3:** LlamaIndex.TS - RAG pipeline, knowledge graph indexing
- **Pattern:** HybridRAG (pgvector semantic + Apache AGE graph traversal fused before LLM)
- **Sandboxing:** gVisor for multi-tenant agent execution safety

### Shared Packages

- `packages/db` - Drizzle schema, migrations, seed, RLS helpers, Apache AGE graph helpers
- `packages/graphql-shared` - Shared SDL (scalars, enums, directives, pagination)
- `packages/graphql-types` - Generated TypeScript types (codegen output)
- `packages/auth` - JWT validation, context extraction, NestJS guards
- `packages/nats-client` - NATS JetStream client wrapper
- `packages/eslint-config` - Shared ESLint rules
- `packages/tsconfig` - Shared TypeScript configs

## Core Rules

1. **Read before modify** - Always read a file before modifying it
2. **Auto-fix errors** - Identify and resolve issues autonomously without asking
3. **Don't ask questions - Execute directly** - When given a task, execute it immediately without asking for confirmation or clarification unless absolutely critical
4. **Max 150 lines per file** - Keep files focused and modular. **Exceptions allowed** for: complex GraphQL resolvers with RLS+JWT+NATS, AI agent workflows (LangGraph.js), Apache AGE graph queries, integration tests, entry points. Create barrel files (`index.ts`) when splitting
5. **TypeScript strict** - `strict: true`, no `any`, no `console.log` (use Pino logger)
6. **All DB queries via Drizzle** - Never raw SQL (except Apache AGE Cypher queries via graph helpers)
7. **Document every task** in `OPEN_ISSUES.md` with status tracking
8. **Update docs at end of each task** - Keep CLAUDE.md, README.md, OPEN_ISSUES.md in sync
9. **Never skip phases** - IMPLEMENTATION_ROADMAP.md defines strict phase order with acceptance criteria
10. **Test everything** - No untested code enters repository
11. **Security-first** - RLS validation, JWT scopes, input sanitization, no secrets in code
12. **Parallel execution mandatory** - Split every task into sub-tasks whenever possible and run Agents/Workers in parallel for maximum efficiency

## Memory Safety (Mandatory)

**Iron rule:** No commit may introduce a memory leak. Every resource opened must have a corresponding close/cleanup path.

### Backend Rules

| Rule                                                                                                                       | Pattern                      |
| -------------------------------------------------------------------------------------------------------------------------- | ---------------------------- |
| Every `@Injectable()` service with `createDatabaseConnection()` MUST implement `OnModuleDestroy` calling `closeAllPools()` | `implements OnModuleDestroy` |
| Every `@Injectable()` service with `new NatsKVClient()` MUST call `this.kv.close()` in `OnModuleDestroy`                   | Lifecycle hook               |
| Every `setInterval`/`setTimeout` in a NestJS service MUST store the handle and clear it in `OnModuleDestroy`               | Handle in class field        |
| All async `for await` subscription loops MUST be stoppable via the subscription's `unsubscribe()` — track in service array | Subscription tracking array  |
| Fire-and-forget async MUST use `Promise.race(task, timeoutPromise)` with DB failure update on timeout                      | 5-min default timeout        |
| Unbounded `Map`/`Array` MUST have max-size eviction (insertion-order LRU for Map, `slice(-N)` for arrays)                  | Size guard                   |
| Database pools MUST use `getOrCreatePool()` from `@edusphere/db` — never `new Pool()` directly                             | Import `getOrCreatePool`     |

### Frontend Rules

| Rule                                                                                                | Pattern                                                                                   |
| --------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| Every `setInterval` in component/hook MUST have `clearInterval` in `useEffect` cleanup return       | `const ref = useRef(); useEffect(() => () => clearInterval(ref.current), [])`             |
| Every `setTimeout` inside a component MUST be stored in `useRef` and cleared in `useEffect` cleanup | Same pattern                                                                              |
| NEVER `return () => cleanup()` inside `useCallback` — the return value is **discarded** by React    | Use `useEffect` for cleanup instead                                                       |
| GraphQL subscriptions (`useSubscription`) MUST use `pause: true` flag tied to component mount state | `const [paused, setPaused] = useState(false); useEffect(() => () => setPaused(true), [])` |
| Module-level WebSocket clients MUST be disposed on `window.beforeunload`                            | `window.addEventListener('beforeunload', () => client.dispose())`                         |

### Infrastructure Rules

| Rule                                                                                                    | Pattern                    |
| ------------------------------------------------------------------------------------------------------- | -------------------------- |
| ALL Docker services MUST have `mem_limit` AND `mem_reservation` in docker-compose files                 | Validated in CI            |
| All Node.js services MUST set `NODE_OPTIONS=--max-old-space-size` ≤ 75% of container `mem_limit`        | Environment block          |
| ALL NATS JetStream streams MUST declare `max_age` AND `max_bytes` at creation                           | Use stream factory helper  |
| LangGraph checkpointers MUST be wrapped in NestJS `@Injectable()` with `OnModuleInit`/`OnModuleDestroy` | `LangGraphService` pattern |

### Memory Testing Rules (required for every new service/hook)

| Change Type                                 | Required Test                                                                  |
| ------------------------------------------- | ------------------------------------------------------------------------------ |
| New NestJS service with DB/NATS connections | `*.memory.spec.ts` verifying `onModuleDestroy` calls cleanup                   |
| New React hook with timers or subscriptions | `*.memory.test.ts` verifying `unmount` triggers `clearTimeout`/`clearInterval` |
| New unbounded Map or growing array          | Test verifying eviction fires at configured max size                           |
| New async subscription loop                 | Test verifying loop exits cleanly on `unsubscribe()`                           |
| New `setInterval` anywhere                  | Test verifying `clearInterval` called on service destroy or component unmount  |

### OOM Response Protocol

| Event                            | Action                                                                               |
| -------------------------------- | ------------------------------------------------------------------------------------ |
| Container OOM-killed             | Check `docker stats` → identify service → increase `mem_limit` OR fix the leak       |
| Node.js heap OOM                 | Run with `--expose-gc` + `--heap-prof` → analyze `.heapprofile` in Chrome DevTools   |
| NATS memory pressure             | Check stream sizes: `nats stream ls` + `nats stream info <name>` → enforce retention |
| PostgreSQL connection exhaustion | Check `pg_stat_activity` → verify `closeAllPools()` is called on service destroy     |
| First OOM in CI                  | Reduce parallel agents by 20% (see Parallel Execution section)                       |

## Environment Setup

### Required Environment Variables

#### Infrastructure (`.env` in project root)

| Category     | Key Variables                                                                    |
| ------------ | -------------------------------------------------------------------------------- |
| **Database** | `DATABASE_URL` (PostgreSQL connection string with AGE/pgvector)                  |
| **Redis**    | `REDIS_URL` (optional for caching)                                               |
| **NATS**     | `NATS_URL` (JetStream-enabled)                                                   |
| **MinIO**    | `MINIO_ENDPOINT`, `MINIO_ACCESS_KEY`, `MINIO_SECRET_KEY`, `MINIO_BUCKET`         |
| **Keycloak** | `KEYCLOAK_URL`, `KEYCLOAK_REALM`, `KEYCLOAK_CLIENT_ID`, `KEYCLOAK_CLIENT_SECRET` |
| **Jaeger**   | `JAEGER_ENDPOINT` (OpenTelemetry tracing)                                        |

#### Gateway (`apps/gateway/.env`)

| Variable                     | Description                                                         |
| ---------------------------- | ------------------------------------------------------------------- |
| `PORT`                       | Gateway port (default: 4000)                                        |
| `SUBGRAPH_CORE_URL`          | http://localhost:4001/graphql                                       |
| `SUBGRAPH_CONTENT_URL`       | http://localhost:4002/graphql                                       |
| `SUBGRAPH_ANNOTATION_URL`    | http://localhost:4003/graphql                                       |
| `SUBGRAPH_COLLABORATION_URL` | http://localhost:4004/graphql                                       |
| `SUBGRAPH_AGENT_URL`         | http://localhost:4005/graphql                                       |
| `SUBGRAPH_KNOWLEDGE_URL`     | http://localhost:4006/graphql                                       |
| `KEYCLOAK_JWKS_URL`          | http://keycloak:8080/realms/edusphere/protocol/openid-connect/certs |

#### Subgraphs (each `apps/subgraph-*/.env`)

| Variable       | Description               |
| -------------- | ------------------------- |
| `NODE_ENV`     | development / production  |
| `PORT`         | Subgraph port (4001-4006) |
| `DATABASE_URL` | PostgreSQL connection     |
| `NATS_URL`     | NATS JetStream URL        |

#### Frontend (`apps/web/.env`)

| Variable                  | Description                   |
| ------------------------- | ----------------------------- |
| `VITE_GRAPHQL_URL`        | http://localhost:4000/graphql |
| `VITE_GRAPHQL_WS_URL`     | ws://localhost:4000/graphql   |
| `VITE_KEYCLOAK_URL`       | http://localhost:8080         |
| `VITE_KEYCLOAK_REALM`     | edusphere                     |
| `VITE_KEYCLOAK_CLIENT_ID` | edusphere-app                 |

#### AI/ML (`apps/subgraph-agent/.env`)

| Variable            | Description                                            |
| ------------------- | ------------------------------------------------------ |
| `OLLAMA_URL`        | http://localhost:11434 (dev)                           |
| `OPENAI_API_KEY`    | (prod only)                                            |
| `ANTHROPIC_API_KEY` | (prod only)                                            |
| `EMBEDDING_MODEL`   | nomic-embed-text (dev) / text-embedding-3-small (prod) |

### Service Startup (required at session start)

| Step              | Command                                           | Verify                                                            |
| ----------------- | ------------------------------------------------- | ----------------------------------------------------------------- |
| 1. Infrastructure | `docker-compose up -d`                            | `docker ps` - postgres, keycloak, nats, minio, jaeger all healthy |
| 2. Database       | `pnpm --filter @edusphere/db migrate`             | `./scripts/health-check.sh` passes                                |
| 3. Seed           | `pnpm --filter @edusphere/db seed`                | Database has demo data                                            |
| 4. Gateway        | `pnpm --filter @edusphere/gateway dev`            | `curl http://localhost:4000/graphql` responds                     |
| 5. Subgraphs      | `pnpm turbo dev --filter='@edusphere/subgraph-*'` | All 6 subgraphs respond to health queries                         |
| 6. Frontend       | `pnpm --filter @edusphere/web dev`                | http://localhost:5173 loads                                       |

**Health check script:** `./scripts/health-check.sh` verifies:

- PostgreSQL accepts connections
- Apache AGE extension loaded (`LOAD 'age'`)
- pgvector extension loaded
- `edusphere_graph` exists
- Keycloak realm accessible
- NATS healthy
- MinIO reachable
- Jaeger UI responds

## MCP Tools — When to Use (Mandatory)

**CRITICAL RULE:** Prefer MCP tools over Bash commands whenever available.
MCP tools return **structured, typed data** — Bash commands return unstructured text that must be parsed.

### MCP Iron Rule — node.exe directly, never .cmd files, never npx

**Root cause #1:** `npx -y` downloads from npm on every session start — corporate proxy/TLS kills it silently.
**Root cause #2:** `.cmd` files on Windows cause 30s MCP timeout — JSON-RPC handshake cannot complete via batch file stdio.
**Correct approach:** All MCP servers globally installed via `npm install -g`, invoked with **`node.exe` + full absolute JS path**.
**Node path:** `C:\Program Files\nodejs\node.exe`
**Global modules:** `C:\Users\P0039217\AppData\Roaming\npm\node_modules\`
**settings.json:** `C:\Users\P0039217\.claude\settings.json`

### Installed MCP Servers (11 active)

| Server                   | Command file                                            | Package                                            | Version | Status    |
| ------------------------ | ------------------------------------------------------- | -------------------------------------------------- | ------- | --------- |
| `memory`                 | `node.exe` + `server-memory\dist\index.js`              | `@modelcontextprotocol/server-memory`              | 0.6.3   | ✅ Global |
| `sequential-thinking`    | `node.exe` + `server-sequential-thinking\dist\index.js` | `@modelcontextprotocol/server-sequential-thinking` | latest  | ✅ Global |
| `eslint`                 | `node.exe` + `@eslint\mcp\src\mcp-cli.js`               | `@eslint/mcp`                                      | 0.3.0   | ✅ Global |
| `github`                 | `github-mcp-server.exe`                                 | `github/github-mcp-server` v0.31.0                 | 0.31.0  | ✅ Binary |
| `tavily`                 | `node.exe` + `tavily-mcp\build\index.js`                | `tavily-mcp`                                       | 0.2.17  | ✅ Global |
| `postgres`               | `node.exe` + `postgres-mcp-server\build\index.js`       | `@henkey/postgres-mcp-server`                      | 1.0.5   | ✅ Global |
| `graphql`                | `node.exe` + `mcp-graphql\dist\index.js`                | `mcp-graphql`                                      | 2.0.4   | ✅ Global |
| `nats`                   | docker exec                                             | edusphere-all-in-one container                     | -       | ✅ Docker |
| `typescript-diagnostics` | `node.exe` + `ts-diagnostics-mcp\dist\index.js`         | `ts-diagnostics-mcp`                               | -       | ✅ Global |
| `playwright`             | `node.exe` + `@playwright\mcp\cli.js`                   | `@playwright/mcp`                                  | 0.0.68  | ✅ Global |
| `context7`               | `node.exe` + `context7-mcp\dist\index.js`               | `@upstash/context7-mcp`                            | 2.1.2   | ✅ Global |

> **Note:** `@modelcontextprotocol/server-github` is DEPRECATED (Apr 2025). Replaced by official `github/github-mcp-server` binary.
> **Note:** `@modelcontextprotocol/server-postgres` is ARCHIVED (May 2025) + has SQL injection vulnerability. Replaced by `@henkey/postgres-mcp-server`.
> **Note:** If Node.js is upgraded, verify path `C:\Program Files\nodejs\node.exe` still exists.

### Decision Matrix

| Task                                                | Use This MCP Tool                                                 | Do NOT Use              |
| --------------------------------------------------- | ----------------------------------------------------------------- | ----------------------- |
| PostgreSQL query (RLS, schema, pg_policies)         | `mcp__postgres__*`                                                | `psql -c "..."` or Bash |
| Search technical docs / APIs / patterns             | `mcp__tavily__tavily_search`                                      | WebSearch built-in      |
| Fetch live NestJS/Drizzle/GraphQL docs              | `mcp__context7__*`                                                | Hallucinated APIs       |
| Lint a file after writing it                        | `mcp__eslint__lint-files`                                         | `pnpm turbo lint`       |
| Store architectural decision across sessions        | `mcp__memory__create_entities`                                    | Editing CLAUDE.md       |
| Recall previous decisions / bug root causes         | `mcp__memory__search_nodes`                                       | Asking user to repeat   |
| GitHub CI status / PR reviews / commit history      | `mcp__github__*`                                                  | `gh run list`           |
| GraphQL schema inspection / query testing           | `mcp__graphql__introspect-schema` / `mcp__graphql__query-graphql` | `pnpm compose`          |
| Complex multi-step reasoning / planning             | `mcp__sequential-thinking__sequentialthinking`                    | Inline reasoning only   |
| E2E browser test after UI change                    | `mcp__playwright__*`                                              | `pnpm test:e2e`         |
| NATS event monitoring / stream inspection           | `mcp__nats__*`                                                    | `nats sub EDUSPHERE.>`  |
| Per-file TypeScript errors (faster than full build) | `mcp__typescript-diagnostics__*`                                  | `pnpm turbo typecheck`  |

### postgres — Use For

- Validate RLS policies: `SELECT tablename, policyname, cmd, qual FROM pg_policies WHERE schemaname='public'`
- Check tenant isolation: query with `SET LOCAL app.current_tenant = '<uuid>'`
- Inspect Apache AGE graph: `SELECT * FROM cypher('edusphere_graph', ...) AS (n agtype)`
- Debug connection pool: `SELECT pid, state, query FROM pg_stat_activity WHERE datname='edusphere'`
- Verify migration state: `SELECT * FROM drizzle.__drizzle_migrations`
- Uses `@henkey/postgres-mcp-server` (18 intelligent tools covering schema, RLS, performance)

### memory — ALWAYS Use

- **Start of every complex task:** `mcp__memory__create_entities` to record the task context
- **After every bug fix:** Record root cause and solution as entity
- **After every architectural decision:** Store the decision and rationale
- **Before starting related tasks:** `mcp__memory__search_nodes` to recall past decisions

### context7 — Use Before Writing Code

- Fetch current NestJS, Drizzle ORM v1, TanStack Query v5, GraphQL Yoga, Expo SDK 54 docs
- Prevents hallucinated/outdated API usage
- Use: `mcp__context7__resolve-library-id` then `mcp__context7__get-library-docs`

### tavily — Use For

- Apache AGE Cypher query syntax and examples
- LangGraph.js agent patterns and state machine docs
- pgvector HNSW index configuration
- NestJS Federation v2 patterns and resolver examples
- `mcp__tavily__tavily_research` for comprehensive multi-source research

### eslint — Use After Every File Write

```
mcp__eslint__lint-files({ filePaths: ["/absolute/path/to/file.ts"] })
```

Fix any errors before moving to next file. Do not batch lint at the end.

### github — Use After Every Push

- Official `github/github-mcp-server` v0.31.0 binary (not deprecated npm package)
- `mcp__github__list_commits` to verify commit landed
- `mcp__github__get_pull_request` to check CI gates
- `mcp__github__get_file_contents` for PR diff inspection

### sequential-thinking — Use For

- RLS policy design (multi-tenant edge cases, cross-schema access)
- LangGraph state machine architecture decisions
- Federation entity resolution debugging
- Complex Drizzle migration sequences with rollback strategy

### Infrastructure Status (3 servers need services running)

| Server     | Prerequisite                           | Verify                                          |
| ---------- | -------------------------------------- | ----------------------------------------------- |
| `postgres` | `docker-compose up -d postgres`        | `mcp__postgres__*` returns result               |
| `graphql`  | `pnpm --filter @edusphere/gateway dev` | `mcp__graphql__introspect-schema` returns types |
| `nats`     | `docker-compose up -d nats`            | `mcp__nats__*` returns stream list              |

---

## Commands Reference

### Development

| Command                                           | Description                    |
| ------------------------------------------------- | ------------------------------ |
| `pnpm dev`                                        | Start all services (turbo dev) |
| `pnpm --filter @edusphere/gateway dev`            | Gateway only (port 4000)       |
| `pnpm --filter @edusphere/subgraph-core dev`      | Core subgraph (port 4001)      |
| `pnpm --filter @edusphere/web dev`                | Frontend (port 5173)           |
| `pnpm --filter @edusphere/mobile start`           | Expo mobile dev server         |
| `pnpm turbo dev --filter='@edusphere/subgraph-*'` | All subgraphs in parallel      |

### Build & Lint

| Command                                | Description                                 |
| -------------------------------------- | ------------------------------------------- |
| `pnpm turbo build`                     | Build all workspaces                        |
| `pnpm turbo build --filter='./apps/*'` | Build apps only                             |
| `pnpm turbo lint`                      | Lint all workspaces (zero warnings in CI)   |
| `pnpm turbo lint -- --fix`             | Auto-fix linting issues                     |
| `pnpm turbo typecheck`                 | TypeScript strict compilation (zero errors) |

### Database (Drizzle + Apache AGE)

| Command                                  | Description                                               |
| ---------------------------------------- | --------------------------------------------------------- |
| `pnpm --filter @edusphere/db generate`   | Generate Drizzle migrations                               |
| `pnpm --filter @edusphere/db migrate`    | Apply migrations                                          |
| `pnpm --filter @edusphere/db seed`       | Seed demo data (tenants, users, courses, knowledge graph) |
| `pnpm --filter @edusphere/db studio`     | Open Drizzle Studio (GUI)                                 |
| `pnpm --filter @edusphere/db graph:init` | Initialize Apache AGE graph ontology                      |

### Testing

| Command                                       | Description                                         |
| --------------------------------------------- | --------------------------------------------------- |
| `pnpm turbo test`                             | All tests (unit + integration)                      |
| `pnpm turbo test -- --coverage`               | With coverage reports                               |
| `pnpm --filter @edusphere/subgraph-core test` | Core subgraph tests                                 |
| `pnpm --filter @edusphere/web test`           | Frontend tests                                      |
| `pnpm --filter @edusphere/web test:e2e`       | E2E tests (Playwright)                              |
| `pnpm test:graphql`                           | GraphQL integration tests (all subgraphs)           |
| `pnpm test:rls`                               | RLS policy validation tests with verbose output     |
| `pnpm test:security`                          | Static security tests (no DB required) — 249+ tests |
| `pnpm test:federation`                        | Federation composition tests                        |

### GraphQL & Schema

| Command                                           | Description                                    |
| ------------------------------------------------- | ---------------------------------------------- |
| `pnpm --filter @edusphere/gateway compose`        | Compose supergraph SDL from subgraphs          |
| `pnpm codegen`                                    | Generate TypeScript types from GraphQL schemas |
| `pnpm --filter @edusphere/gateway schema:check`   | Check for breaking changes (Hive)              |
| `pnpm --filter @edusphere/gateway schema:publish` | Publish schema to Hive registry                |

### Docker & Infrastructure

| Command                           | Description                                                        |
| --------------------------------- | ------------------------------------------------------------------ |
| `docker-compose up -d`            | Start all infrastructure (postgres, keycloak, nats, minio, jaeger) |
| `docker-compose down`             | Stop all containers                                                |
| `docker-compose logs -f postgres` | View PostgreSQL logs                                               |
| `./scripts/health-check.sh`       | Validate all services are healthy                                  |
| `./scripts/smoke-test.sh`         | E2E smoke tests against running stack                              |

### AI/ML & Agents

| Command                                               | Description                                 |
| ----------------------------------------------------- | ------------------------------------------- |
| `pnpm --filter @edusphere/subgraph-agent dev`         | Agent subgraph with Ollama                  |
| `pnpm --filter @edusphere/subgraph-knowledge embed`   | Generate embeddings for all content         |
| `pnpm --filter @edusphere/transcription-worker start` | Start transcription worker (faster-whisper) |

## Code Conventions

### File Size Guidelines

**Target:** Max 150 lines per file for maintainability and modularity.

**Allowed Exceptions (use good judgment):**

- GraphQL resolvers with complex business logic (RLS context + JWT validation + NATS events + error handling)
- AI agent workflow definitions (LangGraph.js state machines with multiple nodes)
- Apache AGE graph query helpers with multiple Cypher patterns
- Integration test suites covering multiple scenarios
- Entry points (`main.ts`, `app.module.ts`) that wire up many modules
- Generated code (GraphQL types from codegen)
- UI component libraries from `packages/ui` (Radix wrappers)

**When to split:**

- Duplicate code patterns → extract to shared utility
- Multiple responsibilities → separate concerns into focused files
- Overly long resolver → extract service layer
- Large test file → split by feature/domain

**How to split:**

- Create barrel files (`index.ts`) to preserve import compatibility
- Example: `user.resolver.ts` (150+ lines) → `user.resolver.ts` + `user.service.ts` + `user.validation.ts` + `index.ts`

### Error Handling

- **Backend (NestJS):** Use NestJS built-in exceptions (`BadRequestException`, `UnauthorizedException`, etc.) + global exception filter
- **GraphQL:** Return structured errors with `extensions: { code, details }` per Error Handling Contract (API-CONTRACTS §6)
- **Frontend:** React Error Boundaries for UI crashes, try/catch in GraphQL calls, toast notifications for user errors
- **Always** return meaningful error messages - never expose internal details to client

### Validation

- **All mutations:** Zod schemas for input validation (define in `*.schemas.ts` files)
- **RLS enforcement:** `withTenantContext()` wrapper for all database queries (sets `app.current_tenant` + `app.current_user_id`)
- **JWT validation:** Gateway validates JWT via Keycloak JWKS, propagates `x-tenant-id` header
- **Frontend:** React Hook Form + Zod for client-side validation before GraphQL calls

### Logging

- **Backend only:** Use Pino logger (`import { Logger } from '@nestjs/common'` + inject via DI)
- **Never** use `console.log` in production code
- **Log levels:** `error` for failures, `warn` for recoverable issues, `info` for key events, `debug` for development
- **Structured logging:** Always include `tenantId`, `userId`, `requestId` in log context

### GraphQL Conventions

- **Schema-first:** SDL files are source of truth, resolvers implement contract
- **Naming:** PascalCase for types, camelCase for fields, SCREAMING_SNAKE_CASE for enums
- **Pagination:** Use Relay Cursor Connection spec (PageInfo, edges, nodes) for all lists
- **Soft deletes:** Never expose `deleted_at`, filter in resolvers
- **Federation:** Entity ownership - one subgraph owns, others extend with `@key` stubs
- **Directives:** `@authenticated`, `@requiresScopes(scopes: ["org:manage"])`, `@requiresRole(roles: [ORG_ADMIN])`

### Multi-tenancy & Security

- **RLS pattern:** Always use `withTenantContext(tenantId, userId, role, () => { /* DB query */ })`
- **JWT claims:** Gateway extracts `tenant_id`, `user_id`, `role`, `scopes` from JWT → GraphQL context
- **Never trust client input:** Validate tenant_id from JWT, not from GraphQL arguments
- **Cross-tenant access:** Only SUPER_ADMIN can query across tenants (explicit role check)

## Testing Requirements

| Change Type            | Required Tests                                                   |
| ---------------------- | ---------------------------------------------------------------- |
| New GraphQL type/field | Unit tests for resolvers + integration test for end-to-end query |
| New mutation           | Unit test + RLS validation test + E2E test                       |
| Bug fix                | Regression test + root cause documented in OPEN_ISSUES.md        |
| Database schema change | Migration test + RLS policy test                                 |
| New subgraph           | Federation composition test + health check test                  |
| AI agent template      | Agent workflow test + sandboxing test + token streaming test     |

### Test File Locations

| Type                 | Location                                         |
| -------------------- | ------------------------------------------------ |
| Subgraph unit        | `apps/subgraph-*/src/**/*.spec.ts`               |
| Subgraph integration | `apps/subgraph-*/src/test/integration/*.spec.ts` |
| RLS validation       | `packages/db/src/rls/*.test.ts`                  |
| Frontend unit        | `apps/web/src/**/*.test.{ts,tsx}`                |
| E2E                  | `apps/web/e2e/*.spec.ts`                         |
| Federation           | `apps/gateway/src/test/federation/*.spec.ts`     |

### Coverage Targets

- **Backend:** >90% line coverage per subgraph
- **Frontend:** >80% component coverage
- **RLS policies:** 100% coverage (critical security)

**No merge/deploy without:**

- All tests passing (`pnpm turbo test`)
- Supergraph composition succeeds (`pnpm --filter @edusphere/gateway compose`)
- Health check passes (`./scripts/health-check.sh`)

## Security Invariants — ENFORCED (Iron Rules — never violate)

These are non-negotiable. Any code violating these invariants must be rejected immediately.

| #         | Invariant                  | WRONG                                                     | RIGHT                                                                       |
| --------- | -------------------------- | --------------------------------------------------------- | --------------------------------------------------------------------------- |
| **SI-1**  | RLS session variable name  | `current_setting('app.current_user', TRUE)`               | `current_setting('app.current_user_id', TRUE)`                              |
| **SI-2**  | CORS origin in production  | `origin: '*'`                                             | `origin: process.env.CORS_ORIGIN?.split(',') ?? []`                         |
| **SI-3**  | PII fields in DB           | Store plaintext email/name/annotation text                | `encryptField(value, tenantKey)` before every write                         |
| **SI-4**  | Keycloak brute-force       | `"bruteForceProtected": false`                            | `"bruteForceProtected": true, "failureFactor": 5`                           |
| **SI-5**  | SSL verification in Docker | `curl --insecure` / `Acquire::https::Verify-Peer "false"` | `apt-get install -y ca-certificates && update-ca-certificates`              |
| **SI-6**  | Inter-service HTTP         | Plain `http://` subgraph URLs in production               | mTLS via Linkerd or `https://` with certs                                   |
| **SI-7**  | NATS without auth/TLS      | `connect({ servers: url })` bare                          | `connect({ servers, tls, authenticator })`                                  |
| **SI-8**  | DB direct access           | `new Pool()` / raw `pg` client                            | `getOrCreatePool()` from `@edusphere/db` only                               |
| **SI-9**  | Cross-tenant query         | Query without `withTenantContext()`                       | Always wrap: `withTenantContext(tenantId, userId, role, fn)`                |
| **SI-10** | LLM call without consent   | Forward user message to OpenAI/Anthropic directly         | Check `THIRD_PARTY_LLM` consent first — throw `CONSENT_REQUIRED` if missing |

**Enforcement:** Pre-commit hook and CI gate must run `pnpm test:rls` + `pnpm audit --audit-level=high`.
**Iron rule:** No commit may weaken any of SI-1 through SI-10. A failing invariant = a blocked PR.

---

## Security

### Pre-commit Gate (every code change)

| Check            | Rule                                                                          |
| ---------------- | ----------------------------------------------------------------------------- |
| XSS              | No unsanitized user input in GraphQL responses                                |
| SQL Injection    | All queries via Drizzle ORM (except Cypher via graph helpers)                 |
| NoSQL Injection  | All Cypher queries use parameterized prepared statements                      |
| RLS              | All tenant-scoped tables have `USING (tenant_id = current_setting(...))`      |
| JWT              | All mutations validate scopes (`@requiresScopes`) and roles (`@requiresRole`) |
| Input Validation | All mutations have Zod schemas                                                |
| Secrets          | No API keys, passwords, tokens in code (use env vars)                         |

### RLS Validation Checklist

- [ ] All 16 tables have RLS enabled (`ALTER TABLE ... ENABLE ROW LEVEL SECURITY`)
- [ ] All tenant-scoped tables have tenant isolation policy
- [ ] All queries use `withTenantContext()` wrapper
- [ ] Cross-tenant tests verify isolation (Tenant A cannot read Tenant B data)
- [ ] Personal annotations only visible to owner or instructors

### GraphQL Security

- [ ] All mutations use `@authenticated` directive
- [ ] Sensitive mutations use `@requiresScopes` (e.g., `course:write`, `agent:execute`)
- [ ] Admin-only mutations use `@requiresRole(roles: [SUPER_ADMIN, ORG_ADMIN])`
- [ ] Query depth limited to 10 (prevent DoS)
- [ ] Query complexity limited to 1000 (prevent expensive queries)
- [ ] Rate limiting at gateway level (per tenant, per IP)

**Iron rule:** No commit may weaken existing security (RLS, JWT validation, scopes, directives).

### Security Test Files

| Test File                                      | Coverage                           |
| ---------------------------------------------- | ---------------------------------- |
| `tests/security/rls-variables.spec.ts`         | SI-1: RLS session variable names   |
| `tests/security/cors-config.spec.ts`           | SI-2: CORS fail-closed             |
| `tests/security/pii-encryption.spec.ts`        | SI-3: AES-256-GCM encryption       |
| `tests/security/keycloak-config.spec.ts`       | G-12: Brute force protection       |
| `tests/security/dockerfile-security.spec.ts`   | G-05: SSL bypass patterns          |
| `tests/security/nats-security.spec.ts`         | SI-7: NATS TLS                     |
| `tests/security/audit-log.spec.ts`             | G-08: Audit trail                  |
| `tests/security/minio-config.spec.ts`          | G-17: MinIO encryption             |
| `tests/security/consent-management.spec.ts`    | G-04: Consent                      |
| `tests/security/data-retention.spec.ts`        | G-13: Retention TTLs               |
| `tests/security/gdpr-erasure.spec.ts`          | G-03+G-11: Erasure+Portability     |
| `tests/security/api-security.spec.ts`          | G-09+G-10: Rate limit + complexity |
| `tests/security/graphql-authorization.spec.ts` | G-15: @requiresScopes              |
| `tests/security/ai-compliance.spec.ts`         | SI-10: LLM consent                 |
| `tests/security/eu-ai-act.spec.ts`             | EU AI Act: transparency            |

## CI/CD (GitHub Actions)

| Workflow           | Trigger                 | Purpose                                                         |
| ------------------ | ----------------------- | --------------------------------------------------------------- |
| `ci.yml`           | Push/PR to main/develop | Lint + type check + unit tests + security scan                  |
| `test.yml`         | Push/PR to main/develop | Full test suite (unit + integration + E2E with Docker services) |
| `federation.yml`   | Push/PR to main/develop | Supergraph composition + breaking change detection              |
| `docker-build.yml` | PR to main + tags       | Multi-stage Docker builds for all services + Trivy scan         |
| `cd.yml`           | Push to main            | Deployment pipeline (K8s + Helm)                                |

### Pre-commit hooks (Husky)

- ESLint auto-fix on staged files
- TypeScript type check on affected files
- No `console.log` in production code

### Post-Push CI Verification

After every `git push`, verify that GitHub Actions workflows are running:

| Step          | Command                             | Expected                     |
| ------------- | ----------------------------------- | ---------------------------- |
| 1. Check runs | `gh run list --limit 5`             | Recent workflow runs visible |
| 2. Watch run  | `gh run watch`                      | Live status of current run   |
| 3. On failure | `gh run view <run-id> --log-failed` | View failure logs            |

**Iron rule:** Every push must trigger CI. If `gh run list` shows no new runs, investigate workflow triggers immediately.

## Git Policy

| Trigger          | Action                                |
| ---------------- | ------------------------------------- |
| Bug fix          | Commit immediately                    |
| Complete feature | Commit at completion                  |
| Complete phase   | Commit after acceptance criteria pass |
| Refactoring      | Commit after logical change           |
| End of day       | Commit + Push for backup              |

**Flow:** Claude proposes commit → User approves → Claude executes.
**Never auto-commit or auto-push without user approval.**

### Commit Message Format

```
<type>(<scope>): <description>

[optional body]

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
```

**Types:** `feat`, `fix`, `refactor`, `docs`, `test`, `chore`, `perf`, `ci`
**Scopes:** `core`, `content`, `annotation`, `collab`, `agent`, `knowledge`, `gateway`, `web`, `mobile`, `db`, `infra`

**Examples:**

- `feat(agent): add Chavruta debate agent template`
- `fix(db): RLS policy for annotations layer filtering`
- `refactor(knowledge): optimize HybridRAG fusion algorithm`

## Bug Fix Protocol

1. **Read logs first** - Subgraph logs, Gateway logs, PostgreSQL logs, NATS logs, Frontend console
2. **If no logs exist** - Add logging as part of the fix (Pino logger)
3. **Reproduce** - Write a failing test that reproduces the bug
4. **Fix** - Implement the fix
5. **Verify** - Run tests + health check + E2E smoke test
6. **Document** in `OPEN_ISSUES.md`:
   - Status: 🔴 Open → 🟡 In Progress → ✅ Fixed
   - Severity: 🔴 Critical / 🟡 Medium / 🟢 Low
   - Files, problem, root cause, solution, tests

**Iron rule:** Never fix a bug without reading the logs first. No logs = part of the bug.

## Parallel Execution (Agents)

**MANDATORY RULE:** Split every task into sub-tasks and run Agents/Workers in parallel whenever possible.

### Task Decomposition Protocol

Before starting any task:

1. **Analyze dependencies** - Identify which sub-tasks can run independently
2. **Create execution plan** - Map out parallel vs sequential sub-tasks
3. **Launch agents** - Spawn multiple agents using Task tool with clear responsibilities
4. **Track progress** - Use Agent Tracking Table to monitor all parallel workers
5. **Synchronize results** - Merge outputs only after all agents complete

### Parallelization Opportunities

- **Multiple subgraphs** - Each subgraph can be built/tested by separate agent
- **Multiple tables** - Database schema creation can be split across agents
- **Multiple test suites** - Backend, Frontend, E2E, RLS tests run in parallel
- **Multiple files** - Code generation, linting, type checking across agents
- **Multiple GraphQL types** - Resolver implementation split by domain

### When Executing Phases

- **Check for parallelization opportunities** - Phase 3 + Phase 4 can run in parallel
- **Always prefer parallel over sequential** when no dependencies exist
- **Use Agent Orchestration Protocol** - Report progress every 3 minutes
- **Never run full test suite in parallel** - Use `pnpm turbo test --filter=<package>` per subgraph
- **Launch agents with Task tool** - One agent per independent sub-task

### Example: Phase 2 Parallelization

```
Task: Implement Core + Content Subgraphs
├─ Agent-1: Core subgraph (Types + Resolvers + Tests) — parallel
├─ Agent-2: Content subgraph (Types + Resolvers + Tests) — parallel
├─ Agent-3: Auth infrastructure (JWT validation + Guards) — parallel
└─ Agent-4: Documentation (API-CONTRACTS updates) — parallel
```

### Agent Tracking Table (required when running parallel)

| Agent               | Task                          | Status     |
| ------------------- | ----------------------------- | ---------- |
| Agent-1 (Architect) | Building docker-compose.yml   | 🟡 Running |
| Agent-2 (Schema)    | Generating Drizzle migrations | ⏳ Waiting |
| Agent-3 (Testing)   | Writing health-check tests    | ✅ Done    |

### OOM Protection

| Event              | Action                                   |
| ------------------ | ---------------------------------------- |
| First OOM          | Reduce agents by 20%                     |
| Repeated OOM       | Continue reducing until 1 agent          |
| Single agent + OOM | `NODE_OPTIONS=--max-old-space-size=8192` |

## Phase Execution Protocol

**CRITICAL:** This project follows IMPLEMENTATION_ROADMAP.md strictly.

### Phase Rules

1. **Never skip phases** - Each phase builds on the previous one
2. **Run acceptance criteria before proceeding** - Green output = permission to advance
3. **Reference API-CONTRACTS and DATABASE_SCHEMA** - Single source of truth
4. **Report progress every 3 minutes** - Use Agent Orchestration Protocol format
5. **No deviation from locked tech stack** - Update IMPLEMENTATION_ROADMAP.md if changes needed

### Quality Gates (Enforced at every phase boundary)

```bash
# 1. TypeScript compilation (zero errors)
pnpm turbo build --filter='./apps/*' --filter='./packages/*'

# 2. Linting (zero warnings in CI mode)
pnpm turbo lint

# 3. Unit tests (100% pass, coverage thresholds met)
pnpm turbo test -- --coverage

# 4. Schema validation (supergraph composes without errors)
pnpm --filter @edusphere/gateway compose

# 5. Docker health (all containers healthy)
./scripts/health-check.sh

# 6. Security scan
pnpm audit --audit-level=high
```

### Phase Progress Reporting Format

```
═══════════════════════════════════════════════════
📊 PROGRESS REPORT — Phase X.Y — [timestamp]
═══════════════════════════════════════════════════
🔵 Active Agents:
   Agent-1 [Schema]: Generating Drizzle migrations — 80% complete
   Agent-2 [Testing]: Writing RLS validation tests — running

✅ Completed this cycle:
   - All 16 tables created with RLS enabled
   - Apache AGE graph ontology initialized

⏳ Next actions:
   - Apply migrations to database
   - Run health-check.sh

📈 Phase progress: 65% → estimated 8 min remaining
═══════════════════════════════════════════════════
```

## Documentation Sync

| File                                  | When to Update                          | What to Sync                                    |
| ------------------------------------- | --------------------------------------- | ----------------------------------------------- |
| `CLAUDE.md`                           | Work rules change, tech stack update    | AI instructions, commands, patterns             |
| `README.md`                           | Stats/numbers change, new feature added | Test counts, phase status, architecture diagram |
| `OPEN_ISSUES.md`                      | Every task/bug start or completion      | Status, severity, files, problem, solution      |
| `IMPLEMENTATION_ROADMAP.md`           | Phase acceptance criteria change        | Tasks, acceptance criteria, commands            |
| `API_CONTRACTS_GRAPHQL_FEDERATION.md` | GraphQL schema change                   | Types, queries, mutations, subscriptions        |

## VS Code Extensions

**Recommended extensions** are defined in `.vscode/extensions.json` and will be suggested automatically when opening the project in VS Code.

### Essential Extensions (Must Install)

| Extension                             | Purpose                                            | Why Critical                                    |
| ------------------------------------- | -------------------------------------------------- | ----------------------------------------------- |
| **GraphQL: Language Feature Support** | GraphQL autocomplete, validation, schema viewing   | Federation development requires GraphQL tooling |
| **GraphQL: Syntax Highlighting**      | Syntax highlighting for .graphql files             | SDL schema files across 6 subgraphs             |
| **Prisma**                            | Database schema visualization (works with Drizzle) | Database schema exploration                     |
| **PostgreSQL** (Chris Kolkman)        | Database client for PostgreSQL queries             | RLS policy testing, manual queries              |
| **ESLint**                            | Code quality and linting                           | Already configured in project                   |
| **Prettier**                          | Auto-formatting                                    | Matches project code conventions                |
| **Docker**                            | Manage containers directly from VS Code            | Infrastructure management                       |

### Highly Recommended

| Extension           | Purpose                                         |
| ------------------- | ----------------------------------------------- |
| **GitLens**         | Advanced Git features (blame, history, compare) |
| **Thunder Client**  | API testing for GraphQL endpoints               |
| **REST Client**     | HTTP/GraphQL requests in .http files            |
| **Error Lens**      | Inline error highlighting                       |
| **Import Cost**     | Shows bundle impact of imports                  |
| **Todo Tree**       | Highlights TODO/FIXME comments                  |
| **Better Comments** | Color-coded comment categories                  |
| **YAML**            | Docker Compose and Kubernetes files             |
| **EditorConfig**    | Consistent formatting across team               |

### Nice to Have

| Extension               | Purpose                          |
| ----------------------- | -------------------------------- |
| **Turbo Console Log**   | Quick console.log insertion      |
| **Path Intellisense**   | Autocomplete file paths          |
| **Markdown All in One** | Better markdown editing for docs |

### Installation

VS Code will prompt to install recommended extensions on first open. Alternatively:

```bash
# Install all at once via Extensions panel "Install All Recommended Extensions"
# Or manually: Ctrl+Shift+X → Search extension name → Install
```

## Troubleshooting

| Problem                      | Solution                                                                                              |
| ---------------------------- | ----------------------------------------------------------------------------------------------------- | ---------- |
| Docker not running           | `docker-compose up -d`                                                                                |
| PostgreSQL down (5432)       | Check `docker ps`, restart postgres container                                                         |
| Apache AGE not loaded        | Run `LOAD 'age';` in psql, verify `shared_preload_libraries` in postgresql.conf                       |
| Gateway down (4000)          | `pnpm --filter @edusphere/gateway dev`                                                                |
| Subgraph down (4001-4006)    | `pnpm --filter @edusphere/subgraph-<name> dev`                                                        |
| Frontend down (5173)         | `pnpm --filter @edusphere/web dev`                                                                    |
| Empty DB                     | `pnpm --filter @edusphere/db seed`                                                                    |
| Drizzle schema out of sync   | `pnpm --filter @edusphere/db generate && pnpm --filter @edusphere/db migrate`                         |
| Supergraph composition fails | Check subgraph SDL files for Federation v2 compliance, run `pnpm --filter @edusphere/gateway compose` |
| RLS policy fails             | Verify `withTenantContext()` wrapper used, check `SET LOCAL` commands in logs                         |
| JWT validation fails         | Check Keycloak JWKS URL, verify `KEYCLOAK_JWKS_URL` in gateway .env                                   |
| NATS connection fails        | Verify `NATS_URL` in .env, check `docker ps                                                           | grep nats` |
| Embeddings not generated     | Run `pnpm --filter @edusphere/subgraph-knowledge embed`, check Ollama running                         |
| Transcription stuck          | Check `apps/transcription-worker` logs, verify MinIO access, check faster-whisper GPU config          |

### Common Errors & Solutions

**Error:** `ReferenceError: edusphere_graph does not exist`
**Solution:** Run `pnpm --filter @edusphere/db graph:init` to initialize Apache AGE graph

**Error:** `Error: Cannot query across tenants without SUPER_ADMIN role`
**Solution:** Check JWT `role` claim, ensure `@requiresRole(roles: [SUPER_ADMIN])` directive on query

**Error:** `Federation composition failed: Field "user" on Annotation cannot be resolved`
**Solution:** Ensure User entity stub in Annotation subgraph with `@key(fields: "id") @external`

**Error:** `OpenTelemetry trace context missing`
**Solution:** Verify Jaeger running (`docker ps | grep jaeger`), check `JAEGER_ENDPOINT` in .env

---

**Last Updated:** February 2026 | **Version:** 1.0.0 | **Target Scale:** 100,000+ concurrent users
