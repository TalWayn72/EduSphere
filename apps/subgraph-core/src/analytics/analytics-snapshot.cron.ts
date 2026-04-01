/**
 * AnalyticsSnapshotCron — Daily CRON job for org analytics snapshots.
 *
 * Runs daily at 02:00 AM, iterates all active tenants,
 * computes KPIs and upserts into tenant_analytics_snapshots.
 *
 * Implements OnModuleDestroy for memory safety.
 */
import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import {
  createDatabaseConnection,
  schema,
  closeAllPools,
  sql,
} from '@edusphere/db';
import type { Database } from '@edusphere/db';

@Injectable()
export class AnalyticsSnapshotCron implements OnModuleDestroy {
  private readonly logger = new Logger(AnalyticsSnapshotCron.name);
  private readonly db: Database;

  constructor() {
    this.db = createDatabaseConnection();
  }

  async onModuleDestroy(): Promise<void> {
    await closeAllPools();
    this.logger.log('[AnalyticsSnapshotCron] onModuleDestroy: cleaned up');
  }

  @Cron('0 2 * * *')
  async runDailySnapshot(): Promise<void> {
    this.logger.log(
      '[AnalyticsSnapshotCron] Starting daily analytics snapshot'
    );
    try {
      const tenants = await this.db
        .select({ id: schema.tenants.id })
        .from(schema.tenants);
      const today = new Date().toISOString().split('T')[0] as string;

      for (const tenant of tenants) {
        await this.snapshotTenant(tenant.id, today);
      }

      this.logger.log(
        `[AnalyticsSnapshotCron] Daily snapshot completed for ${tenants.length} tenant(s)`
      );
    } catch (err) {
      this.logger.error(
        `[AnalyticsSnapshotCron] Snapshot failed: ${String(err)}`
      );
    }
  }

  private async snapshotTenant(tenantId: string, today: string): Promise<void> {
    try {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const todayStart = new Date(today + 'T00:00:00Z');

      const [kpiResult] = await this.db
        .execute<{
          active_learners: string;
          completions: string;
          new_enrollments: string;
          total_minutes: string;
          avg_completion_rate: string;
        }>(
          sql`
        SELECT
          (SELECT COUNT(DISTINCT up.user_id)
           FROM user_progress up
           INNER JOIN users u ON u.id = up.user_id
           WHERE u.tenant_id = ${tenantId}::uuid
             AND up.last_accessed_at >= ${sevenDaysAgo.toISOString()}::timestamptz
          )::text AS active_learners,
          (SELECT COUNT(*)
           FROM user_courses uc
           INNER JOIN courses c ON c.id = uc.course_id
           WHERE c.tenant_id = ${tenantId}::uuid
             AND uc.completed_at >= ${todayStart.toISOString()}::timestamptz
             AND uc.completed_at IS NOT NULL
          )::text AS completions,
          (SELECT COUNT(*)
           FROM user_courses uc
           INNER JOIN courses c ON c.id = uc.course_id
           WHERE c.tenant_id = ${tenantId}::uuid
             AND uc.enrolled_at >= ${todayStart.toISOString()}::timestamptz
          )::text AS new_enrollments,
          COALESCE((SELECT SUM(up.time_spent)
           FROM user_progress up
           INNER JOIN users u ON u.id = up.user_id
           WHERE u.tenant_id = ${tenantId}::uuid
             AND up.last_accessed_at >= ${todayStart.toISOString()}::timestamptz
          ), 0)::text AS total_minutes,
          COALESCE((
            SELECT
              CASE WHEN COUNT(uc.id) = 0 THEN 0
              ELSE (COUNT(CASE WHEN uc.completed_at IS NOT NULL THEN 1 END)::float
                    / COUNT(uc.id) * 100.0)
              END
            FROM user_courses uc
            INNER JOIN courses c ON c.id = uc.course_id
            WHERE c.tenant_id = ${tenantId}::uuid
          ), 0)::text AS avg_completion_rate
      `
        )
        .then((r) => r.rows);

      const activeLearners = Number(kpiResult?.active_learners ?? 0);
      const completions = Number(kpiResult?.completions ?? 0);
      const newEnrollments = Number(kpiResult?.new_enrollments ?? 0);
      const totalMinutes = Math.round(
        Number(kpiResult?.total_minutes ?? 0) / 60
      );
      const avgCompletionRate =
        Math.round(Number(kpiResult?.avg_completion_rate ?? 0) * 100) / 100;

      await this.db
        .insert(schema.tenantAnalyticsSnapshots)
        .values({
          tenantId,
          snapshotDate: today,
          activeLearners,
          completions,
          avgCompletionRate,
          totalLearningMinutes: totalMinutes,
          newEnrollments,
          snapshotType: 'daily',
        })
        .onConflictDoUpdate({
          target: [
            schema.tenantAnalyticsSnapshots.tenantId,
            schema.tenantAnalyticsSnapshots.snapshotDate,
            schema.tenantAnalyticsSnapshots.snapshotType,
          ],
          set: {
            activeLearners,
            completions,
            avgCompletionRate,
            totalLearningMinutes: totalMinutes,
            newEnrollments,
          },
        });

      this.logger.debug(
        `[AnalyticsSnapshotCron] Snapshot upserted tenant=${tenantId} date=${today} active=${activeLearners}`
      );
    } catch (err) {
      this.logger.error(
        `[AnalyticsSnapshotCron] Failed snapshot for tenant=${tenantId}: ${String(err)}`
      );
    }
  }
}
