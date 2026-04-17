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
> - Active implementation plans → `docs/plans/`
> - Bug fix documents → `docs/plans/bugs/` (naming: `BUG-NNN-description.md`)
> - Feature plans → `docs/plans/features/`
> - Completed/old sprint plans → `docs/plans/archive/`
> - Security & compliance docs → `docs/security/`
> - Architecture decisions → `docs/architecture/`
> - ISMS & ISO documents → `docs/isms/`
> - API contracts → `API_CONTRACTS_GRAPHQL_FEDERATION.md` (root)
> - **Screenshots (PNG files) → `docs/screenshots/` — NEVER in project root**
> - CI/build logs → `docs/logs/`
> - Reference docs (naming standards, MCP setup, tech audit) → `docs/reference/`
> - Testing plans → `docs/testing/`
> - Product plans (admin, i18n, tiers) → `docs/product/`
> - All others → `docs/<relevant-subfolder>/`
>
> **Screenshot Rule (IRON RULE):** Playwright screenshots, browser scans, verification PNGs — ALL go to `docs/screenshots/`. Never leave PNGs in the project root.
>
> **Enforcement:** When plan mode writes a plan file, immediately move it to the project before any other work. Check with `ls docs/plans/` that the file is in the correct location.

## Language & Permissions

- **Communication:** Hebrew | **Code & Docs:** English
- **Auto-approved for AGENTS:** File ops (Read, Write), Git (all operations including commit/push), pnpm, Bash, Docker, VS Code extensions, MCP tool calls — these are approved for SUB-AGENTS spawned by the Orchestrator, NOT for the Orchestrator itself
- **No approval needed:** Spawn agents immediately without asking — agent-spawning, progress tracking, and user communication require no approval. The Orchestrator delegates ALL code/infra/test work to agents.
- **Orchestrator tool restriction:** See "Orchestrator Role — IRON RULE" section. The Orchestrator may NOT use Edit, Write, or mutating Bash commands directly.
- **CRITICAL — IRON RULE — NEVER VIOLATE:** DO NOT ask "Can I do X?" or "Should I do Y?" or "האם לבצע?" or "האם להפעיל?" — Just execute immediately. No exceptions. This applies to ALL operations: MCP tests, Docker, git, file writes, Bash commands, running servers, making API calls. If in doubt — execute, don't ask.
- **VIOLATION EXAMPLE (FORBIDDEN):** "האם לבצע Reload Window?" / "Should I run the tests?" / "רוצה שאפעיל?"
- **CORRECT BEHAVIOR:** Detect what needs to be done → execute it → report results.

## Orchestrator Role — IRON RULE (NEVER VIOLATE)

> **The main Claude agent is the ORCHESTRATOR. It manages, it does NOT execute.**
> Full protocol: [docs/operations/ENTERPRISE_EXECUTION_PROTOCOL.md](docs/operations/ENTERPRISE_EXECUTION_PROTOCOL.md)

### Allowed Tools (Orchestrator ONLY uses these)

