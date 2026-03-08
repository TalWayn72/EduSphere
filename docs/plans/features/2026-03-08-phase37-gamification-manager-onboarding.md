# Phase 37: Gamification Completion + Manager Dashboard + Onboarding + Production Hardening

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.
> **Document Storage:** After plan mode exits, move to `docs/plans/features/2026-03-08-phase37-gamification-manager-onboarding.md` (CLAUDE.md iron rule)

**Goal:** Close all 10 open items from Phase 36 post-session audit: complete gamification (streaks/challenges/leaderboard), ship Manager Dashboard, deliver full Onboarding flow (student + instructor), fix Marketplace SDL gap, harden Redis rate limiting, add OWASP ZAP DAST CI, update visual regression baselines, and sync all documentation.

**Architecture:** 3 sprints. Sprint A: 4 parallel agents (T+0). Sprint B: ramp +1 agent every 5 min (T+5 → T+20, max 8 agents). Sprint C: sequential QA gate.

**Tech Stack:** NestJS + Drizzle ORM + pgvector | urql | Recharts | ioredis | OWASP ZAP | Expo SDK 54 | TypeScript strict

---

## Context

Phase 36 is complete at commit `09b8690`. Post-session audit surfaced 10 remaining items:
- **Gamification**: XP foundation shipped (Phase 36), but streaks/challenges/team leaderboard + GamificationPage web + GamificationScreen mobile are missing
- **Manager Dashboard**: New role (MANAGER) + team analytics feature, 0% done
- **Onboarding flow**: Critical UX gap — new users land on Dashboard with no guidance, 0% done
- **Marketplace SDL gap**: `courseListings` query missing from `supergraph.graphql`, frontend forced to `pause: true`
- **Redis rate limiting**: Gateway uses in-memory Map (no eviction, single-instance only, not production-safe)
- **OWASP ZAP DAST**: No runtime vulnerability scanning in CI
- **Visual regression**: 35 Playwright specs "did not run" (stale baselines need `--update-snapshots`)
- **API_CONTRACTS doc**: Missing Section 24 for Phase 36 types (AtRiskLearner, CourseLessonPlan, totalXp, level)
- **README.md**: Stale test counts

---

## Open Items Inventory

| # | Severity | Item | Phase |
|---|----------|------|-------|
| P37-1 | 🔴 | Gamification: streaks + challenges + leaderboard + GamificationPage + GamificationScreen | 37.1 |
| P37-2 | 🔴 | Manager Dashboard: team_members DB + ManagerDashboardService + ManagerDashboardPage | 37.2 |
| P37-3 | 🔴 | Onboarding flow: student 5-step + instructor 4-step + mobile 3-step + DashboardPage banner | 37.3 |
| P37-4 | 🟡 | Marketplace SDL gap: add courseListings to supergraph + unpause MarketplacePage query | 37.A |
| P37-5 | 🟡 | Redis rate limiting: replace in-memory Map in gateway with ioredis sliding window | 37.A |
| P37-6 | 🟡 | OWASP ZAP DAST: `.github/workflows/dast.yml` CI workflow | 37.A |
| P37-7 | 🟡 | Visual regression baselines: run `--update-snapshots` for 35 failing specs | 37.A |
| P37-8 | ⚪ | API_CONTRACTS_GRAPHQL_FEDERATION.md: add Section 24 (Phase 36 types) | 37.A |
| P37-9 | ⚪ | README.md: update stale test counts | 37.A |
| P37-10 | ⚪ | OPEN_ISSUES.md: Phase 37 entry + Phase 36 final status | 37.C |

---

## Dependency Graph

```
Sprint A — T+0 (4 agents, all independent)
├── Agent-1 [Docs]:        P37-8 (API_CONTRACTS) + P37-9 (README)
├── Agent-2 [DevOps]:      P37-6 (OWASP ZAP dast.yml) + P37-7 (visual baselines)
├── Agent-3 [Backend]:     P37-5 (Redis rate limit) + P37-4 (Marketplace SDL + unpause)
└── Agent-4 [Gamification]: P37-1 backend + web GamificationPage

Sprint B — T+5,+10,+15,+20 (ramp to 8 agents)
├── Agent-5 [T+5]:  P37-2 Manager Dashboard (DB + backend + frontend)
├── Agent-6 [T+10]: P37-1 mobile GamificationScreen + mobile MOCK removal + mobile test gaps
├── Agent-7 [T+15]: P37-3 Onboarding student path (DB + backend + OnboardingWizard student)
└── Agent-8 [T+20]: P37-3 Onboarding instructor path + mobile OnboardingScreen + DashboardPage banner

Sprint C — Sequential QA gate
└── Agent-9: All E2E specs + security tests + contract tests + CI verification + P37-10 (OPEN_ISSUES)
```

