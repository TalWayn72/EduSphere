/**
 * at_risk_flags — tracks learners flagged as at-risk per course.
 * RLS: tenant isolation; instructors/admins see all in tenant; learners see own.
 * Feature: F-003 Performance Risk Detection
 */
import {
  pgTable,
  uuid,
  real,
  jsonb,
  timestamp,
  pgEnum,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const atRiskStatusEnum = pgEnum('at_risk_status', [
  'active',
  'resolved',
  'dismissed',
]);

export const atRiskFlags = pgTable(
  'at_risk_flags',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    learnerId: uuid('learner_id').notNull(),
    courseId: uuid('course_id').notNull(),
    tenantId: uuid('tenant_id').notNull(),
    /** Computed risk score 0.0 – 1.0 */
    riskScore: real('risk_score').notNull(),
    /** JSONB bag of boolean risk factors */
    riskFactors: jsonb('risk_factors').notNull(),
    status: atRiskStatusEnum('status').notNull().default('active'),
    flaggedAt: timestamp('flagged_at').notNull().defaultNow(),
    resolvedAt: timestamp('resolved_at'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
);

/** Unique constraint: only one active flag per (learner, course) pair */
export const atRiskFlagsUniqueActive = sql`
CREATE UNIQUE INDEX idx_at_risk_active_pair
  ON at_risk_flags (learner_id, course_id)
  WHERE status = 'active';
`;

export const atRiskFlagsRLS = sql`
CREATE POLICY at_risk_flags_tenant_isolation ON at_risk_flags
  USING (
    tenant_id::text = current_setting('app.current_tenant', TRUE)
    AND (
      current_setting('app.current_user_role', TRUE) IN ('INSTRUCTOR','ORG_ADMIN','SUPER_ADMIN')
      OR learner_id::text = current_setting('app.current_user_id', TRUE)
    )
  )
  WITH CHECK (
    tenant_id::text = current_setting('app.current_tenant', TRUE)
  );

ALTER TABLE at_risk_flags ENABLE ROW LEVEL SECURITY;
`;

export const atRiskFlagsIndexes = sql`
CREATE INDEX idx_at_risk_flags_tenant   ON at_risk_flags (tenant_id);
CREATE INDEX idx_at_risk_flags_course   ON at_risk_flags (course_id);
CREATE INDEX idx_at_risk_flags_learner  ON at_risk_flags (learner_id);
CREATE INDEX idx_at_risk_flags_status   ON at_risk_flags (status);
`;

export type AtRiskFlag = typeof atRiskFlags.$inferSelect;
export type NewAtRiskFlag = typeof atRiskFlags.$inferInsert;
