# MCP Tools — Claude Code Capability Upgrade

**Date:** February 2026
**Scope:** 10 MCP servers configured in `.mcp.json` to extend Claude Code's code-writing and testing capabilities
**Purpose:** Enable Claude to directly query databases, validate TypeScript, lint code, test E2E, monitor NATS events, and search documentation — without relying solely on bash command parsing.

---

## Why MCP Servers

Without MCP servers, Claude reads files and runs Bash commands, then parses unstructured text output.
With MCP servers, Claude gets **structured, typed data** directly — faster, more accurate, less error-prone.

| Without MCP | With MCP |
|-------------|----------|
| `pnpm turbo lint` → parse 200 lines of text | `eslint.lint(file)` → structured JSON with errors |
| `psql -c "SELECT..."` → parse table output | `postgres.query(sql)` → typed result rows |
| `pnpm turbo typecheck` → scan all packages | `typescript.diagnose(file)` → per-file errors |
| `nats sub EDUSPHERE.>` → parse stdout | `nats.subscribe(subject)` → typed message objects |

---

## Configured Servers (`.mcp.json`)

### 1. `postgres` — PostgreSQL Direct Access
**Package:** `@modelcontextprotocol/server-postgres`
**Connection:** `postgresql://edusphere:edusphere_dev_password@localhost:5432/edusphere`

**What it enables:**
- Direct SQL queries to validate RLS policies (`pg_policies`, `pg_stat_activity`)
- Inspect Apache AGE graph structure without writing Cypher via bash
- Verify `withTenantContext()` isolation — query as different tenant IDs
- Check migration state, table schemas, index usage
- Debug connection pool exhaustion (`pg_stat_activity`)

**Example use:**
```sql
SELECT tablename, policyname, permissive, cmd, qual
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename;
```

> **Note:** Read-only access only. Mutations via the app layer only (Drizzle ORM).

---

### 2. `memory` — Cross-Session Knowledge Graph
**Package:** `@modelcontextprotocol/server-memory`
**Config:** No API key required — persists to local file

**What it enables:**
- Remember architectural decisions across conversations
- Track which bugs were investigated and their root causes
- Store patterns learned from this codebase (e.g., RLS edge cases, Federation quirks)
- Remember which files were last modified and why

**Example entities stored:**
```
Entity: "RLS_PATTERN" → "Always wrap with withTenantContext(), SET LOCAL app.current_user_id"
Entity: "NATS_STREAMS" → "EDUSPHERE stream with max_age=7d, max_bytes=1GB"
Entity: "AGE_GRAPH" → "edusphere_graph, nodes: Concept/Person/Term/Source/TopicCluster"
```

---

### 3. `typescript-diagnostics` — Real-Time TypeScript Type Checking
**Package:** `ts-diagnostics-mcp`
**Project Root:** `C:\Users\P0039217\.claude\projects\EduSphere`

**What it enables:**
- Get TypeScript errors per-file without running full `pnpm turbo typecheck`
- Monorepo-aware: understands workspace package references
- Intelligent caching — only re-checks changed files
- Structured error objects: `{ file, line, col, code, message }`

**Why better than bash:**
`pnpm turbo typecheck` scans all packages and returns 500+ lines of text.
This server returns only the errors for the specific file being written.

---

### 4. `eslint` — Official ESLint MCP Server
**Package:** `@eslint/mcp` (official ESLint package)
**Config:** Reads from project's `.eslintrc.js` automatically

**What it enables:**
- Lint specific files immediately after writing them
- Get structured lint errors: `{ rule, severity, line, col, message, fixable }`
- Apply auto-fix suggestions inline
- Validate security rules (`no-unsanitized`, `security/*`) before committing

**Why better than bash:**
No need to run the full monorepo lint. Gets per-file feedback in milliseconds.

---

### 5. `playwright` — E2E Browser Testing (pre-existing)
**Package:** `@playwright/mcp` (was already configured)
**Mode:** `--headed` (visible browser)

**What it enables:**
- Run E2E tests without leaving the coding context
- Navigate the app, fill forms, verify UI state after code changes
- Take screenshots to verify visual correctness
- Test auth flows (Keycloak redirect, JWT token handling)
- Verify GraphQL mutations through the full UI stack

**Test suites available:** smoke, auth, courses, search, agents, full-flow

---

### 6. `github` — GitHub API & CI/CD Management
**Package:** `@modelcontextprotocol/server-github`
**Auth:** Requires `GITHUB_PERSONAL_ACCESS_TOKEN` (see Setup below)

> **Replaces Docker MCP** — Docker Desktop 4.42 has a built-in MCP toolkit (not npm-based).
> GitHub MCP provides higher value for this project's CI/CD workflows.

**What it enables:**
- Check GitHub Actions workflow run status after push
- View failed CI logs without leaving the terminal
- Create/review PRs, check PR review comments
- Monitor security scan results (CodeQL, Trivy)
- Manage issues (OPEN_ISSUES.md ↔ GitHub Issues sync)

**Setup:** Generate a PAT at `https://github.com/settings/tokens` with scopes:
`repo`, `workflow`, `read:org`
Then replace `REPLACE_WITH_YOUR_GITHUB_PAT` in `.mcp.json`.

---

### 7. `graphql` — GraphQL Schema Introspection & Query Execution
**Package:** `mcp-graphql`
**Endpoint:** `http://localhost:4000/graphql` (Hive Gateway)