---

## Sprint A — Quick Wins (T+0, 4 parallel agents)

### Agent-1: Documentation Update

**Modify:** `API_CONTRACTS_GRAPHQL_FEDERATION.md`
Add Section 24 at end of file:
```markdown
## Section 24 — Phase 36: AtRisk, Lesson Pipeline, XP (March 2026)

### New Query: listAtRiskLearners
Returns learners with progress < threshold AND last_activity_at < 14 days ago.
Auth: @requiresRole(roles: [ORG_ADMIN, SUPER_ADMIN])

### New Query: lessonPipeline / myCoursePipelines
Returns CourseLessonPlan with ordered CourseLessonStep[]. Auth: @authenticated

### New Types
- AtRiskLearner: userId, displayName, courseId, courseTitle, daysSinceActive, progressPct
- CourseLessonPlan: id, courseId, title, status (DRAFT|PUBLISHED|ARCHIVED), steps
- CourseLessonStep: id, stepType (VIDEO|QUIZ|DISCUSSION|AI_CHAT|SUMMARY), stepOrder, config

### UserStats extensions (Phase 36)
UserStats now includes: totalXp: Int!, level: Int!
XP table: LESSON_COMPLETED=10, QUIZ_PASSED=25, STREAK_BONUS=5, COURSE_COMPLETED=100
Level formula: max(1, floor(sqrt(totalXp/100))+1)
```

**Modify:** `README.md`
- Update test count section — replace stale numbers with current accurate counts
- Current: ~664 core, ~544 knowledge, ~428 db, ~218 mobile, ~304 i18n, ~928 security, ~88 contract = ~3174+ total
- Update Phase status table: Phase 36 ✅ Complete, Phase 37 🟡 In Progress

---

### Agent-2: DevOps — OWASP ZAP + Visual Baselines

**New file:** `.github/workflows/dast.yml`
```yaml
name: DAST — OWASP ZAP Baseline Scan
on:
  schedule:
    - cron: '0 2 * * 0'   # Weekly Sunday 02:00 UTC
  workflow_dispatch:
  push:
    branches: [main]
    paths:
      - 'apps/gateway/**'
      - 'apps/subgraph-*/**'

jobs:
  zap-scan:
    runs-on: ubuntu-latest
    timeout-minutes: 30
    services:
      postgres:
        image: ankane/pgvector:pg16
        env:
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: edusphere_test
        ports: ['5432:5432']
      nats:
        image: nats:2.10-alpine
        ports: ['4222:4222']

    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
        with: { version: '10' }
      - uses: actions/setup-node@v4
        with: { node-version: '20', cache: 'pnpm' }

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Run database migrations
        run: pnpm --filter @edusphere/db migrate
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/edusphere_test

      - name: Start gateway + subgraphs (background)
        run: |
          pnpm turbo dev --filter='@edusphere/subgraph-*' &
          sleep 20
          pnpm --filter @edusphere/gateway dev &
          sleep 10
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/edusphere_test
          NATS_URL: nats://localhost:4222
          PORT_CORE: 4001
          PORT_CONTENT: 4002

      - name: ZAP Baseline Scan
        uses: zaproxy/action-baseline@v0.12.0
        with:
          target: 'http://localhost:4000/graphql'
          rules_file_name: '.zap/rules.tsv'
          cmd_options: '-a -j'
          fail_action: true
          allow_issue_writing: false

      - name: Upload ZAP Report
        uses: actions/upload-artifact@v4
        if: always()
        with:
          name: zap-report-${{ github.run_number }}
          path: report_html.html
```

**New file:** `.zap/rules.tsv`
```tsv
10021	IGNORE	(X-Content-Type-Options Header Missing) — set at gateway level
10038	IGNORE	(Content Security Policy) — managed by nginx in production
10027	IGNORE	(Information Disclosure - Suspicious Comments) — dev-only
```

**Visual regression baselines:**
Run: `pnpm --filter @edusphere/web test:e2e -- --update-snapshots`
This updates the 35 stale baseline PNGs. Commit updated baselines.

---

### Agent-3: Backend — Redis Rate Limiting + Marketplace SDL

**P37-5: Redis rate limiting**

**Modify:** `apps/gateway/package.json` — add `"ioredis": "^5.4.0"`

