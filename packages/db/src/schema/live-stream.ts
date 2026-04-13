import {
  pgTable,
  text,
  uuid,
  integer,
  boolean,
  numeric,
  jsonb,
  index,
  pgPolicy,
  unique,
  timestamp,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { pk, tenantId, timestamps } from './_shared';
import { tenants } from './tenants';
import { users } from './core';
import { lessons } from './lesson';
import { liveSessions } from './live-sessions';

// ─── Live Session Configs ──────────────────────────────────────────────────
// Extended stream configuration per live session (stream type, LiveKit, recording).
export const live_session_configs = pgTable(
  'live_session_configs',
  {
    id: pk(),
    tenant_id: tenantId().references(() => tenants.id, { onDelete: 'cascade' }),
    session_id: uuid('session_id')
      .notNull()
      .references(() => liveSessions.id, { onDelete: 'cascade' }),
    stream_type: text('stream_type').notNull().default('BBB'),
    stream_url: text('stream_url'),
    livekit_room_id: text('livekit_room_id'),
    recording_key: text('recording_key'),
    lesson_id: uuid('lesson_id').references(() => lessons.id, {
      onDelete: 'set null',
    }),
    instructor_id: uuid('instructor_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    viewer_count: integer('viewer_count').notNull().default(0),
    max_viewers: integer('max_viewers').notNull().default(0),
    auto_record: boolean('auto_record').notNull().default(true),
    is_screen_sharing: boolean('is_screen_sharing').notNull().default(false),
    ...timestamps,
  },
  (t) => [
    unique('live_session_configs_session_unique').on(t.session_id),
    index('idx_live_session_configs_tenant').on(t.tenant_id),
    index('idx_live_session_configs_session').on(t.session_id),
    pgPolicy('live_session_configs_tenant_isolation', {
      using: sql`tenant_id::text = current_setting('app.current_tenant', TRUE)`,
      withCheck: sql`tenant_id::text = current_setting('app.current_tenant', TRUE)`,
    }),
  ]
).enableRLS();

// ─── Live Chat Messages ────────────────────────────────────────────────────
// message_type: TEXT | REACTION | SYSTEM | PINNED
export const live_chat_messages = pgTable(
  'live_chat_messages',
  {
    id: pk(),
    tenant_id: tenantId().references(() => tenants.id, { onDelete: 'cascade' }),
    session_id: uuid('session_id').notNull(),
    user_id: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    content: text('content').notNull(),
    message_type: text('message_type').notNull().default('TEXT'),
    reply_to_id: uuid('reply_to_id'),
    is_pinned: boolean('is_pinned').notNull().default(false),
    is_deleted: boolean('is_deleted').notNull().default(false),
    ...timestamps,
  },
  (t) => [
    index('idx_live_chat_session_created').on(t.session_id, t.created_at),
    index('idx_live_chat_session_user').on(t.session_id, t.user_id),
    pgPolicy('live_chat_messages_tenant_isolation', {
      using: sql`tenant_id::text = current_setting('app.current_tenant', TRUE)`,
      withCheck: sql`tenant_id::text = current_setting('app.current_tenant', TRUE)`,
    }),
  ]
).enableRLS();

// ─── Live Reactions ────────────────────────────────────────────────────────
export const live_reactions = pgTable(
  'live_reactions',
  {
    id: pk(),
    tenant_id: tenantId().references(() => tenants.id, { onDelete: 'cascade' }),
    session_id: uuid('session_id').notNull(),
    user_id: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    emoji: text('emoji').notNull(),
    stream_ts: numeric('stream_ts', { precision: 10, scale: 3 }),
    created_at: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index('idx_live_reactions_session_ts').on(t.session_id, t.stream_ts),
    index('idx_live_reactions_session_user').on(t.session_id, t.user_id),
    pgPolicy('live_reactions_tenant_isolation', {
      using: sql`tenant_id::text = current_setting('app.current_tenant', TRUE)`,
      withCheck: sql`tenant_id::text = current_setting('app.current_tenant', TRUE)`,
    }),
  ]
).enableRLS();

// ─── Live Q&A Questions ────────────────────────────────────────────────────
// status: PENDING | ANSWERED | DISMISSED
export const live_qa_questions = pgTable(
  'live_qa_questions',
  {
    id: pk(),
    tenant_id: tenantId().references(() => tenants.id, { onDelete: 'cascade' }),
    session_id: uuid('session_id').notNull(),
    user_id: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    question: text('question').notNull(),
    upvotes: integer('upvotes').notNull().default(0),
    status: text('status').notNull().default('PENDING'),
    answer: text('answer'),
    stream_ts: numeric('stream_ts', { precision: 10, scale: 3 }),
    answered_at: timestamp('answered_at', { withTimezone: true }),
    ...timestamps,
  },
  (t) => [
    index('idx_live_qa_session_status').on(t.session_id, t.status),
    index('idx_live_qa_session_created').on(t.session_id, t.created_at),
    pgPolicy('live_qa_questions_tenant_isolation', {
      using: sql`tenant_id::text = current_setting('app.current_tenant', TRUE)`,
      withCheck: sql`tenant_id::text = current_setting('app.current_tenant', TRUE)`,
    }),
  ]
).enableRLS();

// ─── Live Session Presence ─────────────────────────────────────────────────
export const live_session_presence = pgTable(
  'live_session_presence',
  {
    id: pk(),
    tenant_id: tenantId().references(() => tenants.id, { onDelete: 'cascade' }),
    session_id: uuid('session_id').notNull(),
    user_id: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    joined_at: timestamp('joined_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    left_at: timestamp('left_at', { withTimezone: true }),
    is_active: boolean('is_active').notNull().default(true),
    ...timestamps,
  },
  (t) => [
    unique('live_session_presence_session_user_unique').on(
      t.session_id,
      t.user_id
    ),
    index('idx_live_presence_session_active').on(t.session_id, t.is_active),
    pgPolicy('live_session_presence_tenant_isolation', {
      using: sql`tenant_id::text = current_setting('app.current_tenant', TRUE)`,
      withCheck: sql`tenant_id::text = current_setting('app.current_tenant', TRUE)`,
    }),
  ]
).enableRLS();

// ─── Live Bookmarks ────────────────────────────────────────────────────────
// RLS: users see own bookmarks; instructors/admins see all.
export const live_bookmarks = pgTable(
  'live_bookmarks',
  {
    id: pk(),
    tenant_id: tenantId().references(() => tenants.id, { onDelete: 'cascade' }),
    session_id: uuid('session_id').notNull(),
    user_id: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    stream_ts: numeric('stream_ts', { precision: 10, scale: 3 }).notNull(),
    label: text('label'),
    note: text('note'),
    ...timestamps,
  },
  (t) => [
    index('idx_live_bookmarks_session_user').on(t.session_id, t.user_id),
    index('idx_live_bookmarks_user_ts').on(t.user_id, t.stream_ts),
    pgPolicy('live_bookmarks_tenant_isolation', {
      using: sql`tenant_id::text = current_setting('app.current_tenant', TRUE)`,
      withCheck: sql`tenant_id::text = current_setting('app.current_tenant', TRUE)`,
    }),
    pgPolicy('live_bookmarks_user_isolation', {
      using: sql`
        user_id::text = current_setting('app.current_user_id', TRUE)
        OR current_setting('app.current_user_role', TRUE)
          IN ('INSTRUCTOR', 'ORG_ADMIN', 'SUPER_ADMIN')
      `,
    }),
  ]
).enableRLS();

// ─── Live Transcript Segments ──────────────────────────────────────────────
export const live_transcript_segments = pgTable(
  'live_transcript_segments',
  {
    id: pk(),
    tenant_id: tenantId().references(() => tenants.id, { onDelete: 'cascade' }),
    session_id: uuid('session_id').notNull(),
    segment_index: integer('segment_index').notNull(),
    text: text('text').notNull(),
    start_time: numeric('start_time', { precision: 10, scale: 3 }),
    end_time: numeric('end_time', { precision: 10, scale: 3 }),
    is_final: boolean('is_final').notNull().default(false),
    speaker: text('speaker'),
    jargon_hits: jsonb('jargon_hits').notNull().default([]),
    created_at: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index('idx_live_transcript_session_index').on(
      t.session_id,
      t.segment_index
    ),
    index('idx_live_transcript_session_time').on(t.session_id, t.start_time),
    pgPolicy('live_transcript_segments_tenant_isolation', {
      using: sql`tenant_id::text = current_setting('app.current_tenant', TRUE)`,
      withCheck: sql`tenant_id::text = current_setting('app.current_tenant', TRUE)`,
    }),
  ]
).enableRLS();

// ─── Live Q&A Upvotes ──────────────────────────────────────────────────────
export const live_qa_upvotes = pgTable(
  'live_qa_upvotes',
  {
    id: pk(),
    tenant_id: tenantId().references(() => tenants.id, { onDelete: 'cascade' }),
    question_id: uuid('question_id')
      .notNull()
      .references(() => live_qa_questions.id, { onDelete: 'cascade' }),
    user_id: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    created_at: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    unique('live_qa_upvotes_question_user_unique').on(
      t.question_id,
      t.user_id
    ),
    index('idx_live_qa_upvotes_question').on(t.question_id),
    pgPolicy('live_qa_upvotes_tenant_isolation', {
      using: sql`tenant_id::text = current_setting('app.current_tenant', TRUE)`,
      withCheck: sql`tenant_id::text = current_setting('app.current_tenant', TRUE)`,
    }),
  ]
).enableRLS();

// ─── TypeScript Types ──────────────────────────────────────────────────────
export type LiveSessionConfig = typeof live_session_configs.$inferSelect;
export type NewLiveSessionConfig = typeof live_session_configs.$inferInsert;

export type LiveChatMessage = typeof live_chat_messages.$inferSelect;
export type NewLiveChatMessage = typeof live_chat_messages.$inferInsert;

export type LiveReaction = typeof live_reactions.$inferSelect;
export type NewLiveReaction = typeof live_reactions.$inferInsert;

export type LiveQaQuestion = typeof live_qa_questions.$inferSelect;
export type NewLiveQaQuestion = typeof live_qa_questions.$inferInsert;

export type LiveSessionPresence = typeof live_session_presence.$inferSelect;
export type NewLiveSessionPresence = typeof live_session_presence.$inferInsert;

export type LiveBookmark = typeof live_bookmarks.$inferSelect;
export type NewLiveBookmark = typeof live_bookmarks.$inferInsert;

export type LiveTranscriptSegment = typeof live_transcript_segments.$inferSelect;
export type NewLiveTranscriptSegment =
  typeof live_transcript_segments.$inferInsert;

export type LiveQaUpvote = typeof live_qa_upvotes.$inferSelect;
export type NewLiveQaUpvote = typeof live_qa_upvotes.$inferInsert;
