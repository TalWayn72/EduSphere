import {
  pgTable,
  uuid,
  text,
  real,
  timestamp,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { pk, tenantId, timestamps } from './_shared';

/**
 * scorm_packages — stores metadata about imported SCORM packages.
 * Each package corresponds to one Course. Tenant-isolated via RLS.
 */
export const scormPackages = pgTable('scorm_packages', {
  id: pk(),
  course_id: uuid('course_id').notNull(),
  tenant_id: tenantId(),
  manifest_version: text('manifest_version', { enum: ['1.2', '2004'] })
    .notNull()
    .default('1.2'),
  title: text('title').notNull(),
  identifier: text('identifier').notNull(),
  minio_prefix: text('minio_prefix').notNull(),
  entry_point: text('entry_point').notNull(),
  ...timestamps,
});

/**
 * scorm_sessions — tracks SCORM runtime state per user per content item.
 * RLS: users see only their own sessions; instructors see all in tenant.
 */
export const scormSessions = pgTable('scorm_sessions', {
  id: pk(),
  user_id: uuid('user_id').notNull(),
  content_item_id: uuid('content_item_id').notNull(),
  tenant_id: tenantId(),
  lesson_status: text('lesson_status').notNull().default('not attempted'),
  score_raw: real('score_raw'),
  score_min: real('score_min'),
  score_max: real('score_max'),
  suspend_data: text('suspend_data'),
  session_time: text('session_time'),
  total_time: text('total_time'),
  completed_at: timestamp('completed_at', { withTimezone: true }),
  ...timestamps,
});

export const scormPackagesRLS = sql`
ALTER TABLE scorm_packages ENABLE ROW LEVEL SECURITY;

CREATE POLICY scorm_packages_tenant_isolation ON scorm_packages
  FOR ALL
  USING (tenant_id::text = current_setting('app.current_tenant', TRUE))
  WITH CHECK (tenant_id::text = current_setting('app.current_tenant', TRUE));
`;

export const scormSessionsRLS = sql`
ALTER TABLE scorm_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY scorm_sessions_user_isolation ON scorm_sessions
  FOR ALL
  USING (
    user_id::text = current_setting('app.current_user_id', TRUE)
    OR current_setting('app.current_user_role', TRUE)
      IN ('INSTRUCTOR', 'ORG_ADMIN', 'SUPER_ADMIN')
  )
  WITH CHECK (
    user_id::text = current_setting('app.current_user_id', TRUE)
  );
`;

export const scormIndexes = sql`
CREATE INDEX idx_scorm_packages_course ON scorm_packages(course_id);
CREATE INDEX idx_scorm_packages_tenant ON scorm_packages(tenant_id);
CREATE INDEX idx_scorm_sessions_user ON scorm_sessions(user_id);
CREATE INDEX idx_scorm_sessions_content ON scorm_sessions(content_item_id);
CREATE INDEX idx_scorm_sessions_tenant ON scorm_sessions(tenant_id);
`;

export type ScormPackage = typeof scormPackages.$inferSelect;
export type NewScormPackage = typeof scormPackages.$inferInsert;
export type ScormSession = typeof scormSessions.$inferSelect;
export type NewScormSession = typeof scormSessions.$inferInsert;