**Modify:** `apps/gateway/src/middleware/rate-limit.middleware.ts`
```typescript
import Redis from 'ioredis';
import { Injectable, NestMiddleware, OnModuleDestroy } from '@nestjs/common';
import { Logger } from '@nestjs/common';

const WINDOW_MS = 60_000;
const MAX_REQUESTS = 200;

@Injectable()
export class RateLimitMiddleware implements NestMiddleware, OnModuleDestroy {
  private readonly logger = new Logger(RateLimitMiddleware.name);
  private redis: Redis | null = null;
  // Fallback in-memory store (single-process graceful degradation)
  private readonly fallback = new Map<string, { count: number; reset: number }>();

  constructor() {
    const redisUrl = process.env.REDIS_RATE_LIMIT_URL || process.env.REDIS_URL;
    if (redisUrl) {
      this.redis = new Redis(redisUrl, { lazyConnect: true, enableOfflineQueue: false });
      this.redis.on('error', (err) => {
        this.logger.warn({ err: String(err) }, '[RateLimitMiddleware] Redis error — falling back to in-memory');
        this.redis = null;
      });
    }
  }

  async use(req: Request, res: Response, next: NextFunction): Promise<void> {
    const tenantId = (req as any).headers['x-tenant-id'] ?? 'global';
    const ip = (req as any).ip ?? 'unknown';
    const key = `rate:${tenantId}:${ip}`;

    const allowed = this.redis
      ? await this.checkRedis(key)
      : this.checkFallback(key);

    if (!allowed) {
      (res as any).status(429).json({ error: 'Too Many Requests', retryAfter: WINDOW_MS / 1000 });
      return;
    }
    next();
  }

  private async checkRedis(key: string): Promise<boolean> {
    const now = Date.now();
    const windowKey = `${key}:${Math.floor(now / WINDOW_MS)}`;
    const count = await this.redis!.incr(windowKey);
    if (count === 1) await this.redis!.pexpire(windowKey, WINDOW_MS);
    return count <= MAX_REQUESTS;
  }

  private checkFallback(key: string): boolean {
    const now = Date.now();
    const entry = this.fallback.get(key);
    if (!entry || now > entry.reset) {
      this.fallback.set(key, { count: 1, reset: now + WINDOW_MS });
      // Evict old entries if map grows too large
      if (this.fallback.size > 10_000) {
        const oldest = this.fallback.entries().next().value;
        if (oldest) this.fallback.delete(oldest[0]);
      }
      return true;
    }
    entry.count++;
    return entry.count <= MAX_REQUESTS;
  }

  onModuleDestroy(): void {
    this.redis?.disconnect();
    this.fallback.clear();
  }
}
```

**Modify:** `apps/gateway/.env.example` — add:
```
# Rate Limiting (optional — falls back to in-memory if not set)
REDIS_RATE_LIMIT_URL=redis://localhost:6379
```

**P37-4: Marketplace SDL fix**

**Modify:** `apps/gateway/supergraph.graphql` — add to Query type:
```graphql
courseListings(tenantId: ID!, limit: Int, offset: Int, filters: CourseListingFiltersInput): CourseListingConnection! @join__field(graph: CONTENT) @authenticated
```

Add new types:
```graphql
type CourseListingConnection @join__type(graph: CONTENT) {
  edges: [CourseListingEdge!]!
  pageInfo: PageInfo!
  totalCount: Int!
}
type CourseListingEdge @join__type(graph: CONTENT) {
  node: CourseListing!
  cursor: String!
}
type CourseListing @join__type(graph: CONTENT) {
  id: ID!
  title: String!
  description: String
  instructorName: String!
  thumbnailUrl: String
  price: Float
  currency: String
  tags: [String!]!
  enrollmentCount: Int!
  rating: Float
  totalLessons: Int!
}
input CourseListingFiltersInput {
  tags: [String!]
  priceMax: Float
  instructorName: String
  search: String
}
```

**Modify:** `apps/web/src/pages/MarketplacePage.tsx`
- Remove `pause: true` hack from `useQuery` call
- Add proper `mounted` guard pattern (consistent with Iron Rule):
  ```typescript
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  useQuery({ query: COURSE_LISTINGS_QUERY, pause: !mounted, variables: { tenantId, limit: 20, filters } });
  ```

---

### Agent-4: Gamification Full-Stack (backend + web)

#### Database

**New file:** `packages/db/src/schema/streaks-challenges.ts`
```typescript
// user_streaks: id, user_id, tenant_id, current_streak int, longest_streak int, last_activity_date date, updated_at
// challenges: id, tenant_id, title, description, target_type enum('LESSON_COUNT','XP_EARNED','QUIZ_COUNT','DISCUSSION_COUNT'), target_value int, xp_reward int, start_date date, end_date date, is_active bool, created_at
// user_challenge_progress: id, user_id, tenant_id, challenge_id, current_value int, completed bool, completed_at, created_at, updated_at
```

