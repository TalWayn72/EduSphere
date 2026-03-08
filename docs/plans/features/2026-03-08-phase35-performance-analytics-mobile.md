# Phase 35: Performance, Analytics & Mobile Parity — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Close six production gaps: replace all mock data in DashboardPage with real DB queries, add tenant-level analytics with CSV export, wire Lighthouse CI, build push notifications (web + mobile) over NATS, complete mobile parity with 3 new screens, and fix the documented N+1 in skill-gap.recommendations.ts.

**Architecture:** 9 phases with dependency-ordered parallel execution (Phases 1–3 fully parallel; Phases 4–7 parallel after Phase 1–3; Phases 8–9 sequential gate). ~13 agent-days, wall-clock 4 days with max parallelism.

**Tech Stack:** NestJS + Drizzle ORM + pgvector | urql | Recharts | web-vitals | web-push | Expo Notifications | @gorhom/bottom-sheet | DataLoader pattern

**Document Storage:** After plan mode exits, move to `docs/plans/features/2026-03-08-phase35-performance-analytics-mobile.md` (CLAUDE.md iron rule)

---

## Context

Phase 34 (Visual Anchoring) is complete. 5,711 passing tests. Six production gaps remain:
1. **DashboardPage** — 5 mock data sources (`MOCK_IN_PROGRESS`, `MOCK_RECOMMENDED`, `MOCK_ACTIVITY`, `MOCK_STREAK`, `MOCK_MASTERY`) in production code
2. **Analytics** — Admin has no real tenant-wide metrics; no CSV export
3. **Performance** — No Lighthouse CI gate, no Web Vitals tracking, no image optimization
4. **Push Notifications** — NATS events exist but no delivery to devices
5. **Mobile Parity** — LiveSessions, SkillTree, 3D viewer missing from mobile
6. **AI N+1** — `skill-gap.recommendations.ts:29–61` fires one pgvector query per concept (documented in code with `TODO: N+1`)

---

## Dependency Graph

```
Phase 1 (DB Migrations) ──────► Phase 4 (Real Dashboard)
                         ──────► Phase 5 (Tenant Analytics)
Phase 2 (SDL Extensions) ──────► Phase 4, 5, 6
Phase 3 (AI / N+1 fix)  ─ (independent)

Phase 4 ─┐
Phase 5 ─┼──► Phase 9 (E2E + CI)
Phase 6 ─┘
Phase 7 (Mobile) — independent of 4/5/6

Phase 8 (Lighthouse CI) — after Phase 4 deployed (needs buildable app)
Phase 9 (E2E Tests + CI gate) — final sequential gate
```

---

## Phase 1 — Database Migrations (parallel with 2 and 3)

**Files to create:**

| File | Purpose |
|------|---------|
| `packages/db/src/schema/tenant-analytics-snapshots.ts` | Pre-aggregated daily analytics snapshots |
| `packages/db/src/schema/push-notification-tokens.ts` | Device push tokens (web/ios/android) |
| `packages/db/src/schema/user-learning-velocity.ts` | Weekly per-user lesson velocity |
| `packages/db/src/migrations/0013_tenant_analytics_snapshot.ts` | DDL + RLS + indexes |
| `packages/db/src/migrations/0014_push_tokens.ts` | DDL + RLS |
| `packages/db/src/migrations/0015_learning_velocity.ts` | DDL + RLS |

**Files to modify:** `packages/db/src/schema/index.ts` — export 3 new schemas

### Table Definitions

**`tenant_analytics_snapshots`:**
- `id` uuid pk | `tenant_id` uuid | `snapshot_date` date | `active_learners` int | `completions` int | `avg_completion_rate` float | `total_learning_minutes` int | `new_enrollments` int | `snapshot_type` enum('daily','weekly','monthly') | `created_at`
- RLS: `tenant_id::text = current_setting('app.current_tenant', TRUE)` (SI-1 ✓)
- Index: unique `(tenant_id, snapshot_date, snapshot_type)`

