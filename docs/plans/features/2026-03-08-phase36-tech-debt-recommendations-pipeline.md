# Phase 36: Technical Debt Clearance + Personalized Recommendations + Lesson Pipeline — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Close all critical and medium technical debt from Phase 35 audit, wire real recommendations from the knowledge subgraph, implement the XP/gamification foundation, harden Lighthouse CI, and deliver the Lesson Pipeline Builder MVP.

**Architecture:** 8 phases with dependency-ordered parallel execution. Phases 1–4 fully parallel (no mutual deps); Phases 5–7 parallel after Phase 1–4; Phase 8 sequential QA gate. ~11 agent-days, wall-clock 3 days with max parallelism.

**Tech Stack:** NestJS + Drizzle ORM + pgvector | urql | Recharts | web-vitals (add) | Expo SDK 54 | TypeScript 5.9.3 (mobile fix) | LangGraph.js | NATS JetStream

**Document Storage:** After plan mode exits, move to `docs/plans/features/2026-03-08-phase36-tech-debt-recommendations-pipeline.md` (CLAUDE.md iron rule)

---

## Context

Phase 35 (Performance, Analytics & Mobile Parity) is complete at commit `32c2ecd`. All-division audit surfaced 11 technical debt items. Two are production-blocking (🔴): CoursesDiscoveryPage still serves MOCK_COURSES in production, and myRecommendedCourses always returns []. Five are medium (🟡): missing web-vitals package, broken mobile TypeScript, undocumented VAPID env vars, AtRiskDashboardPage mock data, Chavruta TemplateType mismatch. Three are infrastructure (⚪): MOCK_XP placeholder, Lighthouse a11y gate soft, minor polish.

---

## Technical Debt Inventory (from Phase 35 audit)

| # | Severity | Item | File | Phase |
|---|----------|------|------|-------|
| TD-1 | 🔴 | CoursesDiscoveryPage MOCK_COURSES | `apps/web/src/pages/CoursesDiscoveryPage.tsx` | 36.1 |
| TD-2 | 🔴 | myRecommendedCourses returns [] | `apps/subgraph-core/src/user/user.resolver.ts` | 36.2 |
| TD-3 | 🟡 | web-vitals package missing | `apps/web/package.json` | 36.3 |
| TD-4 | 🟡 | Mobile TypeScript v6.0.3 → v5.9.3 | `apps/mobile/package.json` | 36.3 |
| TD-5 | 🟡 | VAPID env vars undocumented | `apps/subgraph-core/.env.example` + root `.env.example` | 36.3 |
| TD-6 | 🟡 | AtRiskDashboardPage mock data | `apps/web/src/pages/AtRiskDashboardPage.tsx` | 36.4 |
| TD-7 | 🟡 | Chavruta TemplateType mismatch | `apps/subgraph-agent/src/agent/agent-template.service.ts` | 36.3 |
| TD-8 | ⚪ | MOCK_XP hardcoded | `apps/web/src/pages/DashboardPage.tsx` | 36.5 (XP Phase) |
| TD-9 | ⚪ | Lighthouse a11y `\|\| true` soft | `.github/workflows/ci.yml` | 36.3 |
| TD-10 | 🟡 | Personalized recommendations algorithm | `apps/subgraph-knowledge` | 36.6 |
| TD-11 | 🟡 | Lesson Pipeline Builder MVP | `apps/subgraph-content` + `apps/web` | 36.7 |

---

## Dependency Graph

```
Phase 1 (CoursesDiscovery real data) ─── independent
Phase 2 (Real Recommendations) ────────── independent
Phase 3 (Quick Fixes: TD-3..9) ─────────── independent
Phase 4 (AtRisk real data) ──────────────── independent

Phase 5 (XP Foundation) ─────────────────── after Phase 1+2+3
Phase 6 (Personalized Algo) ─────────────── after Phase 2
Phase 7 (Pipeline Builder MVP) ──────────── independent of 1-4

Phase 8 (E2E + CI Gate) ──────────────────── final sequential gate
```