**New file:** `packages/db/src/migrations/0022_user_streaks_challenges.sql`
- RLS: `user_id::text = current_setting('app.current_user_id', TRUE) OR tenant_id::text = current_setting('app.current_tenant', TRUE)`
- Index: `(user_id, tenant_id)` on `user_streaks`
- Index: `(tenant_id, is_active)` on `challenges`
- FK: `user_challenge_progress.challenge_id → challenges.id ON DELETE CASCADE`

#### Backend

**New file:** `apps/subgraph-core/src/gamification/streak.service.ts`
- `updateStreak(userId, tenantId)` — called on NATS EDUSPHERE.lesson.completed/quiz.passed events
- Logic: if `last_activity_date = yesterday` → increment streak; if `today` → no-op; else reset to 1
- If streak milestone (7, 30, 100 days) → `XpService.awardXP(userId, tenantId, STREAK_BONUS, 5)`
- `getStreak(userId, tenantId)` → `{ currentStreak, longestStreak, lastActivityDate }`
- `OnModuleDestroy` + `closeAllPools()`

**New file:** `apps/subgraph-core/src/gamification/challenges.service.ts`
- `getActiveChallenges(tenantId)` — all challenges where is_active=true and end_date >= today
- `incrementProgress(userId, tenantId, eventType, amount)` — upserts user_challenge_progress for matching challenges; if progress.current_value >= challenge.target_value → marks completed + awards XP
- `getUserChallenges(userId, tenantId)` → challenges with user's progress
- `OnModuleDestroy` + `closeAllPools()`

**New file:** `apps/subgraph-core/src/gamification/leaderboard.service.ts`
- `getLeaderboard(tenantId, limit)` → top-N users sorted by `user_xp_totals.total_xp` DESC
- Returns `{ rank, userId, displayName, totalXp, level, avatarUrl }`
- Cache: in-memory Map<tenantId, { data, expiresAt }> with 1-hour TTL
- Cache eviction: `clearInterval` on `OnModuleDestroy`
- Bounded map: max 500 tenant entries (LRU eviction)
- `OnModuleDestroy`: `clearInterval(this.cleanupHandle); this.cache.clear(); closeAllPools()`

**New file:** `apps/subgraph-core/src/gamification/gamification.module.ts`
- Provides: StreakService, ChallengesService, LeaderboardService, XpService (import from existing)
- Exports: all 4 services

**Modify:** `apps/subgraph-core/src/user/user.graphql` — add:
```graphql
type GamificationStats {
  currentStreak: Int!
  longestStreak: Int!
  activeChallenges: [UserChallenge!]!
  leaderboardRank: Int
  leaderboard: [LeaderboardEntry!]!
}
type UserChallenge {
  challengeId: ID!
  title: String!
  description: String!
  targetValue: Int!
  currentValue: Int!
  xpReward: Int!
  completed: Boolean!
  endDate: DateTime!
}
type LeaderboardEntry {
  rank: Int!
  userId: ID!
  displayName: String!
  totalXp: Int!
  level: Int!
}
extend type Query {
  myGamificationStats: GamificationStats! @authenticated
  tenantLeaderboard(limit: Int): [LeaderboardEntry!]! @authenticated
}
```

**Modify:** `apps/subgraph-core/src/notifications/nats-notification.bridge.ts`
- Subscribe to `EDUSPHERE.lesson.completed` → call `StreakService.updateStreak()` + `ChallengesService.incrementProgress(userId, tenantId, LESSON_COUNT, 1)`
- Subscribe to `EDUSPHERE.quiz.passed` → call `ChallengesService.incrementProgress(userId, tenantId, QUIZ_COUNT, 1)`

#### Frontend

**New file:** `apps/web/src/lib/graphql/gamification.queries.ts`
```typescript
// MY_GAMIFICATION_STATS_QUERY — includes streak, activeChallenges, leaderboard top-10
// TENANT_LEADERBOARD_QUERY
```

**New file:** `apps/web/src/pages/GamificationPage.tsx`
- Route: `/gamification`
- 3 tabs (shadcn/ui Tabs):
  1. **Progress** — XP progress bar toward next level, current streak flame icon, longest streak, recent XP events (last 5)
  2. **Challenges** — Card grid of active challenges with progress bars, "days remaining" badge, XP reward badge
  3. **Leaderboard** — Table: rank | avatar | name | level badge | XP | "You" row highlighted