**`push_notification_tokens`:**
- `id` uuid pk | `user_id` uuid FK users cascade | `tenant_id` uuid | `token` text | `platform` enum('web','ios','android') | `expo_push_token` text nullable | `web_push_subscription` jsonb nullable | `last_seen_at` | `created_at`
- RLS: `user_id::text = current_setting('app.current_user_id', TRUE)`
- Index: unique `(user_id, token)`, `(user_id, platform)`

**`user_learning_velocity`:**
- `id` uuid pk | `user_id` uuid FK | `tenant_id` uuid | `week_start` date | `lessons_completed` int default 0 | `minutes_studied` int default 0 | `annotations_added` int default 0 | `created_at`
- RLS: `user_id::text = current_setting('app.current_user_id',TRUE) OR tenant_id::text = current_setting('app.current_tenant',TRUE)`
- Index: unique `(user_id, week_start)`, `(tenant_id, week_start)`

**Reuse:** `pk()`, `tenantId()`, `...timestamps`, `...softDelete` from `packages/db/src/schema/shared.ts`. Use `getOrCreatePool()` from `packages/db/src/index.ts` (SI-8 ✓).

### Tests Required
- `packages/db/src/schema/schema-extended.test.ts` — extend existing test; assert all 3 new tables exist and RLS is enabled (`pg_policies`)
- Unit tests per schema file asserting Drizzle type inference

---

## Phase 2 — GraphQL SDL Extensions (parallel with 1 and 3)

### 2A: `apps/subgraph-core/src/user/user.graphql`

Add to existing `UserStats` type (already computed in `user-stats.service.ts:computeStreaks()` — SDL-only gap):
```graphql
currentStreak: Int!
longestStreak: Int!
```

Add new queries:
```graphql
type InProgressCourse { id: ID! courseId: ID! title: String! progress: Int! lastAccessedAt: DateTime instructorName: String }
type RecommendedCourse { courseId: ID! title: String! instructorName: String reason: String! }
type ActivityFeedItem { id: ID! eventType: ActivityEventType! description: String! occurredAt: DateTime! }
enum ActivityEventType { LESSON_COMPLETED QUIZ_PASSED AI_SESSION ANNOTATION_ADDED COURSE_ENROLLED }
type UserMasteryTopic { topicName: String! level: MasteryLevel! }
enum MasteryLevel { NONE ATTEMPTED FAMILIAR PROFICIENT MASTERED }

extend type Query {
  myInProgressCourses(limit: Int = 5): [InProgressCourse!]! @authenticated
  myRecommendedCourses(limit: Int = 5): [RecommendedCourse!]! @authenticated
  myActivityFeed(limit: Int = 10): [ActivityFeedItem!]! @authenticated
  myTopMasteryTopics(limit: Int = 5): [UserMasteryTopic!]! @authenticated
}
```

### 2B: `apps/subgraph-content/src/analytics/analytics.graphql`

Add tenant analytics types and queries:
```graphql
enum AnalyticsPeriod { SEVEN_DAYS THIRTY_DAYS NINETY_DAYS }
enum ExportFormat { CSV EXCEL }
type TrendPoint { date: String! value: Float! }
type TenantAnalytics { activeLearnersTrend: [TrendPoint!]! completionRateTrend: [TrendPoint!]! totalEnrollments: Int! avgLearningVelocity: Float! topCourses: [CourseCompletionMetric!]! }
type CourseCompletionMetric { courseId: ID! courseTitle: String! enrollmentCount: Int! completionRate: Float! avgTimeToCompleteHours: Float }
type LearnerVelocityRow { userId: ID! displayName: String! lessonsPerWeek: Float! weeklyTrend: [TrendPoint!]! }
type CohortMetrics { cohortWeek: String! enrolled: Int! activeAt7Days: Int! activeAt30Days: Int! completionRate30Days: Float! }

extend type Query {
  tenantAnalytics(period: AnalyticsPeriod!): TenantAnalytics! @authenticated @requiresRole(roles: [ORG_ADMIN, SUPER_ADMIN])
  learnerVelocity(period: AnalyticsPeriod!, limit: Int = 20): [LearnerVelocityRow!]! @authenticated @requiresRole(roles: [ORG_ADMIN, SUPER_ADMIN])
  cohortRetention(weeksBack: Int = 12): [CohortMetrics!]! @authenticated @requiresRole(roles: [ORG_ADMIN, SUPER_ADMIN])
}
extend type Mutation {
  exportTenantAnalytics(period: AnalyticsPeriod!, format: ExportFormat!): String! @authenticated @requiresScopes(scopes: [["analytics:export"]]) @requiresRole(roles: [ORG_ADMIN, SUPER_ADMIN])
}
```