---

## Phase 1 — CoursesDiscovery Real Data (TD-1) — parallel with 2,3,4

### Problem
`apps/web/src/pages/CoursesDiscoveryPage.tsx` uses a hardcoded `MOCK_COURSES` array (~12 items). Real courses exist in the DB and are served by `apps/subgraph-content/src/content/content.resolver.ts` via the `courses` query.

### Backend — Verify existing query
The `courses` query already exists in `apps/subgraph-content/src/content/content.graphql`:
```graphql
courses(tenantId: ID!, limit: Int, offset: Int, filters: CourseFiltersInput): CourseConnection!
```
No new backend code needed — query is already wired.

### Frontend

**New file:** `apps/web/src/lib/graphql/courses-discovery.queries.ts`
```typescript
// COURSES_DISCOVERY_QUERY with CourseConnection { edges { node { id title description thumbnailUrl instructorName tags enrollmentCount completionRate } } pageInfo { hasNextPage endCursor } }
```

**Modify:** `apps/web/src/pages/CoursesDiscoveryPage.tsx`
- Remove `MOCK_COURSES` constant
- Add `const [mounted, setMounted] = useState(false); useEffect(() => { setMounted(true) }, [])`
- Replace with `useQuery({ query: COURSES_DISCOVERY_QUERY, variables: { tenantId, limit: 20, filters: activeFilters }, pause: !mounted })`
- Iron Rule: when `fetching || error` → render skeleton cards (not blank, not raw error)
- Keep all existing filter/search UI wired to `filters` variable
- Add comment: "// XP data deferred to Phase 36.5 (XP Foundation)"

### Tests
- `apps/web/src/pages/CoursesDiscoveryPage.test.tsx` — extend: mock `COURSES_DISCOVERY_QUERY`, assert MOCK_COURSES string NOT in DOM; assert skeleton on fetching; assert real course titles appear; assert error fallback
- E2E: `apps/web/e2e/course-discovery.spec.ts` — add assertion: no "Introduction to Talmud Study" in live DOM (was in MOCK_COURSES)

---

## Phase 2 — Real Recommendations via Knowledge Subgraph (TD-2) — parallel with 1,3,4

### Problem
`apps/subgraph-core/src/user/user.resolver.ts` `myRecommendedCourses` resolver returns `[]` (stub). The knowledge subgraph has `skillGapRecommendations` which now uses EmbeddingDataLoader (Phase 35 N+1 fix). Need to wire core→knowledge federation to provide real recommendations.

### Architecture
`myRecommendedCourses` in core subgraph → federation call to knowledge subgraph `skillGapRecommendations` → returns top-N courses with `reason` text from explanationText.

### Backend

**New file:** `apps/subgraph-core/src/user/recommended-courses.service.ts`
- `getRecommendedCourses(userId, tenantId, limit)` — calls knowledge subgraph via GraphQL federation reference resolver or direct DB join on `user_skill_mastery` + `courses`
- Returns `RecommendedCourse[]` with `courseId, title, instructorName, reason`
- Uses `withTenantContext` (SI-9 ✓)
- `OnModuleDestroy` + `closeAllPools()` (memory rule ✓)
- Fallback: if skill mastery data empty → returns top-N most enrolled courses in tenant (never empty list)

**Modify:**
- `apps/subgraph-core/src/user/user.module.ts` — provide `RecommendedCoursesService`
- `apps/subgraph-core/src/user/user.resolver.ts` — `myRecommendedCourses` → inject and call `RecommendedCoursesService.getRecommendedCourses()`

### Tests
- `apps/subgraph-core/src/user/recommended-courses.service.spec.ts` — mock DB: assert `withTenantContext` called; assert fallback to enrollment count when mastery empty; assert reason text populated
- `apps/subgraph-core/src/user/user.resolver.spec.ts` — assert `myRecommendedCourses` no longer returns `[]`

---