- Skeleton loading state for all 3 tabs
- Mounted guard: `const [mounted, setMounted] = useState(false); useEffect(...)`

**Modify:** `apps/web/src/App.tsx` — add route `/gamification` → `<GamificationPage />`

**Modify:** `apps/web/src/components/AppSidebar.tsx`
- Add Gamification nav item (Trophy icon) between Dashboard and Explore

#### Tests

**New:** `apps/subgraph-core/src/gamification/streak.service.spec.ts` — streak increment, reset, milestone XP
**New:** `apps/subgraph-core/src/gamification/challenges.service.spec.ts` — progress increment, completion, XP award
**New:** `apps/subgraph-core/src/gamification/leaderboard.service.spec.ts` — top-N sort, cache eviction, TTL
**New:** `apps/web/src/pages/GamificationPage.test.tsx` — tab switching, skeleton on fetching, leaderboard renders

---

## Sprint B — New Features (ramp T+5 → T+20)

### Agent-5 [T+5]: Manager Dashboard

#### Database

**New file:** `packages/db/src/schema/team-members.ts`
```typescript
// team_members: id, manager_id uuid, member_id uuid, tenant_id uuid, created_at
// Unique constraint: (manager_id, member_id, tenant_id)
```

**New file:** `packages/db/src/migrations/0023_team_members.sql`
- RLS: `tenant_id::text = current_setting('app.current_tenant', TRUE)`
- Index: `(manager_id, tenant_id)` for team lookups
- Note: MANAGER role is a Keycloak role — no DB enum change needed (role stored in JWT)

#### Backend

**New file:** `apps/subgraph-core/src/manager/manager-dashboard.service.ts`
```typescript
// getTeamOverview(managerId, tenantId):
//   - member count
//   - avg course completion %
//   - avg XP this week
//   - at-risk count (last_activity > 14 days ago)
//   - top course by team enrollment
// getTeamMemberProgress(managerId, tenantId):
//   - returns TeamMemberProgress[] for all members in team_members
//   - each: userId, displayName, coursesEnrolled, avgCompletion, totalXp, level, lastActive
// addTeamMember(managerId, memberId, tenantId)
// removeTeamMember(managerId, memberId, tenantId)
```
- `withTenantContext()` on all queries (SI-9)
- `OnModuleDestroy` + `closeAllPools()`

**New file:** `apps/subgraph-core/src/manager/manager.graphql`
```graphql
type TeamOverview {
  memberCount: Int!
  avgCompletionPct: Float!
  avgXpThisWeek: Float!
  atRiskCount: Int!
  topCourseTitle: String
}
type TeamMemberProgress {
  userId: ID!
  displayName: String!
  coursesEnrolled: Int!
  avgCompletionPct: Float!
  totalXp: Int!
  level: Int!
  lastActiveAt: DateTime
  isAtRisk: Boolean!
}
extend type Query {
  myTeamOverview: TeamOverview! @authenticated @requiresRole(roles: [MANAGER, ORG_ADMIN, SUPER_ADMIN])
  myTeamMemberProgress: [TeamMemberProgress!]! @authenticated @requiresRole(roles: [MANAGER, ORG_ADMIN, SUPER_ADMIN])
}
extend type Mutation {
  addTeamMember(memberId: ID!): Boolean! @authenticated @requiresRole(roles: [MANAGER, ORG_ADMIN, SUPER_ADMIN])
  removeTeamMember(memberId: ID!): Boolean! @authenticated @requiresRole(roles: [MANAGER, ORG_ADMIN, SUPER_ADMIN])
}
```

**New files:** `apps/subgraph-core/src/manager/manager.resolver.ts`, `manager.module.ts`

#### Frontend

**New file:** `apps/web/src/lib/graphql/manager.queries.ts`

**New file:** `apps/web/src/pages/ManagerDashboardPage.tsx`
- Route: `/manager` — redirect non-MANAGER/ORG_ADMIN/SUPER_ADMIN users to `/`
- Top row: 4 stat cards (Members, Avg Completion, At-Risk, Avg XP)
- Bottom: DataTable of team members with sortable columns (completion%, XP, last active)
- At-risk rows highlighted in amber
- "Add Member" button → dialog with user search
- Skeleton loading + empty state ("No team members yet")

**Modify:** `apps/web/src/App.tsx` — add `/manager` route with MANAGER role guard
**Modify:** `apps/web/src/components/AppSidebar.tsx` — show Manager Dashboard link for MANAGER/ORG_ADMIN/SUPER_ADMIN

