/**
 * user_skill_mastery — tracks per-user mastery level for each concept node
 * in the KnowledgeSkillTree (Session 26 — Learning Loop integration).
 *
 * RLS: users can only read and write their own mastery rows within their tenant.
 * Security Invariant SI-1: uses app.current_user_id (NOT app.current_user).
 *
 * Created by migration 0011_user_skill_mastery.sql
 */
import { pgTable, uuid, text, timestamp, primaryKey, pgPolicy, index } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const masteryLevels = ['NONE', 'ATTEMPTED', 'FAMILIAR', 'PROFICIENT', 'MASTERED'] as const;
export type MasteryLevel = (typeof masteryLevels)[number];

export const userSkillMastery = pgTable(
  'user_skill_mastery',
  {
    userId: uuid('user_id').notNull(),
    tenantId: uuid('tenant_id').notNull(),
    conceptId: uuid('concept_id').notNull(),
    masteryLevel: text('mastery_level').notNull().default('NONE'),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.tenantId, table.conceptId] }),
    index('idx_user_skill_mastery_user_tenant').on(table.userId, table.tenantId),
    index('idx_user_skill_mastery_concept').on(table.tenantId, table.conceptId),
    pgPolicy('user_skill_mastery_tenant_isolation', {
      for: 'all',
      using: sql`
        tenant_id = current_setting('app.current_tenant', TRUE)::uuid
        AND user_id = current_setting('app.current_user_id', TRUE)::uuid
      `,
      withCheck: sql`
        tenant_id = current_setting('app.current_tenant', TRUE)::uuid
        AND user_id = current_setting('app.current_user_id', TRUE)::uuid
      `,
    }),
  ]
).enableRLS();

export type UserSkillMastery = typeof userSkillMastery.$inferSelect;
export type NewUserSkillMastery = typeof userSkillMastery.$inferInsert;
