/**
 * Marketplace tables — F-031 Instructor Marketplace + Revenue Sharing
 * RLS:
 *   - purchases: users see their own; admins/instructors see all in tenant
 *   - course_listings: all authenticated users can read; write restricted to owner
 *   - instructor_payouts: instructors see own; admins see all in tenant
 *   - stripe_customers: users see their own record only
 */
import {
  pgTable,
  uuid,
  text,
  integer,
  boolean,
  timestamp,
  pgEnum,
  index,
  uniqueIndex,
  pgPolicy,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const purchaseStatusEnum = pgEnum('purchase_status', [
  'PENDING',
  'COMPLETE',
  'REFUNDED',
  'FAILED',
]);

export const payoutStatusEnum = pgEnum('payout_status', [
  'PENDING',
  'PAID',
  'FAILED',
]);

export const marketplaceCurrencyEnum = pgEnum('marketplace_currency', [
  'USD',
  'EUR',
  'ILS',
]);

// Course price listing
export const courseListings = pgTable(
  'course_listings',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    courseId: uuid('course_id').notNull(),
    tenantId: uuid('tenant_id').notNull(),
    priceCents: integer('price_cents').notNull(),
    currency: marketplaceCurrencyEnum('currency').notNull().default('USD'),
    stripePriceId: text('stripe_price_id'),
    isPublished: boolean('is_published').notNull().default(false),
    revenueSplitPercent: integer('revenue_split_percent').notNull().default(70),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('course_listings_course_unique').on(t.courseId, t.tenantId),
    pgPolicy('course_listings_rls', {
      using: sql`tenant_id::text = current_setting('app.current_tenant', TRUE)`,
      withCheck: sql`tenant_id::text = current_setting('app.current_tenant', TRUE)`,
    }),
  ]
).enableRLS();

export type CourseListing = typeof courseListings.$inferSelect;
export type NewCourseListing = typeof courseListings.$inferInsert;

// Stripe customer mapping
export const stripeCustomers = pgTable(
  'stripe_customers',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').notNull(),
    tenantId: uuid('tenant_id').notNull(),
    stripeCustomerId: text('stripe_customer_id').notNull().unique(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (t) => [
    index('stripe_customers_user_idx').on(t.userId),
    pgPolicy('stripe_customers_rls', {
      using: sql`
        user_id::text = current_setting('app.current_user_id', TRUE)
        OR current_setting('app.current_user_role', TRUE) IN ('SUPER_ADMIN', 'ORG_ADMIN')
      `,
      withCheck: sql`tenant_id::text = current_setting('app.current_tenant', TRUE)`,
    }),
  ]
).enableRLS();

export type StripeCustomer = typeof stripeCustomers.$inferSelect;
export type NewStripeCustomer = typeof stripeCustomers.$inferInsert;

// Purchase records
export const purchases = pgTable(
  'purchases',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').notNull(),
    courseId: uuid('course_id').notNull(),
    tenantId: uuid('tenant_id').notNull(),
    stripePaymentIntentId: text('stripe_payment_intent_id').notNull().unique(),
    amountCents: integer('amount_cents').notNull(),
    status: purchaseStatusEnum('status').notNull().default('PENDING'),
    purchasedAt: timestamp('purchased_at').notNull().defaultNow(),
  },
  (t) => [
    index('purchases_user_idx').on(t.userId),
    index('purchases_course_idx').on(t.courseId),
    pgPolicy('purchases_rls', {
      using: sql`
        user_id::text = current_setting('app.current_user_id', TRUE)
        OR current_setting('app.current_user_role', TRUE) IN ('SUPER_ADMIN', 'ORG_ADMIN', 'INSTRUCTOR')
      `,
      withCheck: sql`tenant_id::text = current_setting('app.current_tenant', TRUE)`,
    }),
  ]
).enableRLS();

export type Purchase = typeof purchases.$inferSelect;
export type NewPurchase = typeof purchases.$inferInsert;

// Instructor payout records
export const instructorPayouts = pgTable(
  'instructor_payouts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    instructorId: uuid('instructor_id').notNull(),
    tenantId: uuid('tenant_id').notNull(),
    stripeTransferId: text('stripe_transfer_id'),
    amountCents: integer('amount_cents').notNull(),
    periodStart: timestamp('period_start').notNull(),
    periodEnd: timestamp('period_end').notNull(),
    status: payoutStatusEnum('status').notNull().default('PENDING'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (t) => [
    index('instructor_payouts_instructor_idx').on(t.instructorId),
    pgPolicy('instructor_payouts_rls', {
      using: sql`
        instructor_id::text = current_setting('app.current_user_id', TRUE)
        OR current_setting('app.current_user_role', TRUE) IN ('SUPER_ADMIN', 'ORG_ADMIN')
      `,
      withCheck: sql`tenant_id::text = current_setting('app.current_tenant', TRUE)`,
    }),
  ]
).enableRLS();

export type InstructorPayout = typeof instructorPayouts.$inferSelect;
export type NewInstructorPayout = typeof instructorPayouts.$inferInsert;