**What it enables:**
- Introspect the live supergraph schema without running `pnpm compose`
- Execute GraphQL queries/mutations to test resolvers
- Validate that Federation entity resolution works across subgraphs
- Test `@authenticated`, `@requiresScopes` directives

> **Prerequisite:** Gateway must be running (`pnpm --filter @edusphere/gateway dev`)

---

### 8. `nats` — NATS JetStream Event Debugging
**Package:** `mcp-nats`
**Connection:** `nats://localhost:4222` with edusphere credentials

**What it enables:**
- Subscribe to NATS subjects to verify events are published after mutations
- List JetStream streams and check retention policies (`max_age`, `max_bytes`)
- Publish test messages to verify consumer processing
- Debug async flows: `content.created` → annotation pipeline → knowledge graph update
- Monitor stream lag to detect backpressure issues

**Critical subjects to monitor:**
```
EDUSPHERE.content.created
EDUSPHERE.annotation.added
EDUSPHERE.agent.message
EDUSPHERE.knowledge.updated
```

> **Prerequisite:** NATS JetStream must be running (`docker-compose up -d nats`)

---

### 9. `tavily` — Production-Grade Web Search
**Package:** `tavily-mcp`
**Auth:** Requires `TAVILY_API_KEY` (see Setup below)

> **Replaces** the built-in WebSearch tool for technical queries.

**What it enables:**
- Search Apache AGE documentation and Cypher query examples
- Find LangGraph.js patterns and LlamaIndex.TS API docs
- Look up pgvector HNSW index configuration
- Search NestJS Federation v2 patterns
- Find Drizzle ORM v1 migration examples

**Better than WebSearch:** Returns technical documentation, not marketing pages.
**Setup:** Sign up at `https://tavily.com` (free tier: 1000 searches/month).
Replace `REPLACE_WITH_YOUR_TAVILY_API_KEY` in `.mcp.json`.

---

### 10. `sequential-thinking` — Structured Multi-Step Reasoning
**Package:** `@modelcontextprotocol/server-sequential-thinking`
**Config:** No API key required

> **Replaces Git MCP** — the official git MCP server is Python-only (`uvx mcp-server-git`),
> not available as an npm package on Windows.

**What it enables:**
- Break complex problems into numbered reasoning steps before writing code
- Reconsider and revise intermediate steps when new information emerges
- Particularly useful for: RLS policy design, LangGraph state machine architecture, Federation entity resolution, complex Drizzle migration planning
- Structured thinking prevents "write first, think second" errors in multi-file changes

---

## Setup Checklist

### Required: Replace API Key Placeholders

Open `.mcp.json` and replace these two values:

```jsonc
// GitHub PAT — generate at https://github.com/settings/tokens
"GITHUB_PERSONAL_ACCESS_TOKEN": "REPLACE_WITH_YOUR_GITHUB_PAT"

// Tavily API Key — get at https://tavily.com (free tier available)
"TAVILY_API_KEY": "REPLACE_WITH_YOUR_TAVILY_API_KEY"
```

### Required: Infrastructure Running for Some Servers

| Server | Prerequisite |
|--------|-------------|
| `postgres` | `docker-compose up -d postgres` |
| `graphql` | `pnpm --filter @edusphere/gateway dev` |
| `nats` | `docker-compose up -d nats` |
| `playwright` | `pnpm --filter @edusphere/web dev` |
| `memory` | None — always available |
| `typescript-diagnostics` | None — reads tsconfig from project |
| `eslint` | None — reads .eslintrc from project |
| `github` | GITHUB_PERSONAL_ACCESS_TOKEN set |
| `tavily` | TAVILY_API_KEY set |
| `sequential-thinking` | None — always available |

### Reload MCP Servers

After updating `.mcp.json`:
1. Open VS Code Command Palette (`Ctrl+Shift+P`)
2. Run: `Claude: Restart MCP Servers`
3. Or restart the Claude Code session

---

## Server Status Summary

| # | Server | Package | Status | Needs Key |
|---|--------|---------|--------|-----------|
| 1 | postgres | `@modelcontextprotocol/server-postgres` | ✅ Configured | No (dev creds in .env.example) |
| 2 | memory | `@modelcontextprotocol/server-memory` | ✅ Configured | No |
| 3 | typescript-diagnostics | `ts-diagnostics-mcp` | ✅ Configured | No |
| 4 | eslint | `@eslint/mcp` | ✅ Configured | No |
| 5 | playwright | `@playwright/mcp` | ✅ Pre-existing | No |
| 6 | github | `@modelcontextprotocol/server-github` | ⚠️ Needs PAT | Yes — GitHub PAT |
| 7 | graphql | `mcp-graphql` | ✅ Configured | No (needs gateway running) |
| 8 | nats | `mcp-nats` | ✅ Configured | No (dev creds in .env.example) |
| 9 | tavily | `tavily-mcp` | ⚠️ Needs key | Yes — Tavily API Key |
| 10 | sequential-thinking | `@modelcontextprotocol/server-sequential-thinking` | ✅ Configured | No |

---

## Notes on Omitted Tools

**Docker MCP:** Docker Desktop 4.42 introduced a built-in MCP Toolkit (`docker mcp toolbox` CLI).
This is not npm-based and requires Docker Desktop integration, not `.mcp.json` configuration.
Container health can be checked via `Bash(docker ps)` or Docker Desktop's GUI.

**Git MCP (local):** `mcp-server-git` is Python-only (`uvx mcp-server-git`).
Git operations are handled via Bash commands. The `github` MCP covers remote GitHub operations.
