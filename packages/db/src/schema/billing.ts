/**
 * B2B Billing, Subscription & YAU Counting schema — Phase 50
 *
 * Tables:
 *   subscription_plans   — platform-level plan catalogue (SUPER_ADMIN only, no RLS)
 *   tenant_subscriptions — per-tenant active subscription (RLS on tenant_id)
 *   yau_events           — Yearly Active User tracking (RLS on tenant_id)
 *   pilot_requests       — public B2B pilot sign-up queue (no RLS)
 *   usage_snapshots      — monthly billing snapshots for invoicing (RLS on tenant_id)
 *
 * RLS invariant: `tenant_id::text = current_setting('app.current_tenant', TRUE)`
 * SI-1 enforced: uses app.current_user_id (NOT app.current_user)
 */
import {
  pgTable,
  uuid,
  varchar,
  integer,
  boolean,
  timestamp,
  jsonb,
  text,
  date,
  numeric,
  index,
  uniqueIndex,
  pgPolicy,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

// ---------------------------------------------------------------------------
// subscription_plans — platform-level plan catalogue
// No RLS: readable by all authenticated users, writable by SUPER_ADMIN only
// ---------------------------------------------------------------------------

export const subscriptionPlans = pgTable(
  'subscription_plans',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: varchar('name', { length: 100 }).notNull(),
    priceUsdCents: integer('price_usd_cents').notNull(),
    // 12 = annual, 1 = monthly
    billingPeriodMonths: integer('billing_period_months').notNull().default(12),
    // null means unlimited
    maxYau: integer('max_yau'),
    // feature flags, e.g. { "sso": true, "api_access": true }
    features: jsonb('features').notNull().default({}),
    isActive: boolean('is_active').notNull().default(true),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    index('idx_subscription_plans_active').on(t.isActive),
  ]
);

export type SubscriptionPlan = typeof subscriptionPlans.$inferSelect;
export type NewSubscriptionPlan = typeof subscriptionPlans.$inferInsert;

// ---------------------------------------------------------------------------
// tenant_subscriptions — one active subscription record per tenant
// RLS: tenant-scoped access; SUPER_ADMIN sees all
// ---------------------------------------------------------------------------

export const tenantSubscriptions = pgTable(
  'tenant_subscriptions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull(),
    planId: uuid('plan_id').notNull().references(() => subscriptionPlans.id),
    // trialing | active | past_due | canceled | pilot
    status: varchar('status', { length: 20 }).notNull().default('trialing'),
    // null unless status = 'pilot'
    pilotEndsAt: timestamp('pilot_ends_at', { withTimezone: true }),
    currentPeriodStart: timestamp('current_period_start', { withTimezone: true }).notNull(),
    currentPeriodEnd: timestamp('current_period_end', { withTimezone: true }).notNull(),
    // Stripe sync fields — nullable for manual/pilot subscriptions
    stripeSubscriptionId: varchar('stripe_subscription_id', { length: 255 }),
    stripeCustomerId: varchar('stripe_customer_id', { length: 255 }),
    // per-tenant YAU override (null = use plan default)
    maxYau: integer('max_yau'),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    index('idx_tenant_subscriptions_tenant').on(t.tenantId),
    index('idx_tenant_subscriptions_status').on(t.status),
    index('idx_tenant_subscriptions_stripe_sub').on(t.stripeSubscriptionId),
    pgPolicy('tenant_subscriptions_tenant_isolation', {
      using: sql`tenant_id::text = current_setting('app.current_tenant', TRUE)`,
      withCheck: sql`tenant_id::text = current_setting('app.current_tenant', TRUE)`,
    }),
    pgPolicy('tenant_subscriptions_admin_write', {
      using: sql`
        tenant_id::text = current_setting('app.current_tenant', TRUE)
        OR current_setting('app.current_user_role', TRUE) = 'SUPER_ADMIN'
      `,
    }),
  ]
).enableRLS();

export type TenantSubscription = typeof tenantSubscriptions.$inferSelect;
export type NewTenantSubscription = typeof tenantSubscriptions.$inferInsert;

// ---------------------------------------------------------------------------
// yau_events — Yearly Active User tracking
// RLS: tenant-scoped; one row per (tenant, user, year)
// ---------------------------------------------------------------------------

