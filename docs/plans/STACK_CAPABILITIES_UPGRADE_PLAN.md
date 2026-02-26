# EduSphere — תוכנית שדרוג יכולות מלאה

**תאריך:** פברואר 2026 | **סטטוס:** מוכן לאישור

---

## Context

מטרת המשימה: סריקה מעמיקה של כל ה-Stack הטכנולוגי של EduSphere, השוואת גרסאות קיימות מול עדכניות,
ובניית תוכנית שדרוג מקבילית ומגולגלת שתנצל יכולות חדשות של הכלים.

**ממצאים קריטיים:**

1. 🔴 `@langchain/community` — חולשת אבטחה SSRF (שדרוג חובה לאלתר)
2. 🔴 `Apache AGE` חסר תמיכת RLS — חיוני למולטי-טנאנסי בגרפים
3. 🔴 כל שכבת LangChain v0.3 — **deprecated**, מחייבת הגירה ל-v1
4. 🔴 `ollama-ai-provider` — נטוש על ידי המפתח, חייב החלפה
5. 🟡 `TanStack Query v5` ו-`Zustand v5` — מוזכרים ב-CLAUDE.md אך **לא מותקנים בפועל**
6. 🟡 Tailwind CSS v4 ו-Vite v7 — שיפורים דרמטיים (Rust-based, 100× מהיר יותר)
7. 🟡 NestJS v11 — JSON logging, Express v5, ביצועי startup
8. 🟡 Hive Gateway v2 — Distributed Subscriptions דרך NATS (native)

---

## מפת גרסאות: נוכחי ← עדכני

| Package                 | נוכחי    | עדכני        | פער  | עדיפות                  |
| ----------------------- | -------- | ------------ | ---- | ----------------------- |
| `@langchain/community`  | 0.3.22   | 1.1.16       | מג'  | 🔴 SECURITY             |
| `Apache AGE`            | 1.5.0    | 1.7.0        | מינ' | 🔴 RLS needed           |
| `langchain`             | 0.3.10   | 1.2.24       | מג'  | 🔴 deprecated           |
| `@langchain/langgraph`  | 0.2.28   | 1.0+         | מג'  | 🔴 durable exec         |
| `@langchain/openai`     | 0.3.16   | 1.2.8        | מג'  | 🔴 deprecated           |
| `ai` (Vercel AI SDK)    | 4.0.46   | 5.x/6.x      | מג'  | 🔴 agent abstraction    |
| `@ai-sdk/openai`        | 1.0.14   | 3.0.30       | מג'  | 🔴 aligned w/ AI SDK    |
| `ollama-ai-provider`    | 1.2.0    | deprecated   | -    | 🔴 replace              |
| `PostgreSQL`            | 16 (dev) | 18.2         | מג'  | 🔴 3× perf AIO          |
| `@graphql-hive/gateway` | 1.10.0   | 2.2.1        | מג'  | 🔴 subscriptions        |
| `drizzle-orm`           | 0.39.3   | 0.45.1       | מינ' | 🔴 pgvector built-in    |
| `drizzle-kit`           | 0.30.2   | 0.45.1       | מינ' | 🔴 pair with ORM        |
| `Zod`                   | 3.24.1   | 4.3.6        | מג'  | 🟡 performance          |
| `NestJS` core           | 10.4.15  | 11.1.14      | מינ' | 🟡 JSON log, Express v5 |
| `graphql-yoga`          | 5.10.7   | 5.18.0       | מינ' | 🟡 OTel pipeline        |
| `Vite`                  | 6.0.11   | 7.1.2        | מג'  | 🟡 Rust bundler         |
| `Tailwind CSS`          | 3.4.17   | 4.0.12       | מג'  | 🟡 Oxide engine         |
| `TypeScript`            | 5.7/5.8  | 6.0.3        | מינ' | 🟡 stable               |
| `React`                 | 19.0.0   | 19.2.4       | מינ' | 🟡 PPR, Activity        |
| `React Router` web      | 6.28.0   | 7.12.1       | מג'  | 🟡 type safety          |
| `Vitest`                | 2.1–3.2  | 4.0.18       | מינ' | 🟡 browser mode         |
| `Playwright`            | 1.49.1   | 1.58.2       | מינ' | 🟡 enhanced debug       |
| `ESLint`                | 9.18.0   | 10.0.0       | מינ' | 🟡 JSX fix, threads     |
| `pino`                  | 9.6.0    | 10.3.1       | מינ' | 🟡 nestjs-pino v4.6     |
| `Redis`                 | 7-alpine | 8.6.0-alpine | מג'  | 🟡 performance          |
| `Turborepo`             | 2.3.3    | 2.7.2        | מינ' | 🟡 devtools             |
| `Prettier`              | 3.4.2    | 3.8.1        | מינ' | 🟢 fast CLI             |
| `jose`                  | 5.9.6    | 6.1.3        | מינ' | 🟢 optional             |
| `@aws-sdk/client-s3`    | 3.729.0  | 3.993.0      | מינ' | 🟢 patches              |
| `graphql`               | 16.9/10  | 16.12.0      | מינ' | 🟢 minor                |
| `pgvector`              | 0.8.0    | 0.8.1        | מינ' | 🟢 iterative scan       |
| `nats` npm              | 2.28.0   | 2.29.3       | מינ' | 🟢 consider @nats-io/\* |