#### Supergraph Update
**Modify:** `apps/gateway/supergraph.graphql` — add TeamOverview, TeamMemberProgress types + queries/mutations

#### Tests
**New:** `apps/subgraph-core/src/manager/manager-dashboard.service.spec.ts`
**New:** `apps/web/src/pages/ManagerDashboardPage.test.tsx` — STUDENT redirected, MANAGER sees team data

---

### Agent-6 [T+10]: Mobile Gaps

**New file:** `apps/mobile/src/screens/GamificationScreen.tsx`
- 3-tab layout (React Native Tab View or simple state)
- Tab 1: XP progress bar + streak display
- Tab 2: Challenges list (FlatList with progress bars)
- Tab 3: Leaderboard (FlatList with rank badges)
- Uses `useQuery` via urql mobile client
- Mounted guard: `useFocusEffect` (React Navigation) to pause query when screen not focused

**Remove MOCK_* from mobile screens:**
- `apps/mobile/src/screens/DashboardScreen.tsx` — replace `MOCK_STATS` with `useQuery(MY_STATS_QUERY)`
- `apps/mobile/src/screens/CoursesScreen.tsx` — replace `MOCK_RECENT_COURSES` with `useQuery(MY_ENROLLMENTS_QUERY)`
- `apps/mobile/src/screens/KnowledgeGraphScreen.tsx` — replace `MOCK_NODES` with `useQuery(MY_KNOWLEDGE_GRAPH_QUERY)`

**Add missing mobile tests (pure logic — no @testing-library/react-native):**
- `apps/mobile/src/screens/__tests__/DiscussionsScreen.test.ts` — thread format logic
- `apps/mobile/src/screens/__tests__/KnowledgeGraphScreen.test.ts` — graph data transformation
- `apps/mobile/src/screens/__tests__/ProfileScreen.test.ts` — profile data formatting
- `apps/mobile/src/screens/__tests__/SettingsScreen.test.ts` — settings toggle logic
- `apps/mobile/src/screens/__tests__/GamificationScreen.test.ts` — XP level calculation

**Add mobile navigation:**
- `apps/mobile/src/navigation/MainTabNavigator.tsx` — add Gamification tab (Trophy icon)

---

### Agent-7 [T+15]: Onboarding — Student Path + Backend

#### Database

**New file:** `packages/db/src/schema/onboarding.ts`
```typescript
// onboarding_state: user_id uuid PK, tenant_id uuid, role text, current_step int (1-5), completed bool, skipped bool, data jsonb (interests, selected_course_id, etc.), created_at, updated_at
```

**New file:** `packages/db/src/migrations/0024_onboarding_state.sql`
- RLS: `user_id::text = current_setting('app.current_user_id', TRUE)`
- No cross-user reads — each user sees only their own state

#### Backend

**New file:** `apps/subgraph-core/src/onboarding/onboarding.service.ts`
```typescript
// getState(userId, tenantId): OnboardingState
// updateStep(userId, tenantId, step, data): OnboardingState
// completeOnboarding(userId, tenantId): OnboardingState
// skipOnboarding(userId, tenantId): OnboardingState
// isOnboardingComplete(userId, tenantId): boolean
```
- `withTenantContext()` (SI-9), `OnModuleDestroy` + `closeAllPools()`
- Iron rule: validate `userId` from JWT context, NOT from GraphQL args

**New file:** `apps/subgraph-core/src/onboarding/onboarding.graphql`
```graphql
type OnboardingState {
  userId: ID!
  currentStep: Int!
  totalSteps: Int!
  completed: Boolean!
  skipped: Boolean!
  role: String!
  data: JSON
}
input UpdateOnboardingStepInput {
  step: Int!
  data: JSON
}
extend type Query {
  myOnboardingState: OnboardingState @authenticated
}
extend type Mutation {
  updateOnboardingStep(input: UpdateOnboardingStepInput!): OnboardingState! @authenticated
  completeOnboarding: OnboardingState! @authenticated
  skipOnboarding: OnboardingState! @authenticated
}
```

**New files:** `apps/subgraph-core/src/onboarding/onboarding.resolver.ts`, `onboarding.module.ts`

#### Frontend — Student Path

**New file:** `apps/web/src/pages/OnboardingPage.tsx`
- Detects role from JWT → renders `StudentOnboardingSteps` or `InstructorOnboardingSteps`
- Persists step progress via `updateOnboardingStep` mutation on each "Next"
- "Skip for now" link → `skipOnboarding` mutation → redirect to Dashboard

