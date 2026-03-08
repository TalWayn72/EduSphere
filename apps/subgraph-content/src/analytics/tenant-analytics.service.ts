import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import {
  createDatabaseConnection,
  schema,
  closeAllPools,
  withTenantContext,
  sql,
  and,
} from '@edusphere/db';
import { count, avg } from 'drizzle-orm';
import type {
  TenantAnalyticsDto,
  LearnerVelocityDto,
  CohortMetricsDto,
  AnalyticsPeriod,
  DailyMetric,
  TopCourse,
} from './tenant-analytics.types.js';

function periodToDays(period: AnalyticsPeriod): number {
  switch (period) {
    case 'SEVEN_DAYS':
      return 7;
    case 'THIRTY_DAYS':
      return 30;
    case 'NINETY_DAYS':
      return 90;
  }
}

@Injectable()
export class TenantAnalyticsService implements OnModuleDestroy {
  private readonly logger = new Logger(TenantAnalyticsService.name);
  private readonly db = createDatabaseConnection();

  async onModuleDestroy(): Promise<void> {
    await closeAllPools();
  }

  async getTenantAnalytics(
    tenantId: string,
    userId: string,
    period: AnalyticsPeriod
  ): Promise<TenantAnalyticsDto> {
    const days = periodToDays(period);
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    this.logger.log(
      `[TenantAnalyticsService] getTenantAnalytics tenantId=${tenantId} period=${period}`
    );

    const ctx = { tenantId, userId, userRole: 'ORG_ADMIN' as const };

    // For NINETY_DAYS, try snapshot cache first
    if (period === 'NINETY_DAYS') {
      try {
        const snapshots = await withTenantContext(
          this.db,
          ctx,
          async (tx) => {
            return tx
              .select()
              .from(schema.tenantAnalyticsSnapshots)
              .where(
                and(
                  sql`${schema.tenantAnalyticsSnapshots.tenantId} = ${tenantId}`,
                  sql`${schema.tenantAnalyticsSnapshots.snapshotDate} >= ${cutoff.toISOString().split('T')[0]}`,
                  sql`${schema.tenantAnalyticsSnapshots.snapshotType} = 'daily'`
                )
              );
          }
        );
        if (snapshots.length > 0) {
          return this.buildDtoFromSnapshots(tenantId, period, snapshots, cutoff);
        }
      } catch (err) {
        this.logger.warn(
          `[TenantAnalyticsService] Snapshot fallback for tenantId=${tenantId}: ${String(err)}`
        );
      }
    }

    const [totalEnrollments, activeLearnersTrend, completionRateTrend, avgLearningVelocity, topCourses] =
      await Promise.all([
        this.getTotalEnrollments(tenantId, userId, cutoff),
        this.getActiveLearnersTrend(tenantId, userId, cutoff),
        this.getCompletionRateTrend(tenantId, userId, cutoff),
        this.getAvgLearningVelocity(tenantId, userId, cutoff),
        this.getTopCourses(tenantId, userId, cutoff),
      ]);

    return {
      tenantId,
      period,
      totalEnrollments,
      avgLearningVelocity,
      activeLearnersTrend,
      completionRateTrend,
      topCourses,
    };
  }

  private buildDtoFromSnapshots(
    tenantId: string,
    period: AnalyticsPeriod,
    snapshots: typeof schema.tenantAnalyticsSnapshots.$inferSelect[],
    _cutoff: Date
  ): TenantAnalyticsDto {
    const activeLearnersTrend: DailyMetric[] = snapshots.map((s) => ({
      date: String(s.snapshotDate),
      value: s.activeLearners,
    }));
    const completionRateTrend: DailyMetric[] = snapshots.map((s) => ({
      date: String(s.snapshotDate),
      value: Math.round(s.avgCompletionRate * 10) / 10,
    }));
    const totalEnrollments = snapshots.reduce((acc, s) => acc + s.newEnrollments, 0);

    return {
      tenantId,
      period,
      totalEnrollments,
      avgLearningVelocity: 0,
      activeLearnersTrend,
      completionRateTrend,
      topCourses: [],
    };
  }

  private async getTotalEnrollments(
    tenantId: string,
    userId: string,
    cutoff: Date
  ): Promise<number> {
    const ctx = { tenantId, userId, userRole: 'ORG_ADMIN' as const };
    return withTenantContext(this.db, ctx, async (tx) => {
      const [row] = await tx
        .select({ total: count() })
        .from(schema.userCourses)
        .where(
          and(
            sql`EXISTS (SELECT 1 FROM courses WHERE courses.id = ${schema.userCourses.courseId} AND courses.tenant_id = ${tenantId}::uuid)`,
            sql`${schema.userCourses.enrolledAt} >= ${cutoff}`
          )
        );
      return Number(row?.total ?? 0);
    });
  }