### 2C: `apps/subgraph-core/src/notifications/notifications.graphql`

Add push token mutations and extend `NotificationType` enum:
```graphql
enum PushPlatform { WEB IOS ANDROID }
type PushRegistration { id: ID! platform: PushPlatform! createdAt: DateTime! }

extend type Mutation {
  registerPushToken(platform: PushPlatform!, expoPushToken: String, webPushSubscription: JSON): PushRegistration! @authenticated
  unregisterPushToken(platform: PushPlatform!): Boolean! @authenticated
}
# Extend NotificationType enum with: LESSON_AVAILABLE, SESSION_STARTING, STREAK_REMINDER, AT_RISK_ALERT
```

### 2D: `apps/subgraph-knowledge/src/graph/graph.graphql`

Add adaptive path types and `explanationText: String!` to existing `SkillGapItem`:
```graphql
type AdaptivePathItem { contentItemId: ID! title: String! estimatedMinutes: Int! reason: String! priorityScore: Float! }
type AdaptiveLearningPath { courseId: ID! timeBudgetMinutes: Int! items: [AdaptivePathItem!]! masteryGapCount: Int! }
extend type Query {
  adaptiveLearningPath(courseId: ID!, timeBudgetMinutes: Int = 30): AdaptiveLearningPath! @authenticated
}
```

---

## Phase 3 — AI Recommendations: N+1 Fix + Adaptive Paths (parallel with 1 and 2)

### 3A: Fix N+1

**Critical file:** `apps/subgraph-knowledge/src/graph/skill-gap.recommendations.ts:29–61`

Problem: `Promise.all(gapConcepts.map(async (c) => semanticSearch(c)))` fires N pgvector queries.

**New file:** `apps/subgraph-knowledge/src/embedding/embedding.dataloader.ts`

Strategy:
1. `Promise.all` to embed all concept strings in parallel (unavoidable — one embedding call per string)
2. Single pgvector SQL query matching all embedded vectors at once using `ANY()` array
3. Group results by concept using `ROW_NUMBER() OVER (PARTITION BY ...)`
4. Returns `Map<conceptName, SearchResult[]>`

**Modify:** `apps/subgraph-knowledge/src/graph/skill-gap.recommendations.ts` — replace N-query loop with `EmbeddingDataLoader.batchLoad(gapConcepts)`. Remove the `this.logger.warn('[SkillGapRecommendations] N+1 query detected')` line.

### 3B: Adaptive Learning Path

**New files:**
- `apps/subgraph-knowledge/src/graph/adaptive-path.service.ts` — reads `user_skill_mastery` → reorders course content by gap/mastery/duration; `withTenantContext`; `OnModuleDestroy`
- `apps/subgraph-knowledge/src/graph/adaptive-path.resolver.ts` — thin NestJS resolver

### 3C: Recommendation Explanations (rule-based — SI-10 ✓, no LLM call)

**Modify:** `apps/subgraph-knowledge/src/graph/skill-gap.recommendations.ts` — add `explanationText` generation from existing data (concept name, gap count, relevance score). No LLM.

