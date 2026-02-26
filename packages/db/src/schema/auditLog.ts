import {
  pgTable,
  uuid,
  varchar,
  inet,
  text,
  jsonb,
  timestamp,
  index,
  pgPolicy,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

/**
 * Audit log table — records all data access and mutations for GDPR Art.32 + SOC2 CC7.2.
 * RLS: SUPER_ADMIN sees all, ORG_ADMIN/users see own tenant only.
 * Retention: 7 years minimum (SOC2 requirement).
 * This table is append-only — no UPDATE or DELETE policies are defined.
 */
export const auditLog = pgTable(
  'audit_log',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id').notNull(),
    userId: uuid('user_id'),
    action: varchar('action', { length: 100 }).notNull(),
    resourceType: varchar('resource_type', { length: 50 }),
    resourceId: uuid('resource_id'),
    oldValues: jsonb('old_values'),
    newValues: jsonb('new_values'),
    ipAddress: inet('ip_address'),
    userAgent: text('user_agent'),
    requestId: varchar('request_id', { length: 36 }),
    status: varchar('status', { length: 20 }).notNull().default('SUCCESS'),
    metadata: jsonb('metadata'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('audit_log_tenant_created_idx').on(table.tenantId, table.createdAt),
    index('audit_log_user_action_idx').on(
      table.userId,
      table.action,
      table.createdAt
    ),
    index('audit_log_resource_idx').on(table.resourceType, table.resourceId),
    pgPolicy('audit_log_rls', {
      using: sql`
        current_setting('app.current_user_role', TRUE) = 'SUPER_ADMIN'
        OR tenant_id::text = current_setting('app.current_tenant', TRUE)
      `,
    }),
  ]
).enableRLS();

export type AuditLog = typeof auditLog.$inferSelect;
export type NewAuditLog = typeof auditLog.$inferInsert;