  private async getActiveLearnersTrend(
    tenantId: string,
    userId: string,
    cutoff: Date
  ): Promise<DailyMetric[]> {
    const ctx = { tenantId, userId, userRole: 'ORG_ADMIN' as const };
    return withTenantContext(this.db, ctx, async (tx) => {
      const rows = await tx
        .select({
          date: sql<string>`DATE(${schema.userProgress.lastAccessedAt})`,
          value: sql<number>`COUNT(DISTINCT ${schema.userProgress.userId})`,
        })
        .from(schema.userProgress)
        .where(sql`${schema.userProgress.lastAccessedAt} >= ${cutoff}`)
        .groupBy(sql`DATE(${schema.userProgress.lastAccessedAt})`);

      return rows.map((r) => ({
        date: String(r.date),
        value: Number(r.value),
      }));
    });
  }

  private async getCompletionRateTrend(
    tenantId: string,
    userId: string,
    cutoff: Date
  ): Promise<DailyMetric[]> {
    const ctx = { tenantId, userId, userRole: 'ORG_ADMIN' as const };
    return withTenantContext(this.db, ctx, async (tx) => {
      const rows = await tx
        .select({
          date: sql<string>`DATE(${schema.userCourses.enrolledAt})`,
          enrollments: sql<number>`COUNT(*)`,
          completions: sql<number>`COUNT(${schema.userCourses.completedAt})`,
        })
        .from(schema.userCourses)
        .where(
          and(
            sql`EXISTS (SELECT 1 FROM courses WHERE courses.id = ${schema.userCourses.courseId} AND courses.tenant_id = ${tenantId}::uuid)`,
            sql`${schema.userCourses.enrolledAt} >= ${cutoff}`
          )
        )
        .groupBy(sql`DATE(${schema.userCourses.enrolledAt})`);

      return rows.map((r) => {
        const enrollments = Number(r.enrollments);
        const completions = Number(r.completions);
        return {
          date: String(r.date),
          value: enrollments > 0 ? Math.round((completions / enrollments) * 1000) / 10 : 0,
        };
      });
    });
  }

  private async getAvgLearningVelocity(
    tenantId: string,
    userId: string,
    cutoff: Date
  ): Promise<number> {
    const ctx = { tenantId, userId, userRole: 'ORG_ADMIN' as const };
    try {
      return await withTenantContext(this.db, ctx, async (tx) => {
        const [row] = await tx
          .select({
            avgVelocity: avg(schema.userLearningVelocity.lessonsCompleted),
          })
          .from(schema.userLearningVelocity)
          .where(
            and(
              sql`${schema.userLearningVelocity.tenantId} = ${tenantId}::uuid`,
              sql`${schema.userLearningVelocity.weekStart} >= ${cutoff.toISOString().split('T')[0]}`
            )
          );
        return Math.round(Number(row?.avgVelocity ?? 0) * 10) / 10;
      });
    } catch (err) {
      this.logger.warn(
        `[TenantAnalyticsService] userLearningVelocity not available: ${String(err)}`
      );
      return 0.0;
    }
  }

  private async getTopCourses(
    tenantId: string,
    userId: string,
    cutoff: Date
  ): Promise<TopCourse[]> {
    const ctx = { tenantId, userId, userRole: 'ORG_ADMIN' as const };
    return withTenantContext(this.db, ctx, async (tx) => {
      const rows = await tx
        .select({
          courseId: schema.userCourses.courseId,
          enrollmentCount: count(),
          completions: sql<number>`COUNT(${schema.userCourses.completedAt})`,
        })
        .from(schema.userCourses)
        .where(
          and(
            sql`EXISTS (SELECT 1 FROM courses WHERE courses.id = ${schema.userCourses.courseId} AND courses.tenant_id = ${tenantId}::uuid)`,
            sql`${schema.userCourses.enrolledAt} >= ${cutoff}`
          )
        )
        .groupBy(schema.userCourses.courseId);

      return rows
        .sort((a, b) => Number(b.enrollmentCount) - Number(a.enrollmentCount))
        .slice(0, 10)
        .map((r) => {
          const enrollmentCount = Number(r.enrollmentCount);
          const completions = Number(r.completions);
          return {
            courseId: r.courseId,
            title: r.courseId, // title resolved via DataLoader in resolver layer
            enrollmentCount,
            completionRate:
              enrollmentCount > 0
                ? Math.round((completions / enrollmentCount) * 1000) / 10
                : 0,
          };
        });
    });
  }

