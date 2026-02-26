import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import {
  createDatabaseConnection,
  schema,
  sql,
  eq,
  and,
  withTenantContext,
  closeAllPools,
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
  currentStreak: number;
  longestStreak: number;
}

@Injectable()
export class UserStatsService implements OnModuleDestroy {
  private readonly logger = new Logger(UserStatsService.name);
  private db: Database;

  constructor() {
    this.db = createDatabaseConnection();
  }

  async onModuleDestroy(): Promise<void> {
    await closeAllPools();
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

      const { currentStreak, longestStreak } = this.computeStreaks(activity);

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
        currentStreak,
        longestStreak,
      };
    });
  }

  private computeStreaks(activity: DayActivity[]): {
    currentStreak: number;
    longestStreak: number;
  } {
    // Only consider days with count > 0
    const activeDates = activity
      .filter((a) => a.count > 0)
      .map((a) => a.date)
      .sort();

    if (activeDates.length === 0) {
      return { currentStreak: 0, longestStreak: 0 };
    }

    // currentStreak: count consecutive days going back from today
    const today = new Date().toISOString().slice(0, 10);
    const dateSet = new Set(activeDates);
    let currentStreak = 0;
    const checkDate = new Date(today);
    while (dateSet.has(checkDate.toISOString().slice(0, 10))) {
      currentStreak++;
      checkDate.setDate(checkDate.getDate() - 1);
    }

    // longestStreak: max run of consecutive calendar dates in the sorted list
    let longestStreak = 1;
    let run = 1;
    for (let i = 1; i < activeDates.length; i++) {
      const prev = new Date(activeDates[i - 1] as string);
      const curr = new Date(activeDates[i] as string);
      const diffMs = curr.getTime() - prev.getTime();
      const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
      if (diffDays === 1) {
        run++;
        if (run > longestStreak) longestStreak = run;
      } else {
        run = 1;
      }
    }

    return { currentStreak, longestStreak };
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
