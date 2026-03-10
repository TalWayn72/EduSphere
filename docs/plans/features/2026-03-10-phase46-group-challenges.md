# Phase 46 — Group Challenges + Knowledge-Graph Peer Matching

## Goal
Complete the Social Learning loop started in Phase 45 by adding:
1. Group Challenges — collaborative learning objectives with leaderboard
2. KG-based Peer Matching — Apache AGE graph traversal to find ideal learning partners based on complementary skill gaps

## Sprint A — Backend (DB + Subgraph)

### DB Migration 0028
Tables:
- `group_challenges` — id, tenant_id, title, description, course_id, challenge_type (QUIZ/PROJECT/DISCUSSION), target_score, start_date, end_date, max_participants, status (DRAFT/ACTIVE/COMPLETED), created_by, created_at, updated_at
  - RLS: tenant isolation + created_by access
- `challenge_participants` — id, challenge_id, user_id, score, rank, joined_at, completed_at
  - RLS: tenant + participant access
- `peer_match_requests` — id, tenant_id, requester_id, matched_user_id, course_id, match_reason, status (PENDING/ACCEPTED/DECLINED), created_at
  - RLS: requester or matched_user access

### Subgraph-core: GroupChallengeService
- `createChallenge(input)` — INSTRUCTOR/ORG_ADMIN only
- `joinChallenge(challengeId)` — any authenticated user, max_participants check
- `submitChallengeScore(challengeId, score)` — participant only, NATS event: EDUSPHERE.challenge.score_submitted
- `getActiveChallenges(courseId?)` — paginated list
- `getChallengeLeaderboard(challengeId)` — ranked participants
- NATS fan-out: `EDUSPHERE.challenge.completed` → social_feed_items

### Subgraph-knowledge: PeerMatchingService
- `findPeerMatches(userId, courseId)` — Apache AGE Cypher:
  - Find users in same course with COMPLEMENTARY skill gaps
  - Query: users whose strong skills fill my weak skills and vice versa
  - Return top 5 matches with match_reason
- `requestPeerMatch(matchedUserId, courseId)` — creates peer_match_requests record
- `respondToPeerMatch(requestId, accept: boolean)`

### GraphQL SDL additions (subgraph-core + subgraph-knowledge)
```graphql
type GroupChallenge {
  id: ID!
  title: String!
  description: String
  courseId: String
  challengeType: ChallengeType!
  targetScore: Int!
  startDate: String!
  endDate: String!
  maxParticipants: Int!
  status: ChallengeStatus!
  participantCount: Int!
  leaderboard: [ChallengeParticipant!]!
}

type ChallengeParticipant {
  userId: ID!
  displayName: String!
  score: Int!
  rank: Int!
  completedAt: String
}

type PeerMatch {
  userId: ID!
  displayName: String!
  matchReason: String!
  sharedCourses: Int!
  complementarySkills: [String!]!
}

enum ChallengeType { QUIZ PROJECT DISCUSSION }
enum ChallengeStatus { DRAFT ACTIVE COMPLETED }

extend type Query {
  activeChallenges(courseId: String, first: Int, after: String): GroupChallengeConnection!
  challengeLeaderboard(challengeId: ID!): [ChallengeParticipant!]!
  peerMatches(courseId: String): [PeerMatch!]!
  myPeerMatchRequests: [PeerMatchRequest!]!
}

extend type Mutation {
  createChallenge(input: CreateChallengeInput!): GroupChallenge! @requiresRole(roles: [INSTRUCTOR, ORG_ADMIN])
  joinChallenge(challengeId: ID!): ChallengeParticipant! @authenticated
  submitChallengeScore(challengeId: ID!, score: Int!): ChallengeParticipant! @authenticated
  requestPeerMatch(matchedUserId: ID!, courseId: String!): PeerMatchRequest! @authenticated
  respondToPeerMatch(requestId: ID!, accept: Boolean!): PeerMatchRequest! @authenticated
}
```

## Sprint B — Frontend UI

### New Pages (apps/web/src/pages/)
- `GroupChallengesPage.tsx` — list of active challenges, join button, leaderboard preview
- `ChallengeDetailPage.tsx` — full leaderboard, submit score, participants list
- `PeerMatchingPage.tsx` — "Find a Study Partner" page, match cards with request button

### New Components (apps/web/src/components/)
- `challenge/ChallengeCard.tsx` — challenge preview with countdown timer
- `challenge/Leaderboard.tsx` — ranked table with trophy icons for top 3
- `challenge/CountdownTimer.tsx` — live countdown to challenge end date
- `peer-matching/MatchCard.tsx` — peer match suggestion with skill overlap visual
- `peer-matching/SkillOverlapBar.tsx` — visual overlap of complementary skills

### New GraphQL queries (apps/web/src/lib/graphql/)
- `challenge.queries.ts`
- `peer-matching.queries.ts`

### Router + Sidebar
- Routes: `/challenges`, `/challenges/:id`, `/peer-matching`
- AppSidebar nav: Group Challenges (Trophy), Find Study Partner (UserCheck)

## Sprint C — Security + Tests + E2E

### Security
- SEC-1: `if (challenge.createdBy !== userId && role !== 'INSTRUCTOR')` guard
- IDOR: `submitScore` validates participant membership before update
- Rate limit: max 1 score submission per challenge per user (unique constraint)
- SEC-9: `withTenantContext()` on all challenge + peer_match queries

### Tests
- `packages/db/src/rls/group-challenges.test.ts` — RLS isolation
- `apps/subgraph-core/src/challenges/group-challenge.service.spec.ts`
- `apps/subgraph-knowledge/src/peer-matching/peer-matching.service.spec.ts`
- `apps/web/src/pages/GroupChallengesPage.test.tsx`
- `apps/web/src/pages/PeerMatchingPage.test.tsx`
- `apps/web/e2e/group-challenges.spec.ts`
- `tests/security/group-challenges.spec.ts`

## Acceptance Criteria
- [ ] `pnpm turbo test` 100% pass
- [ ] `pnpm turbo typecheck` 0 errors
- [ ] `pnpm turbo lint` 0 errors
- [ ] Migration 0028 applies cleanly
- [ ] KG peer matching returns >= 1 result for seed data users
- [ ] Leaderboard shows correct ranking after score submissions
- [ ] All E2E specs pass
- [ ] Security gate: 0 failures
