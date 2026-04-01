/**
 * TenantAnalyticsService — Orchestrates analytics queries and report generation.
 * Delegates aggregation to TenantAnalyticsAggregationService.
 * File-size compliance: <300 lines.
 */
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
} from './tenant-analytics.types.js';
import { TenantAnalyticsAggregationService } from './tenant-analytics-aggregation.service.js';

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

  constructor(
    private readonly aggregation: TenantAnalyticsAggregationService
  ) {}

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

    if (period === 'NINETY_DAYS') {
      try {
        const snapshots = await withTenantContext(this.db, ctx, async (tx) => {
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
        });
        if (snapshots.length > 0) {
          return this.buildDtoFromSnapshots(tenantId, period, snapshots);
        }
      } catch (err) {
        this.logger.warn(
          `[TenantAnalyticsService] Snapshot fallback for tenantId=${tenantId}: ${String(err)}`
        );
      }
    }

    const [
      totalEnrollments,
      activeLearnersTrend,
      completionRateTrend,
      avgLearningVelocity,
      topCourses,
    ] = await Promise.all([
      this.aggregation.getTotalEnrollments(this.db, tenantId, userId, cutoff),
      this.aggregation.getActiveLearnersTrend(
        this.db,
        tenantId,
        userId,
        cutoff
      ),
      this.aggregation.getCompletionRateTrend(
        this.db,
        tenantId,
        userId,
        cutoff
      ),
      this.aggregation.getAvgLearningVelocity(
        this.db,
        tenantId,
        userId,
        cutoff
      ),
      this.aggregation.getTopCourses(this.db, tenantId, userId, cutoff),
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
    snapshots: (typeof schema.tenantAnalyticsSnapshots.$inferSelect)[]
  ): TenantAnalyticsDto {
    const activeLearnersTrend: DailyMetric[] = snapshots.map((s) => ({
      date: String(s.snapshotDate),
      value: s.activeLearners,
    }));
    const completionRateTrend: DailyMetric[] = snapshots.map((s) => ({
      date: String(s.snapshotDate),
      value: Math.round(s.avgCompletionRate * 10) / 10,
    }));
    const totalEnrollments = snapshots.reduce(
      (acc, s) => acc + s.newEnrollments,
      0
    );

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
          .where(
            sql`${schema.userLearningVelocity.tenantId} = ${tenantId}::uuid`
          )
          .groupBy(schema.userLearningVelocity.userId);

        const sorted = rows
          .sort((a, b) => Number(b.avgLessons) - Number(a.avgLessons))
          .slice(0, limit);

        return sorted.map((r) => ({
          userId: r.userId,
          displayName: `User ${r.userId.slice(0, 8)}`,
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
        .groupBy(sql`DATE_TRUNC('week', ${schema.userCourses.enrolledAt})`);

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
            enrolled > 0
              ? Math.round((activeAt7Days / enrolled) * 1000) / 10
              : 0,
          retentionAt30Days:
            enrolled > 0
              ? Math.round((activeAt30Days / enrolled) * 1000) / 10
              : 0,
        };
      });
    });
  }
}