## Phase 3 — Quick Fixes (TD-3 through TD-9) — parallel with 1,2,4

### 3A: web-vitals package (TD-3)

**Modify:** `apps/web/package.json` — add `"web-vitals": "^3.5.0"` to dependencies

**Modify:** `apps/web/src/lib/vitals.ts` — replace stub with real implementation:
```typescript
import { onCLS, onFID, onLCP, onFCP, onTTFB } from 'web-vitals';
export function reportWebVitals(): void {
  const endpoint = import.meta.env.VITE_VITALS_ENDPOINT;
  if (!endpoint) return;
  const send = (metric: unknown) => navigator.sendBeacon(endpoint, JSON.stringify(metric));
  onCLS(send); onFID(send); onLCP(send); onFCP(send); onTTFB(send);
}
```

### 3B: Mobile TypeScript fix (TD-4)

**Modify:** `apps/mobile/package.json` — change `"typescript": "^6.0.3"` → `"typescript": "~5.9.3"`

Run: `pnpm --filter @edusphere/mobile install` to update lockfile.

### 3C: VAPID env vars documentation (TD-5)

**Modify:** `apps/subgraph-core/.env.example` — add:
```
# Push Notifications (Web Push VAPID)
WEB_PUSH_VAPID_PUBLIC=<generate with: npx web-push generate-vapid-keys>
WEB_PUSH_VAPID_PRIVATE=<generate with: npx web-push generate-vapid-keys>
WEB_PUSH_SUBJECT=mailto:admin@edusphere.dev
```

**Modify:** root `.env.example` — add same block under `# Notifications` section

### 3D: Chavruta TemplateType mismatch (TD-7)

**Investigate:** `apps/subgraph-agent/src/agent/agent-template.service.ts` — check if enum value is `CHAVRUTA` or `CHAVRUTA_DEBATE`

**Modify:** whichever file has the mismatch — align enum value to match the GraphQL SDL `TemplateType` enum definition in `apps/subgraph-agent/src/agent/agent.graphql`. If SDL says `CHAVRUTA_DEBATE`, update service; if service says `CHAVRUTA`, update SDL + codegen.

Run: `pnpm codegen` after fix to regenerate `packages/graphql-types`.

### 3E: Lighthouse a11y gate hardening (TD-9)

**Modify:** `.github/workflows/ci.yml` — find the lighthouse-ci step and remove `|| true`:
```yaml
# BEFORE:
- run: pnpm lhci autorun || true
# AFTER:
- run: pnpm lhci autorun
  env:
    LHCI_GITHUB_APP_TOKEN: ${{ secrets.LHCI_GITHUB_APP_TOKEN }}
```

**Modify:** `.lighthouserc.json` — ensure `accessibility` assertion uses `"level": "error"` (not `"warn"`):
```json
"assertions": {
  "categories:accessibility": ["error", {"minScore": 0.90}],
  "categories:performance": ["warn", {"minScore": 0.80}]
}
```

### Tests for Phase 3
- `apps/web/src/lib/vitals.test.ts` — mock web-vitals module, assert `sendBeacon` called with CLS/LCP metrics
- `apps/mobile/src/App.test.tsx` — verify TypeScript compilation passes at v5.9.3 (typecheck gate)
- Security test for TD-7: `pnpm turbo typecheck --filter=@edusphere/subgraph-agent` — 0 errors

---

## Phase 4 — AtRisk Dashboard Real Data (TD-6) — parallel with 1,2,3

### Problem
`apps/web/src/pages/AtRiskDashboardPage.tsx` uses mock data. The `listAtRiskLearners` query exists in `apps/subgraph-content/src/analytics/analytics.graphql` (likely stub).

### Backend

**Verify:** `apps/subgraph-content/src/analytics/analytics.resolver.ts` — does `listAtRiskLearners` have a real implementation?