**Tests:** `embedding.dataloader.spec.ts` (spy on `db.execute`, verify called once for N concepts); `skill-gap.recommendations.spec.ts` (verify `batchLoad` called once, `semanticSearch` called 0 times); `adaptive-path.service.spec.ts` (mock mastery data, verify gap-items ordered first); `adaptive-path.resolver.spec.ts`

---

## Phase 4 — Real Dashboard Data (depends on Phase 1 + 2A)

### Backend

**New files:**
- `apps/subgraph-core/src/user/activity-feed.service.ts` — merges `user_progress`, `annotations`, `user_courses` by timestamp; `OnModuleDestroy`+`closeAllPools()`; max 50 items
- `apps/subgraph-core/src/user/in-progress-courses.service.ts` — joins `user_courses`, `courses`, `users`; calculates progress ratio from `user_progress`

**Modify:**
- `apps/subgraph-core/src/user/user.module.ts` — add 2 new services
- `apps/subgraph-core/src/user/user-stats.service.ts` — return `currentStreak`/`longestStreak` from already-computed `computeStreaks()`

### Frontend

**New file:** `apps/web/src/lib/graphql/dashboard.queries.ts` — urql `gql` exports for `MY_IN_PROGRESS_COURSES_QUERY`, `MY_RECOMMENDED_COURSES_QUERY`, `MY_ACTIVITY_FEED_QUERY`, `MY_TOP_MASTERY_TOPICS_QUERY`

**Modify:** `apps/web/src/pages/DashboardPage.tsx` — replace 5 mock sources with real urql queries:
1. `MOCK_IN_PROGRESS` → `useQuery({ query: MY_IN_PROGRESS_COURSES_QUERY, pause: !mounted })`
2. `MOCK_RECOMMENDED` → `useQuery({ query: MY_RECOMMENDED_COURSES_QUERY, pause: !mounted })`
3. `MOCK_ACTIVITY` → `useQuery({ query: MY_ACTIVITY_FEED_QUERY, pause: !mounted })`
4. `MOCK_STREAK` → `myStats.currentStreak`
5. `MOCK_MASTERY` → `useQuery({ query: MY_TOP_MASTERY_TOPICS_QUERY, pause: !mounted })`
6. `MOCK_XP` — keep with comment: "XP system deferred to Phase 36" (no silent removal)

**Iron Rule:** Every real query shows mock data fallback when `fetching || error` — never blank state, never raw error string to user.

**Tests:** `DashboardPage.test.tsx` (mock 3 new queries; assert MOCK string constants NOT in DOM on success; assert fallback on error); `activity-feed.service.spec.ts`; `in-progress-courses.service.spec.ts`

---

## Phase 5 — Tenant Admin Analytics Dashboard (depends on Phase 1 + 2B)

### Backend

**New files:**
- `apps/subgraph-content/src/analytics/tenant-analytics.service.ts` — `getTenantAnalytics`, `getLearnerVelocity`, `getCohortRetention`; 90-day uses `tenant_analytics_snapshots` (falls back to live query); all methods use `withTenantContext`; `OnModuleDestroy`
- `apps/subgraph-content/src/analytics/tenant-analytics-export.service.ts` — inline CSV formatter → MinIO upload via existing `getPresignedUploadUrl` pattern → returns 15-min pre-signed URL
- `apps/subgraph-content/src/analytics/tenant-analytics.resolver.ts` — thin resolver
- `apps/subgraph-content/src/analytics/analytics-snapshot.job.ts` — `@Cron('0 0 * * *')` midnight aggregation; `OnModuleDestroy` clears cron handle

**Modify:** `apps/subgraph-content/src/analytics/analytics.module.ts` — add new services

### Frontend

**New files** (all ≤150 lines each):
- `apps/web/src/pages/TenantAnalyticsPage.tsx` — main: period tabs (7d/30d/90d) + KPI cards + Export button
- `apps/web/src/pages/TenantAnalyticsPage.charts.tsx` — Recharts AreaChart + LineChart
- `apps/web/src/pages/TenantAnalyticsPage.cohort.tsx` — cohort retention heatmap table (color cells by %)
- `apps/web/src/pages/TenantAnalyticsPage.export.tsx` — export mutation + open pre-signed URL
- `apps/web/src/lib/graphql/tenant-analytics.queries.ts` — all 4 urql query/mutation exports

