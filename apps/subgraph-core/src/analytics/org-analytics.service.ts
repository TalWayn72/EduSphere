/**
 * OrgAnalyticsService — KPI aggregation for organization dashboards.
 *
 * Features:
 *   - Live KPI computation (active learners, completion rate, learning hours)
 *   - Top courses by enrollment
 *   - Daily analytics snapshots
 *   - Date range filtering
 *   - All queries scoped via withTenantContext (RLS enforced)
 */
import {
  Injectable,
  Logger,
  OnModuleDestroy,
} from '@nestjs/common';
import {
  createDatabaseConnection,
  closeAllPools,
  withTenantContext,
  sql,
} from '@edusphere/db';
import type { Database, TenantContext } from '@edusphere/db';

export interface DateRangeInput {
  from: Date;
  to: Date;
}

export interface CourseAnalytics {
  courseId: string;
  title: string;
  enrollmentCount: number;
  completionRate: number;
  avgTimeToComplete: number | null;
}

export interface AnalyticsSnapshot {
  date: string;
  activeLearners: number;
  completions: number;
  newEnrollments: number;
  learningMinutes: number;
}

export interface OrgAnalytics {
  activeLearners: number;
  totalEnrollments: number;
  completionRate: number;
  totalLearningHours: number;
  topCourses: CourseAnalytics[];
  dailySnapshots: AnalyticsSnapshot[];
}

@Injectable()
export class OrgAnalyticsService implements OnModuleDestroy {
  private readonly logger = new Logger(OrgAnalyticsService.name);
  private readonly db: Database;

  constructor() {
    this.db = createDatabaseConnection();
  }

  async onModuleDestroy(): Promise<void> {
    await closeAllPools();
    this.logger.log('[OrgAnalyticsService] onModuleDestroy: cleaned up');
  }

  async getOrgAnalytics(
    ctx: TenantContext,
    dateRange: DateRangeInput
  ): Promise<OrgAnalytics> {
    const [kpis, topCourses, snapshots] = await Promise.all([
      this.computeKpis(ctx, dateRange),
      this.getTopCourses(ctx, dateRange),
      this.getDailySnapshots(ctx, dateRange),
    ]);

    return {
      ...kpis,
      topCourses,
      dailySnapshots: snapshots,
    };
  }

  private async computeKpis(
    ctx: TenantContext,
    dateRange: DateRangeInput
  ): Promise<{
    activeLearners: number;
    totalEnrollments: number;
    completionRate: number;
    totalLearningHours: number;
  }> {
    return withTenantContext(this.db, ctx, async (tx) => {
      const result = await tx.execute<{
        active_learners: string;
        total_enrollments: string;
        completed_count: string;
        total_minutes: string;
      }>(sql`
        SELECT
          COUNT(DISTINCT CASE
            WHEN uc.last_accessed_at >= ${dateRange.from.toISOString()}::timestamptz
            THEN uc.user_id
          END)::text AS active_learners,
          COUNT(*)::text AS total_enrollments,
          COUNT(CASE WHEN uc.completed_at IS NOT NULL THEN 1 END)::text AS completed_count,
          COALESCE(SUM(
            CASE WHEN up.time_spent_seconds IS NOT NULL
              THEN up.time_spent_seconds / 60.0
              ELSE 0
            END
          ), 0)::text AS total_minutes
        FROM user_courses uc
        LEFT JOIN user_progress up ON up.user_id = uc.user_id AND up.course_id = uc.course_id
        WHERE uc.enrolled_at >= ${dateRange.from.toISOString()}::timestamptz
          AND uc.enrolled_at <= ${dateRange.to.toISOString()}::timestamptz
      `);

      const row = result.rows[0];
      const totalEnrollments = Number(row?.total_enrollments ?? 0);
      const completedCount = Number(row?.completed_count ?? 0);

      return {
        activeLearners: Number(row?.active_learners ?? 0),
        totalEnrollments,
        completionRate: totalEnrollments > 0
          ? Math.round((completedCount / totalEnrollments) * 10000) / 100
          : 0,
        totalLearningHours: Math.round(
          Number(row?.total_minutes ?? 0) / 60 * 100
        ) / 100,
      };
    });
  }

  private async getTopCourses(
    ctx: TenantContext,
    dateRange: DateRangeInput
  ): Promise<CourseAnalytics[]> {
    return withTenantContext(this.db, ctx, async (tx) => {
      const result = await tx.execute<{
        course_id: string;
        title: string;
        enrollment_count: string;
        completed_count: string;
        avg_time_seconds: string | null;
      }>(sql`
        SELECT
          c.id::text AS course_id,
          c.title,
          COUNT(uc.id)::text AS enrollment_count,
          COUNT(uc.completed_at)::text AS completed_count,
          AVG(
            EXTRACT(EPOCH FROM (uc.completed_at - uc.enrolled_at))
          )::text AS avg_time_seconds
        FROM courses c
        LEFT JOIN user_courses uc ON uc.course_id = c.id
          AND uc.enrolled_at >= ${dateRange.from.toISOString()}::timestamptz
          AND uc.enrolled_at <= ${dateRange.to.toISOString()}::timestamptz
        GROUP BY c.id, c.title
        ORDER BY COUNT(uc.id) DESC
        LIMIT 10
      `);

      return result.rows.map((r) => {
        const enrollmentCount = Number(r.enrollment_count);
        const completedCount = Number(r.completed_count);
        return {
          courseId: r.course_id,
          title: r.title,
          enrollmentCount,
          completionRate: enrollmentCount > 0
            ? Math.round((completedCount / enrollmentCount) * 10000) / 100
            : 0,
          avgTimeToComplete: r.avg_time_seconds
            ? Math.round(Number(r.avg_time_seconds) / 3600 * 100) / 100
            : null,
        };
      });
    });
  }

  private async getDailySnapshots(
    ctx: TenantContext,
    dateRange: DateRangeInput
  ): Promise<AnalyticsSnapshot[]> {
    return withTenantContext(this.db, ctx, async (tx) => {
      const result = await tx.execute<{
        snapshot_date: string;
        active_learners: string;
        completions: string;
        new_enrollments: string;
        learning_minutes: string;
      }>(sql`
        SELECT
          snapshot_date::text,
          active_learners::text,
          completions::text,
          new_enrollments::text,
          total_learning_minutes::text AS learning_minutes
        FROM tenant_analytics_snapshots
        WHERE tenant_id = ${ctx.tenantId}::uuid
          AND snapshot_date >= ${dateRange.from.toISOString()}::date
          AND snapshot_date <= ${dateRange.to.toISOString()}::date
          AND snapshot_type = 'daily'
        ORDER BY snapshot_date ASC
      `);

      return result.rows.map((r) => ({
        date: r.snapshot_date,
        activeLearners: Number(r.active_learners),
        completions: Number(r.completions),
        newEnrollments: Number(r.new_enrollments),
        learningMinutes: Number(r.learning_minutes),
      }));
    });
  }
}