**New/Modify:** `apps/subgraph-content/src/analytics/at-risk.service.ts`
- `getAtRiskLearners(tenantId, threshold)` — queries `user_courses` for learners with `progress_pct < threshold` AND `last_activity_at < NOW() - INTERVAL '14 days'`
- Returns `AtRiskLearner[]` with `userId, displayName, courseId, courseTitle, daysSinceActive, progressPct`
- `withTenantContext` (SI-9) + `OnModuleDestroy` (memory)
- GDPR: no raw email in response — displayName only

**Modify:** `apps/subgraph-content/src/analytics/analytics.module.ts` — provide AtRiskService

### Frontend

**New file:** `apps/web/src/lib/graphql/at-risk.queries.ts` — `LIST_AT_RISK_LEARNERS_QUERY`

**Modify:** `apps/web/src/pages/AtRiskDashboardPage.tsx`
- Replace mock array with `useQuery({ query: LIST_AT_RISK_LEARNERS_QUERY, pause: !mounted })`
- Fallback: empty state card "No at-risk learners detected" (not blank, not mock data)

### Tests
- `apps/subgraph-content/src/analytics/at-risk.service.spec.ts`
- `apps/web/src/pages/AtRiskDashboardPage.test.tsx` — assert mock strings NOT in DOM

---

## Phase 5 — XP Foundation (TD-8) — after Phases 1–4

### Problem
`DashboardPage.tsx` has `// XP system deferred to Phase 36` comment. Need basic XP model: award XP on lesson completion + quiz pass, display total on dashboard.

### Database

**New file:** `packages/db/src/schema/user-xp.ts`
```typescript
// user_xp_events: id, user_id, tenant_id, event_type enum('LESSON_COMPLETED','QUIZ_PASSED','STREAK_BONUS','COURSE_COMPLETED'), xp_awarded int, metadata jsonb, created_at
// user_xp_totals: user_id PK, tenant_id, total_xp int default 0, level int default 1, updated_at
```

**New file:** `packages/db/src/migrations/0020_user_xp.sql`
- RLS: `user_id::text = current_setting('app.current_user_id', TRUE) OR tenant_id::text = current_setting('app.current_tenant', TRUE)`
- Unique index: `(user_id)` on `user_xp_totals`
- Trigger: `AFTER INSERT ON user_xp_events` → upsert `user_xp_totals.total_xp += NEW.xp_awarded`; level = `FLOOR(SQRT(total_xp / 100))::int + 1`

### Backend

**New file:** `apps/subgraph-core/src/gamification/xp.service.ts`
- `awardXP(userId, tenantId, eventType, xpAmount, metadata)` — insert event + upsert total
- `getUserXP(userId, tenantId)` — returns `{ totalXp, level, recentEvents: last 5 }`
- `OnModuleDestroy` + `closeAllPools()`
- XP table: LESSON_COMPLETED=10, QUIZ_PASSED=25, STREAK_BONUS=5, COURSE_COMPLETED=100

**Modify:** `apps/subgraph-core/src/user/user.graphql` — add to `UserStats`:
```graphql
totalXp: Int!
level: Int!
```

**Modify:** `apps/subgraph-core/src/user/user-stats.service.ts` — include `getUserXP()` in `getStats()` return

**NATS integration:** `apps/subgraph-core/src/notifications/nats-notification.bridge.ts` — subscribe to `EDUSPHERE.lesson.completed` and `EDUSPHERE.quiz.passed` → call `XpService.awardXP()`

### Frontend

**Modify:** `apps/web/src/pages/DashboardPage.tsx`
- Remove `MOCK_XP` and the `// XP system deferred to Phase 36` comment
- Wire `myStats.totalXp` and `myStats.level` from existing `MY_STATS_WITH_STREAK_QUERY` (extend query to include new fields)
- XP progress bar: `(totalXp % 100) / 100 * 100%` width toward next level
- Level badge: `Lv. {level}` next to streak widget

