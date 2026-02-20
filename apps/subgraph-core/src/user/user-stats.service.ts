import { Injectable, Logger } from '@nestjs/common';
import {
  createDatabaseConnection,
  schema,
  sql,
  eq,
  and,
  withTenantContext,
} from '@edusphere/db';
import type { Database, TenantContext } from '@edusphere/db';

export interface DayActivity {
  date: string;
  count: number;
}

export interface UserStats {
  coursesEnrolled: number;
  annotationsCreated: number;
  conceptsMastered: number;
  totalLearningMinutes: number;
  weeklyActivity: DayActivity[];
}

@Injectable()
export class UserStatsService {
  private readonly logger = new Logger(UserStatsService.name);
  private db: Database;

  constructor() {
    this.db = createDatabaseConnection();
  }

  async getMyStats(userId: string, tenantId: string): Promise<UserStats> {
    const ctx: TenantContext = {
      tenantId,
      userId,
      userRole: 'STUDENT',
    };

    return withTenantContext(this.db, ctx, async (tx) => {
      const [enrolled, annotated, progress, activity] = await Promise.all([
        this.countEnrolled(tx, userId),
        this.countAnnotations(tx, userId, tenantId),
        this.sumLearningMinutes(tx, userId),
        this.fetchWeeklyActivity(tx, userId, tenantId),
      ]);

      this.logger.debug(
        { userId, tenantId, enrolled, annotated },
        'myStats aggregated'
      );

      return {
        coursesEnrolled: enrolled,
        annotationsCreated: annotated,
        conceptsMastered: progress.completed,
        totalLearningMinutes: progress.minutes,
        weeklyActivity: activity,
      };
    });
  }

  private async countEnrolled(tx: Database, userId: string): Promise<number> {
    // user_courses is not in the main schema barrel — use raw sql
    const rows = await tx.execute(
      sql`
        SELECT COUNT(*)::int AS count
        FROM user_courses
        WHERE user_id = ${userId}::uuid
          AND status = 'ACTIVE'
      `
    );
    return Number((rows.rows[0] as { count: number } | undefined)?.count ?? 0);
  }

  private async countAnnotations(
    tx: Database,
    userId: string,
    tenantId: string
  ): Promise<number> {
    const rows = await tx
      .select({ count: sql<string>`COUNT(*)` })
      .from(schema.annotations)
      .where(
        and(
          eq(schema.annotations.user_id, userId),
          eq(schema.annotations.tenant_id, tenantId)
        )
      );
    return Number(rows[0]?.count ?? 0);
  }

  private async sumLearningMinutes(
    tx: Database,
    userId: string
  ): Promise<{ completed: number; minutes: number }> {
    // user_progress is not in the main schema barrel — use raw sql
    const rows = await tx.execute(
      sql`
        SELECT
          COALESCE(SUM(CASE WHEN is_completed THEN 1 ELSE 0 END), 0)::int AS completed,
          COALESCE(SUM(time_spent), 0)::int AS total_seconds
        FROM user_progress
        WHERE user_id = ${userId}::uuid
      `
    );
    const row = rows.rows[0] as
      | { completed: number; total_seconds: number }
      | undefined;
    return {
      completed: Number(row?.completed ?? 0),
      minutes: Math.round(Number(row?.total_seconds ?? 0) / 60),
    };
  }

  private async fetchWeeklyActivity(
    tx: Database,
    userId: string,
    tenantId: string
  ): Promise<DayActivity[]> {
    const rows = await tx.execute(
      sql`
        SELECT DATE(created_at)::text AS date, COUNT(*)::int AS count
        FROM annotations
        WHERE user_id = ${userId}::uuid
          AND tenant_id = ${tenantId}::uuid
          AND created_at >= NOW() - INTERVAL '30 days'
        GROUP BY DATE(created_at)
        ORDER BY date ASC
      `
    );

    return (rows.rows as { date: string; count: number }[]).map((r) => ({
      date: r.date,
      count: Number(r.count),
    }));
  }
}