export const yauEvents = pgTable(
  'yau_events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull(),
    userId: uuid('user_id').notNull(),
    // Calendar year, e.g. 2026
    year: integer('year').notNull(),
    // Timestamp of first meaningful action in this year
    firstActiveAt: timestamp('first_active_at', { withTimezone: true }).notNull().defaultNow(),
    // Updated on every meaningful action
    lastActiveAt: timestamp('last_active_at', { withTimezone: true }).notNull().defaultNow(),
    // true once this user has been counted toward the YAU limit
    isCounted: boolean('is_counted').notNull().default(false),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    uniqueIndex('yau_events_tenant_user_year_unique').on(t.tenantId, t.userId, t.year),
    index('idx_yau_events_tenant_year').on(t.tenantId, t.year),
    index('idx_yau_events_user').on(t.userId),
    index('idx_yau_events_is_counted').on(t.tenantId, t.isCounted),
    pgPolicy('yau_events_tenant_isolation', {
      using: sql`tenant_id::text = current_setting('app.current_tenant', TRUE)`,
      withCheck: sql`tenant_id::text = current_setting('app.current_tenant', TRUE)`,
    }),
    // SC-06 (T-06): Fix cross-tenant RLS NULL bypass.
    // The original yau_events_admin_read used OR between user-level and role-level
    // checks, which allowed the admin role check to bypass the tenant_isolation policy.
    // Split into three separate policies so admin reads are still tenant-scoped:
    //   1. User self-read: user can see their own events within their tenant.
    //   2. ORG_ADMIN tenant-scoped read: ORG_ADMIN sees all events for their tenant only.
    //   3. SUPER_ADMIN platform-wide read: SUPER_ADMIN can see all events across tenants.
    // Policies are evaluated with OR between policies (PostgreSQL default for PERMISSIVE),
    // but each policy is internally conjunctive with the base tenant_isolation for non-SA.
    pgPolicy('yau_events_user_self_read', {
      for: 'select',
      using: sql`
        tenant_id::text = current_setting('app.current_tenant', TRUE)
        AND user_id::text = current_setting('app.current_user_id', TRUE)
      `,
    }),
    pgPolicy('yau_events_org_admin_tenant_read', {
      for: 'select',
      using: sql`
        tenant_id::text = current_setting('app.current_tenant', TRUE)
        AND current_setting('app.current_user_role', TRUE) = 'ORG_ADMIN'
      `,
    }),
    pgPolicy('yau_events_super_admin_read', {
      for: 'select',
      using: sql`current_setting('app.current_user_role', TRUE) = 'SUPER_ADMIN'`,
    }),
  ]
).enableRLS();

export type YauEvent = typeof yauEvents.$inferSelect;
export type NewYauEvent = typeof yauEvents.$inferInsert;

// ---------------------------------------------------------------------------
// pilot_requests — public B2B pilot sign-up submissions
// No RLS: public submission endpoint; admins manage via SUPER_ADMIN role
// ---------------------------------------------------------------------------

export const pilotRequests = pgTable(
  'pilot_requests',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orgName: varchar('org_name', { length: 255 }).notNull(),
    // university | college | corporate | government | defense
    orgType: varchar('org_type', { length: 50 }).notNull(),
    contactName: varchar('contact_name', { length: 255 }).notNull(),
    contactEmail: varchar('contact_email', { length: 255 }).notNull(),
    contactPhone: varchar('contact_phone', { length: 50 }),
    estimatedUsers: integer('estimated_users'),
    useCase: text('use_case'),
    // pending | approved | rejected | expired
    status: varchar('status', { length: 20 }).notNull().default('pending'),
    approvedAt: timestamp('approved_at', { withTimezone: true }),
    // populated once the pilot tenant is provisioned
    tenantId: uuid('tenant_id'),
    pilotEndsAt: timestamp('pilot_ends_at', { withTimezone: true }),
    // internal admin notes
    notes: text('notes'),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    index('idx_pilot_requests_status').on(t.status),
    index('idx_pilot_requests_email').on(t.contactEmail),
    index('idx_pilot_requests_tenant').on(t.tenantId),
  ]
);

export type PilotRequest = typeof pilotRequests.$inferSelect;
export type NewPilotRequest = typeof pilotRequests.$inferInsert;

// ---------------------------------------------------------------------------
// usage_snapshots — monthly billing snapshots for invoicing
// RLS: tenant-scoped; computed by billing worker
// ---------------------------------------------------------------------------

export const usageSnapshots = pgTable(
  'usage_snapshots',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull(),
    // First day of the month, e.g. 2026-03-01
    snapshotMonth: date('snapshot_month').notNull(),
    yauCount: integer('yau_count').notNull().default(0),
    activeUsersCount: integer('active_users_count').notNull().default(0),
    coursesCount: integer('courses_count').notNull().default(0),
    storageGb: numeric('storage_gb', { precision: 10, scale: 4 }).notNull().default('0'),
    computedAt: timestamp('computed_at', { withTimezone: true }).notNull().defaultNow(),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('usage_snapshots_tenant_month_unique').on(t.tenantId, t.snapshotMonth),
    index('idx_usage_snapshots_tenant').on(t.tenantId),
    index('idx_usage_snapshots_month').on(t.snapshotMonth),
    pgPolicy('usage_snapshots_tenant_isolation', {
      using: sql`tenant_id::text = current_setting('app.current_tenant', TRUE)`,
      withCheck: sql`tenant_id::text = current_setting('app.current_tenant', TRUE)`,
    }),
    pgPolicy('usage_snapshots_admin_read', {
      using: sql`
        current_setting('app.current_user_role', TRUE) IN ('SUPER_ADMIN', 'ORG_ADMIN')
      `,
    }),
  ]
).enableRLS();

export type UsageSnapshot = typeof usageSnapshots.$inferSelect;
export type NewUsageSnapshot = typeof usageSnapshots.$inferInsert;