| Tool               | Permitted Use                                                                                                                                                                         |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Agent`            | Spawn sub-agents for ALL implementation work — this is the PRIMARY tool                                                                                                               |
| `Read`             | Read tracking docs ONLY (OPEN_ISSUES.md, CLAUDE.md, MEMORY.md, docs/\*.md, plan files). NEVER read source code (.ts/.tsx/.graphql/.sql) to solve problems — delegate to Explore agent |
| `Glob` / `Grep`    | ONLY for task decomposition analysis (understanding scope before spawning agents). NEVER to debug or fix issues                                                                       |
| `Bash` (read-only) | ONLY: `git status`, `git log`, `git diff`, `docker ps`, `./scripts/health-check.sh`. NEVER: `pnpm`, `npm`, build commands, test commands, Docker build/up/down                        |
| `TodoWrite`        | Track agent progress and task state                                                                                                                                                   |
| Direct text output | Communicate with user (Hebrew), report progress, present agent results                                                                                                                |

### FORBIDDEN Tools (Orchestrator MUST NEVER use these directly)

| Tool                         | Why Forbidden                                                                                          |
| ---------------------------- | ------------------------------------------------------------------------------------------------------ |
| `Edit`                       | Code changes are agent work — delegate to FE/BE/DB/DevOps agent                                        |
| `Write`                      | File creation is agent work — delegate to appropriate division agent                                   |
| `Bash` (mutating)            | `pnpm test`, `pnpm build`, `docker-compose up`, `git commit`, `git push` — delegate to QA/DevOps agent |
| `MCP tools` (code-affecting) | `mcp__eslint__*`, `mcp__playwright__*`, `mcp__postgres__*` for fixing — delegate to appropriate agent  |
| `Read` (source code)         | Reading `.ts`, `.tsx`, `.graphql`, `.sql` files to solve a problem — delegate to an Explore agent      |

### What the Orchestrator DOES

1. **Receives task** from user
2. **Analyzes scope** — reads tracking docs, uses Glob/Grep to understand affected areas
3. **Decomposes** into sub-tasks with clear agent assignments
4. **Spawns agents** via the Agent tool — one per independent sub-task
5. **Monitors progress** — tracks agent outputs, reports to user every 3 minutes
6. **Reviews agent results** — checks that agents followed protocols, tests pass, docs updated
7. **Spawns fix agents** if any agent output has gaps
8. **Reports completion** to user with the Session Completion Gate table

### Agent Type Catalog

| Work Type                           | Agent Division         | Agent Prompt Pattern                                                         |
| ----------------------------------- | ---------------------- | ---------------------------------------------------------------------------- |
| React/UI component changes          | Frontend Engineering   | `Agent("Fix/build the X component in apps/web/src/...")`                     |
| NestJS/resolver/service changes     | Backend Engineering    | `Agent("Update the Y service in apps/subgraph-Z/...")`                       |
| Schema/migration/RLS changes        | Database & Data        | `Agent("Add migration for table Z...")`                                      |
| Docker/CI/deployment/git ops        | DevOps & Release       | `Agent("Rebuild Docker image and verify..." / "Commit and push...")`         |
| Unit/integration/E2E tests          | QA & Validation        | `Agent("Write E2E test for feature X...")`                                   |
| Security audit/pen test             | Security & Compliance  | `Agent("Audit RLS policies for table X...")`                                 |
| README/OPEN_ISSUES/docs update      | Documentation          | `Agent("Update OPEN_ISSUES.md with bug X status...")`                        |
| Code exploration/debugging          | Architecture (Explore) | `Agent("Investigate why X fails...", subagent_type="Explore")`               |
| Bug investigation (3 waves)         | Architecture (Explore) | `Agent("Run discovery waves for bug pattern X...", subagent_type="Explore")` |
| Planning/design decisions           | Architecture (Plan)    | `Agent("Design approach for feature X...", subagent_type="Plan")`            |
| Expo/React Native mobile screens    | Frontend Engineering   | `Agent("Build mobile screen X in apps/mobile/src/...")`                      |
| LangGraph AI agent workflows        | Backend Engineering    | `Agent("Implement AI agent workflow for X in apps/subgraph-agent/...")`      |
| GraphQL federation contract testing | Backend Engineering    | `Agent("Validate federation composition for entity X...")`                   |
| Apache AGE graph queries/ontology   | Database & Data        | `Agent("Write Cypher query for knowledge graph traversal X...")`             |
| Container/infra security audit      | Security & Compliance  | `Agent("Audit Docker security and TLS config for service X...")`             |
| Mobile E2E testing                  | QA & Validation        | `Agent("Write mobile E2E tests for screen X...")`                            |
| Observability/tracing/metrics       | DevOps & Release       | `Agent("Configure distributed tracing for service X...")`                    |

### CRITICAL: "Execute directly" means "spawn agents directly"

The existing rule "Don't ask questions — Execute directly" means:

- DO spawn agents immediately without asking the user
- DO NOT execute code changes yourself
- "Execute" = "launch the right agents" — NOT "write the code yourself"

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
3. **Don't ask questions - Delegate directly** - When given a task, spawn the appropriate agents immediately without asking for confirmation. The Orchestrator NEVER executes code changes itself — it delegates to agents who execute.
4. **Max 150 lines per file** - Keep files focused and modular. **Exceptions allowed** for: complex GraphQL resolvers with RLS+JWT+NATS, AI agent workflows (LangGraph.js), Apache AGE graph queries, integration tests, entry points. Create barrel files (`index.ts`) when splitting
5. **TypeScript strict** - `strict: true`, no `any`, no `console.log` (use Pino logger)
6. **All DB queries via Drizzle** - Never raw SQL (except Apache AGE Cypher queries via graph helpers)
7. **Document every task** in `OPEN_ISSUES.md` with status tracking
8. **Update docs at end of each task** - Keep CLAUDE.md, README.md, OPEN_ISSUES.md in sync
9. **Never skip phases** - IMPLEMENTATION_ROADMAP.md defines strict phase order with acceptance criteria
10. **Test everything** - No untested code enters repository
11. **Security-first** - RLS validation, JWT scopes, input sanitization, no secrets in code
12. **Parallel agent execution mandatory** - Split every task into sub-tasks and spawn Agents in parallel for maximum efficiency. The Orchestrator's ONLY execution tool is the Agent tool — all other work is done by agents.

## Memory Architecture — 5 Layers (IRON RULES)

EduSphere uses a 5-layer persistent memory system with hook-based automation.

### Layer Overview

| Layer | File                       | Purpose                                        | Update                           | Loaded                      |
| ----- | -------------------------- | ---------------------------------------------- | -------------------------------- | --------------------------- |
| L1    | `CLAUDE.md`                | Iron Rules (this file)                         | Manual, rare                     | Auto — every session        |
| L2    | `docs/memory/primer.md`    | Session state — last recap, status, next steps | Hybrid: Orchestrator + Stop hook | SessionStart hook injection |
| L3    | git-context (dynamic)      | Branch, commits, dirty files                   | SessionStart hook generates live | SessionStart hook injection |
| L4    | `MEMORY.md` + memory files | Behavioral — corrections, patterns             | Auto by Claude on correction     | Auto — every session        |
| L5    | `docs/memory/kb-index.md`  | Reference — divisions, MCP, ports, users       | Manual, infrequent               | On demand only              |

### Hooks (4 active)

| Hook                          | Trigger             | Script                                     | Action                                  |
| ----------------------------- | ------------------- | ------------------------------------------ | --------------------------------------- |
| SessionStart (startup/resume) | Every session start | `scripts/memory/session-start.sh`          | Injects L2 primer + L3 git context      |
| SessionStart (compact)        | After compaction    | `scripts/memory/session-resume-compact.sh` | Re-injects L2+L3 with compaction notice |
| PreCompact (auto)             | Before compaction   | `scripts/memory/pre-compact.sh`            | Saves timestamp to primer               |
| Stop                          | Session end         | `scripts/memory/session-end.sh`            | Appends git snapshot + staleness check  |

### IRON RULE — Memory Access Hierarchy (NEVER VIOLATE)

| Level | Who            | Memory Access       | How                                                                                                                                             |
| ----- | -------------- | ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| L0    | Orchestrator   | Full — all 5 layers | Hooks inject L2+L3 auto. Reads L5 on demand. Updates primer.md before Stop.                                                                     |
| L1    | Division Leads | **NONE directly**   | Receives relevant memory excerpts as **plain text in Orchestrator brief**. MUST NOT Read/Write any `docs/memory/*` or `scripts/memory/*` files. |
| L2    | Specialists    | **NONE directly**   | Receives relevant context as **plain text in Lead brief**. MUST NOT Read/Write any `docs/memory/*` or `scripts/memory/*` files.                 |

**Violation:** A Lead or Specialist reading/writing `docs/memory/*` directly.

### IRON RULE — Orchestrator Primer Update (NEVER VIOLATE)

> **Before ending any session**, the Orchestrator MUST update `docs/memory/primer.md` with:
>
> 1. What was accomplished this session
> 2. Current state of work
> 3. Next steps planned
> 4. Any open decisions or blockers
>
> The Stop hook will then automatically append a git snapshot.
> **Violation:** Ending a session without updating primer.md.

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

## MCP Tools — 14 Active Servers

> **Full configuration, decision matrix, and HIVEMIND protocol:** [docs/operations/MCP_DECISION_MATRIX.md](docs/operations/MCP_DECISION_MATRIX.md)

**CRITICAL RULE:** Prefer MCP tools over Bash commands whenever available.
MCP tools return **structured, typed data** — Bash commands return unstructured text that must be parsed.

**Servers:** memory, sequential-thinking, eslint, github, tavily, postgres, graphql, nats, typescript-diagnostics, playwright, context7, coordination-bridge, vector-memory, exa

## Skills Integration

### Overview

Skills are markdown-based expertise guides that auto-load when Claude detects relevant context (file paths, keywords, patterns). 23 custom EduSphere skills + ~200 external skills are installed in `~/.agents/skills/`.

### EduSphere Custom Skills (Auto-Loaded)

| Skill                                        | Auto-Triggers On                                        | Content                                                                                |
| -------------------------------------------- | ------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| `graphql-federation-edusphere`               | `.graphql` files, `apps/gateway/`, resolver files       | Federation v2.7, 6-subgraph map, entity resolution, SDL-first workflow                 |
| `apache-age-knowledge-graph`                 | `packages/db/src/graph/`, `apps/subgraph-knowledge/`    | Cypher queries, 5-node ontology, executeCypher(), RLS in graph                         |
| `pgvector-hybrid-rag`                        | embeddings schema, `apps/subgraph-knowledge/`           | HNSW indexes, 768-dim embeddings, HybridRAG fusion, RRF reranking                      |
| `langgraph-agent-workflows`                  | `apps/subgraph-agent/`, AI agent code                   | StateGraph, assess-quiz-explain-debate, Vercel AI SDK v6, gVisor                       |
| `drizzle-orm-edusphere`                      | `packages/db/`, schema/migration files                  | pgTable.withRLS(), withTenantContext(), SI-1/SI-3/SI-8 compliance                      |
| `nats-jetstream-patterns`                    | `packages/nats-client/`, NATS imports                   | 23 event subjects, stream retention, KV stores, SI-7 TLS                               |
| `session-completion-gate`                    | task completion, before git push                        | 10-check gate, 5-user auth, Docker health, failure protocol                            |
| `discovery-wave-automator`                   | bug fixes, test failures                                | 3-wave search, 7-dir checklist, Discovery List, pattern-class search                   |
| `rls-policy-patterns-edusphere`              | `packages/db/src/rls/`, RLS policy files                | RLS policy templates, tenant isolation patterns, cross-tenant guards                   |
| `memory-safety-resource-lifecycle-edusphere` | `OnModuleDestroy`, cleanup patterns                     | Resource lifecycle management, connection pool cleanup, timer guards                   |
| `keycloak-oauth-oidc-edusphere`              | Keycloak config, `packages/auth/`, JWT/OIDC code        | OIDC flows, realm config, brute-force protection, JWKS validation                      |
| `expo-sdk-54-mobile-edusphere`               | `apps/mobile/`, Expo config files                       | Expo SDK 54 patterns, expo-sqlite offline-first, React Native 0.81                     |
| `multi-tenant-architecture-edusphere`        | `withTenantContext`, tenant isolation code              | Multi-tenant RLS patterns, tenant context propagation, SI-9 compliance                 |
| `react-19-vite-6-edusphere`                  | `apps/web/`, React 19 components, Vite config           | React 19 features, Vite 6 config, mounted-guard patterns                               |
| `hive-gateway-v2-patterns`                   | `apps/gateway/`, supergraph composition                 | Hive Gateway v2 config, Federation v2.7, subgraph routing                              |
| `playwright-visual-regression-edusphere`     | `apps/web/e2e/`, visual test files                      | toHaveScreenshot() patterns, visual baseline management                                |
| `docker-blue-green-deployment-edusphere`     | `docker-compose.yml`, Dockerfile                        | Blue-green protocol, mem_limit/mem_reservation, rollback strategy                      |
| `turborepo-edusphere-monorepo`               | `turbo.json`, monorepo config                           | Turborepo caching, workspace filtering, pipeline configuration                         |
| `graphql-authorization-directives-edusphere` | `@authenticated`, `@requiresScopes` directives          | GraphQL authorization directives, scope enforcement                                    |
| `scorm-edusphere-lms-integration`            | SCORM-related code, LMS integration files               | SCORM 1.2/2004 compliance, LMS data model, xAPI integration                            |
| `test-first-bugfix-edusphere`                | Bug investigation, test failures, debugging             | Test-first reproducer protocol, 3-wave discovery, fix rounds, container verification   |
| `browser-verification-edusphere`             | Playwright E2E, screenshot verification, keycloak-login | Zero-mock Playwright patterns, Keycloak login, screenshot capture, visual confirmation |
| `transcript-click-seek-patterns`             | TranscriptPanel, seekTo, onSeek, useYouTubePlayer       | 3 transcript systems, timestamp data flow, YouTube async seek, failure modes           |

### Skills per Wave (Mandatory Loading)

- **Wave 1 (Product/Arch/UX):** `architecture-patterns`, `architecture-decision-records`, `graphql-federation-edusphere`, `accessibility-compliance`, `wcag-audit-patterns`, `writing-plans`, `brainstorming`, `multi-tenant-architecture-edusphere`, `hive-gateway-v2-patterns`
- **Wave 2 (FE/BE/DB/Security/QA):** `nestjs-best-practices`, `drizzle-orm-edusphere`, `apache-age-knowledge-graph`, `pgvector-hybrid-rag`, `langgraph-agent-workflows`, `nats-jetstream-patterns`, `react-state-management`, `e2e-testing-patterns`, `auth-implementation-patterns`, `secrets-management`, `sast-configuration`, `test-driven-development`, `rls-policy-patterns-edusphere`, `memory-safety-resource-lifecycle-edusphere`, `keycloak-oauth-oidc-edusphere`, `expo-sdk-54-mobile-edusphere`, `react-19-vite-6-edusphere`, `playwright-visual-regression-edusphere`, `graphql-authorization-directives-edusphere`, `test-first-bugfix-edusphere`, `browser-verification-edusphere`, `transcript-click-seek-patterns`
- **Wave 3 (Docs/DevOps):** `changelog-automation`, `deployment-pipeline-design`, `distributed-tracing`, `turborepo-caching`, `github-actions-templates`, `docker-blue-green-deployment-edusphere`, `turborepo-edusphere-monorepo`, `scorm-edusphere-lms-integration`

### Skill Trigger Rules

- Skills auto-load based on `description` field in SKILL.md frontmatter
- Custom EduSphere skills (`*-edusphere`) take precedence for overlapping domains
- Multiple matching skills load additively (not exclusively)
- Skills location: `~/.agents/skills/<skill-name>/SKILL.md`
- Load `systematic-debugging` + `discovery-wave-automator` + domain skill at START of every bug investigation
- Load `session-completion-gate` skill before declaring ANY task complete

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

**When to split:** Duplicate code patterns, multiple responsibilities, overly long resolver, large test file.
**How to split:** Create barrel files (`index.ts`) to preserve import compatibility.

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

**No merge/deploy without:** All tests passing (`pnpm turbo test`), supergraph composition succeeds, health check passes.

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

### Post-Push CI Verification — IRON RULE

After every `git push`, the Orchestrator MUST verify CI passes:

| Step          | Command                                  | Action on Failure             |
| ------------- | ---------------------------------------- | ----------------------------- |
| 1. Wait 30s   | —                                        | Allow CI to start             |
| 2. Check runs | `gh run list --limit 3`                  | Verify workflow triggered     |
| 3. Monitor    | `gh run watch` or poll every 2 min       | Wait for completion           |
| 4. On failure | `gh run view <id> --log-failed`          | Investigate, spawn fix agents |
| 5. Re-push    | Fix → commit → push → repeat from step 1 | Until ALL checks pass         |

**IRON RULE:** A push with failing CI is NOT complete. The Orchestrator MUST iterate fix cycles until all checks are green. No exceptions.

**Maximum cycles:** 5 attempts. If CI still fails after 5 fix-push cycles, report to user with full failure analysis.

## Documentation Sync

| File                                  | When to Update                          | What to Sync                                    |
| ------------------------------------- | --------------------------------------- | ----------------------------------------------- |
| `CLAUDE.md`                           | Work rules change, tech stack update    | AI instructions, commands, patterns             |
| `README.md`                           | Stats/numbers change, new feature added | Test counts, phase status, architecture diagram |
| `OPEN_ISSUES.md`                      | Every task/bug start or completion      | Status, severity, files, problem, solution      |
| `IMPLEMENTATION_ROADMAP.md`           | Phase acceptance criteria change        | Tasks, acceptance criteria, commands            |
| `API_CONTRACTS_GRAPHQL_FEDERATION.md` | GraphQL schema change                   | Types, queries, mutations, subscriptions        |

### Mermaid Diagram Rule (MANDATORY)

Every new or updated `.md` file describing architecture, flows, relationships, state machines, or timelines **MUST** include Mermaid diagrams following [docs/reference/MERMAID_STYLE_GUIDE.md](docs/reference/MERMAID_STYLE_GUIDE.md).

## VS Code Extensions

**Recommended extensions** are defined in `.vscode/extensions.json` and will be suggested automatically when opening the project in VS Code.

**Essential:** GraphQL Language Feature Support, GraphQL Syntax Highlighting, Prisma, PostgreSQL (Chris Kolkman), ESLint, Prettier, Docker

**Highly Recommended:** GitLens, Thunder Client, REST Client, Error Lens, Import Cost, Todo Tree, Better Comments, YAML, EditorConfig

## Troubleshooting

| Problem                      | Solution                                                                                              |
| ---------------------------- | ----------------------------------------------------------------------------------------------------- |
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
| NATS connection fails        | Verify `NATS_URL` in .env, check `docker ps` for nats container                                       |
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

## Extracted Operations Documents

The following sections have been extracted to keep CLAUDE.md focused. Each document contains the full content and links back here.

| Document                                                                                             | Content                                                                                                                                                                                |
| ---------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [docs/operations/IRON_RULES.md](docs/operations/IRON_RULES.md)                                       | Security Invariants (SI-1 to SI-10), Memory Safety rules (backend/frontend/infrastructure), OOM Response Protocol                                                                      |
| [docs/operations/ENTERPRISE_EXECUTION_PROTOCOL.md](docs/operations/ENTERPRISE_EXECUTION_PROTOCOL.md) | Enterprise Division Structure, Wave-Based Parallel Model, Agent Orchestration, Phase Execution, Autonomous Execution Rules                                                             |
| [docs/operations/SESSION_COMPLETION_GATE.md](docs/operations/SESSION_COMPLETION_GATE.md)             | 12-check completion table, Iron Rules for Completion, Parallel Agents Completion Protocol                                                                                              |
| [docs/operations/MCP_DECISION_MATRIX.md](docs/operations/MCP_DECISION_MATRIX.md)                     | 14 MCP servers config, Decision Matrix, Tool Usage Guidelines, HIVEMIND/MindHive protocol                                                                                              |
| [docs/operations/BUG_FIX_PROTOCOL_QUICK_REF.md](docs/operations/BUG_FIX_PROTOCOL_QUICK_REF.md)       | Bug Fix Protocol phases 0-5, Discovery Waves, Round Completion Gate, `dap` debugger reference. Full protocol: [docs/reference/BUG_FIX_PROTOCOL.md](docs/reference/BUG_FIX_PROTOCOL.md) |

---

**Last Updated:** March 2026 | **Version:** 1.1.0 | **Target Scale:** 100,000+ concurrent users
