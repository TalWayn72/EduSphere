# תוכנית: MCP-001 — השלמה, אימות, הפעלה ותיעוד שימוש

## Context

משימת MCP-001 (הגדרת 10 MCP servers) בוצעה אך הסשן קרס לפני ה-commit.
כל השינויים ב-working directory אך לא committed.
בנוסף: חלק מה-servers לא נוצלו בפועל כי אין הוראות מפורשות ב-CLAUDE.md מתי להשתמש בהם.

**מטרת התוכנית:**
1. Commit לשינויים הפתוחים
2. אימות כל server על-ידי הפעלה ישירה
3. עדכון CLAUDE.md עם הוראות שימוש מפורשות לכל tool
4. תיעוד תוצאות האימות ב-OPEN_ISSUES.md

---

## קבצים קריטיים

| קובץ | פעולה |
|------|--------|
| `.mcp.json` | Already staged — ייכנס ל-commit |
| `OPEN_ISSUES.md` | Stage + commit |
| `docs/plans/MCP_TOOLS_SETUP.md` | Stage + commit |
| `packages/graphql-shared/tsconfig.tsbuildinfo` | **לא לכלול** — auto-generated cache |
| `scripts/setup-mcp-keys.sh` | Stage + commit |
| `CLAUDE.md` | עדכון — הוספת סעיף MCP Tools Usage |

---

## שלב 1: Commit (sequentially, no parallel)

```bash
git add .mcp.json OPEN_ISSUES.md docs/plans/MCP_TOOLS_SETUP.md scripts/setup-mcp-keys.sh
git commit -m "feat(infra): configure 10 MCP servers for Claude Code capabilities"
```

**לא לכלול:** `packages/graphql-shared/tsconfig.tsbuildinfo` (TypeScript build cache)

---

## שלב 2: אימות MCP Servers (parallel)

### Servers שכבר פעילים בסשן (verify by invoking):
| Server | כלי לבדיקה | שאילתת אימות |
|--------|------------|---------------|
| `postgres` | `mcp__postgres__query` | `SELECT version()` |
| `memory` | `mcp__memory__search_nodes` | `query: "EduSphere"` |
| `github` | `mcp__github__search_repositories` | `query: "EduSphere"` |
| `graphql` | `mcp__graphql__introspect-schema` | introspect supergraph |
| `tavily` | `mcp__tavily__tavily_search` | search "pgvector HNSW" |
| `sequential-thinking` | `mcp__sequential-thinking__sequentialthinking` | test thought |
| `eslint` | `mcp__eslint__lint-files` | lint a project file |

### Servers לבדיקת זמינות (might fail — investigate):
| Server | Package | בדיקה |
|--------|---------|--------|
| `nats` | `mcp-nats` | בדיקה אם הtools קיימים בסשן |
| `typescript-diagnostics` | `ts-diagnostics-mcp@latest` | בדיקה אם הtools קיימים |
| `playwright` | `@playwright/mcp@latest` | בדיקה אם הtools קיימים |

---

## שלב 3: עדכון CLAUDE.md — הוספת סעיף "MCP Tools Usage"

יש להוסיף סעיף חדש ב-CLAUDE.md **אחרי** "## Commands Reference" עם הנחיות מפורשות:

### תוכן הסעיף (לכלול בתוכנית):

```markdown
## MCP Tools — When to Use (Mandatory)

**CRITICAL RULE:** Prefer MCP tools over Bash commands whenever available.
MCP tools return structured data — Bash commands return unstructured text.

### Decision Matrix: MCP Tool vs Bash

| Task | Use MCP Tool | NOT Bash |
|------|-------------|----------|
| PostgreSQL query (RLS, schema, policies) | `mcp__postgres__query` | `psql -c "..."` |
| Search technical documentation | `mcp__tavily__tavily_search` | WebSearch |
| Lint a file after writing | `mcp__eslint__lint-files` | `pnpm turbo lint` |
| Store architectural decision | `mcp__memory__create_entities` | CLAUDE.md edit |
| GitHub CI/CD status after push | `mcp__github__*` | `gh run list` |
| GraphQL schema inspection | `mcp__graphql__introspect-schema` | `pnpm compose` |
| Complex multi-step reasoning | `mcp__sequential-thinking__*` | — |
| E2E browser testing | playwright MCP | `pnpm test:e2e` |
| NATS event monitoring | nats MCP | `nats sub EDUSPHERE.>` |
| Per-file TypeScript errors | typescript-diagnostics MCP | `pnpm turbo typecheck` |

### postgres — Use For:
- Validate RLS policies: `SELECT * FROM pg_policies WHERE schemaname='public'`
- Check tenant isolation: query with different `app.current_tenant` settings
- Inspect Apache AGE graph structure
- Debug connection pool: `SELECT * FROM pg_stat_activity`

### memory — Use For:
- Store every architectural decision made during a session
- Remember bug root causes across sessions
- Track which patterns are specific to this codebase
- **Create entity at start of every complex task**

### tavily — Use For:
- Apache AGE Cypher documentation
- LangGraph.js state machine patterns
- pgvector HNSW configuration
- NestJS Federation v2 examples
- Drizzle ORM v1 migration patterns

### eslint — Use For:
- Lint every new/modified file immediately after writing
- Validate security rules before commit
- Check for `no-unsanitized`, `security/*` violations

### github — Use For:
- After every `git push`: check `mcp__github__list_commits`
- Monitor CI/CD: `mcp__github__get_pull_request_status`
- View failed workflow logs

### sequential-thinking — Use For:
- RLS policy design (multi-tenant edge cases)
- LangGraph state machine architecture
- Federation entity resolution planning
- Complex Drizzle migration sequences
```

---

## שלב 4: תיעוד תוצאות ב-OPEN_ISSUES.md

עדכון MCP-001 עם:
- תוצאות אימות כל server (✅ / ⚠️ / ❌)
- הוספת הוראות ל-CLAUDE.md (✅)
- commit hash

---

## ביצוע מקבילי

```
שלב 1: Commit (sequential — must be first)
    ↓
שלב 2+3 (parallel):
    ├─ Agent A: אימות 7 servers פעילים (postgres, memory, github, graphql, tavily, eslint, sequential-thinking)
    ├─ Agent B: בדיקת nats + typescript-diagnostics + playwright
    └─ Agent C: עדכון CLAUDE.md + OPEN_ISSUES.md
    ↓
שלב 4: Commit final documentation (sequential — after all above)
```

---

## אימות סופי

1. `git log --oneline -3` — שני commits חדשים נוצרו
2. כל MCP tool שנבדק החזיר תוצאה ✅
3. `CLAUDE.md` מכיל סעיף "MCP Tools — When to Use"
4. `OPEN_ISSUES.md` מכיל תוצאות אימות מלאות