**Modify:** admin routing — add `/admin/analytics` → `TenantAnalyticsPage` (guard: ORG_ADMIN only)

**Security:** CSV must not include raw user_id UUIDs — displayName only (GDPR). `analytics:export` scope required in Keycloak ORG_ADMIN role mapping.

**Tests:** `TenantAnalyticsPage.test.tsx`; `tenant-analytics.service.spec.ts`; `tenant-analytics-export.service.spec.ts`

---

## Phase 6 — Push Notifications (depends on Phase 1 + 2C)

### Backend

**New files:**
- `apps/subgraph-core/src/notifications/push-token.service.ts` — upsert/delete/getTokensForUser/getTokensByUserIds; `OnModuleDestroy`
- `apps/subgraph-core/src/notifications/push-dispatch.service.ts` — dispatches via Expo Push API (ios/android) and `web-push` npm (web); `Promise.race(send, timeout(10_000))`; fire-and-forget (never throws); token NOT logged in Pino (SI-3 adjacent)

**Env vars required:** `WEB_PUSH_VAPID_PUBLIC`, `WEB_PUSH_VAPID_PRIVATE`, `WEB_PUSH_SUBJECT`

**Modify:**
- `apps/subgraph-core/src/notifications/nats-notification.bridge.ts` — add 4 subjects to `SUBJECT_MAP`: `EDUSPHERE.lesson.available`, `EDUSPHERE.session.starting`, `EDUSPHERE.streak.reminder`, `EDUSPHERE.at.risk.alert`; wire `PushDispatchService.dispatchToUser()` after existing notification logic
- `apps/subgraph-core/src/notifications/notifications.module.ts` — add new services
- `apps/subgraph-core/src/notifications/notifications.resolver.ts` — add `registerPushToken`/`unregisterPushToken` mutations

### Frontend Web

**New files:**
- `apps/web/src/lib/webPush.ts` — VAPID subscribe helper wrapping `pushManager.subscribe()`
- `apps/web/src/hooks/usePushNotifications.ts` — `requestPermission()` → `subscribe()` → `registerPushToken` mutation; cleanup removes SW `push` listener on unmount

**Modify:**
- `apps/web/src/pages/NotificationsPage.tsx` — add push toggle (Enable/Disable)
- `apps/web/src/pwa.ts` — add `push` event handler that shows `self.registration.showNotification()`

### Frontend Mobile

**New file:** `apps/mobile/src/notifications/index.ts` — `registerForPushNotificationsAsync()` → `registerPushToken` mutation
**Modify:** `apps/mobile/App.tsx` — call on app init

**Tests:** `push-token.service.spec.ts`; `push-dispatch.service.spec.ts`; `usePushNotifications.test.ts` (mock pushManager, assert SW listener cleanup)

---

## Phase 7 — Mobile Parity (independent — parallel with 4/5/6)

### New Screens

**New files:**
- `apps/mobile/src/screens/LiveSessionsScreen.tsx` — tabs (Upcoming/Past); role-based buttons (INSTRUCTOR: Start/Manage, STUDENT: Join); matches `LiveSessionsPage.tsx` feature parity
- `apps/mobile/src/screens/SkillTreeScreen.tsx` — `FlatList` of skill tree nodes; tap → modal with mastery level + progress bar
- `apps/mobile/src/screens/ModelViewerScreen.tsx` — `expo-gl`/`expo-three` 3D viewer; loading skeleton; error fallback when GL not available

**New component:**
- `apps/mobile/src/components/WeeklyActivityBar.tsx` — pure presentational heatmap bar for 7-day activity

**New files:**
- `apps/mobile/src/lib/graphql/live-session.queries.ts`
- `apps/mobile/src/lib/graphql/knowledge.queries.ts`

