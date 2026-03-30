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

/**
 * GDPR Erasure Log — cryptographic proof that user data was erased.
 *
 * Stores a SHA-256 hash of the erasure manifest (table names + row counts)
 * plus a signed JWT verification token. The user_id is stored as a hash
 * (not plaintext) so the log itself does not contain PII.
 *
 * Append-only: no UPDATE or DELETE policies. Retained for 7 years (SOC2).
 * RLS: only SUPER_ADMIN or same-tenant ORG_ADMIN can read.
 */
export const gdprErasureLog = pgTable(
  'gdpr_erasure_log',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userIdHash: varchar('user_id_hash', { length: 64 }).notNull(),
    tenantId: uuid('tenant_id').notNull(),
    requestedAt: timestamp('requested_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    tablesAffected: text('tables_affected').array().notNull(),
    rowsDeletedCount: integer('rows_deleted_count').notNull().default(0),
    erasureHash: varchar('erasure_hash', { length: 64 }).notNull(),
    verificationToken: text('verification_token').notNull(),
    requestedBy: uuid('requested_by').notNull(),
    status: varchar('status', { length: 20 }).notNull().default('COMPLETED'),
  },
  (table) => [
    index('gdpr_erasure_log_tenant_idx').on(table.tenantId),
    index('gdpr_erasure_log_user_hash_idx').on(table.userIdHash),
    index('gdpr_erasure_log_requested_at_idx').on(table.requestedAt),
    pgPolicy('gdpr_erasure_log_rls', {
      using: sql`
        current_setting('app.current_user_role', TRUE) = 'SUPER_ADMIN'
        OR tenant_id::text = current_setting('app.current_tenant', TRUE)
      `,
    }),
  ]
).enableRLS();

export type GdprErasureLog = typeof gdprErasureLog.$inferSelect;
export type NewGdprErasureLog = typeof gdprErasureLog.$inferInsert;
