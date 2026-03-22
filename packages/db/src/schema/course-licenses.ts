/**
 * Course Licenses — FEAT-ORG-ONBOARDING Phase 1
 * Cross-tenant course licensing for marketplace content.
 *
 * RLS: dual-tenant policy (licensee OR licensor can access)
 * SI-1: uses app.current_tenant (NOT app.current_user)
 */
import {
  pgTable,
  uuid,
  varchar,
  integer,
  timestamp,
  index,
  pgPolicy,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { tenants } from './tenants';

export const courseLicenses = pgTable(
  'course_licenses',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    /** The tenant licensing (buying) the course */
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id),
    courseId: uuid('course_id').notNull(),
    /** UNLIMITED | PER_SEAT | TIME_LIMITED */
    licenseType: varchar('license_type', { length: 20 })
      .notNull()
      .default('UNLIMITED'),
    /** null for UNLIMITED */
    maxSeats: integer('max_seats'),
    usedSeats: integer('used_seats').notNull().default(0),
    licensedAt: timestamp('licensed_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    /** null for perpetual */
    expiresAt: timestamp('expires_at', { withTimezone: true }),
    /** The tenant that published/owns the course */
    licensorTenantId: uuid('licensor_tenant_id').notNull(),
    /** ACTIVE | EXPIRED | REVOKED */
    status: varchar('status', { length: 20 }).notNull().default('ACTIVE'),
    created_at: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    index('idx_course_licenses_tenant').on(t.tenantId),
    index('idx_course_licenses_course').on(t.courseId),
    index('idx_course_licenses_licensor').on(t.licensorTenantId),
    index('idx_course_licenses_status').on(t.status),
    /** Dual-tenant RLS: both licensee and licensor can access */
    pgPolicy('course_licenses_tenant_isolation', {
      using: sql`
        tenant_id::text = current_setting('app.current_tenant', TRUE)
        OR licensor_tenant_id::text = current_setting('app.current_tenant', TRUE)
      `,
      withCheck: sql`tenant_id::text = current_setting('app.current_tenant', TRUE)`,
    }),
  ]
).enableRLS();

export type CourseLicense = typeof courseLicenses.$inferSelect;
export type NewCourseLicense = typeof courseLicenses.$inferInsert;
