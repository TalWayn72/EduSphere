import {
  pgTable,
  uuid,
  text,
  integer,
  boolean,
  timestamp,
  jsonb,
  index,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

// Breakout rooms for live sessions
export const breakoutRooms = pgTable(
  'breakout_rooms',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    sessionId: uuid('session_id').notNull(),
    tenantId: uuid('tenant_id').notNull(),
    roomName: text('room_name').notNull(),
    bbbBreakoutId: text('bbb_breakout_id'),
    capacity: integer('capacity').notNull().default(10),
    assignedUserIds: uuid('assigned_user_ids').array().notNull().default([]),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (t) => ({
    sessionIdx: index('breakout_rooms_session_idx').on(t.sessionId),
    tenantIdx: index('breakout_rooms_tenant_idx').on(t.tenantId),
  }),
);

// Polls created during sessions
export const sessionPolls = pgTable(
  'session_polls',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    sessionId: uuid('session_id').notNull(),
    tenantId: uuid('tenant_id').notNull(),
    question: text('question').notNull(),
    options: jsonb('options').notNull(), // string[] array
    isActive: boolean('is_active').notNull().default(false),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    closedAt: timestamp('closed_at'),
  },
  (t) => ({
    sessionIdx: index('session_polls_session_idx').on(t.sessionId),
    tenantIdx: index('session_polls_tenant_idx').on(t.tenantId),
  }),
);

// Individual vote records
export const pollVotes = pgTable(
  'poll_votes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    pollId: uuid('poll_id').notNull(),
    userId: uuid('user_id').notNull(),
    tenantId: uuid('tenant_id').notNull(),
    optionIndex: integer('option_index').notNull(),
    votedAt: timestamp('voted_at').notNull().defaultNow(),
  },
  (t) => ({
    pollUserIdx: index('poll_votes_poll_user_idx').on(t.pollId, t.userId),
    tenantIdx: index('poll_votes_tenant_idx').on(t.tenantId),
  }),
);

// RLS policies: users see polls/rooms for sessions they're in; moderators see all
export const liveSessionExtensionsRLS = sql`
ALTER TABLE breakout_rooms ENABLE ROW LEVEL SECURITY;

CREATE POLICY breakout_rooms_tenant_isolation ON breakout_rooms
  USING (tenant_id::text = current_setting('app.current_tenant', TRUE));

ALTER TABLE session_polls ENABLE ROW LEVEL SECURITY;

CREATE POLICY session_polls_tenant_isolation ON session_polls
  USING (tenant_id::text = current_setting('app.current_tenant', TRUE));

ALTER TABLE poll_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY poll_votes_tenant_isolation ON poll_votes
  USING (tenant_id::text = current_setting('app.current_tenant', TRUE));

CREATE POLICY poll_votes_user_isolation ON poll_votes
  USING (
    user_id::text = current_setting('app.current_user_id', TRUE)
    OR current_setting('app.current_user_role', TRUE) IN ('ORG_ADMIN', 'INSTRUCTOR', 'SUPER_ADMIN')
  );
`;

export type BreakoutRoom = typeof breakoutRooms.$inferSelect;
export type NewBreakoutRoom = typeof breakoutRooms.$inferInsert;
export type SessionPoll = typeof sessionPolls.$inferSelect;
export type NewSessionPoll = typeof sessionPolls.$inferInsert;
export type PollVote = typeof pollVotes.$inferSelect;
export type NewPollVote = typeof pollVotes.$inferInsert;
