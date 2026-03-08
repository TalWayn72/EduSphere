import {
  pgTable,
  uuid,
  integer,
  doublePrecision,
  timestamp,
  date,
  pgEnum,
  uniqueIndex,
  index,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const analyticsSnapshotTypeEnum = pgEnum('analytics_snapshot_type', [
  'daily',
  'weekly',
  'monthly',
]);

export const tenantAnalyticsSnapshots = pgTable('tenant_analytics_snapshots', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull(),
  snapshotDate: date('snapshot_date').notNull(),
  activeLearners: integer('active_learners').notNull().default(0),
  completions: integer('completions').notNull().default(0),
  avgCompletionRate: doublePrecision('avg_completion_rate').notNull().default(0),
  totalLearningMinutes: integer('total_learning_minutes').notNull().default(0),
  newEnrollments: integer('new_enrollments').notNull().default(0),
  snapshotType: analyticsSnapshotTypeEnum('snapshot_type').notNull().default('daily'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const tenantAnalyticsSnapshotsRLS = sql`
ALTER TABLE tenant_analytics_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_analytics_snapshots_tenant_isolation" ON tenant_analytics_snapshots
  USING (tenant_id::text = current_setting('app.current_tenant', TRUE));
`;

export const tenantAnalyticsSnapshotsIndexes = sql`
CREATE INDEX IF NOT EXISTS idx_analytics_snapshots_tenant
  ON tenant_analytics_snapshots(tenant_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_analytics_snapshots_unique
  ON tenant_analytics_snapshots(tenant_id, snapshot_date, snapshot_type);
`;

export type TenantAnalyticsSnapshot = typeof tenantAnalyticsSnapshots.$inferSelect;
export type NewTenantAnalyticsSnapshot = typeof tenantAnalyticsSnapshots.$inferInsert;
