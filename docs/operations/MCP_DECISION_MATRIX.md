# MCP Tools — Decision Matrix & Configuration

> **Parent document:** [CLAUDE.md](../../CLAUDE.md)

**CRITICAL RULE:** Prefer MCP tools over Bash commands whenever available.
MCP tools return **structured, typed data** — Bash commands return unstructured text that must be parsed.

## MCP Iron Rule — node.exe directly, never .cmd files, never npx

**Root cause #1:** `npx -y` downloads from npm on every session start — corporate proxy/TLS kills it silently.
**Root cause #2:** `.cmd` files on Windows cause 30s MCP timeout — JSON-RPC handshake cannot complete via batch file stdio.
**Correct approach:** All MCP servers globally installed via `npm install -g`, invoked with **`node.exe` + full absolute JS path**.
**Node path:** `C:\Program Files\nodejs\node.exe`
**Global modules:** `C:\Users\P0039217\AppData\Roaming\npm\node_modules\`
**settings.json:** `C:\Users\P0039217\.claude\settings.json`

## Installed MCP Servers (14 active)

| Server                   | Command file                                                       | Package                                            | Version | Status  |
| ------------------------ | ------------------------------------------------------------------ | -------------------------------------------------- | ------- | ------- |
| `memory`                 | `node.exe` + `server-memory\dist\index.js`                         | `@modelcontextprotocol/server-memory`              | 0.6.3   | Global  |
| `sequential-thinking`    | `node.exe` + `server-sequential-thinking\dist\index.js`            | `@modelcontextprotocol/server-sequential-thinking` | latest  | Global  |
| `eslint`                 | `node.exe` + `@eslint\mcp\src\mcp-cli.js`                          | `@eslint/mcp`                                      | 0.3.0   | Global  |
| `github`                 | `github-mcp-server.exe`                                            | `github/github-mcp-server` v0.31.0                 | 0.31.0  | Binary  |
| `tavily`                 | `node.exe` + `tavily-mcp\build\index.js`                           | `tavily-mcp`                                       | 0.2.17  | Global  |
| `postgres`               | `node.exe` + `postgres-mcp-server\build\index.js`                  | `@henkey/postgres-mcp-server`                      | 1.0.5   | Global  |
| `graphql`                | `node.exe` + `mcp-graphql\dist\index.js`                           | `mcp-graphql`                                      | 2.0.4   | Global  |
| `nats`                   | docker exec                                                        | edusphere-all-in-one container                     | -       | Docker  |
| `typescript-diagnostics` | `node.exe` + `ts-diagnostics-mcp\dist\index.js`                    | `ts-diagnostics-mcp`                               | -       | Global  |
| `playwright`             | `node.exe` + `@playwright\mcp\cli.js`                              | `@playwright/mcp`                                  | 0.0.68  | Global  |
| `context7`               | `node.exe` + `context7-mcp\dist\index.js`                          | `@upstash/context7-mcp`                            | 2.1.2   | Global  |
| `coordination-bridge`    | `node.exe` + project `tools/mcp-coordination-bridge/dist/index.js` | Local (project)                                    | 1.0.0   | Project |
| `vector-memory`          | `node.exe` + project `tools/mcp-vector-memory/dist/index.js`       | Local (project)                                    | 1.0.0   | Project |
| `exa`                    | `node.exe` + `exa-mcp-server\.smithery\stdio\index.cjs`            | `exa-mcp-server`                                   | latest  | Global  |

> **Note:** `@modelcontextprotocol/server-github` is DEPRECATED (Apr 2025). Replaced by official `github/github-mcp-server` binary.
> **Note:** `@modelcontextprotocol/server-postgres` is ARCHIVED (May 2025) + has SQL injection vulnerability. Replaced by `@henkey/postgres-mcp-server`.
> **Note:** If Node.js is upgraded, verify path `C:\Program Files\nodejs\node.exe` still exists.

## Decision Matrix

| Task                                                | Use This MCP Tool                                                 | Do NOT Use                          |
| --------------------------------------------------- | ----------------------------------------------------------------- | ----------------------------------- |
| PostgreSQL query (RLS, schema, pg_policies)         | `mcp__postgres__*`                                                | `psql -c "..."` or Bash             |
| Search technical docs / APIs / patterns             | `mcp__tavily__tavily_search`                                      | WebSearch built-in                  |
| Fetch live NestJS/Drizzle/GraphQL docs              | `mcp__context7__*`                                                | Hallucinated APIs                   |
| Lint a file after writing it                        | `mcp__eslint__lint-files`                                         | `pnpm turbo lint`                   |
| Store architectural decision across sessions        | `mcp__memory__create_entities`                                    | Editing CLAUDE.md                   |
| Recall previous decisions / bug root causes         | `mcp__memory__search_nodes`                                       | Asking user to repeat               |
| GitHub CI status / PR reviews / commit history      | `mcp__github__*`                                                  | `gh run list`                       |
| GraphQL schema inspection / query testing           | `mcp__graphql__introspect-schema` / `mcp__graphql__query-graphql` | `pnpm compose`                      |
| Complex multi-step reasoning / planning             | `mcp__sequential-thinking__sequentialthinking`                    | Inline reasoning only               |
| E2E browser test after UI change                    | `mcp__playwright__*`                                              | `pnpm test:e2e`                     |
| NATS event monitoring / stream inspection           | `mcp__nats__*`                                                    | `nats sub EDUSPHERE.>`              |
| Per-file TypeScript errors (faster than full build) | `mcp__typescript-diagnostics__*`                                  | `pnpm turbo typecheck`              |
| Agent coordination (Orchestrator only)              | `mcp__coordination-bridge__cb_health`                             | Manual tracking in docs             |
| Store/search architectural decisions                | `mcp__vector-memory__vm_store/search_*`                           | Only `mcp__memory__*`               |
| Search past bug patterns before fix                 | `mcp__vector-memory__vm_search_bugs`                              | Re-investigating from scratch       |
| Search academic papers, code patterns               | `mcp__exa__*`                                                     | `mcp__tavily__*` for general search |

## Tool Usage Guidelines

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

## Infrastructure Status (4 servers need services running)

| Server          | Prerequisite                                                   | Verify                                          |
| --------------- | -------------------------------------------------------------- | ----------------------------------------------- |
| `postgres`      | `docker-compose up -d postgres`                                | `mcp__postgres__*` returns result               |
| `graphql`       | `pnpm --filter @edusphere/gateway dev`                         | `mcp__graphql__introspect-schema` returns types |
| `nats`          | `docker-compose up -d nats`                                    | `mcp__nats__*` returns stream list              |
| `vector-memory` | `docker-compose -f docker-compose.hivemind.yml up -d chromadb` | `mcp__vector-memory__vm_health` returns ok      |

---

## HIVEMIND — Shared Intelligence Layer (Orchestrator-Only)

HIVEMIND provides persistent semantic memory via 2 MCP servers (27 tools). **Only the Orchestrator uses HIVEMIND directly.** Leads and Specialists work without any HIVEMIND overhead — the Orchestrator injects relevant prior intelligence as plain text in Lead briefs.

### Why Orchestrator-Only

Requiring all ~50 agents to register, search, lock, and store added ~420 MCP calls per session with minimal value. Under the Orchestrator-Only model, HIVEMIND overhead drops to ~10 calls per session while retaining cross-session memory benefits.

### Auto-Startup Check (EVERY session start)

Before spawning any agents, the Orchestrator MUST verify:

1. `docker ps | grep hivemind-chromadb` — must be healthy
2. If not running: `docker-compose -f tools/docker-compose.hivemind.yml up -d`
3. `mcp__vector-memory__vm_health` — must return `status: ok`

### Orchestrator HIVEMIND Protocol

**Before spawning Leads:**

1. `vm_search({ query: "<task keywords>" })` — gather prior intelligence
2. `vm_search_decisions({ query: "<domain>" })` — find past architectural decisions
3. `vm_search_bugs({ query: "<domain>" })` — find past bug patterns
4. Include findings as "Prior Intelligence" plain text in each Lead brief

**After all Leads complete:**

1. `vm_store_decision({ title, rationale, alternatives, chosen, tags })` — for each major decision
2. `vm_store_bug_pattern(...)` — for each bug fix from Lead reports
3. `vm_get_recent({ n: 10 })` — verify decisions were stored

### Leads and Specialists — NO HIVEMIND

- Leads receive prior intelligence as plain text in their brief from the Orchestrator
- Leads do NOT call any `cb_*` or `vm_*` tools
- Specialists do NOT call any `cb_*` or `vm_*` tools
- No file locking (`cb_lock_file`) — divisions already separate concerns by file ownership
- No agent registration (`cb_register_agent`) — the Orchestrator tracks agents via the Agent tool directly

### MindHive MCP Servers

| Server                | Tool Prefix                      | Backend                                        | Tools | Used By                            |
| --------------------- | -------------------------------- | ---------------------------------------------- | ----- | ---------------------------------- |
| `coordination-bridge` | `mcp__coordination-bridge__cb_*` | SQLite (WAL mode, `.hivemind/coordination.db`) | 15    | Orchestrator only (health check)   |
| `vector-memory`       | `mcp__vector-memory__vm_*`       | ChromaDB (Docker, port 8100)                   | 12    | Orchestrator only (search + store) |

**CRITICAL — Tool Name Format:** Use HYPHENS, not underscores: `mcp__coordination-bridge__cb_*` and `mcp__vector-memory__vm_*`.

### Orchestrator-Only Protocol

| Phase         | Actions                                                  | Tools                                                             |
| ------------- | -------------------------------------------------------- | ----------------------------------------------------------------- |
| Session Start | Health check, search prior intelligence                  | `vm_health`, `vm_search`, `vm_search_decisions`, `vm_search_bugs` |
| Before Leads  | Inject findings as plain text in Lead briefs             | (text only — no MCP)                                              |
| After Leads   | Store major decisions and bug patterns from Lead reports | `vm_store_decision`, `vm_store_bug_pattern`                       |
| Session End   | Verify decisions stored                                  | `vm_get_recent`                                                   |

### What Leads and Specialists Do NOT Do

- No `cb_register_agent` — Orchestrator tracks agents via Agent tool
- No `cb_lock_file` / `cb_unlock_file` — divisions separate file ownership
- No `vm_search_*` — Orchestrator provides prior intelligence in briefs
- No `vm_store_*` — Orchestrator consolidates and stores from Lead reports
- No `cb_publish` / `cb_subscribe` — Leads report directly to Orchestrator

**Full protocol reference:** `docs/architecture/MINDHIVE-PROTOCOL.md`