**כבר עדכני:** `@nestjs/cli` 11.0.16 ✅ | `NATS Server` 2.12.4 ✅ | `Keycloak` 26.5.3 ✅

**חוסרים מ-CLAUDE.md שאינם מותקנים:**

- `@tanstack/react-query` v5 — מוזכר בארכיטקטורה, חסר לחלוטין
- `zustand` v5 — מוזכר בארכיטקטורה, חסר לחלוטין

---

## תוכנית ביצוע מקבילית — 6 שלבים

---

### שלב 0: אבטחה קריטית (יום 1 — מיידי)

> **מקביל לחלוטין — Agent-1 + Agent-2 במקביל**

**Agent-1: SSRF Security Fix**

- קובץ: `packages/rag/package.json`, `packages/langgraph-workflows/package.json`
- שדרוג: `@langchain/community` 0.3.22 → 1.1.16
- בדיקה: וידוא שלא קיים כניסה לרשת ב-context tenant
- בדיקות: ריצת test suite של RAG, וידוא RLS isolation עדיין עובד

**Agent-2: Apache AGE RLS**

- קובץ: `infrastructure/docker/Dockerfile.postgres`
- שדרוג: Apache AGE 1.5.0 → 1.7.0 (PG16 branch)
- מה חדש: `SET LOCAL` על גרפים, index על ID columns
- הגירה: `pnpm --filter @edusphere/db graph:init` לאחר עדכון

**קבצים קריטיים:**

- `packages/rag/package.json`
- `packages/langgraph-workflows/package.json`
- `infrastructure/docker/Dockerfile.postgres`

---

### שלב 1: תשתית Build (שבוע 1 — 4 agents מקביליים)

> **אפס תלויות בין ה-agents**

**Agent-1A: Build Tools**

- `turbo` 2.3.3 → 2.7.2 (root `package.json`)
- `typescript` 5.7/5.8 → 6.0.3 (כל `packages/*` ו-`apps/*`)
- `prettier` 3.4.2 → 3.8.1
- הפעלת `--experimental-cli` ב-lint-staged
- קבצים: `package.json` (root), כל `tsconfig*.json`

**Agent-1B: Vite 7 + Vitest 4**

- `vite` 6.0.11 → 7.1.2 (`apps/web`)
- `vitest` → 4.0.18 (אחידות בכל packages)
- `@vitest/coverage-v8` → 4.x (כל packages)
- Node.js 22+ required (כבר עונה על הדרישה)
- קבצים: `apps/web/package.json`, `apps/web/vite.config.ts`, `apps/web/vitest.config.ts`, כל `vitest.config.ts` במונורפו

