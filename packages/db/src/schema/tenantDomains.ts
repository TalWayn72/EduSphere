import {
  pgTable,
  uuid,
  varchar,
  boolean,
  timestamp,
} from 'drizzle-orm/pg-core';
import { tenants } from './tenants';

/**
 * Custom domain management for white-label tenants (G-20, G-21).
 * Each tenant can have a subdomain (slug.edusphere.io) or custom domain (learn.client.com).
 */
export const tenantDomains = pgTable('tenant_domains', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id')
    .references(() => tenants.id)
    .notNull(),
  domain: varchar('domain', { length: 255 }).unique().notNull(),
  domainType: varchar('domain_type', { length: 20 })
    .notNull()
    .default('SUBDOMAIN'), // 'SUBDOMAIN' | 'CUSTOM'
  verified: boolean('verified').notNull().default(false),
  verificationToken: varchar('verification_token', { length: 64 }),
  sslProvisioned: boolean('ssl_provisioned').notNull().default(false),
  keycloakRealm: varchar('keycloak_realm', { length: 100 }), // 'edusphere-{slug}' or 'edusphere'
  createdAt: timestamp('created_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .defaultNow()
    .notNull(),
});