### Tests
- `packages/db/src/schema/user-xp.schema.test.ts`
- `apps/subgraph-core/src/gamification/xp.service.spec.ts` — verify XP math, level calculation
- `apps/web/src/pages/DashboardPage.test.tsx` — extend: assert `MOCK_XP` constant gone, `totalXp` shows numeric value

---

## Phase 6 — Personalized Recommendations Algorithm (TD-10) — after Phase 2

### Enhancement over Phase 35 fallback
Phase 35's `RecommendedCoursesService` falls back to enrollment count. Phase 36 wires a proper multi-signal scoring algorithm.

### Signals
1. **Skill gap** — concepts in `user_skill_mastery` with level < PROFICIENT → weight 0.5
2. **Learning velocity** — `user_learning_velocity.lessons_per_week` → high velocity users get harder courses
3. **Collaborative filtering** — courses completed by users with similar skill profiles in same tenant → weight 0.3
4. **Freshness** — recently added courses get +0.1 boost (added within 30 days)

### Backend

**New file:** `apps/subgraph-knowledge/src/graph/recommendation-scorer.ts`
- `scoreCoursesForUser(userId, tenantId, candidateCourseIds)` → `Map<courseId, {score, reason}>`
- Pure function (no DB calls) — takes pre-fetched signals as params (testable, SI-10 ✓)
- Reason string: "Based on your gap in [Concept]" or "Trending in your organization"

**Modify:** `apps/subgraph-core/src/user/recommended-courses.service.ts`
- Fetch 3 signals in parallel: `Promise.all([getSkillGaps, getVelocity, getTopCoursesInTenant])`
- Call `RecommendationScorer.scoreCoursesForUser()`
- Sort by score descending, return top-N

### Tests
- `apps/subgraph-knowledge/src/graph/recommendation-scorer.spec.ts` — unit test scoring math; assert high-gap course scores above already-mastered
- `apps/subgraph-core/src/user/recommended-courses.service.spec.ts` — extend: mock all 3 signals, verify scorer called, verify reason populated

---

## Phase 7 — Lesson Pipeline Builder MVP (TD-11) — independent

### Scope (MVP only — full spec is 13 agent-days, this is foundations)

Lesson Pipeline Builder = WYSIWYG lesson authoring tool for instructors. MVP: create lesson with steps (Video → Quiz → Discussion → Summary), preview, save draft.

### Database

**New file:** `packages/db/src/schema/lesson-pipeline.ts`
- `lesson_pipelines`: `id, course_id, tenant_id, title, status enum('DRAFT','PUBLISHED','ARCHIVED'), created_by uuid, created_at, updated_at`
- `pipeline_steps`: `id, pipeline_id, step_type enum('VIDEO','QUIZ','DISCUSSION','AI_CHAT','SUMMARY'), step_order int, config jsonb, created_at`

**New file:** `packages/db/src/migrations/0021_lesson_pipeline.sql`
- RLS on both tables: tenant isolation
- FK: `pipeline_steps.pipeline_id → lesson_pipelines.id ON DELETE CASCADE`

### Backend

**New file:** `apps/subgraph-content/src/pipeline/lesson-pipeline.service.ts`
- CRUD: `createPipeline`, `getPipeline`, `updatePipeline`, `addStep`, `reorderSteps`, `publishPipeline`
- `OnModuleDestroy` + `closeAllPools()`

**New file:** `apps/subgraph-content/src/pipeline/lesson-pipeline.resolver.ts`