**Agent-1C: ESLint 10**

- `eslint` 9.18 → 10.0.0 (כל packages)
- `@typescript-eslint/*` → גרסה תואמת
- וידוא flat config כבר בשימוש
- הפעלת multithreaded linting
- קבצים: `packages/eslint-config/package.json`, `eslint.config.*` בכל app

**Agent-1D: Turborepo Devtools Setup**

- הפעלת `turbo devtools` לגרף dependencies
- הוספת composable turbo configs לכל subgraph
- קבצים: `turbo.json`, `apps/*/turbo.json`

**אימות שלב 1:**

```bash
pnpm turbo build
pnpm turbo lint
pnpm turbo typecheck
```

---

### שלב 2: שכבת Database (שבוע 1-2 — 3 agents מקביליים)

**Agent-2A: Drizzle ORM 0.45 (built-in pgvector)**

- `drizzle-orm` 0.39.3 → 0.45.1 (כל subgraphs + packages/db)
- `drizzle-kit` 0.30.2 → 0.45.1
- **יכולות חדשות לממש:**
  - `pgvector()` column type נטיב ב-Drizzle (במקום raw SQL)
  - `identity()` columns במקום `serial`
  - RLS על views ב-`packages/db/src/schema/`
- קבצים: `packages/db/package.json`, `packages/db/src/schema/*.ts`, כל `apps/subgraph-*/package.json`

**Agent-2B: PostgreSQL 18 + pgvector 0.8.1**

- `infrastructure/docker/Dockerfile.postgres`: `postgres:16-alpine` → `postgres:18-alpine`
- pgvector 0.8.0 → 0.8.1 (iterative scan לדיוק גבוה יותר)
- הגדרת `hnsw.iterative_scan = relaxed` ב-config
- `docker-compose.dev.yml`: עדכון postgres image
- הגירה: `pg_upgrade` script ב-`scripts/`
- קבצים: `infrastructure/docker/Dockerfile.postgres`, `docker-compose.dev.yml`

**Agent-2C: Redis 7 → 8 + Zod v4**

- Redis: `redis:7-alpine` → `redis:8.6.0-alpine` ב-docker-compose
- `zod` 3.x → 4.3.6 (כל packages) — JSON Schema support, faster compile
- הגירה: `npx zod-migration-codemod` לאוטומציה
- קבצים: `docker-compose.dev.yml`, כל `package.json` עם zod

**אימות שלב 2:**

```bash
pnpm --filter @edusphere/db generate
pnpm --filter @edusphere/db migrate
pnpm test:rls
./scripts/health-check.sh
```

---

### שלב 3: NestJS + GraphQL (שבוע 2 — 3 agents מקביליים)

**Agent-3A: NestJS v10 → v11 (כל subgraphs)**

- `@nestjs/common`, `@nestjs/core`, `@nestjs/platform-express` 10.4.15 → 11.1.14
- `@nestjs/testing` 10.4.15 → 11.x
- **יכולות חדשות לממש:**
  - הפעלת JSON logging ב-ConsoleLogger (structured logs לכל subgraph)
  - `nestjs-pino` v4.6.0 + `pino` v10.3.1 (שדרוג מ-v9)
  - `ParseDatePipe` לפרמטרי תאריך בקורסים
  - תיקון wildcard routes ל-Express v5 syntax
- קבצים: כל `apps/subgraph-*/package.json`, `apps/subgraph-*/src/main.ts`

**Agent-3B: GraphQL Yoga + Hive Gateway v2**

- `graphql-yoga` 5.10.7 → 5.18.0
  - Pipeline Instrumentation API → חיבור ל-OpenTelemetry/Jaeger
  - `withState` plugin utility לניהול tenant context