**Modify:**
- `apps/mobile/src/navigation/index.tsx` — add 3 new stack screens to `RootStackParamList`
- `apps/mobile/src/screens/HomeScreen.tsx` — add analytics widget (streak + weekly velocity + `WeeklyActivityBar`)
- `apps/mobile/src/screens/CourseDetailScreen.tsx` — add links to LiveSessions + SkillTree for current course

**Tests:** All mobile tests are pure logic (no `@testing-library/react-native` — not installed):
`LiveSessionsScreen.test.tsx`, `SkillTreeScreen.test.tsx`, `ModelViewerScreen.test.tsx`, `WeeklyActivityBar.test.tsx`

---

## Phase 8 — Lighthouse CI + Web Performance (after Phase 4)

### 8A: Lighthouse Config

**New file:** `.lighthouserc.json`
- `collect`: 2 runs, URL `/` and `/dashboard`, start with `pnpm --filter @edusphere/web preview --port 4173`
- `assert`: Performance `warn ≥0.80`, Accessibility `error ≥0.90`, LCP `warn ≤3500ms`, CLS `warn ≤0.10`
- `upload`: `temporary-public-storage`

**Modify:** `.github/workflows/ci.yml` — add `lighthouse-ci` to `ci-complete` needs list (currently missing)

### 8B: Web Vitals

**New file:** `apps/web/src/lib/vitals.ts` — wraps `web-vitals` pkg; `onCLS`/`onFID`/`onLCP`/`onFCP`/`onTTFB` → `navigator.sendBeacon(VITE_VITALS_ENDPOINT, JSON.stringify(...))`

**Modify:** `apps/web/src/main.tsx` — call `reportWebVitals()` after mount

**New file:** `apps/subgraph-core/src/metrics/vitals.controller.ts` — `@Post('/vitals')`; Zod validation; `this.logger.info({ vitals })` structured Pino (no DB write for MVP)

### 8C: Image Optimization

**New file:** `apps/web/src/components/ui/OptimizedImage.tsx` — `<picture><source type="image/webp" srcset="...?tr=f-webp,q-80"><img src="..." loading="lazy" decoding="async" width height></picture>`

**Modify:** Replace raw `<img>` in `CourseCard.tsx` and `CourseDiscoveryPage.tsx` with `<OptimizedImage />`

### 8D: Preload + Vite Config

**Modify:**
- `apps/web/index.html` — add `<link rel="preload">` for primary font woff2
- `apps/web/vite.config.ts` — add `dashboard.queries.ts` + `tenant-analytics.queries.ts` to `vendor-graphql` chunk; add `/api/health` to workbox `runtimeCaching` with `NetworkFirst`

**Tests:** `vitals.test.ts` (mock web-vitals, assert sendBeacon payload); `vitals.controller.spec.ts` (Zod rejects bad payloads); `OptimizedImage.test.tsx` (assert loading=lazy, picture/source with webp type)

---

## Phase 9 — E2E Tests + CI Gate (final sequential gate)

### New E2E Specs

| File | Assertions |
|------|-----------|
| `apps/web/e2e/dashboard-realdata.spec.ts` | Student login; streak is numeric; no "Dr. Cohen" / "Introduction to Talmud Study" in DOM; `toHaveScreenshot('dashboard-realdata-chromium-win32.png')` |
| `apps/web/e2e/tenant-analytics.spec.ts` | org.admin login; period tabs + 4 KPI cards visible; student gets 403 UI; `toHaveScreenshot('admin-analytics-30d-chromium-win32.png')` |
| `apps/web/e2e/push-notifications.spec.ts` | Mock `Notification.requestPermission`+'pushManager.subscribe' via `page.evaluate`; assert `registerPushToken` mutation intercepted via `page.route()`; `toHaveScreenshot('push-notifications-enabled-chromium-win32.png')` |
| `apps/web/e2e/adaptive-recommendations.spec.ts` | Recommended courses show `reason` text; no "[object Object]" or N+1 warning visible; `toHaveScreenshot('recommendations-with-reason-chromium-win32.png')` |

