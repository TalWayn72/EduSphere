# תוכנית פעולה מסודרת - EduSphere

**תאריך:** 2026-02-17 20:01
**בסיס:** PRD + Gap Analysis + Implementation Roadmap

═══════════════════════════════════════════════════

## 📋 סיכום מצב נוכחי

═══════════════════════════════════════════════════

### ✅ הושלם (Phases 0-2):

- Foundation: Docker + Monorepo + Health Checks
- Data Layer: 16 tables + RLS + Apache AGE + pgvector
- Auth: Keycloak + JWT + packages/auth
- Subgraph-Core: Users + Tenants (Port 4001)
- Subgraph-Content: Courses (חלקי, Port 4002)

### 🔴 חסר (קריטי):

- Gateway (Port 4000) - **חוסם הכל**
- Frontend (Port 5173)
- 4 subgraphs נוספים

═══════════════════════════════════════════════════

## 🎯 תוכנית פעולה - 3 רבדים

═══════════════════════════════════════════════════

### רובד א': קריטי - ההשקה הבסיסית (זמן: 4-5 שעות)

**מטרה:** מערכת עובדת end-to-end עם login + רשימת קורסים

#### משימה 1: Gateway (עדיפות 1 - חוסם!) ⚡

**זמן משוער:** 1.5-2 שעות
**תיאור:** יצירת GraphQL Federation Gateway עם Hive Gateway v2.7

**שלבי ביצוע:**
1.1. יצירת apps/gateway/

- package.json עם @graphql-hive/gateway
- src/index.ts - Gateway server (port 4000)
- Supergraph configuration (6 subgraphs)

  1.2. JWT Propagation

- קריאת Authorization header
- חילוץ tenant_id מ-JWT
- העברת x-tenant-id ל-subgraphs

  1.3. CORS + Health Check

- CORS middleware לפיתוח
- /health endpoint
- /\_readiness endpoint

  1.4. Build + Test

- pnpm build
- בדיקת composition
- GraphQL Playground

**Acceptance:**

- http://localhost:4000/graphql פעיל
- Query `{ __typename }` עובד
- Introspection מראה כל הsubgraphs

---

#### משימה 2: Frontend - Authentication (עדיפות 2)

**זמן משוער:** 2-2.5 שעות
**תיאור:** React app עם login + routing בסיסי

**שלבי ביצוע:**
2.1. Setup Vite + React 19

- apps/web/package.json
- vite.config.ts עם path aliases
- tsconfig.json

  2.2. GraphQL Client (urql)

- src/lib/graphql-client.ts
- Auth exchange (JWT מ-localStorage)
- Error handling

  2.3. Authentication Flow

- src/pages/Login.tsx
- src/pages/Dashboard.tsx
- src/contexts/AuthContext.tsx
- Login → JWT → Redirect

  2.4. Router Setup

- React Router v6
- Protected routes
- /login, /dashboard, /courses

**Acceptance:**

- http://localhost:5173 פעיל
- Login עובד עם Keycloak
- Dashboard מציג user.email
- Protected routes מפנים ל-login

---

#### משימה 3: השלמת Content Subgraph (עדיפות 3)

**זמן משוער:** 1 שעה
**תיאור:** הוספת auth middleware + media assets

**שלבי ביצוע:**
3.1. Auth Middleware

- העתקה מ-subgraph-core
- src/auth/auth.middleware.ts
- Integration ב-app.module.ts

  3.2. Media Module (אופציונלי)

- src/media/media.graphql
- src/media/media.service.ts
- src/media/media.resolver.ts

  3.3. RLS Integration

- withTenantContext בכל הqueries
- AuthContext מה-context

**Acceptance:**

- Query עם JWT עובד
- RLS מונע cross-tenant access
- Build successful

═══════════════════════════════════════════════════

### רובד ב': תכונות ליבה (זמן: 8-10 שעות)

**מטרה:** Annotation + Knowledge Graph + Collaboration

#### משימה 4: Annotation Subgraph (עדיפות 4)

**זמן:** 3-4 שעות

- 4 שכבות: PERSONAL, SHARED, INSTRUCTOR, AI_GENERATED
- Types: TEXT, SKETCH, LINK, BOOKMARK
- Threaded replies
- Real-time updates

#### משימה 5: Knowledge Subgraph (עדיפות 5)

**זמן:** 3-4 שעות

- Apache AGE graph queries
- HybridRAG (semantic + graph)
- Learning path generation
- Contradiction detection

#### משימה 6: Agent Subgraph (עדיפות 6)

**זמן:** 2-3 שעות

- LangGraph.js workflows
- Chavruta debate agent
- Quiz generation agent
- Explain agent

═══════════════════════════════════════════════════

### רובד ג': שיפורים וקנה מידה (זמן: 6-8 שעות)

**מטרה:** Production-ready + Testing

#### משימה 7: Collaboration Subgraph (עדיפות 7)

**זמן:** 2-3 שעות

- Yjs CRDT
- WebSocket subscriptions
- Conflict resolution

#### משימה 8: Frontend Features (עדיפות 8)

**זמן:** 3-4 שעות

- Course listing + details
- Annotation UI
- Collaboration editor
- AI chat interface

#### משימה 9: Testing & CI/CD (עדיפות 9)

**זמן:** 2-3 שעות

- Integration tests
- E2E tests (Playwright)
- GitHub Actions
- Docker build

═══════════════════════════════════════════════════

## 🚀 המלצה לסשן הבא

═══════════════════════════════════════════════════

### אסטרטגיה: 3 Agents במקביל על רובד א'

**Agent-1:** Gateway (1.5h)

- יצירת מלאה של apps/gateway
- Supergraph composition
- JWT propagation

**Agent-2:** Frontend Auth (2h)

- React + Vite setup
- urql client
- Login flow

**Agent-3:** Complete Content (1h)

- Auth middleware
- RLS fixes
- Build verification

**זמן כולל עם parallelization:** ~2 שעות במקום 4.5

**לאחר מכן:**

- Build all packages
- Test end-to-end flow
- Commit + Push
- Deploy לסביבת dev

═══════════════════════════════════════════════════

## 📊 KPIs להצלחה

═══════════════════════════════════════════════════

### רובד א' (MVP):

- ✅ Gateway serving GraphQL on :4000
- ✅ Frontend serving on :5173
- ✅ Login flow working
- ✅ Query `{ me { email } }` returns data
- ✅ RLS preventing cross-tenant access

### רובד ב' (Core):

- ✅ Annotation system functional
- ✅ Knowledge graph queries working
- ✅ AI agent responding to prompts

### רובד ג' (Production):

- ✅ All tests passing (>80% coverage)
- ✅ Docker build successful
- ✅ Performance: <100ms p95 latency
- ✅ Can handle 1000 concurrent users