- `@graphql-hive/gateway` 1.10.0 → 2.2.1
  - **שינוי קריטי:** migration guide v1→v2 (config structure)
  - **יכולות חדשות:**
    - Distributed Subscriptions עם NATS adapter (native)
    - OpenTelemetry rebuilt — proper span hierarchy
    - Request deduplication
- `graphql` 16.9/10 → 16.12.0
- קבצים: `apps/gateway/package.json`, `apps/gateway/gateway.config.ts`, כל `apps/subgraph-*/src/main.ts`

**Agent-3C: AWS SDK + NATS Upgrade**

- `@aws-sdk/client-s3` 3.729 → 3.993.0
- `nats` npm 2.28 → 2.29.3 (שקול הגירה ל-`@nats-io/*` modular)
- `jose` 5.9.6 → 6.1.3
- `graphql-scalars` → עדכון לאחרון
- קבצים: `apps/subgraph-content/package.json`, `packages/nats-client/package.json`, `packages/auth/package.json`

**אימות שלב 3:**

```bash
pnpm --filter @edusphere/gateway compose
pnpm test:federation
pnpm test:graphql
```

---

### שלב 4: AI/ML Stack (שבוע 2-3 — 3 agents מקביליים)

**Agent-4A: LangChain v1 Migration**

- `langchain` 0.3.10 → 1.2.24
- `@langchain/openai` 0.3.16 → 1.2.8
- `@langchain/community` 0.3.22 → 1.1.16 (כבר בשלב 0, אימות כאן)
- **Agentic RAG 2.0 לממש ב-`packages/rag/`:**
  - Adaptive RAG: query analysis → conditional retrieval → grading → fallback
  - Hybrid Search: semantic (pgvector) + keyword fusion
  - Query caching layer
- קבצים: `packages/rag/package.json`, `packages/rag/src/`

**Agent-4B: LangGraph v1 — Durable Execution**

- `@langchain/langgraph` 0.2.28 → 1.0+
- **יכולות חדשות לממש ב-`packages/langgraph-workflows/` ו-`apps/subgraph-agent/`:**
  - Checkpointing: agent session resume אחרי restart
  - Human-in-the-loop: pause/resume לאישור מורים
  - Multi-session memory: שמירת progress תלמיד בין sessions
  - Time travel debugging לאחר-מעשה
- שימוש ב-PostgreSQL כ-checkpoint store (Drizzle)
- קבצים: `packages/langgraph-workflows/package.json`, `apps/subgraph-agent/src/workflows/`, `apps/subgraph-agent/src/ai/ai.langgraph.ts`

**Agent-4C: Vercel AI SDK v5 + Ollama Migration**

- `ai` 4.x → 5.x (stable) — **המתן ל-v6 GA**
- `@ai-sdk/openai` 1.x → 3.0.30
- החלפה: `ollama-ai-provider` → `ai-sdk-ollama` (community provider)
- **יכולות חדשות לממש:**
  - Agent abstraction: define once, reuse (Chavruta, quiz, assessment agents)
  - Tool execution approval: instructor review לפני actions
  - MCP support: חיבור ל-external knowledge bases
  - Streaming token tracking לניטור עלות לסטודנט
- קבצים: `apps/subgraph-agent/package.json`, `apps/subgraph-agent/src/ai/`, `apps/transcription-worker/package.json`

**אימות שלב 4:**

```bash
pnpm --filter @edusphere/subgraph-agent test
pnpm --filter @edusphere/langgraph-workflows test
```

---

### שלב 5: Frontend (שבוע 3-4 — 4 agents מקביליים)

**Agent-5A: Tailwind CSS v4 Migration**

- `tailwindcss` 3.4.17 → 4.0.12
- הגירה מ-`tailwind.config.js` → CSS `@theme` (CSS-first config)
- הסרת `@tailwind` directives → `@import "tailwindcss"`
- הסרת `@tailwindcss/container-queries` plugin (built-in now)
- **יכולות חדשות:**
  - Built-in container queries ב-dashboard ו-editor
  - 3D transforms לאנימציות knowledge graph
  - CSS cascade layers לתיעדוף styles
