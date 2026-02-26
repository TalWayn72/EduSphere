import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import {
  createDatabaseConnection,
  schema,
  eq,
  and,
  withTenantContext,
  closeAllPools,
} from '@edusphere/db';
import type { TenantContext } from '@edusphere/db';
import type {
  ContentItemMetric,
  FunnelStep,
  CourseAnalytics,
} from './analytics.types.js';
import { sql, count, avg } from 'drizzle-orm';

@Injectable()
export class AnalyticsService implements OnModuleDestroy {
  private readonly logger = new Logger(AnalyticsService.name);
  private readonly db = createDatabaseConnection();

  async onModuleDestroy(): Promise<void> {
    await closeAllPools();
  }

  async getCourseAnalytics(
    courseId: string,
    ctx: TenantContext
  ): Promise<CourseAnalytics> {
    this.logger.log(
      `getCourseAnalytics courseId=${courseId} tenant=${ctx.tenantId}`
    );

    const [
      enrollmentCount,
      activeCount,
      completionRate,
      contentMetrics,
      funnel,
    ] = await Promise.all([
      this.getEnrollmentCount(courseId, ctx),
      this.getActiveLearners(courseId, ctx),
      this.getCompletionRate(courseId, ctx),
      this.getContentItemMetrics(courseId, ctx),
      this.getDropOffFunnel(courseId, ctx),
    ]);

    return {
      courseId,
      enrollmentCount,
      activeLearnersLast7Days: activeCount,
      completionRate,
      avgQuizScore: null, // quiz score data not yet in schema
      contentItemMetrics: contentMetrics,
      dropOffFunnel: funnel,
    };
  }

  private async getEnrollmentCount(
    courseId: string,
    ctx: TenantContext
  ): Promise<number> {
    return withTenantContext(this.db, ctx, async (tx) => {
      const [row] = await tx
        .select({ total: count() })
        .from(schema.userCourses)
        .where(eq(schema.userCourses.courseId, courseId));
      return Number(row?.total ?? 0);
    });
  }

  private async getActiveLearners(
    courseId: string,
    ctx: TenantContext
  ): Promise<number> {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    return withTenantContext(this.db, ctx, async (tx) => {
      const [row] = await tx
        .select({ total: count() })
        .from(schema.userCourses)
        .where(
          and(
            eq(schema.userCourses.courseId, courseId),
            sql`${schema.userCourses.enrolledAt} >= ${sevenDaysAgo}`
          )
        );
      return Number(row?.total ?? 0);
    });
  }

  private async getCompletionRate(
    courseId: string,
    ctx: TenantContext
  ): Promise<number> {
    return withTenantContext(this.db, ctx, async (tx) => {
      const [totalRow] = await tx
        .select({ total: count() })
        .from(schema.userCourses)
        .where(eq(schema.userCourses.courseId, courseId));
      const total = Number(totalRow?.total ?? 0);
      if (total === 0) return 0;

      const [completedRow] = await tx
        .select({ completed: count() })
        .from(schema.userCourses)
        .where(
          and(
            eq(schema.userCourses.courseId, courseId),
            sql`${schema.userCourses.completedAt} IS NOT NULL`
          )
        );
      const completed = Number(completedRow?.completed ?? 0);
      return Math.round((completed / total) * 1000) / 10;
    });
  }

  private async getContentItemMetrics(
    courseId: string,
    ctx: TenantContext
  ): Promise<ContentItemMetric[]> {
    return withTenantContext(this.db, ctx, async (tx) => {
      const rows = await tx
        .select({
          contentItemId: schema.contentItems.id,
          title: schema.contentItems.title,
          viewCount: count(schema.userProgress.id),
          avgTimeSpent: avg(schema.userProgress.timeSpent),
          completedCount: sql<number>`SUM(CASE WHEN ${schema.userProgress.isCompleted} THEN 1 ELSE 0 END)`,
        })
        .from(schema.contentItems)
        .innerJoin(
          schema.modules,
          eq(schema.contentItems.moduleId, schema.modules.id)
        )
        .leftJoin(
          schema.userProgress,
          eq(schema.userProgress.contentItemId, schema.contentItems.id)
        )
        .where(eq(schema.modules.course_id, courseId))
        .groupBy(schema.contentItems.id, schema.contentItems.title);

      return rows.map((r) => {
        const viewCount = Number(r.viewCount ?? 0);
        const completedCount = Number(r.completedCount ?? 0);
        return {
          contentItemId: r.contentItemId,
          title: r.title,
          viewCount,
          avgTimeSpentSeconds: Math.round(Number(r.avgTimeSpent ?? 0)),
          completionRate:
            viewCount > 0
              ? Math.round((completedCount / viewCount) * 1000) / 10
              : 0,
        };
      });
    });
  }

  private async getDropOffFunnel(
    courseId: string,
    ctx: TenantContext
  ): Promise<FunnelStep[]> {
    return withTenantContext(this.db, ctx, async (tx) => {
      const modRows = await tx
        .select({ id: schema.modules.id, title: schema.modules.title })
        .from(schema.modules)
        .where(eq(schema.modules.course_id, courseId))
        .orderBy(schema.modules.order_index);

      const steps: FunnelStep[] = [];
      for (const mod of modRows) {
        const [startedRow] = await tx
          .select({ n: count() })
          .from(schema.userProgress)
          .innerJoin(
            schema.contentItems,
            eq(schema.userProgress.contentItemId, schema.contentItems.id)
          )
          .where(eq(schema.contentItems.moduleId, mod.id));

        const [completedRow] = await tx
          .select({ n: count() })
          .from(schema.userProgress)
          .innerJoin(
            schema.contentItems,
            eq(schema.userProgress.contentItemId, schema.contentItems.id)
          )
          .where(
            and(
              eq(schema.contentItems.moduleId, mod.id),
              eq(schema.userProgress.isCompleted, true)
            )
          );

        const started = Number(startedRow?.n ?? 0);
        const completed = Number(completedRow?.n ?? 0);
        steps.push({
          moduleId: mod.id,
          moduleName: mod.title,
          learnersStarted: started,
          learnersCompleted: completed,
          dropOffRate:
            started > 0
              ? Math.round(((started - completed) / started) * 1000) / 10
              : 0,
        });
      }
      return steps;
    });
  }
}
