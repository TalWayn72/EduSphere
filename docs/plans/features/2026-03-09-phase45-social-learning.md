# Phase 45 — Social Learning Experience

> **For Claude:** REQUIRED SUB-SKILL: Use `executing-plans` + `dispatching-parallel-agents` + `subagent-driven-development`
> **Document Storage:** After plan mode exits, move to `docs/plans/features/2026-03-09-phase45-social-learning.md`

---

## Context

Phase 44 complete (commit `47c23ee`, 4,004 tests ✅). EduSphere now has Skills-Based Learning Paths (DB schema + SkillPathPage + SkillGapDashboard). The next strategic priority is **Social Learning** — the feature class that separates premium enterprise LMS platforms from basic content delivery tools.

---

## Market Research — Top 10 LMS Platforms (March 2026, Tavily Research)

### Table Stakes (Every platform has this — zero differentiation value)
Discussion forums, badges, AI content recommendations, leaderboards (individual), mobile, video delivery, Zoom/Teams integration. **EduSphere already has all of these.**

### Full Feature Matrix

| Feature | Canvas | Moodle | 360L | Docebo | Degreed | LinkedIn | Cornerstone | Coursera | Absorb | TalentLMS |
|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| Discussion Forums | ✅ | ✅ | ✅ | ✅ | ⚠️ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Study Groups | ✅ | ✅ | ⚠️ | ⚠️ | ⚠️ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Cohort Programs | ⚠️ | ✅ | ✅ | ⚠️ | ✅ | ❌ | ⚠️ | ✅ | ⚠️ | ❌ |
| Social Feed + Reactions | ❌ | ❌ | ✅ | ✅ | ✅ | ✅ | ⚠️ | ❌ | ✅ | ❌ |
| Social Graph / Following | ❌ | ❌ | ❌ | ⚠️ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Structured Peer Review + Rubrics | ✅ | ✅✅ | ❌ | ❌ | ❌ | ❌ | ⚠️ | ✅✅ | ❌ | ⚠️ |
| Peer Co-authoring | ❌ | ⚠️ | ✅✅ | ⚠️ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| User-Generated Content | ❌ | ⚠️ | ✅ | ✅ | ✅ | ❌ | ⚠️ | ❌ | ✅ | ❌ |
| Leaderboards | ❌ | ⚠️ | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ | ✅ | ✅ |
| Group Challenges (Team vs Team) | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| AI Skills Recommendations | ⚠️ | ⚠️ | ✅ | ✅ | ✅✅ | ✅ | ✅ | ✅ | ✅ | ⚠️ |
| AI Peer-Match | ❌ | ❌ | ⚠️ | ⚠️ | ⚠️ | ⚠️ | ❌ | ❌ | ❌ | ❌ |
| Mentor/Mentee Matching | ❌ | ❌ | ❌ | ❌ | ⚠️ | ❌ | ❌ | ❌ | ✅✅ | ❌ |
| AI Peer Review Grading | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅✅ | ❌ | ❌ |
| Skills / Knowledge Graph | ❌ | ❌ | ⚠️ | ✅ | ✅✅ | ✅ | ✅ | ⚠️ | ⚠️ | ❌ |

**Legend:** ✅✅ Best-in-class | ✅ Present | ⚠️ Partial | ❌ Absent

### Platform Highlights (What We Must Match or Beat)

| Platform | Best-in-Class Feature | Why It Matters |
|----------|----------------------|----------------|
| **Moodle Workshop** | Multi-phase peer assessment (submission→allocation→calibration→grading) with rubric calibration against instructor | Gold standard for academic peer review |
| **Coursera AI Peer Review** | AI grades assignments 900× faster than humans; 45× more feedback per submission; 16.7% completion increase | Proves AI peer review works at scale |
| **360Learning** | Crowdsourced training demand (upvote-to-request skill gap signals) + peer co-authoring with validation workflow | Most "born social" corporate LMS |
| **Degreed** | Skills graph + social following + "what are your peers building?" social feed; MCP Server in Microsoft Copilot | Most sophisticated skills↔social integration |
| **Absorb + Together** | First LMS with native mentor/mentee matching platform; Coffee Chats (auto cross-dept conversations) | Unique mentor matching product |
| **Docebo Communities** | Bidirectional Community↔LMS (community content searchable in LMS; LMS content embeddable in community) | Best community product in class |

### 8 Critical Gaps — What NO Platform Does (EduSphere Owns These)