- קבצים: `apps/web/tailwind.config.*`, `apps/web/src/styles/globals.css`

**Agent-5B: React + React Router v7**

- `react` + `react-dom` 19.0.0 → 19.2.4
- `react-router-dom` 6.28.0 → 7.12.1 (`apps/web`)
- **יכולות חדשות לממש:**
  - `<Activity>` component לניהול annotations/discussions tabs
  - Partial Pre-rendering לדפי course catalog
  - React Router v7 middleware לטנאנט isolation
  - Type-safe routing
- קבצים: `apps/web/package.json`, `apps/web/src/App.tsx`, `apps/web/src/pages/*.tsx`

**Agent-5C: TanStack Query + Zustand (הוספה)**

- **התקנה:** `@tanstack/react-query` v5 + `@tanstack/react-query-devtools`
- **התקנה:** `zustand` v5
- הגירה: ניתוק ישיר מ-`urql` ל-TanStack Query (server state)
- Zustand stores: UI state (sidebar, active annotations, agent chat)
- **מדוע חיוני:** מוזכר ב-CLAUDE.md כארכיטקטורה, אך חסר בקוד!
- קבצים: `apps/web/package.json`, `apps/web/src/hooks/`, `apps/web/src/lib/`

**Agent-5D: Testing Upgrade**

- `@playwright/test` 1.49.1 → 1.58.2
- `@testing-library/react` → גרסה עדכנית
- `msw` → גרסה עדכנית
- הוספת visual regression tests (`toMatchScreenshot()` ב-Vitest 4)
- קבצים: `apps/web/package.json`, `apps/web/vitest.config.ts`, `apps/web/e2e/`

**אימות שלב 5:**

```bash
pnpm --filter @edusphere/web build
pnpm --filter @edusphere/web test
pnpm --filter @edusphere/web test:e2e
```

---

### שלב 6: ניצול יכולות חדשות (שבוע 4-5 — features חדשות)

> תלוי בהשלמת שלבים 1-5

**Feature-1: Hive Gateway v2 Distributed Subscriptions via NATS**

- ניצול: `@graphql-hive/gateway` v2 NATS subscription adapter
- מימוש: Real-time collaboration subscriptions דרך federation
- קבצים: `apps/gateway/gateway.config.ts`, `apps/subgraph-collaboration/src/`

**Feature-2: Drizzle Native pgvector Queries**

- ניצול: `drizzle-orm` v0.45 built-in pgvector support
- מימוש: הגירת raw SQL embeddings → Drizzle typed queries
- קבצים: `apps/subgraph-knowledge/src/embedding/`, `packages/db/src/schema/`

**Feature-3: Apache AGE RLS ב-Graph Queries**

- ניצול: AGE v1.7.0 RLS support
- מימוש: tenant isolation על Cypher queries
- קבצים: `packages/db/src/schema/graph-helpers.ts`, `apps/subgraph-knowledge/src/graph/`

**Feature-4: LangGraph Persistent Agent Sessions**

- ניצול: LangGraph v1 durable execution + checkpointing
- מימוש: agent session resume, instructor approval workflow
- קבצים: `apps/subgraph-agent/src/agent-session/`, `apps/subgraph-agent/src/workflows/`

---

## תלויות בין שלבים

```
שלב 0 (Security) ─────────────────────────────────────────
                   ↓
שלב 1 (Build Tools) ←→ שלב 2 (Database) — מקביל
         ↓                      ↓
שלב 3 (NestJS + GraphQL) ←→ שלב 4 (AI/ML) — מקביל
         ↓                      ↓
         └──────── שלב 5 (Frontend) ──────────────
                          ↓
                   שלב 6 (Features)
```

---

## מדיניות גרסאות לאחר שדרוג

