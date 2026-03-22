/**
 * API Keys — FEAT-ORG-ONBOARDING Phase 1
 * Per-tenant API key management with bcrypt-hashed storage.
 *
 * RLS: tenant-scoped + ORG_ADMIN-only access
 * SI-1: uses app.current_tenant + app.current_user_role
 * Security: key_hash stores bcrypt, never plaintext
 */
import {
  pgTable,
  uuid,
  varchar,
  integer,
  boolean,
  timestamp,
  index,
  pgPolicy,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { tenants } from './tenants';

export const apiKeys = pgTable(
  'api_keys',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id),
    name: varchar('name', { length: 200 }).notNull(),
    /** bcrypt hash of the plaintext key — never store plaintext */
    keyHash: varchar('key_hash', { length: 128 }).notNull(),
    /** First 8 chars for identification (e.g., "esk_live") */
    keyPrefix: varchar('key_prefix', { length: 8 }).notNull(),
    /** e.g., ['courses:read', 'users:read', 'analytics:read'] */
    scopes: varchar('scopes', { length: 50 }).array().notNull().default([]),
    rateLimitPerMinute: integer('rate_limit_per_minute')
      .notNull()
      .default(60),
    lastUsedAt: timestamp('last_used_at', { withTimezone: true }),
    expiresAt: timestamp('expires_at', { withTimezone: true }),
    isActive: boolean('is_active').notNull().default(true),
    createdBy: uuid('created_by').notNull(),
    created_at: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    index('idx_api_keys_tenant').on(t.tenantId),
    index('idx_api_keys_prefix').on(t.keyPrefix),
    index('idx_api_keys_active').on(t.isActive),
    /** Only ORG_ADMIN and SUPER_ADMIN can manage API keys */
    pgPolicy('api_keys_tenant_isolation', {
      using: sql`
        tenant_id::text = current_setting('app.current_tenant', TRUE)
        AND current_setting('app.current_user_role', TRUE) IN ('ORG_ADMIN', 'SUPER_ADMIN')
      `,
      withCheck: sql`tenant_id::text = current_setting('app.current_tenant', TRUE)`,
    }),
  ]
).enableRLS();

export type ApiKey = typeof apiKeys.$inferSelect;
export type NewApiKey = typeof apiKeys.$inferInsert;
