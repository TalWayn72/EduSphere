/**
 * Tenant Audit Log — F-10 Content Isolation Audit
 *
 * Fine-grained per-tenant audit trail for all GraphQL mutations.
 * GDPR Art.32 + SOC2 CC7.2 compliance.
 *
 * RLS: tenant-scoped via tenant_id = app.current_tenant
 * SI-1: uses app.current_tenant (NOT app.current_user)
 */
import {
  pgTable,
  uuid,
  varchar,
  jsonb,
  timestamp,
  index,
  pgPolicy,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { tenants } from './tenants';

export const tenantAuditLog = pgTable(
  'tenant_audit_log',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id),
    actorId: uuid('actor_id'),
    action: varchar('action', { length: 50 }).notNull(),
    resourceType: varchar('resource_type', { length: 50 }),
    resourceId: uuid('resource_id'),
    metadata: jsonb('metadata'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('idx_tenant_audit_log_tenant_created').on(
      table.tenantId,
      table.createdAt
    ),
    index('idx_tenant_audit_log_action').on(table.tenantId, table.action),
    pgPolicy('tenant_audit_log_tenant_isolation', {
      using: sql`tenant_id::text = current_setting('app.current_tenant', TRUE)`,
    }),
  ]
).enableRLS();

export type TenantAuditLog = typeof tenantAuditLog.$inferSelect;
export type NewTenantAuditLog = typeof tenantAuditLog.$inferInsert;