**New file:** `apps/web/src/components/onboarding/StudentOnboardingSteps.tsx`
- Step 1: Profile photo + display name + timezone
- Step 2: Interest topics (checkbox grid: 12 topic categories from knowledge graph)
- Step 3: Skill self-assessment (5 sliders: Beginner→Expert per selected topic)
- Step 4: Personalized course recommendations (3 cards from `myRecommendedCourses` + "Enroll" CTA)
- Step 5: Completion screen with confetti animation + "Go to Dashboard" button

**Modify:** `apps/web/src/App.tsx` — add `/onboarding` route (no auth guard needed — @authenticated handles it)

---

### Agent-8 [T+20]: Onboarding — Instructor Path + Mobile + Banner

#### Frontend — Instructor Path

**New file:** `apps/web/src/components/onboarding/InstructorOnboardingSteps.tsx`
- Step 1: Profile + bio + subject expertise
- Step 2: Create first course (title + description + cover image upload)
- Step 3: Add first lesson (title + select content type: VIDEO/QUIZ/DISCUSSION)
- Step 4: Publish course + success screen with "Preview as student" CTA

#### DashboardPage Banner

**Modify:** `apps/web/src/pages/DashboardPage.tsx`
- Add `useQuery(MY_ONBOARDING_STATE_QUERY)` with mounted guard
- If `!state.completed && !state.skipped` → show sticky banner at top:
  ```
  📚 Complete your profile setup  [Continue]  [Skip]
  ```
- Banner uses `role="status"` `aria-live="polite"` (WCAG)
- Banner has `clearTimeout` on unmount (memory safety)

#### Mobile Onboarding

**New file:** `apps/mobile/src/screens/OnboardingScreen.tsx`
- 3-step simplified wizard: (1) Profile photo + name, (2) Interest topics (3 max), (3) Success + "Start learning"
- Uses same backend mutations
- Shown on first launch via AsyncStorage flag check

**Modify:** `apps/mobile/src/navigation/AppNavigator.tsx` — add OnboardingScreen, show before MainTabNavigator if not onboarded

#### Supergraph Update
**Modify:** `apps/gateway/supergraph.graphql` — add GamificationStats, UserChallenge, LeaderboardEntry, OnboardingState types + all queries/mutations from Agents 4+7

---

## Sprint C — QA Gate (sequential)

### Agent-9: Full E2E + Security + Contract

**New E2E specs:**

| File | Assertions |
|------|-----------|
| `apps/web/e2e/gamification.spec.ts` | Login as student → /gamification → streak visible, challenges load, leaderboard row visible; `toHaveScreenshot` |
| `apps/web/e2e/manager-dashboard.spec.ts` | Login as org.admin → /manager → team table visible; STUDENT gets redirect; `toHaveScreenshot` |
| `apps/web/e2e/onboarding-student.spec.ts` | Fresh login → DashboardPage shows banner → /onboarding → complete all 5 steps → banner gone; `toHaveScreenshot` |
| `apps/web/e2e/onboarding-instructor.spec.ts` | Instructor login → /onboarding → create course step → publish; `toHaveScreenshot` |
| `apps/web/e2e/marketplace.spec.ts` | Student → /marketplace → real listings visible (not paused query); filter works; `toHaveScreenshot` |

**Security test extensions:**
- `tests/security/graphql-authorization.spec.ts`:
  - `myTeamOverview` — assert STUDENT gets AuthorizationError
  - `addTeamMember` — assert STUDENT gets AuthorizationError
  - `skipOnboarding` — assert unauthenticated gets AuthenticationError

**Contract tests:**
- After supergraph updates, run `pnpm turbo test --filter=@edusphere/gateway` — verify 88+ contract tests pass with new types

**OPEN_ISSUES.md update (P37-10):**
- Phase 36 entry → ✅ Complete (all items resolved in Session 30-31)
- Phase 37 entry → 🟡 In Progress → after all tests pass: ✅ Complete

---

## Database Migration Summary

| Migration | File | Tables |
|-----------|------|--------|
| 0022 | `0022_user_streaks_challenges.sql` | user_streaks, challenges, user_challenge_progress |
| 0023 | `0023_team_members.sql` | team_members |
| 0024 | `0024_onboarding_state.sql` | onboarding_state |

---

## Memory Safety Checklist

| New Service | OnModuleDestroy | closeAllPools | Special |
|-------------|----------------|---------------|---------|
| streak.service.ts | ✓ | ✓ | — |
| challenges.service.ts | ✓ | ✓ | — |
| leaderboard.service.ts | ✓ | ✓ | clearInterval (cache refresh) + cache.clear() |
| manager-dashboard.service.ts | ✓ | ✓ | — |
| onboarding.service.ts | ✓ | ✓ | — |
| rate-limit.middleware.ts | ✓ | N/A | redis.disconnect() + fallback.clear() |

