import {
  pgTable,
  pgEnum,
  uuid,
  boolean,
  varchar,
  inet,
  text,
  timestamp,
  unique,
  pgPolicy,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

/**
 * Consent types per GDPR Art.6 lawful basis categories.
 * ESSENTIAL: required for platform operation (no consent required — legitimate interest)
 * All others require explicit opt-in consent.
 */
export const consentTypeEnum = pgEnum('consent_type', [
  'ESSENTIAL',
  'ANALYTICS',
  'AI_PROCESSING',
  'THIRD_PARTY_LLM',
  'MARKETING',
  'RESEARCH',
]);

/**
 * User consent records — GDPR Art.7 proof of consent.
 * Each row represents the current consent state for one user+type combination.
 * Historical changes tracked via audit_log.
 */
export const userConsents = pgTable(
  'user_consents',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    tenantId: uuid('tenant_id').notNull(),
    userId: uuid('user_id').notNull(),
    consentType: consentTypeEnum('consent_type').notNull(),
    given: boolean('given').notNull(),
    givenAt: timestamp('given_at', { withTimezone: true }),
    withdrawnAt: timestamp('withdrawn_at', { withTimezone: true }),
    ipAddress: inet('ip_address'),
    userAgent: text('user_agent'),
    consentVersion: varchar('consent_version', { length: 20 }).notNull(),
    method: varchar('method', { length: 50 }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    unique('user_consents_user_type_unique').on(table.userId, table.consentType),
    pgPolicy('user_consents_rls', {
      using: sql`
        user_id::text = current_setting('app.current_user_id', TRUE)
        OR current_setting('app.current_user_role', TRUE) IN ('SUPER_ADMIN', 'ORG_ADMIN')
      `,
    }),
  ],
).enableRLS();

export type UserConsent = typeof userConsents.$inferSelect;
export type NewUserConsent = typeof userConsents.$inferInsert;
