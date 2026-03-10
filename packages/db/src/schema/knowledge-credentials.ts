/**
 * Phase 47: Knowledge Graph Credentials
 *
 * chavruta_partner_sessions — tracks paired Chavruta debate sessions (GAP-3)
 * knowledge_path_credentials — links badge assertions to KG path coverage (GAP-8)
 *
 * RLS:
 *   - chavruta_partner_sessions: tenant isolation + participant access (initiator OR partner)
 *   - knowledge_path_credentials: tenant isolation + owner access
 *
 * Security Invariant SI-1: uses app.current_user_id (NOT app.current_user)
 */
import {
  pgTable,
  uuid,
  text,
  real,
  integer,
  timestamp,
  jsonb,
  varchar,
  index,
  pgPolicy,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { openBadgeAssertions } from './open-badges';

// ---------------------------------------------------------------------------
// chavruta_partner_sessions — GAP-3: Chavruta debate partner matching
// ---------------------------------------------------------------------------

export const chavrutaPartnerSessions = pgTable(
  'chavruta_partner_sessions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull(),
    initiatorId: uuid('initiator_id').notNull(),
    partnerId: uuid('partner_id').notNull(),
    courseId: uuid('course_id'),
    topic: text('topic').notNull(),
    matchReason: text('match_reason'),
    // PENDING | ACTIVE | COMPLETED | DECLINED
    status: varchar('status', { length: 20 }).notNull().default('PENDING'),
    agentSessionId: uuid('agent_session_id'),
    initiatedAt: timestamp('initiated_at', { withTimezone: true }).notNull().defaultNow(),
    startedAt: timestamp('started_at', { withTimezone: true }),
    completedAt: timestamp('completed_at', { withTimezone: true }),
  },
  (t) => [
    index('idx_chavruta_partner_sessions_initiator').on(t.initiatorId),
    index('idx_chavruta_partner_sessions_partner').on(t.partnerId),
    index('idx_chavruta_partner_sessions_tenant_status').on(t.tenantId, t.status),
    pgPolicy('chavruta_partner_sessions_tenant_isolation', {
      using: sql`tenant_id::text = current_setting('app.current_tenant', TRUE)`,
      withCheck: sql`tenant_id::text = current_setting('app.current_tenant', TRUE)`,
    }),
    pgPolicy('chavruta_partner_sessions_participant_access', {
      using: sql`
        initiator_id::text = current_setting('app.current_user_id', TRUE)
        OR partner_id::text = current_setting('app.current_user_id', TRUE)
      `,
    }),
  ]
).enableRLS();

// ---------------------------------------------------------------------------
// knowledge_path_credentials — GAP-8: Graph-grounded micro-credentials
// ---------------------------------------------------------------------------

export const knowledgePathCredentials = pgTable(
  'knowledge_path_credentials',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull(),
    userId: uuid('user_id').notNull(),
    badgeAssertionId: uuid('badge_assertion_id')
      .notNull()
      .references(() => openBadgeAssertions.id, { onDelete: 'cascade' }),
    // AGE concept node IDs covered by this credential
    conceptIds: text('concept_ids')
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    // number of hops in concept graph
    pathDepth: integer('path_depth').notNull().default(0),
    // 0.0-1.0 fraction of required concepts mastered
    coverageScore: real('coverage_score').notNull().default(0),
    // minimum mastery required per concept
    masteryThreshold: real('mastery_threshold').notNull().default(0.7),
    verifiedAt: timestamp('verified_at', { withTimezone: true }).notNull().defaultNow(),
    metadata: jsonb('metadata').notNull().default({}),
  },
  (t) => [
    index('idx_knowledge_path_credentials_user').on(t.userId),
    index('idx_knowledge_path_credentials_badge').on(t.badgeAssertionId),
    pgPolicy('knowledge_path_credentials_tenant', {
      using: sql`tenant_id::text = current_setting('app.current_tenant', TRUE)`,
      withCheck: sql`tenant_id::text = current_setting('app.current_tenant', TRUE)`,
    }),
    pgPolicy('knowledge_path_credentials_owner', {
      using: sql`
        user_id::text = current_setting('app.current_user_id', TRUE)
        OR current_setting('app.current_user_role', TRUE) IN ('SUPER_ADMIN', 'ORG_ADMIN', 'INSTRUCTOR')
      `,
    }),
  ]
).enableRLS();

// ---------------------------------------------------------------------------
// Inferred types
// ---------------------------------------------------------------------------

export type ChavrutaPartnerSession = typeof chavrutaPartnerSessions.$inferSelect;
export type NewChavrutaPartnerSession = typeof chavrutaPartnerSessions.$inferInsert;

export type KnowledgePathCredential = typeof knowledgePathCredentials.$inferSelect;
export type NewKnowledgePathCredential = typeof knowledgePathCredentials.$inferInsert;
