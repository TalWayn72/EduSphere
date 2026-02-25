import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import {
  createDatabaseConnection,
  schema,
  sql,
  eq,
  withBypassRLS,
  closeAllPools,
} from '@edusphere/db';
import type { Database } from '@edusphere/db';
import { parsePreferences } from './user-preferences.service';

export interface PublicCourse {
  id: string;
  title: string;
  completedAt: string;
}

export interface PublicProfile {
  userId: string;
  displayName: string;
  bio: string | null;
  avatarUrl: string | null;
  joinedAt: string;
  currentStreak: number;
  longestStreak: number;
  completedCoursesCount: number;
  completedCourses: PublicCourse[];
  badgesCount: number;
  conceptsMastered: number;
  totalLearningMinutes: number;
}

@Injectable()
export class PublicProfileService implements OnModuleDestroy {
  private readonly logger = new Logger(PublicProfileService.name);
  private db: Database;

  constructor() {
    this.db = createDatabaseConnection();
  }

  async onModuleDestroy(): Promise<void> {
    await closeAllPools();
  }

  async getPublicProfile(userId: string): Promise<PublicProfile | null> {
    return withBypassRLS(this.db, async (tx) => {
      // 1. Fetch user and verify public opt-in
      const [user] = await tx
        .select({
          id: schema.users.id,
          display_name: schema.users.display_name,
          avatar_url: schema.users.avatar_url,
          preferences: schema.users.preferences,
          created_at: schema.users.created_at,
        })
        .from(schema.users)
        .where(eq(schema.users.id, userId))
        .limit(1);

      if (!user) return null;

      const prefs = parsePreferences(user.preferences);
      if (!prefs.isPublicProfile) {
        this.logger.debug({ userId }, 'publicProfile requested but profile is private');
        return null;
      }

      // 2. Fetch completed public courses (PUBLISHED only)
      const completedRows = await tx.execute(sql`
        SELECT uc.id, c.id AS course_id, c.title, uc.completed_at
        FROM user_courses uc
        JOIN courses c ON c.id = uc.course_id
        WHERE uc.user_id = ${userId}::uuid
          AND uc.status = 'COMPLETED'
          AND uc.completed_at IS NOT NULL
          AND c.is_published = TRUE
        ORDER BY uc.completed_at DESC
        LIMIT 50
      `);

      // 3. Badge count
      const badgeRows = await tx.execute(sql`
        SELECT COUNT(*)::int AS count
        FROM user_badges
        WHERE user_id = ${userId}::uuid
      `);

      // 4. Learning stats (concepts + minutes)
      const progressRows = await tx.execute(sql`
        SELECT
          COALESCE(SUM(CASE WHEN is_completed THEN 1 ELSE 0 END), 0)::int AS completed,
          COALESCE(SUM(time_spent), 0)::int AS total_seconds
        FROM user_progress
        WHERE user_id = ${userId}::uuid
      `);

      const courseList = (
        completedRows.rows as { course_id: string; title: string; completed_at: string }[]
      ).map((r) => ({
        id: r.course_id,
        title: r.title,
        completedAt: r.completed_at
          ? new Date(r.completed_at).toISOString()
          : new Date().toISOString(),
      }));

      const badgeCount = Number(
        (badgeRows.rows[0] as { count: number } | undefined)?.count ?? 0,
      );

      const progressRow = progressRows.rows[0] as
        | { completed: number; total_seconds: number }
        | undefined;

      const joinedAt = user.created_at instanceof Date
        ? user.created_at.toISOString()
        : String(user.created_at);

      this.logger.debug({ userId, badgeCount, courses: courseList.length }, 'publicProfile fetched');

      return {
        userId: user.id,
        displayName: user.display_name || userId,
        bio: null,
        avatarUrl: user.avatar_url ?? null,
        joinedAt,
        currentStreak: 0,
        longestStreak: 0,
        completedCoursesCount: courseList.length,
        completedCourses: courseList,
        badgesCount: badgeCount,
        conceptsMastered: Number(progressRow?.completed ?? 0),
        totalLearningMinutes: Math.round(Number(progressRow?.total_seconds ?? 0) / 60),
      };
    });
  }
}