**New SDL:** `apps/subgraph-content/src/pipeline/lesson-pipeline.graphql`
```graphql
type LessonPipeline { id: ID! courseId: ID! title: String! status: PipelineStatus! steps: [PipelineStep!]! createdAt: DateTime! }
type PipelineStep { id: ID! stepType: StepType! stepOrder: Int! config: JSON! }
enum PipelineStatus { DRAFT PUBLISHED ARCHIVED }
enum StepType { VIDEO QUIZ DISCUSSION AI_CHAT SUMMARY }
input CreatePipelineInput { courseId: ID! title: String! }
input AddStepInput { pipelineId: ID! stepType: StepType! config: JSON! }
extend type Query {
  lessonPipeline(id: ID!): LessonPipeline @authenticated
  myCoursePipelines(courseId: ID!): [LessonPipeline!]! @authenticated @requiresRole(roles: [INSTRUCTOR, ORG_ADMIN, SUPER_ADMIN])
}
extend type Mutation {
  createLessonPipeline(input: CreatePipelineInput!): LessonPipeline! @authenticated @requiresRole(roles: [INSTRUCTOR, ORG_ADMIN, SUPER_ADMIN])
  addPipelineStep(input: AddStepInput!): LessonPipeline! @authenticated @requiresRole(roles: [INSTRUCTOR, ORG_ADMIN, SUPER_ADMIN])
  reorderPipelineSteps(pipelineId: ID!, stepIds: [ID!]!): LessonPipeline! @authenticated @requiresRole(roles: [INSTRUCTOR, ORG_ADMIN, SUPER_ADMIN])
  publishLessonPipeline(id: ID!): LessonPipeline! @authenticated @requiresRole(roles: [INSTRUCTOR, ORG_ADMIN, SUPER_ADMIN])
}
```

### Frontend (MVP — Instructor only)

**New file:** `apps/web/src/pages/LessonPipelineBuilderPage.tsx`
- Route: `/courses/:courseId/pipeline/builder`
- Guard: INSTRUCTOR/ORG_ADMIN/SUPER_ADMIN only
- Left panel: Step palette (drag icons for Video/Quiz/Discussion/AI_Chat/Summary)
- Center: Pipeline canvas — vertical list of steps (reorderable via drag-and-drop)
- Right panel: Step config editor (title, duration, prompt text per step type)
- Save Draft button → `createLessonPipeline` + `addPipelineStep` mutations
- Publish button → `publishLessonPipeline` mutation

**New file:** `apps/web/src/lib/graphql/pipeline.queries.ts`

**Modify:** `apps/web/src/App.tsx` — add route `/courses/:courseId/pipeline/builder`

### Tests
- `packages/db/src/schema/lesson-pipeline.schema.test.ts`
- `apps/subgraph-content/src/pipeline/lesson-pipeline.service.spec.ts`
- `apps/web/src/pages/LessonPipelineBuilderPage.test.tsx` — assert instructor can see builder, student gets redirect
- E2E: `apps/web/e2e/lesson-pipeline-builder.spec.ts` — instructor login → navigate to course → open builder → add step → save draft → assert pipeline title visible

---

## Phase 8 — E2E Tests + CI Gate (sequential gate)

### New E2E Specs

| File | Assertions |
|------|-----------|
| `apps/web/e2e/courses-discovery-realdata.spec.ts` | No "Introduction to Talmud Study" in DOM; filter chip works; pagination; `toHaveScreenshot` |
| `apps/web/e2e/recommendations-realdata.spec.ts` | Recommended courses have `reason` text; no "[]" or empty list when mastery data exists; `toHaveScreenshot` |
| `apps/web/e2e/at-risk-dashboard.spec.ts` | ORG_ADMIN login; table rows visible; student gets 403; `toHaveScreenshot` |
| `apps/web/e2e/lesson-pipeline-builder.spec.ts` | Instructor creates pipeline + adds VIDEO step; publish button; `toHaveScreenshot` |
| `apps/web/e2e/xp-dashboard.spec.ts` | Dashboard shows level badge + XP bar; no "MOCK_XP" in DOM; `toHaveScreenshot` |

### Security Tests

**Modify:** `tests/security/graphql-authorization.spec.ts`
- `createLessonPipeline` — assert STUDENT gets AuthorizationError
- `publishLessonPipeline` — assert STUDENT gets AuthorizationError
- `listAtRiskLearners` — assert STUDENT gets AuthorizationError

### CI Gate

**Modify:** `.github/workflows/ci.yml` — remove `|| true` from lhci step (Phase 3E)

---

## Memory Safety Checklist