| Category   | גרסה סופית                 |
| ---------- | -------------------------- |
| TypeScript | 6.0.3 (אחיד בכל packages)  |
| Vitest     | 4.0.18 (אחיד בכל packages) |
| Zod        | 4.3.6 (אחיד בכל packages)  |
| NestJS     | 11.x (כל subgraphs)        |
| Node.js    | 22 LTS (כבר נתמך)          |

---

## קבצים קריטיים לשינוי

### שדרוגים ישירים (package.json)

- `package.json` (root) — turbo, typescript, prettier, vitest
- `apps/gateway/package.json` — hive-gateway, graphql-yoga, graphql
- `apps/subgraph-*/package.json` — NestJS, drizzle, pino, zod
- `apps/web/package.json` — vite, tailwind, react, react-router, tanstack-query, zustand
- `apps/mobile/package.json` — minimal changes
- `apps/transcription-worker/package.json` — ai-sdk, ollama
- `packages/db/package.json` — drizzle-orm, drizzle-kit, zod
- `packages/rag/package.json` — langchain, @langchain/\*, ai
- `packages/langgraph-workflows/package.json` — langgraph, ai-sdk

### שינויי קוד נדרשים

- `apps/gateway/gateway.config.ts` — Hive Gateway v2 config migration
- `apps/web/src/styles/globals.css` — Tailwind v4 CSS-first config
- `apps/web/tailwind.config.*` — הסרה/שדרוג
- `apps/subgraph-*/src/main.ts` — NestJS v11 bootstrap + JSON logging
- `apps/subgraph-agent/src/ai/*` — AI SDK v5 + LangGraph v1
- `packages/rag/src/` — Agentic RAG 2.0
- `infrastructure/docker/Dockerfile.postgres` — PG 18 + AGE 1.7
- `docker-compose.dev.yml` — postgres + redis versions

---

## אימות קצה-לקצה

```bash
# 1. Security validation
pnpm test:rls                              # tenant isolation intact
pnpm audit --audit-level=high             # no critical CVEs

# 2. Build quality
pnpm turbo typecheck                       # zero TypeScript errors
pnpm turbo lint                            # zero ESLint warnings
pnpm turbo build                           # all packages compile

# 3. Schema integrity
pnpm --filter @edusphere/gateway compose  # federation composes
pnpm test:federation                       # breaking changes = none

# 4. Database
pnpm --filter @edusphere/db migrate        # migrations clean
pnpm test:rls                              # RLS policies pass
./scripts/health-check.sh                  # all services healthy

# 5. Full test suite
pnpm turbo test -- --coverage              # >90% backend, >80% frontend

# 6. E2E
pnpm --filter @edusphere/web test:e2e      # Playwright passes
./scripts/smoke-test.sh                    # production stack healthy
```

---

## סיכום עדיפויות

| עדיפות      | משימה                             | השפעה           |
| ----------- | --------------------------------- | --------------- |
| 🔴 מיידי    | @langchain/community SSRF fix     | אבטחה           |
| 🔴 מיידי    | Apache AGE 1.7.0 + RLS            | מולטי-טנאנסי    |
| 🔴 שבוע 1   | LangChain v1 + LangGraph v1       | agents, RAG     |
| 🔴 שבוע 1   | Vercel AI SDK v5 + Ollama replace | AI core         |
| 🔴 שבוע 1   | Drizzle 0.45 (pgvector built-in)  | semantic search |
| 🟡 שבוע 1   | Hive Gateway v2                   | subscriptions   |
| 🟡 שבוע 1   | NestJS v11                        | logging, perf   |
| 🟡 שבוע 1-2 | Vite 7 + Tailwind 4               | build speed     |
| 🟡 שבוע 1-2 | TanStack Query + Zustand (הוספה)  | state mgmt      |
| 🟡 שבוע 2   | PostgreSQL 18                     | DB perf         |
| 🟢 שבוע 3   | React 19.2 + Router v7            | PPR, types      |
| 🟢 שבוע 3   | Vitest 4 + Playwright 1.58        | testing         |
