/**
 * B2B2C Partner Portal schema — Phase 52
 *
 * Tables:
 *   partners        — partner organizations (training companies, content creators, resellers)
 *   partner_revenue — monthly revenue share tracking
 *
 * RLS: partners are NOT tenant-scoped (they ARE tenants);
 *      partner_revenue uses partner_id-based access (SUPER_ADMIN only)
 */
import {
  pgTable,
  pgEnum,
  uuid,
  text,
  varchar,
  integer,
  timestamp,
  index,
  uniqueIndex,
  pgPolicy,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

// ---------------------------------------------------------------------------
// partner_type enum
// ---------------------------------------------------------------------------
export const partnerTypeEnum = pgEnum('partner_type', [
  'TRAINING_COMPANY',
  'CONTENT_CREATOR',
  'RESELLER',
  'SYSTEM_INTEGRATOR',
]);

export type PartnerType = (typeof partnerTypeEnum.enumValues)[number];

// ---------------------------------------------------------------------------
// partners — partner organizations (cross-tenant; SUPER_ADMIN access only)
// RLS: no tenant scoping — partners ARE the tenant-level entities
// ---------------------------------------------------------------------------
export const partners = pgTable(
  'partners',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').notNull(),
    type: partnerTypeEnum('type').notNull(),
    contactEmail: text('contact_email').notNull(),
    /** SHA-256 of actual API key — plaintext NEVER stored (SI-3 PII / key hygiene) */
    apiKeyHash: text('api_key_hash').notNull(),
    /** Set after approval; null while pending */
    tenantId: uuid('tenant_id'),
    /** Percentage EduSphere retains from gross revenue (e.g. 30 = 30%) */
    revSharePct: integer('rev_share_pct').notNull().default(30),
    /** pending | active | suspended */
    status: text('status').notNull().default('pending'),
    notes: text('notes'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    index('idx_partners_status').on(t.status),
    index('idx_partners_email').on(t.contactEmail),
    pgPolicy('partners_superadmin', {
      using: sql`current_setting('app.current_user_role', TRUE) = 'SUPER_ADMIN'`,
    }),
  ]
).enableRLS();

export type Partner = typeof partners.$inferSelect;
export type NewPartner = typeof partners.$inferInsert;

// ---------------------------------------------------------------------------
// partner_revenue — monthly revenue share records (SUPER_ADMIN only)
// ---------------------------------------------------------------------------
export const partnerRevenue = pgTable(
  'partner_revenue',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    partnerId: uuid('partner_id')
      .notNull()
      .references(() => partners.id, { onDelete: 'cascade' }),
    /** Format: YYYY-MM (e.g. "2026-03") */
    month: varchar('month', { length: 7 }).notNull(),
    /** Gross revenue in USD cents */
    grossRevUsd: integer('gross_rev_usd').notNull(),
    /** Platform cut in USD cents (grossRevUsd * revSharePct / 100) */
    platformCutUsd: integer('platform_cut_usd').notNull(),
    /** Partner payout in USD cents (grossRevUsd - platformCutUsd) */
    partnerPayoutUsd: integer('partner_payout_usd').notNull(),
    /** pending | paid */
    status: text('status').notNull().default('pending'),
    paidAt: timestamp('paid_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('partner_revenue_partner_month_unique').on(t.partnerId, t.month),
    index('idx_partner_revenue_partner').on(t.partnerId),
    index('idx_partner_revenue_month').on(t.month),
    pgPolicy('partner_revenue_superadmin', {
      using: sql`current_setting('app.current_user_role', TRUE) = 'SUPER_ADMIN'`,
    }),
  ]
).enableRLS();

export type PartnerRevenue = typeof partnerRevenue.$inferSelect;
export type NewPartnerRevenue = typeof partnerRevenue.$inferInsert;
