/**
 * Custom Domains — F-03 Subdomain Provisioning
 * Stores custom domain records with verification + SSL status per tenant.
 *
 * RLS: tenant-scoped via `tenant_id`
 * SI-1: uses app.current_tenant (NOT app.current_user)
 */
import {
  pgTable,
  uuid,
  varchar,
  timestamp,
  index,
  uniqueIndex,
  pgPolicy,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { tenants } from './tenants';

export const customDomains = pgTable(
  'custom_domains',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    domain: varchar('domain', { length: 255 }).notNull().unique(),
    verificationToken: varchar('verification_token', { length: 64 }),
    verificationRecordType: varchar('verification_record_type', { length: 10 })
      .default('TXT'),
    verifiedAt: timestamp('verified_at', { withTimezone: true }),
    sslStatus: varchar('ssl_status', { length: 20 })
      .notNull()
      .default('pending'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index('idx_custom_domains_tenant').on(t.tenantId),
    uniqueIndex('idx_custom_domains_domain').on(t.domain),
    pgPolicy('custom_domains_tenant_isolation', {
      using: sql`tenant_id::text = current_setting('app.current_tenant', TRUE)`,
      withCheck: sql`tenant_id::text = current_setting('app.current_tenant', TRUE)`,
    }),
  ]
).enableRLS();

export type CustomDomain = typeof customDomains.$inferSelect;
export type NewCustomDomain = typeof customDomains.$inferInsert;
