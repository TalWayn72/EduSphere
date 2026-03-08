import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import {
  createDatabaseConnection,
  schema,
  closeAllPools,
  sql,
} from '@edusphere/db';

@Injectable()
export class AnalyticsSnapshotJob implements OnModuleDestroy, OnModuleInit {
  private readonly logger = new Logger(AnalyticsSnapshotJob.name);
  private readonly db = createDatabaseConnection();

  onModuleInit(): void {
    // Kick off an initial snapshot computation at startup (non-blocking)
    void this.runDailySnapshot();
  }

  async onModuleDestroy(): Promise<void> {
    await closeAllPools();
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async runDailySnapshot(): Promise<void> {
    this.logger.log('[AnalyticsSnapshotJob] Starting daily analytics snapshot');
    try {
      const tenants = await this.getAllTenants();
      const today = new Date().toISOString().split('T')[0] as string;
      const cutoff7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

      for (const tenant of tenants) {
        await this.snapshotTenant(tenant.id, today, cutoff7d);
      }

      this.logger.log(
        `[AnalyticsSnapshotJob] Daily snapshot completed for ${tenants.length} tenant(s)`
      );
    } catch (err) {
      this.logger.error(
        `[AnalyticsSnapshotJob] Snapshot failed: ${String(err)}`
      );
    }
  }

  private async getAllTenants(): Promise<{ id: string }[]> {
    return this.db.select({ id: schema.tenants.id }).from(schema.tenants);
  }

  private async snapshotTenant(
    tenantId: string,
    today: string,
    cutoff7d: Date
  ): Promise<void> {
    try {
      // Count active learners (accessed content in last 7 days)
      const [activeRow] = await this.db
        .select({
          activeLearners: sql<number>`COUNT(DISTINCT ${schema.userProgress.userId})`,
        })
        .from(schema.userProgress)
        .where(sql`${schema.userProgress.lastAccessedAt} >= ${cutoff7d}`);

      // Count completions today
      const todayStart = new Date(today + 'T00:00:00Z');
      const [completionRow] = await this.db
        .select({
          completions: sql<number>`COUNT(*)`,
        })
        .from(schema.userCourses)
        .where(
          sql`${schema.userCourses.completedAt} >= ${todayStart} AND ${schema.userCourses.completedAt} IS NOT NULL`
        );

      // Count new enrollments today
      const [enrollRow] = await this.db
        .select({
          newEnrollments: sql<number>`COUNT(*)`,
        })
        .from(schema.userCourses)
        .where(sql`${schema.userCourses.enrolledAt} >= ${todayStart}`);

      const activeLearners = Number(activeRow?.activeLearners ?? 0);
      const completions = Number(completionRow?.completions ?? 0);
      const newEnrollments = Number(enrollRow?.newEnrollments ?? 0);

      // Upsert into tenant_analytics_snapshots (idempotent)
      await this.db
        .insert(schema.tenantAnalyticsSnapshots)
        .values({
          tenantId,
          snapshotDate: today,
          activeLearners,
          completions,
          avgCompletionRate: 0,
          totalLearningMinutes: 0,
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
            newEnrollments,
          },
        });

      this.logger.debug(
        `[AnalyticsSnapshotJob] Snapshot upserted for tenant=${tenantId} date=${today}`
      );
    } catch (err) {
      this.logger.error(
        `[AnalyticsSnapshotJob] Failed snapshot for tenant=${tenantId}: ${String(err)}`
      );
    }
  }
}
