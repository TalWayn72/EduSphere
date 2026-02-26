import {
  pgTable,
  uuid,
  varchar,
  integer,
  boolean,
  timestamp,
  pgPolicy,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

/**
 * Data retention policies — GDPR Art.5(e) storage limitation.
 * Defines how long each entity type is kept before hard-delete or anonymization.
 * Per-tenant configurable; defaults applied from RETENTION_DEFAULTS below.
 */
export const dataRetentionPolicies = pgTable(
  'data_retention_policies',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id'),
    entityType: varchar('entity_type', { length: 50 }).notNull(),
    retentionDays: integer('retention_days').notNull(),
    deleteMode: varchar('delete_mode', { length: 20 })
      .notNull()
      .default('HARD_DELETE'),
    enabled: boolean('enabled').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    pgPolicy('retention_policies_rls', {
      using: sql`
        tenant_id IS NULL
        OR tenant_id::text = current_setting('app.current_tenant', TRUE)
        OR current_setting('app.current_user_role', TRUE) = 'SUPER_ADMIN'
      `,
    }),
  ]
).enableRLS();

/** Default retention periods (days) — GDPR data minimization defaults */
export const RETENTION_DEFAULTS: Record<
  string,
  { days: number; mode: 'HARD_DELETE' | 'ANONYMIZE' }
> = {
  AGENT_MESSAGES: { days: 90, mode: 'HARD_DELETE' },
  AGENT_SESSIONS: { days: 90, mode: 'HARD_DELETE' },
  USER_PROGRESS: { days: 2555, mode: 'HARD_DELETE' }, // 7 years — educational records
  ANNOTATIONS: { days: 2555, mode: 'HARD_DELETE' }, // 7 years
  DISCUSSION_POSTS: { days: 1095, mode: 'ANONYMIZE' }, // 3 years — preserve forum integrity
  AUDIT_LOG: { days: 2555, mode: 'HARD_DELETE' }, // 7 years — SOC2 requirement
  COLLABORATION_CRDT: { days: 30, mode: 'HARD_DELETE' },
};

export type DataRetentionPolicy = typeof dataRetentionPolicies.$inferSelect;
export type NewDataRetentionPolicy = typeof dataRetentionPolicies.$inferInsert;