| New Service | OnModuleDestroy | closeAllPools |
|-------------|----------------|---------------|
| recommended-courses.service.ts | ✓ | ✓ |
| xp.service.ts | ✓ | ✓ |
| at-risk.service.ts | ✓ | ✓ |
| lesson-pipeline.service.ts | ✓ | ✓ |

---

## Agent Parallelization Map

```
Sprint A — Day 1 (all 4 parallel, no deps)
├── Agent-1 [Frontend]:   Phase 1 — CoursesDiscovery real data
├── Agent-2 [Backend]:    Phase 2 — Real recommendations service
├── Agent-3 [DevOps/QA]:  Phase 3 — Quick fixes (TD-3..9)
└── Agent-4 [Backend]:    Phase 4 — AtRisk real data

Sprint B — Day 2 (all 3 parallel, after Sprint A)
├── Agent-5 [DB+Backend]: Phase 5 — XP Foundation (DB + backend + NATS)
├── Agent-6 [Knowledge]:  Phase 6 — Personalized scoring algorithm
└── Agent-7 [Full-Stack]: Phase 7 — Lesson Pipeline Builder MVP

Sprint C — Day 3 (sequential gate)
└── Agent-8 [QA]:         Phase 8 — All E2E + security + CI gate removal
```

---

## Security Invariants

| Phase | Invariant | Mitigation |
|-------|-----------|-----------|
| 5 (XP) | SI-1 RLS uses `app.current_user_id` | Migration 0020 uses correct session variable |
| 7 (Pipeline) | SI-9 tenant isolation | `withTenantContext` on all pipeline queries |
| 7 (Pipeline) | SDL auth | `@requiresRole(roles: [INSTRUCTOR, ...])` on all mutations |
| 6 (Scoring) | SI-10 rule-based only | No LLM call in scorer — pure math function |

---

## Verification Steps

### After Phase 1 (CoursesDiscovery)
```bash
pnpm --filter @edusphere/web dev
# Login as student@example.com
# Navigate to /explore — assert "Introduction to Talmud Study" NOT in DOM
# DevTools Network: verify COURSES_DISCOVERY_QUERY fires
```

### After Phase 3 (Quick Fixes)
```bash
pnpm --filter @edusphere/mobile typecheck  # 0 errors (TypeScript 5.9.3)
pnpm --filter @edusphere/web test -- vitals  # web-vitals mock test passes
grep -r "CHAVRUTA" apps/subgraph-agent/src/  # single consistent enum value
```

### After Phase 5 (XP)
```bash
# mcp__postgres__pg_execute_query:
#   SELECT tablename FROM pg_tables WHERE tablename IN ('user_xp_events','user_xp_totals')
# → 2 rows
# Login as student@example.com → complete a lesson → dashboard shows XP increment
```

### After Phase 8 (Full Test Gate)
```bash
pnpm turbo test               # all pass, 0 failures
pnpm turbo typecheck          # 0 TypeScript errors
pnpm turbo lint               # 0 warnings/errors
pnpm --filter @edusphere/web test:e2e  # all Playwright specs pass
pnpm test:security            # 0 failures
./scripts/health-check.sh     # all services UP
gh run list --limit 3         # all CI runs green (a11y gate now hard-blocks)
```

---

## OPEN_ISSUES.md Entry

```
FEAT-PHASE36-TECHDEBT-RECOMMENDATIONS-PIPELINE | 🟡 In Progress | HIGH
Phase 36 — Technical Debt Clearance + Personalized Recommendations + Lesson Pipeline
8 phases: CoursesDiscovery real data, real recommendations, 7 quick fixes, AtRisk real data,
XP foundation (DB+NATS+UI), personalized scoring algorithm, Lesson Pipeline Builder MVP, E2E gate
Files: apps/web, apps/subgraph-core, apps/subgraph-content, apps/subgraph-knowledge, apps/mobile, packages/db
Tests required: unit + integration + E2E + visual regression + security
```
