/**
 * OpenBadges 3.0 tables — W3C Verifiable Credentials with Ed25519 proofs (F-025)
 * RLS: users see own assertions; admins see all in tenant.
 */
import {
  pgTable,
  uuid,
  text,
  timestamp,
  boolean,
  jsonb,
  index,
  pgPolicy,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

// ── Badge definitions (issuer-managed: one per tenant or platform) ─────────────
export const openBadgeDefinitions = pgTable(
  'open_badge_definitions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull(),
    name: text('name').notNull(),
    description: text('description').notNull(),
    imageUrl: text('image_url'),
    criteriaUrl: text('criteria_url'),
    tags: text('tags').array().notNull().default(sql`'{}'::text[]`),
    version: text('version').notNull().default('3.0'),
    issuerId: text('issuer_id').notNull(), // DID or URL for the issuer
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('open_badge_definitions_tenant_idx').on(t.tenantId),
    pgPolicy('open_badge_definitions_rls', {
      using: sql`
        tenant_id::text = current_setting('app.current_tenant', TRUE)
        AND (
          current_setting('app.current_user_role', TRUE) IN ('SUPER_ADMIN', 'ORG_ADMIN', 'INSTRUCTOR')
          OR current_setting('app.current_user_role', TRUE) = 'STUDENT'
        )
      `,
      withCheck: sql`tenant_id::text = current_setting('app.current_tenant', TRUE)`,
    }),
  ],
).enableRLS();

export type OpenBadgeDefinition = typeof openBadgeDefinitions.$inferSelect;
export type NewOpenBadgeDefinition = typeof openBadgeDefinitions.$inferInsert;

// ── Badge assertion instances — one per earned credential ─────────────────────
export const openBadgeAssertions = pgTable(
  'open_badge_assertions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    badgeDefinitionId: uuid('badge_definition_id').notNull().references(() => openBadgeDefinitions.id),
    recipientId: uuid('recipient_id').notNull(),
    tenantId: uuid('tenant_id').notNull(),
    issuedAt: timestamp('issued_at', { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp('expires_at', { withTimezone: true }),
    evidenceUrl: text('evidence_url'),
    // JSON-LD proof object: { type, created, verificationMethod, proofPurpose, proofValue }
    proof: jsonb('proof').notNull(),
    revoked: boolean('revoked').notNull().default(false),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    revokedReason: text('revoked_reason'),
  },
  (t) => [
    index('open_badge_assertions_recipient_idx').on(t.recipientId),
    index('open_badge_assertions_tenant_idx').on(t.tenantId),
    pgPolicy('open_badge_assertions_rls', {
      using: sql`
        tenant_id::text = current_setting('app.current_tenant', TRUE)
        AND (
          recipient_id::text = current_setting('app.current_user_id', TRUE)
          OR current_setting('app.current_user_role', TRUE) IN ('SUPER_ADMIN', 'ORG_ADMIN', 'INSTRUCTOR')
        )
      `,
      withCheck: sql`tenant_id::text = current_setting('app.current_tenant', TRUE)`,
    }),
  ],
).enableRLS();

export type OpenBadgeAssertion = typeof openBadgeAssertions.$inferSelect;
export type NewOpenBadgeAssertion = typeof openBadgeAssertions.$inferInsert;