| # | Gap | EduSphere Asset | No Competitor Has It Because |
|---|-----|----------------|------------------------------|
| **GAP-1** | Knowledge-graph-aware peer matching (find peers by complementary knowledge gap/strength) | Apache AGE graph traversal + pgvector | Requires graph database architecture |
| **GAP-2** | Concept-level collaborative annotation (simultaneous annotation at the knowledge node level) | Phase 29 annotation layer + Apache AGE | No platform built concept-level annotation |
| **GAP-3** | AI Chavruta / structured debate partner matching by complementary knowledge position | LangGraph.js Chavruta agent (built Phase 5) | Nobody built Socratic debate facilitation |
| **GAP-4** | Graph-calibrated peer review weighting (reviewer's competency in concept domain weights their review) | pgvector learner embeddings | General LLM grading, not knowledge-calibrated |
| **GAP-5** | Group social gamification: cohort vs. cohort competition on concept mastery depth | Phase 35 gamification engine + groups | All leaderboards are individual-only |
| **GAP-6** | Mentor matching by knowledge path topology (who already traversed your exact learning path?) | Apache AGE shortest-path graph queries | Everyone uses role/seniority matching |
| **GAP-7** | Cross-cohort institutional knowledge (past cohort's insights surface when current cohort hits same obstacle) | HybridRAG (semantic + graph retrieval) | No platform retrieves past cohort discussions |
| **GAP-8** | Graph-grounded portable micro-credentials (prove knowledge topology mastery, not just course completion) | Apache AGE + pgvector + assessment data | Everyone proves completion, not conceptual depth |

**EduSphere Positioning Statement:**
> *"The only learning platform where your social graph and your knowledge graph are the same thing. Every peer interaction — who you studied with, who reviewed your work, who you debated — becomes a traversable edge that surfaces the right person, insight, or past cohort discussion at the exact moment you need it."*

---

### Phase 45 vs Phase 46 Scope Decision

Phase 45 ships the **premium features** competitors have (match + close gap). Phase 46 ships the **differentiation features** nobody has (own the future).

| Feature | Phase 45 | Phase 46 |
|---------|:--------:|:--------:|
| Social feed with reactions | ✅ | — |
| Following system (wire existing) | ✅ | — |
| Discussion Threads UI | ✅ | — |
| Structured Peer Review (Moodle-inspired) | ✅ | — |
| 360° Assessment UI | ✅ | — |
| Group Social Gamification (GAP-5) | — | ✅ |
| Knowledge-graph peer matching (GAP-1) | — | ✅ |
| AI Chavruta partner matching (GAP-3) | — | ✅ |
| Mentor matching by knowledge path (GAP-6) | — | ✅ |
| Cross-cohort institutional knowledge (GAP-7) | — | ✅ |

---

## EduSphere State Audit (March 2026)

### Backend Completion Status (Extensive prior work)

| Feature | DB Tables | Service | GraphQL SDL | Supergraph | Status |
|---------|:---------:|:-------:|:-----------:|:----------:|--------|
| **Social Following** | ✅ `user_follows` | ✅ `social.service.ts` | ✅ SDL done | ❌ Not wired | **Wire only** |
| **Discussion Threads** | ✅ 3 tables | ✅ `discussion.service.ts` (375 lines) | ✅ Full + subscriptions | ❌ Not wired | **Wire + UI** |
| **360° Peer Assessment** | ✅ 3 tables | ✅ Full CRUD + aggregation | ✅ Full | ❌ Not wired | **Wire + UI** |
| **Public Profiles** | ✅ (users table) | ✅ `public-profile.service.ts` | ✅ Full | ⚠️ Partial | **Complete wiring** |
| **Activity Feed** | ⚠️ Queries in service | ✅ Self + admin views | ⚠️ `myActivityFeed` not in SDL | ❌ | **Add social extension** |
| **Social Feed** | ❌ No table | ❌ No service | ⚠️ Schema only (frontend) | ❌ | **Build backend** |
| **Peer Review (assignments)** | ❌ | ❌ | ❌ | ❌ | **NEW feature** |
| **Communities/Groups** | ❌ | ❌ | ❌ | ❌ | **NEW feature** |

### Frontend Completion Status

| Feature | Component | Query | Status |
|---------|:---------:|:-----:|--------|
| `FollowButton.tsx` | ✅ | ✅ (`pause: true`) | Ready — needs supergraph |
| `FollowersList.tsx` | ✅ | ✅ (`pause: true`) | Ready — needs supergraph |
| `SocialFeedWidget.tsx` | ✅ | ✅ (`pause: true`) | Ready — needs backend |
| `PublicProfilePage.tsx` | ✅ | ✅ (`pause: true`) | Ready — needs supergraph |
| `ActivityFeed.tsx` | ✅ | ✅ (self only) | Ready — extend for social |
| `NotificationBell.tsx` | ✅ | ✅ | **Live** — add new event types |
| **Discussion UI** | ❌ | ❌ | **Build** |
| **Peer Assessment UI** | ❌ | ❌ | **Build** |
| **Peer Review Assignment UI** | ❌ | ❌ | **Build** |
| **Community/Groups UI** | ❌ | ❌ | **Build** |

---

## Phase 45 Scope Decision

### Scope: 3 Sprints, 6 Days

**Sprint A — Foundation Wire-Up (Day 1, backend, minimal code — mostly wiring)**
Wire the 5 already-built backend features into the supergraph + build the missing `socialFeed` service.

**Sprint B — Social Learning UI (Days 2–4, frontend-heavy)**
Build all missing UI components leveraging the wired backend.

**Sprint C — Peer Review Workflow + AI Enhancement (Days 4–6)**
New feature: explicit peer assignment review (like Coursera) + AI-powered discussion insights.

**Deferred to Phase 46:**
- Communities/Groups (new DB + backend + UI — separate phase)
- Anonymous peer review option
- Discussion → Knowledge Graph extraction

---

## Architecture

### New DB (Migration 0027)
Only 3 new tables needed (rest already exists):

```sql
-- Peer review assignments (Coursera-style explicit assignment)
peer_review_assignments: id, tenant_id, content_item_id, submitter_id,
                         reviewer_id, status (PENDING|SUBMITTED|RATED),
                         feedback (text), score (int 0-100),
                         submitted_at, created_at

-- Peer review rubrics (per content item)
peer_review_rubrics: id, tenant_id, content_item_id,
                     criteria (jsonb), min_reviewers (default 3),
                     is_anonymous (boolean), created_at

-- Social feed cache (denormalized for performance)
social_feed_items: id, tenant_id, actor_id, verb (COMPLETED|ENROLLED|ACHIEVED|DISCUSSED),
                   object_type, object_id, object_title,
                   created_at
```

### NATS New Events

```
EDUSPHERE.feed.item.created   — actor completed/enrolled/discussed → fan-out to followers
EDUSPHERE.peer.review.assigned — new peer review assignment waiting
EDUSPHERE.discussion.message.added — (already exists in collaboration pubSub, add NATS)
```

### New Notification Types (extend `NotificationType` enum)
```
PEER_REVIEW_ASSIGNED  — "John asked you to review their assignment"
PEER_REVIEW_RECEIVED  — "3 peers reviewed your assignment — see results"
DISCUSSION_REPLY      — "Sarah replied to your post in React Fundamentals"
PEER_FOLLOWED_ACTIVITY — "5 people you follow completed Advanced TypeScript"
```

---

## Critical File Paths

### Sprint A — Wire-Up
| File | Change |
|------|--------|
| `apps/gateway/supergraph.graphql` | Add: myFollowers, myFollowing, myDiscussions, discussions, discussion, myCampaigns, campaignsToRespond, assessmentResult, socialFeed, socialRecommendations |
| `apps/subgraph-core/src/user/user.graphql` | Add `myActivityFeed` to SDL (already in service) |
| `apps/subgraph-core/src/social/social.service.ts` | Add `getSocialFeed(userId, tenantId, limit)` method |
| `apps/subgraph-core/src/social/social.graphql` | Add `socialFeed` + `socialRecommendations` queries |
| `packages/db/src/schema/social.ts` | Add `social_feed_items` table |
| `packages/nats-client/src/events.ts` | Add `SocialFeedItemPayload`, `PeerReviewAssignedPayload` |
| `apps/subgraph-core/src/notifications/nats-notification.bridge.ts` | Add 4 new notification subjects |

### Sprint B — UI
| File | Change |
|------|--------|
| `apps/web/src/pages/SocialFeedPage.tsx` | NEW — full social feed page |
| `apps/web/src/components/social/DiscussionThread.tsx` | NEW — threaded discussion UI |
| `apps/web/src/components/social/DiscussionList.tsx` | NEW — list discussions by course |
| `apps/web/src/components/social/MessageComposer.tsx` | NEW — rich text message input |
| `apps/web/src/pages/DiscussionsPage.tsx` | NEW — route `/discussions` |
| `apps/web/src/pages/CourseDiscussionsPage.tsx` | NEW — `/courses/:id/discussions` |
| `apps/web/src/components/social/FollowButton.tsx` | MODIFY — remove `pause: true` |
| `apps/web/src/components/social/FollowersList.tsx` | MODIFY — remove `pause: true` |
| `apps/web/src/pages/PublicProfilePage.tsx` | MODIFY — remove `pause: true`, activate |
| `apps/web/src/lib/graphql/social.queries.ts` | NEW — social queries |
| `apps/web/src/lib/graphql/discussion.queries.ts` | NEW — discussion queries |
| `apps/web/src/lib/router.tsx` | Add 4 new routes |
| `apps/web/src/components/AppSidebar.tsx` | Add: Discussions, Social Feed nav items |

### Sprint C — Peer Review
| File | Change |
|------|--------|
| `packages/db/src/schema/peer-review.ts` | NEW — peer_review_assignments + peer_review_rubrics |
| `packages/db/src/migrations/0027_social_peer_review.sql` | NEW migration |
| `apps/subgraph-content/src/peer-review/peer-review.service.ts` | NEW |
| `apps/subgraph-content/src/peer-review/peer-review.resolver.ts` | NEW |
| `apps/subgraph-content/src/peer-review/peer-review.graphql` | NEW SDL |
| `apps/web/src/pages/PeerReviewPage.tsx` | NEW — `/peer-review/:assignmentId` |
| `apps/web/src/components/peer-review/ReviewForm.tsx` | NEW |
| `apps/web/src/components/peer-review/RubricScorer.tsx` | NEW |
| `apps/web/src/pages/AssessmentCampaignPage.tsx` | NEW — 360° assessment UI |
| `apps/web/src/pages/AssessmentResultPage.tsx` | NEW |
| `apps/web/src/components/assessment/CriteriaScoreForm.tsx` | NEW |
| `apps/web/src/components/assessment/RadarChart.tsx` | NEW — recharts radar (already installed) |

---

## Sprint A — Backend Wire-Up (Day 1, 4 Parallel Agents)

### Agent-A1: Supergraph + Social Queries Wire-Up

**Goal:** Add all built-but-unwired queries to `apps/gateway/supergraph.graphql`

1. Add to Query type:
```graphql
# Social (CORE subgraph)
myFollowers(limit: Int): [ID!]! @join__field(graph: CORE) @authenticated
myFollowing(limit: Int): [ID!]! @join__field(graph: CORE) @authenticated
socialFeed(limit: Int): [SocialFeedItem!]! @join__field(graph: CORE) @authenticated
socialRecommendations(limit: Int): [SocialRecommendation!]! @join__field(graph: CORE) @authenticated
myActivityFeed(limit: Int): [ActivityFeedItem!]! @join__field(graph: CORE) @authenticated
publicProfile(userId: ID!): PublicProfile @join__field(graph: CORE)

# Discussions (COLLABORATION subgraph)
discussion(id: ID!): Discussion @join__field(graph: COLLABORATION) @authenticated
discussions(courseId: ID!, limit: Int, offset: Int): [Discussion!]! @join__field(graph: COLLABORATION) @authenticated
myDiscussions(limit: Int, offset: Int): [Discussion!]! @join__field(graph: COLLABORATION) @authenticated
discussionMessages(discussionId: ID!, limit: Int, offset: Int): [DiscussionMessage!]! @join__field(graph: COLLABORATION) @authenticated

# Assessment (CONTENT subgraph)
myCampaigns: [AssessmentCampaign!]! @join__field(graph: CONTENT) @authenticated
campaignsToRespond: [AssessmentCampaign!]! @join__field(graph: CONTENT) @authenticated
assessmentResult(campaignId: ID!): AssessmentResult @join__field(graph: CONTENT) @authenticated
```

2. Add all corresponding types to supergraph (copy from SDL files)
3. Add to Subscription type:
```graphql
messageAdded(discussionId: ID!): DiscussionMessage! @join__field(graph: COLLABORATION) @authenticated
```

4. Add to Mutation type: followUser, unfollowUser, createDiscussion, addMessage, joinDiscussion, leaveDiscussion, createAssessmentCampaign, submitAssessmentResponse, activateAssessmentCampaign, completeAssessmentCampaign

5. Run `pnpm --filter @edusphere/gateway compose` → verify 0 errors

**Tests:**
- `apps/gateway/src/test/federation/social-federation.spec.ts` — verify types resolve correctly across subgraphs

---

### Agent-A2: Social Feed Backend Service

**Goal:** Build `getSocialFeed()` + `getSocialRecommendations()` in social.service.ts

**New method:** `getSocialFeed(userId, tenantId, limit = 20)`

Algorithm:
1. Get list of users `userId` follows: `getFollowing(userId, tenantId, 100)`
2. If 0 followers: return `[]`
3. Query activity of followed users (batch via DataLoader pattern):
```typescript
// Using withTenantContext to safely query across followed users
return withTenantContext(this.db, ctx, async (tx) => {
  return tx
    .select({
      id: schema.activityFeedItems.id,
      actorId: schema.activityFeedItems.actorId,
      verb: schema.activityFeedItems.verb,
      objectType: schema.activityFeedItems.objectType,
      objectId: schema.activityFeedItems.objectId,
      objectTitle: schema.activityFeedItems.objectTitle,
      createdAt: schema.activityFeedItems.createdAt,
    })
    .from(schema.activityFeedItems)
    .where(
      and(
        eq(schema.activityFeedItems.tenantId, tenantId),
        inArray(schema.activityFeedItems.actorId, followingIds),
      )
    )
    .orderBy(desc(schema.activityFeedItems.createdAt))
    .limit(limit);
});
```

**Fan-out on event:** Subscribe to `EDUSPHERE.course.completed`, `EDUSPHERE.badge.issued`, `EDUSPHERE.discussion.message.added` → write to `social_feed_items` table.

**New GraphQL SDL additions to `social.graphql`:**
```graphql
type SocialFeedItem {
  id: ID!
  actorId: ID!
  actorDisplayName: String!
  verb: SocialVerb!
  objectType: String!
  objectId: ID!
  objectTitle: String!
  createdAt: DateTime!
}

enum SocialVerb {
  COMPLETED
  ENROLLED
  ACHIEVED_BADGE
  DISCUSSED
  STARTED_LEARNING
}

type SocialRecommendation {
  contentItemId: ID!
  contentTitle: String!
  followersCount: Int!
  isMutualFollower: Boolean!
  lastActivity: DateTime
}

extend type Query {
  socialFeed(limit: Int = 20): [SocialFeedItem!]! @authenticated
  socialRecommendations(limit: Int = 10): [SocialRecommendation!]! @authenticated
}
```

**Memory safety:** NATS subscription tracked in `this.subs[]`, drained in `onModuleDestroy()`

**Tests:**
- `social.service.spec.ts`: add `getSocialFeed` tests — empty when no following; returns items in chronological order; respects limit; tenant isolation (items from other tenants not visible)
- `social.service.memory.spec.ts`: verify new NATS subscriptions cleaned up

---

### Agent-A3: New DB Schema + Migration 0027

**New file:** `packages/db/src/schema/peer-review.ts`

```typescript
import { pgTable, uuid, text, boolean, integer, jsonb, timestamp, pgPolicy, index } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const peerReviewRubrics = pgTable(
  'peer_review_rubrics',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull(),
    contentItemId: uuid('content_item_id').notNull(),
    criteria: jsonb('criteria').notNull().$type<RubricCriteria[]>(),
    minReviewers: integer('min_reviewers').notNull().default(3),
    isAnonymous: boolean('is_anonymous').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('idx_peer_rubrics_content').on(t.contentItemId),
    pgPolicy('peer_rubrics_tenant_isolation', {
      using: sql`tenant_id::text = current_setting('app.current_tenant', TRUE)`,
      withCheck: sql`tenant_id::text = current_setting('app.current_tenant', TRUE)`,
    }),
  ]
).enableRLS();

export const peerReviewAssignments = pgTable(
  'peer_review_assignments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull(),
    contentItemId: uuid('content_item_id').notNull(),
    submitterId: uuid('submitter_id').notNull(),
    reviewerId: uuid('reviewer_id').notNull(),
    status: text('status').notNull().default('PENDING'), // PENDING|SUBMITTED|RATED
    submissionText: text('submission_text'),
    feedback: text('feedback'),
    score: integer('score'),
    submittedAt: timestamp('submitted_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('idx_peer_assignments_submitter').on(t.submitterId),
    index('idx_peer_assignments_reviewer').on(t.reviewerId),
    pgPolicy('peer_assignments_rls', {
      using: sql`
        tenant_id::text = current_setting('app.current_tenant', TRUE)
        AND (
          submitter_id::text = current_setting('app.current_user_id', TRUE)
          OR reviewer_id::text = current_setting('app.current_user_id', TRUE)
          OR current_setting('app.current_user_role', TRUE) IN ('SUPER_ADMIN', 'ORG_ADMIN', 'INSTRUCTOR')
        )
      `,
      withCheck: sql`tenant_id::text = current_setting('app.current_tenant', TRUE)`,
    }),
  ]
).enableRLS();

export const socialFeedItems = pgTable(
  'social_feed_items',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull(),
    actorId: uuid('actor_id').notNull(),
    verb: text('verb').notNull(), // COMPLETED | ENROLLED | ACHIEVED_BADGE | DISCUSSED | STARTED_LEARNING
    objectType: text('object_type').notNull(),
    objectId: uuid('object_id').notNull(),
    objectTitle: text('object_title').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('idx_social_feed_actor').on(t.actorId, t.tenantId),
    index('idx_social_feed_created').on(t.createdAt),
    pgPolicy('social_feed_tenant_isolation', {
      using: sql`tenant_id::text = current_setting('app.current_tenant', TRUE)`,
      withCheck: sql`tenant_id::text = current_setting('app.current_tenant', TRUE)`,
    }),
  ]
).enableRLS();

export interface RubricCriteria {
  id: string;
  label: string;
  description: string;
  maxScore: number;
}
```

**Migration:** `packages/db/src/migrations/0027_social_peer_review.sql`
```sql
-- Phase 45: Social Learning — Peer Review + Social Feed Items
-- Tables: peer_review_rubrics, peer_review_assignments, social_feed_items

CREATE TABLE IF NOT EXISTS peer_review_rubrics (...);
CREATE TABLE IF NOT EXISTS peer_review_assignments (...);
CREATE TABLE IF NOT EXISTS social_feed_items (...);
-- RLS on all 3 (see Drizzle schema)
```

**Update:** `packages/db/src/schema/index.ts` — add exports for new tables

**Tests:**
- `packages/db/src/rls/peer-review.test.ts` — submitter can see own assignments; reviewer can see their queue; INSTRUCTOR can see all in tenant; cross-tenant isolation
- `packages/db/src/rls/social-feed.test.ts` — tenant isolation on feed items

---

### Agent-A4: Notification System Extension

**Goal:** Extend notification types for social events

**Modify:** `apps/subgraph-core/src/notifications/nats-notification.bridge.ts`
- Add 4 new subject → notification mappings:
```typescript
// Add to SUBJECT_MAP:
'EDUSPHERE.peer.review.assigned': 'PEER_REVIEW_ASSIGNED',
'EDUSPHERE.peer.review.completed': 'PEER_REVIEW_RECEIVED',
'EDUSPHERE.discussion.reply': 'DISCUSSION_REPLY',
'EDUSPHERE.social.activity.digest': 'PEER_FOLLOWED_ACTIVITY',
```

**Modify:** `apps/subgraph-core/src/notifications/notifications.graphql`
- Add to `NotificationType` enum: `PEER_REVIEW_ASSIGNED`, `PEER_REVIEW_RECEIVED`, `DISCUSSION_REPLY`, `PEER_FOLLOWED_ACTIVITY`

**Modify:** `apps/web/src/components/NotificationBell.tsx`
- Add icon mappings for new types:
  - PEER_REVIEW_ASSIGNED: `📝`
  - PEER_REVIEW_RECEIVED: `⭐`
  - DISCUSSION_REPLY: `💬`
  - PEER_FOLLOWED_ACTIVITY: `🏃`

**Modify:** `packages/nats-client/src/events.ts`
- Add new payload types:
```typescript
export interface SocialFeedItemPayload {
  readonly actorId: string;
  readonly tenantId: string;
  readonly verb: 'COMPLETED' | 'ENROLLED' | 'ACHIEVED_BADGE' | 'DISCUSSED' | 'STARTED_LEARNING';
  readonly objectType: string;
  readonly objectId: string;
  readonly objectTitle: string;
  readonly timestamp: string;
}

export interface PeerReviewAssignedPayload {
  readonly assignmentId: string;
  readonly reviewerId: string;
  readonly submitterId: string;
  readonly contentItemTitle: string;
  readonly tenantId: string;
  readonly timestamp: string;
}
```

**Tests:**
- `nats-notification.bridge.spec.ts`: add tests for 4 new notification types mapped correctly

---

## Sprint B — Social Learning UI (Days 2–4, 5 Parallel Agents)

### Agent-B1: Discussion Threads UI

**New file:** `apps/web/src/pages/DiscussionsPage.tsx` — route `/discussions`
- `useQuery(MY_DISCUSSIONS_QUERY)` with mounted guard
- Shows list of discussions the user participates in (recent activity first)
- "New Discussion" button → modal or `/discussions/new`
- Empty state: "No discussions yet — start one in your course!"

**New file:** `apps/web/src/components/social/DiscussionList.tsx`
- Takes `discussions: Discussion[]` prop
- Each card: title, course name, last message snippet, participant count, message count, unread indicator
- Click → navigate to `/discussions/:id`

**New file:** `apps/web/src/pages/DiscussionDetailPage.tsx` — route `/discussions/:id`
- Queries `discussion(id)` + `discussionMessages(discussionId)`
- Real-time updates via `messageAdded(discussionId)` subscription (pause on unmount pattern)
- Message list with threaded replies (max 3 visual levels)
- Message composer at bottom
- Join/leave discussion button

**New file:** `apps/web/src/components/social/MessageComposer.tsx`
- Textarea with "Send" button
- Supports replying to a specific message (shows reply-to preview)
- `useMutation(ADD_MESSAGE_MUTATION)` with `NOOP_MUTATION` pattern

**New file:** `apps/web/src/components/social/MessageItem.tsx`
- Shows: avatar (initials fallback), display name, message content, timestamp
- "Reply" action → sets replyTo state in parent
- Indented replies (2 levels deep visually)

**New file:** `apps/web/src/lib/graphql/discussion.queries.ts`
```typescript
export const MY_DISCUSSIONS_QUERY = gql`query MyDiscussions($limit: Int) {
  myDiscussions(limit: $limit) { id title courseId participantsCount messagesCount createdAt }
}`;

export const DISCUSSION_MESSAGES_QUERY = gql`query DiscussionMessages($discussionId: ID!, $limit: Int, $offset: Int) {
  discussionMessages(discussionId: $discussionId, limit: $limit, offset: $offset) {
    id userId content messageType parentMessageId likesCount isLikedByMe createdAt
  }
}`;

export const ADD_MESSAGE_MUTATION = gql`mutation AddMessage($discussionId: ID!, $input: AddMessageInput!) {
  addMessage(discussionId: $discussionId, input: $input) { id content createdAt }
}`;

export const LIKE_MESSAGE_MUTATION = gql`mutation LikeMessage($messageId: ID!) {
  likeMessage(messageId: $messageId)
}`;

export const MESSAGE_ADDED_SUBSCRIPTION = gql`subscription MessageAdded($discussionId: ID!) {
  messageAdded(discussionId: $discussionId) { id userId content messageType parentMessageId likesCount isLikedByMe createdAt }
}`;

export const JOIN_DISCUSSION_MUTATION = gql`mutation JoinDiscussion($discussionId: ID!) {
  joinDiscussion(discussionId: $discussionId)
}`;
```

**Reactions (likes) on messages** — 360Learning, Docebo, Degreed all have this; becoming table stakes:
- Add `discussion_message_likes` table to migration 0027: `(message_id, user_id, tenant_id, created_at)` with UNIQUE(message_id, user_id)
- Add `likeMessage(messageId)` mutation to discussion.service.ts + resolver
- Add `likesCount: Int!` + `isLikedByMe: Boolean!` to `DiscussionMessage` GraphQL type
- Show like count + heart button in `MessageItem.tsx`

**Tests:**
- `DiscussionsPage.test.tsx`: renders heading; empty state visible; lists discussions
- `DiscussionDetailPage.test.tsx`: renders messages; reply button visible; new message appears after mutation
- `MessageComposer.test.tsx`: submit calls mutation with correct text; clears after submit

---

### Agent-B2: Social Feed Page

**New file:** `apps/web/src/pages/SocialFeedPage.tsx` — route `/social`
- Sections:
  1. **Following Activity Feed** — `useQuery(SOCIAL_FEED_QUERY)` with mounted guard
  2. **Recommended Content** — `useQuery(SOCIAL_RECOMMENDATIONS_QUERY)`
  3. **People to Follow** — based on same-course enrollment (future: AI-powered)
- Empty state: "Follow learners to see their activity here"
- Each feed item: avatar, action description, content title, time ago

**Modify:** `apps/web/src/components/SocialFeedWidget.tsx`
- Remove `pause: true` — queries are now live
- Handle loading + error states

**New file:** `apps/web/src/components/social/FeedItem.tsx`
- Renders a single `SocialFeedItem`: "[Avatar] **Alice** completed **React Fundamentals** · 2h ago"
- Verb → human text: COMPLETED→"completed", ENROLLED→"started", ACHIEVED_BADGE→"earned", DISCUSSED→"posted in"

**New file:** `apps/web/src/lib/graphql/social.queries.ts`
```typescript
export const SOCIAL_FEED_QUERY = gql`query SocialFeed($limit: Int) {
  socialFeed(limit: $limit) { id actorId actorDisplayName verb objectType objectId objectTitle createdAt }
}`;

export const SOCIAL_RECOMMENDATIONS_QUERY = gql`query SocialRecommendations($limit: Int) {
  socialRecommendations(limit: $limit) { contentItemId contentTitle followersCount isMutualFollower lastActivity }
}`;
```

**Tests:**
- `SocialFeedPage.test.tsx`: renders heading; empty state shows when no feed items; feed items render actor name + action; recommendations render
- `FeedItem.test.tsx`: renders "Alice completed React Fundamentals"; verb mapping correct for all 5 verbs

---

### Agent-B3: Public Profile + Follow System Activation

**Modify:** `apps/web/src/pages/PublicProfilePage.tsx`
- Remove all `pause: true` from queries
- The profile page is fully built — just needs live queries

**Modify:** `apps/web/src/components/social/FollowButton.tsx`
- Remove `pause: true`

**Modify:** `apps/web/src/components/social/FollowersList.tsx`
- Remove `pause: true`

**Modify:** `apps/web/src/lib/graphql/profile.queries.ts`
- Remove `pause: true` comments/flags (if any)

**New file:** `apps/web/src/pages/UserSearchPage.tsx` — route `/people`
- Search users by display name
- Shows: avatar, display name, followers count, FollowButton
- Uses `publicProfile(userId)` query for each result (or add a dedicated `searchUsers` query)
- **Add `searchUsers(query: String!, limit: Int): [PublicProfile!]!` to social.graphql**

**AppSidebar additions:**
```typescript
{ to: '/social', icon: Users, label: 'Social Feed' },
{ to: '/discussions', icon: MessageSquare, label: 'Discussions' },
{ to: '/people', icon: Search, label: 'Find People' },
```

**Tests:**
- `PublicProfilePage.test.tsx` (modify): queries no longer paused; renders follow button; followers count visible
- `UserSearchPage.test.tsx`: search input renders; results show after mock query

---

### Agent-B4: 360° Assessment UI

**New file:** `apps/web/src/pages/AssessmentCampaignsPage.tsx` — route `/assessments`
- Two tabs: "My Assessments" (campaigns targeting me) + "To Review" (campaigns I'm asked to fill)
- `useQuery(MY_CAMPAIGNS_QUERY)` + `useQuery(CAMPAIGNS_TO_RESPOND_QUERY)`

**New file:** `apps/web/src/pages/AssessmentResponsePage.tsx` — route `/assessments/:id/respond`
- Form with:
  - Role selector (PEER, MANAGER, DIRECT_REPORT)
  - Per-criterion slider 1–5 with label
  - Narrative text area
  - Submit → `submitAssessmentResponse`
- Confirmation screen after submit

**New file:** `apps/web/src/pages/AssessmentResultPage.tsx` — route `/assessments/:id/results`
- Radar chart (recharts `RadarChart` — already installed) showing per-criterion scores
- Breakdown by rater role (self vs. peers vs. managers)
- Text summary (auto-generated by aggregation service)

**New file:** `apps/web/src/components/assessment/RadarChart.tsx`
```typescript
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer } from 'recharts';
// Props: criteria names + avg scores
// Color: blue fill for overall, gray outline for self
```

**New file:** `apps/web/src/lib/graphql/assessment.queries.ts`
```typescript
export const MY_CAMPAIGNS_QUERY = gql`query MyCampaigns { myCampaigns { id title status dueDate } }`;
export const CAMPAIGNS_TO_RESPOND_QUERY = gql`query CampaignsToRespond { campaignsToRespond { id title status dueDate createdBy } }`;
export const ASSESSMENT_RESULT_QUERY = gql`query AssessmentResult($campaignId: ID!) {
  assessmentResult(campaignId: $campaignId) {
    campaignId aggregatedScores summary generatedAt
  }
}`;
export const SUBMIT_RESPONSE_MUTATION = gql`mutation SubmitResponse($campaignId: ID!, $raterRole: RaterRole!, $criteriaScores: String!, $narrative: String) {
  submitAssessmentResponse(campaignId: $campaignId, raterRole: $raterRole, criteriaScores: $criteriaScores, narrative: $narrative)
}`;
```

**Tests:**
- `AssessmentCampaignsPage.test.tsx`: renders two tabs; my campaigns list; campaigns to respond list
- `AssessmentResponsePage.test.tsx`: renders criteria sliders; narrative field; submit calls mutation; success message shown
- `AssessmentResultPage.test.tsx`: radar chart renders with mock data; summary text visible
- `RadarChart.test.tsx`: renders with 5 criteria; labels visible

---

### Agent-B5: Peer Review Workflow UI

**New file:** `apps/web/src/pages/PeerReviewPage.tsx` — route `/peer-review`
- Shows: assignments waiting for me to review + assignments I submitted waiting for peer review
- "Assignments to Review" section: content title, submitter (anonymous if rubric is_anonymous), due date, "Start Review" button
- "My Submissions" section: content title, status badge (PENDING/IN REVIEW/COMPLETE), score if rated

**New file:** `apps/web/src/pages/ReviewAssignmentPage.tsx` — route `/peer-review/:id`
- Shows submission text (content item or text submission)
- Rubric scoring form (per-criterion sliders)
- Feedback textarea
- Submit review → `submitPeerReview(assignmentId, criteriaScores, feedback)` mutation

**New file:** `apps/web/src/components/peer-review/RubricScorer.tsx`
- Takes `criteria: RubricCriteria[]` + `onChange: (scores: Record<string, number>) => void`
- Per criterion: label, description, slider 0–maxScore
- Shows total score

**New file:** `apps/web/src/lib/graphql/peer-review.queries.ts`
```typescript
export const MY_REVIEW_ASSIGNMENTS_QUERY = gql`...`;
export const SUBMIT_PEER_REVIEW_MUTATION = gql`...`;
export const MY_SUBMISSIONS_QUERY = gql`...`;
```

**AppSidebar:** Add `{ to: '/peer-review', icon: Star, label: 'Peer Review' }`

**Tests:**
- `PeerReviewPage.test.tsx`: renders both sections; shows pending count badge; empty states
- `ReviewAssignmentPage.test.tsx`: rubric renders; submit calls mutation; success redirect
- `RubricScorer.test.tsx`: slider per criterion; score accumulates; onChange fires

---

## Sprint C — Peer Review Backend + AI Insights (Days 4–6, 3 Parallel Agents)

### Agent-C1: Peer Review Service + Resolver

**New file:** `apps/subgraph-content/src/peer-review/peer-review.service.ts`

```typescript
@Injectable()
export class PeerReviewService implements OnModuleInit, OnModuleDestroy {
  // createRubric(contentItemId, criteria, minReviewers, isAnonymous, tenantId, userId)
  // createAssignment(contentItemId, submitterId, submissionText, tenantId)
  //   → auto-assigns `minReviewers` peers from same course via random selection
  //   → publishes EDUSPHERE.peer.review.assigned per reviewer
  // submitReview(assignmentId, reviewerId, criteriaScores, feedback, tenantId)
  //   → validates reviewer matches assignment.reviewerId
  //   → updates status PENDING→SUBMITTED
  //   → check if all assignments complete → publish EDUSPHERE.peer.review.completed
  // getMyAssignmentsToReview(reviewerId, tenantId) → PENDING assignments
  // getMySubmissions(submitterId, tenantId) → my submissions + their review status
  // getRubric(contentItemId, tenantId) → rubric or null if not configured
}
```

**Security:** reviewer_id must match `ctx.userId` (no reviewing other people's assignments)

**New file:** `apps/subgraph-content/src/peer-review/peer-review.graphql`
```graphql
extend type Mutation {
  createPeerReviewRubric(input: CreateRubricInput!): PeerReviewRubric! @authenticated @requiresRole(roles: [INSTRUCTOR, ORG_ADMIN, SUPER_ADMIN])
  submitForPeerReview(contentItemId: ID!, submissionText: String!): [PeerReviewAssignment!]! @authenticated
  submitPeerReview(assignmentId: ID!, criteriaScores: String!, feedback: String): Boolean! @authenticated
}

extend type Query {
  myReviewAssignments: [PeerReviewAssignment!]! @authenticated
  mySubmissions: [PeerReviewSubmission!]! @authenticated
  peerReviewRubric(contentItemId: ID!): PeerReviewRubric @authenticated
}

type PeerReviewAssignment {
  id: ID!
  contentItemId: ID!
  contentItemTitle: String!
  submitterId: ID!
  submitterDisplayName: String  # null if isAnonymous
  status: PeerReviewStatus!
  submissionText: String
  feedback: String
  score: Int
  createdAt: DateTime!
}
```

**Tests:** peer-review.service.spec.ts (10+ tests), peer-review.service.memory.spec.ts, peer-review.resolver.spec.ts

---

### Agent-C2: AI-Powered Discussion Insights (Ollama Integration)

**Goal:** Auto-summarize long discussion threads + extract topics + suggest follow-up questions

**New file:** `apps/subgraph-collaboration/src/discussion/discussion-insights.service.ts`

```typescript
@Injectable()
export class DiscussionInsightsService {
  // summarizeThread(discussionId, tenantId): Promise<DiscussionSummary>
  //   → fetch last 50 messages from discussion
  //   → call Ollama (via existing Vercel AI SDK pattern) with summarization prompt
  //   → return: { summary, keyTopics[], suggestedFollowUps[], sentimentScore }
  // extractTopics(messages): Promise<string[]>
  //   → LLM → 3-5 topic tags per discussion
  // generateFollowUpQuestion(messages): Promise<string>
  //   → LLM → one Socratic follow-up question to deepen the discussion
}
```

**Ollama prompt pattern** (follow existing agent subgraph pattern):
```typescript
const { text } = await generateText({
  model: ollama('llama3.2'),
  prompt: `Summarize this learning discussion in 2 sentences. Focus on what was learned:\n\n${messages}`,
  maxTokens: 150,
});
```

**GraphQL SDL extension:**
```graphql
extend type Mutation {
  generateDiscussionSummary(discussionId: ID!): DiscussionSummary! @authenticated
}

type DiscussionSummary {
  summary: String!
  keyTopics: [String!]!
  suggestedFollowUp: String
  generatedAt: DateTime!
}
```

**Frontend integration:** Show "AI Summary" button in DiscussionDetailPage → lazy generates summary → display in collapsed panel above messages.

**Tests:** Mock Ollama SDK calls, verify summary stored and returned correctly.

---

### Agent-C3: E2E + Security Gate

**New E2E specs:**

| File | Assertions |
|------|-----------|
| `apps/web/e2e/social-feed.spec.ts` | Login → /social → feed visible; FollowButton works; follows count updates; `toHaveScreenshot` |
| `apps/web/e2e/discussions.spec.ts` | Login → /discussions → list visible; open discussion → messages; send message → appears in thread; `toHaveScreenshot` |
| `apps/web/e2e/peer-review.spec.ts` | Login as student → submit for review → login as peer → review form appears; submit review → `toHaveScreenshot` |
| `apps/web/e2e/assessment.spec.ts` | Login as org.admin → create campaign → login as student → respond → complete campaign → results visible with radar chart |

**Security tests (`tests/security/api-security.spec.ts` additions):**
- `submitPeerReview` with another user's `assignmentId` → expect `UNAUTHORIZED` (reviewer must match)
- `followUser(userId)` with your own userId → expect `BadRequestException` (cannot follow yourself)
- `createAssessmentCampaign` as STUDENT → expect `FORBIDDEN` (requires INSTRUCTOR+)
- Cross-tenant peer review: reviewer from Tenant A cannot review submission from Tenant B
- Social feed: items from other tenants not visible even with direct query (RLS verification)

**OPEN_ISSUES.md + README.md update** (final sync)

---

## Execution Timeline

```
Day 1 (All 4 parallel):
  A1 (Supergraph wire-up) + A2 (Social Feed backend) + A3 (DB migration 0027) + A4 (Notifications)
  Gate: pnpm turbo typecheck → 0 errors

Day 2–3 (All 5 parallel):
  B1 (Discussion UI) + B2 (Social Feed page) + B3 (Public Profile activation) +
  B4 (Assessment UI) + B5 (Peer Review UI)

Day 4–5 (3 parallel):
  C1 (Peer Review backend) + C2 (AI discussion insights) + C3 (E2E + Security)

Day 6 (Quality Gate):
  pnpm turbo test + typecheck + lint
  E2E: social-feed + discussions + peer-review + assessment
  Security: 0 violations on new invariants
  5-user auth verification
```

---

## Patterns to Reuse (Exact File References)

| Pattern | File to Copy From |
|---------|------------------|
| NestJS service lifecycle (NATS + DB) | `apps/subgraph-core/src/social/social.service.ts` |
| withTenantContext wrapper | `apps/subgraph-core/src/social/social.service.ts:45` |
| Drizzle schema with RLS (pgPolicy) | `packages/db/src/schema/skills.ts` |
| NATS fan-out on event | `apps/subgraph-core/src/gamification/badge.service.ts` |
| GraphQL subscription bridge | `apps/subgraph-core/src/notifications/nats-notification.bridge.ts` |
| useSubscription with unmount safety | `apps/web/src/hooks/useNotifications.ts` |
| Radar chart (recharts) | Use `recharts` already installed — see recharts docs |
| Mounted guard useQuery | Any page with `pause: !mounted` pattern |
| NOOP_MUTATION / NOOP_QUERY mock | Any test file using urql |

---

## Verification Checklist

### After Sprint A
```bash
pnpm --filter @edusphere/gateway compose  # 0 composition errors
grep "socialFeed\|myFollowers\|discussions\|myCampaigns" apps/gateway/supergraph.graphql  # all present
```

### After Sprint B
```bash
pnpm --filter @edusphere/web test  # all pass (expected +100 tests)
grep "pause: true" apps/web/src/components/social/FollowButton.tsx  # → 0 matches
```

### After Sprint C (Full QA Gate)
```bash
pnpm turbo test               # 100% pass
pnpm turbo typecheck          # 0 TypeScript errors
pnpm turbo lint               # 0 warnings
pnpm --filter @edusphere/web test:e2e  # all E2E pass
pnpm test:security            # 0 failures
./scripts/health-check.sh     # all services UP
```

---

## Expected Test Delta

| Package | Before | After | Delta |
|---------|--------|-------|-------|
| Web unit | 4,004 | ~4,130+ | +126 (discussion, peer-review, assessment, social UI) |
| E2E specs | ~117+ | ~125+ | +8 (social-feed, discussions, peer-review, assessment) |
| Security tests | ~1,015+ | ~1,040+ | +25 (peer-review auth, cross-tenant, self-follow, role gates) |
| Backend (subgraph-core) | existing | +30 | +30 (social feed service, notification extension) |
| Backend (subgraph-content) | existing | +25 | +25 (peer review service + resolver) |
| Backend (subgraph-collab) | existing | +15 | +15 (AI insights service) |

---

## Security Division — Phase 45 Threat Model & Implementation

### 7 New Attack Surfaces (Social Features)

| # | Attack | Vector | Severity |
|---|--------|--------|----------|
| **SEC-1** | Self-follow loop | `followUser(userId: myOwnId)` | Medium — inflates follower counts |
| **SEC-2** | IDOR in peer review | `submitPeerReview(assignmentId: othersAssignment)` | Critical — unauthorized grading |
| **SEC-3** | XSS via discussion messages | `addMessage(content: "<script>alert(1)</script>")` | High — stored XSS in feed |
| **SEC-4** | Feed injection | Create fake feed items via direct GraphQL mutation | High — social manipulation |
| **SEC-5** | Reaction bombing | `likeMessage()` spam DoS loop | Medium — rate limit bypass |
| **SEC-6** | AI prompt injection | Inject LLM instructions via discussion messages | High — AI output manipulation |
| **SEC-7** | Profile enumeration | `publicProfile(userId)` brute-force user discovery | Low — privacy concern |

### Security Controls Required

**SEC-1 — Self-follow prevention:**
```typescript
// In social.service.ts followUser():
if (followerId === followingId) {
  throw new BadRequestException('Cannot follow yourself');
}
```

**SEC-2 — IDOR prevention (peer review RLS):**
```sql
-- peer_review_assignments RLS USING clause:
tenant_id::text = current_setting('app.current_tenant', TRUE)
AND (
  submitter_id::text = current_setting('app.current_user_id', TRUE)
  OR reviewer_id::text = current_setting('app.current_user_id', TRUE)
  OR current_setting('app.current_user_role', TRUE) IN ('SUPER_ADMIN', 'ORG_ADMIN', 'INSTRUCTOR')
)
```

Additionally in `submitPeerReview()` resolver: verify `assignment.reviewerId === ctx.userId` before allowing write.

**SEC-3 — XSS prevention:**
```typescript
// Zod schema for AddMessageInput:
const AddMessageSchema = z.object({
  content: z.string().min(1).max(2000).transform(val => DOMPurify.sanitize(val, { ALLOWED_TAGS: [] })),
  parentMessageId: z.string().uuid().optional(),
});
```
DOMPurify is already installed (Phase 29 visual anchors). Strip ALL tags — learning discussions are plain text.

**SEC-4 — Feed injection prevention:**
- `social_feed_items` table: NO `createFeedItem` / `addFeedItem` mutation in GraphQL SDL
- Only NATS event handler (`onCourseCompleted`, `onBadgeIssued`, `onMessageAdded`) writes to this table
- RLS `WITH CHECK`: `tenant_id::text = current_setting('app.current_tenant', TRUE)` only — no user_id check (NATS writes as service role)

**SEC-5 — Rate limiting (new rules for social endpoints):**
```typescript
// Add to gateway rate-limit config:
{ matcher: /followUser|unfollowUser/, limit: 100, window: '1m', scope: 'user' },
{ matcher: /searchUsers/, limit: 20, window: '1m', scope: 'ip' },
{ matcher: /addMessage/, limit: 60, window: '1m', scope: 'user' },
{ matcher: /likeMessage/, limit: 10, window: '1s', scope: 'user' },
{ matcher: /publicProfile/, limit: 20, window: '1m', scope: 'ip' },
{ matcher: /submitForPeerReview/, limit: 5, window: '1h', scope: 'user' },
```

**SEC-6 — AI prompt injection guard:**
```typescript
// In discussion-insights.service.ts:
// WRONG: prompt = `Summarize: ${messages.map(m => m.content).join('\n')}`
// RIGHT: use structured tool calls — pass messages as JSON data field, not string concatenation
const { text } = await generateText({
  model: ollama('llama3.2'),
  messages: [
    { role: 'system', content: 'You are a learning discussion summarizer. Summarize only.' },
    { role: 'user', content: JSON.stringify({ task: 'summarize', data: messages.map(m => ({ content: m.content })) }) },
  ],
  maxTokens: 150,
});
```

**SEC-7 — Profile enumeration mitigation:**
- `publicProfile(userId)` returns 404 (null) for non-existent users — same response time as found users (no timing oracle)
- `searchUsers(query)` requires minimum 3-character query before executing

### New Security Test File

**`tests/security/social-learning.spec.ts`** — 72 assertions across 8 describe blocks:

```typescript
describe('Social Learning Security — Phase 45', () => {
  describe('SEC-1: Self-follow prevention', () => {
    it('followUser resolver source enforces followerId !== followingId guard', () => {
      const src = readFileSync('apps/subgraph-core/src/social/social.service.ts', 'utf8');
      expect(src).toMatch(/followerId.*!==.*followingId|followId.*===.*userId.*throw/i);
    });
    it('BadRequestException thrown on self-follow attempt (not silent ignore)', () => {
      expect(src).toMatch(/BadRequestException.*[Cc]annot follow yourself/);
    });
  });

  describe('SEC-2: IDOR in peer review (reviewer must match assignment)', () => {
    it('peer_review_assignments schema includes RLS for reviewer_id OR submitter_id', () => {
      const schema = readFileSync('packages/db/src/schema/peer-review.ts', 'utf8');
      expect(schema).toMatch(/reviewer_id.*current_setting|submitter_id.*current_setting/i);
    });
    it('submitPeerReview resolver validates ctx.userId === assignment.reviewerId', () => {
      const resolver = readFileSync('apps/subgraph-content/src/peer-review/peer-review.resolver.ts', 'utf8');
      expect(resolver).toMatch(/ctx\.userId.*reviewerId|UnauthorizedException/);
    });
  });

  describe('SEC-3: XSS in discussion messages', () => {
    it('AddMessageInput schema sanitizes content with DOMPurify (strip all tags)', () => {
      const schema = readFileSync('apps/subgraph-collaboration/src/discussion/discussion.schemas.ts', 'utf8');
      expect(schema).toMatch(/DOMPurify\.sanitize|sanitize.*ALLOWED_TAGS.*\[\]/);
    });
    it('message content max length is enforced (2000 chars)', () => {
      expect(schema).toMatch(/max\(2000\)|maxLength.*2000/);
    });
    it('XSS payload in message content is stripped before storage', () => {
      // Static check: DOMPurify.sanitize called before DB insert
      const service = readFileSync('apps/subgraph-collaboration/src/discussion/discussion.service.ts', 'utf8');
      expect(service).toMatch(/sanitize|DOMPurify/);
    });
  });

  describe('SEC-4: Feed injection prevention (NATS-only writes)', () => {
    it('no createFeedItem/addFeedItem mutation exists in social.graphql SDL', () => {
      const sdl = readFileSync('apps/subgraph-core/src/social/social.graphql', 'utf8');
      expect(sdl).not.toMatch(/createFeedItem|addFeedItem|insertFeedItem|writeFeedItem/);
    });
    it('social_feed_items table has no GraphQL mutation resolver', () => {
      const resolver = readFileSync('apps/subgraph-core/src/social/social.resolver.ts', 'utf8');
      expect(resolver).not.toMatch(/createFeedItem|addFeedItem/);
    });
  });

  describe('SEC-5: Rate limiting on social endpoints', () => {
    it('gateway rate-limit config includes followUser rule', () => {
      // Check gateway config or rate-limit middleware
      const config = readFileSync('apps/gateway/src/rate-limit.config.ts', 'utf8');
      expect(config).toMatch(/followUser|unfollowUser/);
    });
    it('likeMessage rate limit is stricter than other social actions (per-second)', () => {
      expect(config).toMatch(/likeMessage.*\b[1-9]\b.*second|likeMessage.*window.*1s/i);
    });
  });

  describe('SEC-6: AI prompt injection guard', () => {
    it('discussion summarization uses structured JSON data field (not string concat)', () => {
      const insights = readFileSync('apps/subgraph-collaboration/src/discussion/discussion-insights.service.ts', 'utf8');
      expect(insights).toMatch(/JSON\.stringify|role.*system.*summarize|task.*summarize/);
    });
    it('system prompt is hardcoded (not user-controllable)', () => {
      expect(insights).toMatch(/role.*system.*content.*You are/);
    });
  });

  describe('SEC-7: Profile enumeration protection', () => {
    it('searchUsers requires minimum query length before executing', () => {
      const service = readFileSync('apps/subgraph-core/src/social/social.service.ts', 'utf8');
      expect(service).toMatch(/query\.length.*[<>=].*[23]|minLength.*[23]/);
    });
  });

  describe('Cross-feature: RLS tenant isolation on new tables', () => {
    it('peer_review_rubrics has pgPolicy with tenant_id check', () => { ... });
    it('peer_review_assignments has pgPolicy with tenant_id check', () => { ... });
    it('social_feed_items has pgPolicy with tenant_id check', () => { ... });
    it('discussion_message_likes has pgPolicy with tenant_id check', () => { ... });
  });
});
```

### Security Acceptance Criteria (must pass before Phase 45 ships)
- [ ] `pnpm test:security` — 0 failures (existing 1,015+ + 72 new = ~1,087 total)
- [ ] Self-follow attempt returns `BadRequestException` (not silent)
- [ ] Cross-tenant peer review returns `UNAUTHORIZED` (RLS blocks at DB level)
- [ ] `<script>alert(1)</script>` in message content → stored as empty string or sanitized text
- [ ] `social_feed_items` has no GraphQL write mutation (grep returns 0 matches)
- [ ] AI summarization uses structured tool call pattern (no string concatenation)
- [ ] Rate limit rules active for all 6 social endpoints listed above

---

## QA Division — Comprehensive Test Strategy

### Existing State (before Phase 45)
- Web unit tests: ~4,004 (vitest + @testing-library/react)
- E2E specs: ~103 spec files (Playwright)
- Visual regression: `toHaveScreenshot()` pattern (no Argos — using Playwright native)
- `public-profile.spec.ts` already exists — needs update when `pause: true` removed

### Unit Test Plan (per new component)

| Component | Test File | Key Assertions |
|-----------|-----------|---------------|
| `DiscussionsPage` | `DiscussionsPage.test.tsx` | heading renders; empty state shows; lists discussions; "New Discussion" button present |
| `DiscussionDetailPage` | `DiscussionDetailPage.test.tsx` | messages render; reply button visible; message appears after mutation; subscription fires |
| `MessageComposer` | `MessageComposer.test.tsx` | submit calls mutation with text; clears after submit; reply preview shows when replyTo set |
| `MessageItem` | `MessageItem.test.tsx` | avatar initials from displayName; timestamp format; reply action sets state; like count visible |
| `SocialFeedPage` | `SocialFeedPage.test.tsx` | heading renders; empty state "Follow learners"; feed items show actor + action; recommendations show |
| `FeedItem` | `FeedItem.test.tsx` | "Alice completed React Fundamentals"; all 5 verb mappings correct; time ago format |
| `UserSearchPage` | `UserSearchPage.test.tsx` | search input renders; min 3 chars before query fires; results show name + FollowButton |
| `AssessmentCampaignsPage` | `AssessmentCampaignsPage.test.tsx` | two tabs render; my campaigns list; campaigns to respond list; tab switching |
| `AssessmentResponsePage` | `AssessmentResponsePage.test.tsx` | criteria sliders render; narrative field; submit calls mutation; success confirmation |
| `AssessmentResultPage` | `AssessmentResultPage.test.tsx` | radar chart renders; summary text; breakdown by role visible |
| `RadarChart` | `RadarChart.test.tsx` | renders 5 criteria; labels visible; no crash on empty data |
| `PeerReviewPage` | `PeerReviewPage.test.tsx` | both sections render; pending count badge; empty states handled |
| `ReviewAssignmentPage` | `ReviewAssignmentPage.test.tsx` | rubric renders; submit calls mutation; success redirect |
| `RubricScorer` | `RubricScorer.test.tsx` | slider per criterion; total accumulates correctly; onChange fires on change |

**Mock pattern** (follow existing `FollowButton.test.tsx`):
```typescript
const NOOP_QUERY = [{ data: undefined, fetching: false, error: undefined }, vi.fn()] as never;
const NOOP_MUTATION = [{ fetching: false }, vi.fn().mockResolvedValue({ data: undefined, error: undefined })] as never;

vi.mocked(urql.useQuery).mockImplementation((doc) => {
  if (String(doc).includes('MyDiscussions')) return [{ data: mockDiscussions, fetching: false, error: undefined }, vi.fn()] as never;
  return NOOP_QUERY;
});
```

**Memory safety tests required for:**
- `DiscussionDetailPage` — `useSubscription(MESSAGE_ADDED_SUBSCRIPTION)` must use `pause: !mounted` pattern → test that subscription pauses on unmount
- `MessageComposer` — no timer concerns (just mutation)

### E2E Test Plan (4 new specs)

**`apps/web/e2e/social-feed.spec.ts`**
```typescript
test('social feed page shows following activity', async ({ page }) => {
  await loginAs(page, 'student@example.com', 'Student123!');
  await page.goto('/social');
  await expect(page.getByRole('heading', { name: /Social Feed|Following Activity/i })).toBeVisible();
  // Empty state when no follows
  await expect(page.getByText(/Follow learners/i)).toBeVisible();
  await expect(page).toHaveScreenshot('social-feed-empty.png', { threshold: 0.02 });
});

test('follow a user and see activity in feed', async ({ page }) => {
  await loginAs(page, 'student@example.com', 'Student123!');
  await page.goto('/people');
  await page.getByPlaceholder(/search/i).fill('instructor');
  await page.getByRole('button', { name: /Follow/i }).first().click();
  await page.goto('/social');
  await expect(page).toHaveScreenshot('social-feed-with-follows.png', { threshold: 0.02 });
});
```

**`apps/web/e2e/discussions.spec.ts`**
```typescript
test('can browse and post in a discussion', async ({ page }) => {
  await loginAs(page, 'student@example.com', 'Student123!');
  await page.goto('/discussions');
  await expect(page.getByRole('heading', { name: /Discussions/i })).toBeVisible();
  await expect(page).toHaveScreenshot('discussions-list.png', { threshold: 0.02 });
  // Open first discussion
  await page.getByRole('link').first().click();
  await expect(page.getByRole('textbox', { name: /message|reply/i })).toBeVisible();
  await page.fill('[data-testid="message-composer"]', 'Test message content');
  await page.getByRole('button', { name: /Send/i }).click();
  await expect(page.getByText('Test message content')).toBeVisible();
  await expect(page).toHaveScreenshot('discussions-detail-with-message.png', { threshold: 0.02 });
});
```

**`apps/web/e2e/peer-review.spec.ts`**
```typescript
test('peer review workflow: submit and review', async ({ page, browser }) => {
  // Student submits for peer review
  await loginAs(page, 'student@example.com', 'Student123!');
  await page.goto('/peer-review');
  await expect(page.getByRole('heading', { name: /Peer Review/i })).toBeVisible();
  await expect(page).toHaveScreenshot('peer-review-empty.png', { threshold: 0.02 });
});
```

**`apps/web/e2e/assessment-360.spec.ts`**
```typescript
test('360 assessment flow: create campaign → respond → view results', async ({ page }) => {
  await loginAs(page, 'org.admin@example.com', 'OrgAdmin123!');
  await page.goto('/assessments');
  await expect(page.getByRole('heading', { name: /Assessments/i })).toBeVisible();
  await expect(page).toHaveScreenshot('assessments-page.png', { threshold: 0.02 });
});
```

### Accessibility Test Plan

New components requiring accessibility assertions:

| Component | Required ARIA | Test assertion |
|-----------|--------------|----------------|
| `DiscussionDetailPage` | `role="log"` + `aria-live="polite"` on message list | `expect(messageList).toHaveAttribute('aria-live', 'polite')` |
| `MessageComposer` | `aria-label` on textarea; announce "Message sent" after submit | check `aria-live` region |
| `RubricScorer` | sliders: `role="slider"` with `aria-valuemin/max/now` | Radix Slider handles this automatically |
| `PeerReviewPage` | sections with `role="region"` and `aria-label` | check heading structure |
| `RadarChart` | provide `aria-label` with summary text (recharts renders SVG) | `expect(svg).toHaveAttribute('aria-label')` |

### Visual Regression Screenshots (toHaveScreenshot names)

```
social-feed-empty.png           — /social, no follows
social-feed-with-activity.png   — /social, with mock feed items
discussions-list.png            — /discussions, list view
discussions-detail.png          — /discussions/:id, with messages
discussions-reply-composer.png  — reply mode active
peer-review-dashboard.png       — /peer-review, both sections
peer-review-rubric-form.png     — /peer-review/:id, scoring form
assessment-campaigns.png        — /assessments, two tabs
assessment-response-form.png    — /assessments/:id/respond
assessment-radar-chart.png      — /assessments/:id/results, radar chart visible
public-profile-with-follow.png  — /profile/:id (live data, no pause)
people-search-results.png       — /people, search results
```

**Responsive coverage:** 375px (mobile) + 1280px (desktop) for SocialFeedPage, DiscussionDetailPage, PeerReviewPage.

### Expected Test Delta

| Package | Before | After | Delta |
|---------|--------|-------|-------|
| `@edusphere/web` unit | 4,004 | ~4,140+ | +136 (14 component suites × ~10 tests each) |
| E2E specs | ~103 | ~107 | +4 new spec files |
| Backend `subgraph-core` | existing | +35 | +35 (social feed service, notification extension) |
| Backend `subgraph-content` | existing | +28 | +28 (peer review service + resolver) |
| Backend `subgraph-collab` | existing | +85 | +85 (peer review service + AI insights) |
| Security tests | ~1,015+ | ~1,087+ | +72 (social-learning.spec.ts) |
| Visual regression (Argos) | existing | +85 baselines | 4 spec files × desktop/tablet/mobile + dark mode |
| **Total** | **~4,004** | **~4,889+** | **+885** |

### Storybook Stories Plan (Storybook 8 + addon-a11y)

**Location:** `apps/web/src/components/<Component>.stories.tsx`

Key stories per component:
- `DiscussionThread` — EmptyThread, FiveMessages, TwentyMessagesWithScroll, WithNestedReplies
- `RubricScorer` — ThreeCriteria, FiveCriteria, AllMaxScores
- `RadarChart` — BalancedScores (circular), SkewedScores (star)
- `FeedItem` — one story per verb: CompletedCourse, EarnedBadge, PostedDiscussion, LikedComment, SharedResource
- `MessageItem` — TextOnly, WithReply (indented), WithFiveLikes

### ARIA Snapshot Tests (toMatchAriaSnapshot)

```typescript
// In discussion E2E spec:
await expect(main).toMatchAriaSnapshot(`
  - main
    - heading "React Performance Tips"
    - log "Message thread"
      - article
      - article
    - region "Message composer"
`);

// In social feed E2E spec:
await expect(feed).toMatchAriaSnapshot(`
  - feed "Social Activity Stream"
    - article
    - article
    - article
`);

// In rubric scorer E2E spec:
await expect(rubricGroup).toMatchAriaSnapshot(`
  - group "Rubric Scoring"
    - label
      - heading "Content"
      - slider min=0 max=5 value=0 aria-label="Content score"
    - region "Total score" aria-live="polite"
`);
```

### Cross-Browser Matrix

Tests that MUST run on Chromium + Firefox + WebKit:

| Test | Reason |
|------|--------|
| `messageAdded` WebSocket subscription | Safari WebSocket behavior differs |
| `RubricScorer` input[type="range"] sliders | Cross-browser range rendering |
| `RadarChart` SVG rendering | Safari SVG filter differences |
| Discussion scroll-to-latest | Scroll behavior edge cases |
| Aria live region announcements | Screen reader timing differences |

---

## Technical Debt — Pre-Phase 45 Remediation

### Migration State
- Last migration: `0026_skills.sql` ✅
- Next migration: `0027_social_peer_review.sql` ✅ — no conflict

### `pause: true` Inventory (Social Components)

| File | Line | Status | Action |
|------|------|--------|--------|
| `apps/web/src/components/FollowersList.tsx` | 62, 68 | `pause: true` — myFollowers/myFollowing not wired | **Remove in Sprint A** (after supergraph wired) |
| `apps/web/src/pages/PublicProfilePage.tsx` | 98 | `pause: true` — publicProfile not in live gateway | **Remove in Sprint B Agent-B3** |
| `apps/web/src/pages/AssessmentCampaignPage.tsx` | 94 | `pause: true` — myCampaigns not wired | **Remove in Sprint A** (after supergraph wired) |
| `apps/web/src/components/FollowButton.tsx` | — | No pause — mutation only | ✅ Already live |
| `apps/web/src/components/SocialFeedWidget.tsx` | — | No pause — query already live, returns empty | ✅ Will work after Sprint A-A2 |

**Note:** `SocialFeedWidget` does NOT have a mounted guard — add `pause: !mounted` in Sprint B per CLAUDE.md memory safety rules.

### P0 — Must fix before Phase 45 ships (blocks correctness)

| # | Item | File | Fix |
|---|------|------|-----|
| P0-1 | `SocialFeedWidget` missing mounted guard | `apps/web/src/components/SocialFeedWidget.tsx:63` | Add `const [mounted, setMounted] = useState(false); useEffect(() => { setMounted(true); }, []); pause: !mounted` |
| P0-2 | Self-follow missing in current `social.service.ts` | `apps/subgraph-core/src/social/social.service.ts` | Add `if (followerId === followingId) throw new BadRequestException(...)` in `followUser()` |
| P0-3 | `discussion_message_likes` table needed for reactions | Migration 0027 | Add table with UNIQUE(message_id, user_id) constraint |

### P1 — Fix during Phase 45 (part of sprint tasks)

| # | Item | File | When |
|---|------|------|------|
| P1-1 | Remove `pause: true` from `FollowersList.tsx` | Sprint A completion | After supergraph wired |
| P1-2 | Remove `pause: true` from `PublicProfilePage.tsx:98` | Sprint B Agent-B3 | Part of profile activation |
| P1-3 | Remove `pause: true` from `AssessmentCampaignPage.tsx:94` | Sprint A completion | After supergraph wired |
| P1-4 | `SocialFeedWidget` uses `SOCIAL_FEED_QUERY` from `knowledge-tier3.queries` — move to new `social.queries.ts` | Sprint B Agent-B2 | Keep query shape compatible |
| P1-5 | `FollowButton.tsx` / `FollowersList.tsx` / `SocialFeedWidget.tsx` live in `src/components/` root — consider moving to `src/components/social/` | Sprint B Agent-B3 | Low risk — update imports |

### P1-Additional — Fix alongside Phase 45 (found by debt scan, non-social features)

| # | File | Line | Issue | Action |
|---|------|------|-------|--------|
| TD-1 | `apps/web/src/pages/DashboardPage.tsx` | 25-26 | `MOCK_STREAK` + `MOCK_ACTIVITY` — dashboard shows mock data | Implement `myStats` + `activityFeed` in supergraph wiring (Sprint A) |
| TD-2 | `apps/web/src/hooks/useAgentChat.ts` | 200 | `TemplateType.Chavruta` does not exist in schema | Update subgraph-agent schema to include `ChavrutaDebate` enum value |
| TD-3 | `apps/web/src/pages/ScenariosPage.tsx` | 59 | `pause: true` — `scenarioTemplates` not in gateway | Decision: implement resolver OR defer to Phase 46 |

### P2 — Backlog (Phase 46 or dedicated debt sprint)

| # | Item | Severity |
|---|------|----------|
| P2-1 | `AdminDashboardPage.tsx:58` `pause: true` — adminOverview not in supergraph | Low |
| P2-2 | `InstructorAnalyticsDashboard.tsx:95` `pause: true` — analytics not in supergraph | Low |
| P2-3 | `ContentViewer.tsx:146` `pause: true` — liveSession BUG-027 open | Medium |
| P2-4 | Multiple settings pages with `pause: true` (BrandingSettings, CPDSettings, CrmSettings, etc.) | Low |
| P2-5 | `embedding.service.ts` (431 lines) → split into EmbeddingService + VectorStoreService | Low |
| P2-6 | `badge.service.ts` (464 lines) → split into BadgeService + LeaderboardService | Low |
| P2-7 | `useContentData.ts` — replace manual `ContentQueryResult` with codegen type | Low |

### Codebase Health (from automated debt scan, 2026-03-09)
- ✅ **0 console.log violations** in production code
- ✅ **0 `any` type violations** in non-test code
- ✅ **No memory leaks** — all setInterval/setTimeout properly cleaned with OnModuleDestroy
- ✅ **All RLS policies in place** — withTenantContext wrapper throughout
- ✅ **5,711 tests passing** at Phase 35 baseline
- 🟡 **14 large files** at architectural limits (justified exceptions per CLAUDE.md)

---

## OPEN_ISSUES.md Entry

```
FEAT-PHASE45-SOCIAL-LEARNING | 🟡 Planned | HIGH
Phase 45 — Social Learning Experience: Discussions, Peer Review, Social Feed, 360° Assessment UI

Key deliverables:
1. Wire 5 already-built backend features into supergraph (following, discussions, assessments, profiles, activity)
2. Social Feed backend service (getSocialFeed from followed users' activities)
3. Discussion Threads UI (DiscussionDetailPage, MessageComposer, threaded replies, real-time subscription)
4. Peer Review Workflow UI (PeerReviewPage, RubricScorer, ReviewAssignmentPage)
5. 360° Assessment UI (campaign list, response form, radar chart results)
6. Peer Review Assignment backend (auto-assign peers, submit review, complete flow)
7. AI Discussion Insights (thread summarization via Ollama, topic extraction)

New DB tables: peer_review_rubrics, peer_review_assignments, social_feed_items (migration 0027)
New notifications: PEER_REVIEW_ASSIGNED, PEER_REVIEW_RECEIVED, DISCUSSION_REPLY, PEER_FOLLOWED_ACTIVITY
Competitive differentiators: AI discussion summarization, socially-aware skill visibility,
  graph-based social learning (Apache AGE), real-time peer review with CRDT
```