---

## Security Invariants

| Phase | Invariant | Implementation |
|-------|-----------|----------------|
| Manager Dashboard | SI-9 tenant isolation | `withTenantContext()` on all team queries |
| Manager Dashboard | Role gate | `@requiresRole(roles: [MANAGER, ORG_ADMIN, SUPER_ADMIN])` on all mutations |
| Onboarding | User isolation | validate `userId` from JWT context (not GraphQL args) |
| Onboarding | RLS | `user_id = current_setting('app.current_user_id')` |
| Gamification | Public leaderboard | displayName only — no email/PII in leaderboard entries (GDPR) |
| Redis rate limit | Key privacy | use hash of tenantId, not raw value, as Redis key segment |

---

## Supergraph Changes (apps/gateway/supergraph.graphql)

New types to add in Sprint A+B:
- `CourseListingConnection`, `CourseListingEdge`, `CourseListing`, `CourseListingFiltersInput`
- `GamificationStats`, `UserChallenge`, `LeaderboardEntry`
- `TeamOverview`, `TeamMemberProgress`
- `OnboardingState`, `UpdateOnboardingStepInput`

New queries:
- `courseListings`, `myGamificationStats`, `tenantLeaderboard`
- `myTeamOverview`, `myTeamMemberProgress`, `myOnboardingState`

New mutations:
- `addTeamMember`, `removeTeamMember`
- `updateOnboardingStep`, `completeOnboarding`, `skipOnboarding`

---

## Agent Ramp Schedule

```
T+0  min → Launch: Agent-1, Agent-2, Agent-3, Agent-4  (4 agents)
T+5  min → Launch: Agent-5 [Manager Dashboard]          (5 agents)
T+10 min → Launch: Agent-6 [Mobile Gaps]                (6 agents)
T+15 min → Launch: Agent-7 [Onboarding Student]         (7 agents)
T+20 min → Launch: Agent-8 [Onboarding Instructor+Mobile] (8 agents)
  → Monitor CPU/memory. If >85%: do NOT add more.
Sprint C → Agent-9 [QA] — sequential, after Sprint A+B complete
```

---

## Verification Steps

### After Sprint A
```bash
pnpm --filter @edusphere/gateway dev  # supergraph composes with new types
curl -X POST http://localhost:4000/graphql \
  -H "Content-Type: application/json" \
  -d '{"query":"{ courseListings(tenantId:\"test\", limit:5) { edges { node { title } } } }"}'
# → returns real listings, not error
grep -r "pause: true" apps/web/src/pages/MarketplacePage.tsx  # → 0 results
```

### After Sprint B (Gamification)
```bash
# mcp__postgres__pg_execute_query:
#   SELECT tablename FROM pg_tables WHERE tablename IN ('user_streaks','challenges','user_challenge_progress')
# → 3 rows
# Login as student → /gamification → check 3 tabs render, streak shows, leaderboard has entries
```

### After Sprint B (Onboarding)
```bash
# mcp__postgres__pg_execute_query:
#   SELECT tablename FROM pg_tables WHERE tablename IN ('onboarding_state')
# → 1 row
# Fresh user login → Dashboard shows onboarding banner → /onboarding → wizard renders
```

### After Sprint C (Full QA Gate)
```bash
pnpm turbo test               # all pass, 0 failures
pnpm turbo typecheck          # 0 TypeScript errors
pnpm turbo lint               # 0 warnings/errors
pnpm --filter @edusphere/web test:e2e  # all Playwright specs pass
pnpm test:security            # 0 failures
./scripts/health-check.sh     # all services UP
gh run list --limit 3         # all CI runs green
```

---

## OPEN_ISSUES.md Entry

```
FEAT-PHASE37-GAMIFICATION-MANAGER-ONBOARDING | 🟡 In Progress | HIGH
Phase 37 — Gamification Completion + Manager Dashboard + Onboarding + Production Hardening
10 items: streaks/challenges/leaderboard, Manager Dashboard, Onboarding flow (student+instructor+mobile),
Marketplace SDL fix, Redis rate limiting, OWASP ZAP DAST, visual baselines, API_CONTRACTS Section 24, README sync
Files: apps/web, apps/mobile, apps/subgraph-core, apps/gateway, packages/db, .github/workflows
Tests required: unit + integration + E2E + visual regression + security + contract
```
