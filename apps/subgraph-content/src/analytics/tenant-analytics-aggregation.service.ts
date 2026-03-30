/**
 * TenantAnalyticsAggregationService — Data aggregation queries (enrollments, trends, velocity).
 * Extracted from TenantAnalyticsService for file-size compliance (<300 lines).
 */
import { Injectable, Logger } from '@nestjs/common';
import {
  schema,
  withTenantContext,
  sql,
  and,
} from '@edusphere/db';
import { count, avg } from 'drizzle-orm';
import type { Database } from '@edusphere/db';
import type { DailyMetric, TopCourse } from './tenant-analytics.types.js';

@Injectable()
export class TenantAnalyticsAggregationService {
  private readonly logger = new Logger(TenantAnalyticsAggregationService.name);

  async getTotalEnrollments(
    db: Database,
    tenantId: string,
    userId: string,
    cutoff: Date
  ): Promise<number> {
    const ctx = { tenantId, userId, userRole: 'ORG_ADMIN' as const };
    return withTenantContext(db, ctx, async (tx) => {
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

  async getActiveLearnersTrend(
    db: Database,
    tenantId: string,
    userId: string,
    cutoff: Date
  ): Promise<DailyMetric[]> {
    const ctx = { tenantId, userId, userRole: 'ORG_ADMIN' as const };
    return withTenantContext(db, ctx, async (tx) => {
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

  async getCompletionRateTrend(
    db: Database,
    tenantId: string,
    userId: string,
    cutoff: Date
  ): Promise<DailyMetric[]> {
    const ctx = { tenantId, userId, userRole: 'ORG_ADMIN' as const };
    return withTenantContext(db, ctx, async (tx) => {
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

  async getAvgLearningVelocity(
    db: Database,
    tenantId: string,
    userId: string,
    cutoff: Date
  ): Promise<number> {
    const ctx = { tenantId, userId, userRole: 'ORG_ADMIN' as const };
    try {
      return await withTenantContext(db, ctx, async (tx) => {
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
        `[TenantAnalyticsAggregation] userLearningVelocity not available: ${String(err)}`
      );
      return 0.0;
    }
  }

  async getTopCourses(
    db: Database,
    tenantId: string,
    userId: string,
    cutoff: Date
  ): Promise<TopCourse[]> {
    const ctx = { tenantId, userId, userRole: 'ORG_ADMIN' as const };
    return withTenantContext(db, ctx, async (tx) => {
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
            title: r.courseId,
            enrollmentCount,
            completionRate:
              enrollmentCount > 0
                ? Math.round((completions / enrollmentCount) * 1000) / 10
                : 0,
          };
        });
    });
  }
}
