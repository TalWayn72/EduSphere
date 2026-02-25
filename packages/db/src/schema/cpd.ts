import { pgTable, uuid, text, boolean, timestamp, decimal, index } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

// Table 1: Credit type definitions (e.g., "NASBA CPE", "AMA PRA Category 1")
export const cpdCreditTypes = pgTable('cpd_credit_types', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull(),
  name: text('name').notNull(),
  regulatoryBody: text('regulatory_body').notNull(),
  creditHoursPerHour: decimal('credit_hours_per_hour', { precision: 4, scale: 2 }).notNull().default('1.00'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// Table 2: CPD credits assigned to specific courses by admins
export const courseCpdCredits = pgTable('course_cpd_credits', {
  id: uuid('id').primaryKey().defaultRandom(),
  courseId: uuid('course_id').notNull(),
  tenantId: uuid('tenant_id').notNull(),
  creditTypeId: uuid('credit_type_id').notNull(),
  creditHours: decimal('credit_hours', { precision: 6, scale: 2 }).notNull(),
  approvedAt: timestamp('approved_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// Table 3: User CPD log - one record per completion
export const userCpdLog = pgTable('user_cpd_log', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull(),
  tenantId: uuid('tenant_id').notNull(),
  courseId: uuid('course_id').notNull(),
  creditTypeId: uuid('credit_type_id').notNull(),
  earnedHours: decimal('earned_hours', { precision: 6, scale: 2 }).notNull(),
  completionDate: timestamp('completion_date').notNull(),
  certificateId: uuid('certificate_id'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (t) => ({
  userIdx: index('user_cpd_log_user_idx').on(t.userId),
  tenantIdx: index('user_cpd_log_tenant_idx').on(t.tenantId),
}));

// RLS: users see own records, admins see all tenant records
export const cpdRLS = sql`
CREATE POLICY cpd_credit_types_tenant_isolation ON cpd_credit_types
  USING (tenant_id::text = current_setting('app.current_tenant', TRUE))
  WITH CHECK (tenant_id::text = current_setting('app.current_tenant', TRUE));

ALTER TABLE cpd_credit_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY course_cpd_credits_tenant_isolation ON course_cpd_credits
  USING (tenant_id::text = current_setting('app.current_tenant', TRUE))
  WITH CHECK (tenant_id::text = current_setting('app.current_tenant', TRUE));

ALTER TABLE course_cpd_credits ENABLE ROW LEVEL SECURITY;

CREATE POLICY user_cpd_log_isolation ON user_cpd_log
  USING (
    tenant_id::text = current_setting('app.current_tenant', TRUE)
    AND (
      user_id::text = current_setting('app.current_user_id', TRUE)
      OR current_setting('app.current_user_role', TRUE) IN ('ORG_ADMIN', 'SUPER_ADMIN')
    )
  )
  WITH CHECK (tenant_id::text = current_setting('app.current_tenant', TRUE));

ALTER TABLE user_cpd_log ENABLE ROW LEVEL SECURITY;
`;

export type CpdCreditType = typeof cpdCreditTypes.$inferSelect;
export type NewCpdCreditType = typeof cpdCreditTypes.$inferInsert;
export type CourseCpdCredit = typeof courseCpdCredits.$inferSelect;
export type NewCourseCpdCredit = typeof courseCpdCredits.$inferInsert;
export type UserCpdLog = typeof userCpdLog.$inferSelect;
export type NewUserCpdLog = typeof userCpdLog.$inferInsert;