### Security Tests

**New file:** `tests/security/push-notifications-security.spec.ts`
- `registerPushToken` requires `@authenticated` (assert 401 without JWT)
- Student cannot call `exportTenantAnalytics` (assert AuthorizationError)
- `webPushSubscription` Zod validation rejects malformed JSON
- Token string not present in `pino.info()` / `pino.debug()` calls (grep test)

**Modify:** `tests/security/graphql-authorization.spec.ts` — add assertions for `registerPushToken`, `exportTenantAnalytics`, `adaptiveLearningPath`

---

## Memory Safety Checklist (CLAUDE.md iron rule)

| New Service | OnModuleDestroy | closeAllPools | Extra cleanup |
|-------------|----------------|---------------|---------------|
| activity-feed.service.ts | ✓ | ✓ | — |
| in-progress-courses.service.ts | ✓ | ✓ | — |
| tenant-analytics.service.ts | ✓ | ✓ | — |
| tenant-analytics-export.service.ts | ✓ | ✓ | — |
| push-token.service.ts | ✓ | ✓ | — |
| push-dispatch.service.ts | ✓ | — | Promise.race timeout(10s) |
| adaptive-path.service.ts | ✓ | ✓ | — |
| analytics-snapshot.job.ts | ✓ | ✓ | clear @Cron handle |

| New Hook | useEffect cleanup |
|----------|------------------|
| usePushNotifications.ts | remove SW 'push' listener on unmount |
| WeeklyActivityBar.tsx | pure component — n/a |

---

## Agent Parallelization Map

```
Sprint A — Day 1 (all 3 parallel, no deps)
├── Agent-1 [DB & Data]:     Phase 1 — 3 migrations + 3 schema files + schema/index.ts
├── Agent-2 [Backend Eng.]:  Phase 3 — embedding.dataloader + adaptive-path service + resolver
└── Agent-3 [Architecture]:  Phase 2 — all 4 SDL extension files (draft + schema-first)

Sprint B — Day 2 (all 4 parallel, after Sprint A complete)
├── Agent-4 [Backend Eng.]:  Phase 4 backend (activity-feed + in-progress-courses services)
├── Agent-5 [Backend Eng.]:  Phase 5 backend (tenant-analytics + export + snapshot job)
├── Agent-6 [Backend Eng.]:  Phase 6 backend (push-token + push-dispatch + nats bridge)
└── Agent-7 [Mobile]:        Phase 7 (LiveSessions + SkillTree + ModelViewer + HomeScreen widget)

Sprint C — Day 3 (all 4 parallel, after Sprint B complete)
├── Agent-8 [Frontend Eng.]: Phase 4 frontend (DashboardPage — replace 5 mocks)
├── Agent-9 [Frontend Eng.]: Phase 5 frontend (TenantAnalyticsPage 4 sub-files)
├── Agent-10 [Frontend]:     Phase 6 frontend (usePushNotifications + NotificationsPage + pwa.ts)
└── Agent-11 [Performance]:  Phase 8 (Lighthouse config + vitals.ts + OptimizedImage + vite.config)

Sprint D — Day 4 (sequential gate)
└── Agent-12 [QA]:           Phase 9 — all 4 E2E specs + security test extensions
```

---

## Security Invariants (SI-1 through SI-10)

| # | Relevant to Phase 35 | Mitigation |
|---|---------------------|-----------|
| SI-1 | Phase 1 all migrations | All RLS uses `current_setting('app.current_tenant', TRUE)` / `app.current_user_id` (never `app.current_user`) |
| SI-3 | Phase 6 push tokens | `expo_push_token` is device identifier, not PII; `webPushSubscription` endpoint not logged via Pino |
| SI-7 | Phase 6 new NATS subjects | Uses existing `buildNatsOptions()` — TLS/auth already wired (no bare `connect()`) |
| SI-8 | All new DB services | All use `getOrCreatePool()` from `@edusphere/db` (no `new Pool()`) |
| SI-9 | Phase 4/5/6 services | `withTenantContext()` on every DB call; tenant ID from JWT, never GraphQL arg |
| SI-10 | Phase 3 recommendations | Explanation generation is rule-based only — zero LLM calls. Adaptive path is also pure rule-based logic. |

