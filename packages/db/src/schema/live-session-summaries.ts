import {
  pgTable,
  text,
  uuid,
  integer,
  jsonb,
  index,
  pgPolicy,
  unique,
  timestamp,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { pk, tenantId, timestamps } from './_shared';
import { tenants } from './tenants';
import { liveSessions } from './live-sessions';

// ─── Live Session Summaries ────────────────────────────────────────────────
// AI-generated post-session summaries. One record per session (UNIQUE on session_id).
export const live_session_summaries = pgTable(
  'live_session_summaries',
  {
    id: pk(),
    tenant_id: tenantId().references(() => tenants.id, { onDelete: 'cascade' }),
    session_id: uuid('session_id')
      .notNull()
      .references(() => liveSessions.id, { onDelete: 'cascade' }),
    summary: text('summary').notNull(),
    key_topics: jsonb('key_topics').notNull().default([]),
    jargon_terms: jsonb('jargon_terms').notNull().default([]),
    questions_asked: integer('questions_asked').notNull().default(0),
    peak_viewers: integer('peak_viewers').notNull().default(0),
    duration: integer('duration').notNull().default(0),
    generated_at: timestamp('generated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    ...timestamps,
  },
  (t) => [
    unique('live_session_summaries_session_unique').on(t.session_id),
    index('idx_live_session_summaries_tenant').on(t.tenant_id),
    index('idx_live_session_summaries_session').on(t.session_id),
    pgPolicy('live_session_summaries_tenant_isolation', {
      using: sql`tenant_id::text = current_setting('app.current_tenant', TRUE)`,
      withCheck: sql`tenant_id::text = current_setting('app.current_tenant', TRUE)`,
    }),
  ]
).enableRLS();

// ─── TypeScript Types ──────────────────────────────────────────────────────
export type LiveSessionSummary = typeof live_session_summaries.$inferSelect;
export type NewLiveSessionSummary = typeof live_session_summaries.$inferInsert;