  async getLearnerVelocity(
    tenantId: string,
    userId: string,
    _period: string,
    limit: number = 20
  ): Promise<LearnerVelocityDto[]> {
    this.logger.log(
      `[TenantAnalyticsService] getLearnerVelocity tenantId=${tenantId} limit=${limit}`
    );
    const ctx = { tenantId, userId, userRole: 'ORG_ADMIN' as const };
    try {
      return await withTenantContext(this.db, ctx, async (tx) => {
        const rows = await tx
          .select({
            userId: schema.userLearningVelocity.userId,
            avgLessons: avg(schema.userLearningVelocity.lessonsCompleted),
            totalWeeks: count(),
          })
          .from(schema.userLearningVelocity)
          .where(sql`${schema.userLearningVelocity.tenantId} = ${tenantId}::uuid`)
          .groupBy(schema.userLearningVelocity.userId);

        const sorted = rows
          .sort((a, b) => Number(b.avgLessons) - Number(a.avgLessons))
          .slice(0, limit);

        return sorted.map((r) => ({
          userId: r.userId,
          displayName: `User ${r.userId.slice(0, 8)}`, // GDPR: no raw email, use displayName from users table
          avgLessonsPerWeek: Math.round(Number(r.avgLessons ?? 0) * 10) / 10,
          totalWeeks: Number(r.totalWeeks),
        }));
      });
    } catch (err) {
      this.logger.warn(
        `[TenantAnalyticsService] userLearningVelocity table not available: ${String(err)}`
      );
      return [];
    }
  }

  async getCohortRetention(
    tenantId: string,
    userId: string,
    weeksBack: number = 12
  ): Promise<CohortMetricsDto[]> {
    this.logger.log(
      `[TenantAnalyticsService] getCohortRetention tenantId=${tenantId} weeksBack=${weeksBack}`
    );
    const cutoff = new Date(Date.now() - weeksBack * 7 * 24 * 60 * 60 * 1000);
    const ctx = { tenantId, userId, userRole: 'ORG_ADMIN' as const };

    return withTenantContext(this.db, ctx, async (tx) => {
      // Group enrollments by ISO week
      const cohortRows = await tx
        .select({
          cohortWeek: sql<string>`TO_CHAR(DATE_TRUNC('week', ${schema.userCourses.enrolledAt}), 'IYYY-"W"IW')`,
          enrolled: count(),
          activeAt7Days: sql<number>`SUM(CASE WHEN EXISTS (
            SELECT 1 FROM user_progress up
            WHERE up.user_id = ${schema.userCourses.userId}
              AND up.last_accessed_at >= ${schema.userCourses.enrolledAt}
              AND up.last_accessed_at < (${schema.userCourses.enrolledAt} + INTERVAL '7 days')
          ) THEN 1 ELSE 0 END)`,
          activeAt30Days: sql<number>`SUM(CASE WHEN EXISTS (
            SELECT 1 FROM user_progress up
            WHERE up.user_id = ${schema.userCourses.userId}
              AND up.last_accessed_at >= ${schema.userCourses.enrolledAt}
              AND up.last_accessed_at < (${schema.userCourses.enrolledAt} + INTERVAL '30 days')
          ) THEN 1 ELSE 0 END)`,
        })
        .from(schema.userCourses)
        .where(
          and(
            sql`EXISTS (SELECT 1 FROM courses WHERE courses.id = ${schema.userCourses.courseId} AND courses.tenant_id = ${tenantId}::uuid)`,
            sql`${schema.userCourses.enrolledAt} >= ${cutoff}`
          )
        )
        .groupBy(
          sql`DATE_TRUNC('week', ${schema.userCourses.enrolledAt})`
        );

      return cohortRows.map((r) => {
        const enrolled = Number(r.enrolled);
        const activeAt7Days = Number(r.activeAt7Days ?? 0);
        const activeAt30Days = Number(r.activeAt30Days ?? 0);
        return {
          cohortWeek: r.cohortWeek,
          enrolled,
          activeAt7Days,
          activeAt30Days,
          retentionAt7Days:
            enrolled > 0 ? Math.round((activeAt7Days / enrolled) * 1000) / 10 : 0,
          retentionAt30Days:
            enrolled > 0 ? Math.round((activeAt30Days / enrolled) * 1000) / 10 : 0,
        };
      });
    });
  }
}