---

## Key Reusable Utilities (do NOT reinvent)

| Utility | Path | Use for |
|---------|------|---------|
| `withTenantContext` | `packages/db/src/rls/withTenantContext.ts` | All new DB queries |
| `pk()`, `tenantId()`, `...timestamps` | `packages/db/src/schema/shared.ts` | New table defs |
| `getOrCreatePool()` | `packages/db/src/index.ts` | DB pool (SI-8) |
| `getPresignedUploadUrl` | `apps/subgraph-content/src/media/media.service.ts:L88–120` | CSV export → MinIO pre-signed URL |
| `buildNatsOptions()` | `apps/subgraph-core/src/notifications/nats-notification.bridge.ts` | Push notification NATS (SI-7) |
| `NOOP_MUTATION` urql mock | any test file | `[{ fetching: false }, vi.fn()]` cast `as never` |
| `useOfflineStatus` | `apps/web/src/hooks/useOfflineStatus.ts` | Gate push registration on online state |
| Recharts | already in `apps/web/package.json` | Analytics charts (no new install needed) |

---

## Verification Steps

### After Phase 1 (DB)
```bash
pnpm --filter @edusphere/db migrate
# mcp__postgres__pg_execute_query:
#   SELECT tablename FROM pg_tables WHERE tablename IN ('tenant_analytics_snapshots','push_notification_tokens','user_learning_velocity')
# → 3 rows
# mcp__postgres__pg_manage_rls → verify RLS enabled on all 3 tables
```

### After Phase 2 (SDL)
```bash
pnpm --filter @edusphere/gateway compose
# → supergraph compiles 0 errors
# mcp__graphql__introspect-schema → confirm TenantAnalytics, AdaptiveLearningPath, PushRegistration types present
# mcp__graphql__query-graphql → { adaptiveLearningPath(courseId:"...") { items { reason } } }
```

### After Phase 4 (Real Dashboard)
```bash
pnpm --filter @edusphere/web dev
# Login as student@example.com
# DevTools Network: verify 3 real GraphQL queries firing
# Assert no "Dr. Cohen" or "Introduction to Talmud Study" in DOM
# Assert streak widget shows numeric value
```

### After Phase 9 (Full Test Gate)
```bash
pnpm turbo test               # ≥5711+200 pass, 0 failures
pnpm turbo typecheck          # 0 TypeScript errors
pnpm turbo lint               # 0 warnings/errors
pnpm --filter @edusphere/web test:e2e  # all Playwright specs pass
pnpm test:security            # 0 failures
./scripts/health-check.sh     # all services UP
gh run list --limit 3         # all CI runs green
```

### Lighthouse Baseline
```bash
pnpm --filter @edusphere/web build && pnpm --filter @edusphere/web preview --port 4173
lhci autorun
# Expected: Performance ≥0.80 (warn), Accessibility ≥0.90 (error gate)
```

---

## OPEN_ISSUES.md Entry

```
FEAT-PHASE35-ANALYTICS-MOBILE | 🟡 In Progress | HIGH
Phase 35 — Performance, Analytics & Mobile Parity
9 sub-phases: DB migrations (3 tables), SDL extensions (4 subgraphs), AI N+1 fix + adaptive paths,
real dashboard data (5 mock replacements), tenant analytics with CSV export, push notifications
(web + mobile), mobile parity (3 new screens), Lighthouse CI, E2E tests
Files: packages/db, apps/subgraph-core, apps/subgraph-content, apps/subgraph-knowledge, apps/web, apps/mobile
Tests required: unit + integration + E2E + visual regression + security
```
