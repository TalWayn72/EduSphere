/**
 * Group Challenges + KG Peer Matching — Phase 46
 *
 * Tables:
 *  - group_challenges: collaborative learning objectives (tenant-scoped)
 *  - challenge_participants: scores and rankings per challenge
 *  - peer_match_requests: KG-based study partner requests
 *
 * RLS:
 *  - group_challenges: tenant isolation
 *  - challenge_participants: tenant isolation via FK join to group_challenges
 *  - peer_match_requests: tenant + participant isolation (requester OR matched_user)
 *
 * Security Invariant SI-1: uses app.current_user_id (NOT app.current_user)
 */
import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  timestamp,
  index,
  pgPolicy,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

// ---------------------------------------------------------------------------
// group_challenges — collaborative learning objectives
// ---------------------------------------------------------------------------

export const groupChallenges = pgTable(
  'group_challenges',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull(),
    title: varchar('title', { length: 200 }).notNull(),
    description: text('description'),
    courseId: uuid('course_id'),
    // QUIZ | PROJECT | DISCUSSION
    challengeType: varchar('challenge_type', { length: 20 })
      .notNull()
      .default('QUIZ'),
    targetScore: integer('target_score').notNull().default(100),
    startDate: timestamp('start_date', { withTimezone: true }).notNull(),
    endDate: timestamp('end_date', { withTimezone: true }).notNull(),
    maxParticipants: integer('max_participants').notNull().default(50),
    // DRAFT | ACTIVE | COMPLETED
    status: varchar('status', { length: 20 }).notNull().default('DRAFT'),
    createdBy: uuid('created_by').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index('idx_challenges_tenant_status').on(t.tenantId, t.status),
    index('idx_challenges_course').on(t.courseId),
    pgPolicy('challenges_tenant_isolation', {
      using: sql`tenant_id::text = current_setting('app.current_tenant', TRUE)`,
      withCheck: sql`tenant_id::text = current_setting('app.current_tenant', TRUE)`,
    }),
  ]
).enableRLS();

// ---------------------------------------------------------------------------
// challenge_participants — who joined, their score and rank
// ---------------------------------------------------------------------------

export const challengeParticipants = pgTable(
  'challenge_participants',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    challengeId: uuid('challenge_id')
      .notNull()
      .references(() => groupChallenges.id, { onDelete: 'cascade' }),
    userId: uuid('user_id').notNull(),
    score: integer('score').notNull().default(0),
    rank: integer('rank'),
    joinedAt: timestamp('joined_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    completedAt: timestamp('completed_at', { withTimezone: true }),
  },
  (t) => [
    index('idx_challenge_participants_challenge').on(t.challengeId),
    index('idx_challenge_participants_user').on(t.userId),
    pgPolicy('participants_isolation', {
      using: sql`EXISTS (
        SELECT 1 FROM group_challenges gc
        WHERE gc.id = challenge_id
        AND gc.tenant_id::text = current_setting('app.current_tenant', TRUE)
      )`,
      withCheck: sql`EXISTS (
        SELECT 1 FROM group_challenges gc
        WHERE gc.id = challenge_id
        AND gc.tenant_id::text = current_setting('app.current_tenant', TRUE)
      )`,
    }),
  ]
).enableRLS();

// ---------------------------------------------------------------------------
// peer_match_requests — KG-based study partner requests
// ---------------------------------------------------------------------------

export const peerMatchRequests = pgTable(
  'peer_match_requests',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull(),
    requesterId: uuid('requester_id').notNull(),
    matchedUserId: uuid('matched_user_id').notNull(),
    courseId: uuid('course_id'),
    matchReason: text('match_reason'),
    // PENDING | ACCEPTED | DECLINED
    status: varchar('status', { length: 20 }).notNull().default('PENDING'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index('idx_peer_match_tenant').on(t.tenantId),
    index('idx_peer_match_requester').on(t.requesterId),
    pgPolicy('peer_match_rls', {
      using: sql`
        tenant_id::text = current_setting('app.current_tenant', TRUE)
        AND (
          requester_id::text = current_setting('app.current_user_id', TRUE)
          OR matched_user_id::text = current_setting('app.current_user_id', TRUE)
        )
      `,
      withCheck: sql`
        tenant_id::text = current_setting('app.current_tenant', TRUE)
        AND requester_id::text = current_setting('app.current_user_id', TRUE)
      `,
    }),
  ]
).enableRLS();

// ---------------------------------------------------------------------------
// Inferred types
// ---------------------------------------------------------------------------

export type GroupChallenge = typeof groupChallenges.$inferSelect;
export type NewGroupChallenge = typeof groupChallenges.$inferInsert;

export type ChallengeParticipant = typeof challengeParticipants.$inferSelect;
export type NewChallengeParticipant = typeof challengeParticipants.$inferInsert;

export type PeerMatchRequest = typeof peerMatchRequests.$inferSelect;
export type NewPeerMatchRequest = typeof peerMatchRequests.$inferInsert;
