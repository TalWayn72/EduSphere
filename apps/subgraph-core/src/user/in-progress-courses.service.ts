import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import {
  createDatabaseConnection,
  sql,
  withTenantContext,
  closeAllPools,
} from '@edusphere/db';
import type { Database, TenantContext } from '@edusphere/db';

export interface InProgressCourseDto {
  id: string;
  courseId: string;
  title: string;
  progress: number;
  lastAccessedAt: string | null;
  instructorName: string | null;
}

interface RawInProgressRow {
  id: string;
  course_id: string;
  course_title: string | null;
  last_accessed_at: string | null;
  instructor_name: string | null;
  completed_items: number;
  total_items: number;
}

@Injectable()
export class InProgressCoursesService implements OnModuleDestroy {
  private readonly logger = new Logger(InProgressCoursesService.name);
  private db: Database;

  constructor() {
    this.db = createDatabaseConnection();
  }

  async onModuleDestroy(): Promise<void> {
    await closeAllPools();
  }

  async getInProgressCourses(
    userId: string,
    tenantId: string,
    limit = 5
  ): Promise<InProgressCourseDto[]> {
    const safeLimit = Math.min(limit, 20);
    const ctx: TenantContext = { tenantId, userId, userRole: 'STUDENT' };

    return withTenantContext(this.db, ctx, async (tx) => {
      // Join user_courses with courses for title + instructor, with progress stats
      const rows = await tx.execute(sql`
        SELECT
          uc.id,
          uc.course_id,
          c.title AS course_title,
          MAX(up.last_accessed_at)::text AS last_accessed_at,
          COALESCE(u.display_name, u.first_name || ' ' || u.last_name) AS instructor_name,
          COUNT(CASE WHEN up.is_completed THEN 1 END)::int AS completed_items,
          COUNT(ci.id)::int AS total_items
        FROM user_courses uc
        LEFT JOIN courses c ON c.id = uc.course_id
        LEFT JOIN users u ON u.id = c.created_by
        LEFT JOIN content_items ci ON ci.course_id = uc.course_id
        LEFT JOIN user_progress up
          ON up.content_item_id = ci.id
          AND up.user_id = uc.user_id
        WHERE uc.user_id = ${userId}::uuid
          AND uc.status = 'ACTIVE'
        GROUP BY uc.id, uc.course_id, c.title, u.display_name, u.first_name, u.last_name
        ORDER BY last_accessed_at DESC NULLS LAST
        LIMIT ${safeLimit}
      `);

      const result = (rows.rows as unknown as RawInProgressRow[]).map((row) => {
        const completed = Number(row.completed_items ?? 0);
        const total = Number(row.total_items ?? 0);
        const progress =
          total > 0 ? Math.round((completed / total) * 100) : 0;

        return {
          id: row.id,
          courseId: row.course_id,
          title: row.course_title ?? 'Untitled Course',
          progress,
          lastAccessedAt: row.last_accessed_at ?? null,
          instructorName: row.instructor_name ?? null,
        };
      });

      this.logger.debug(
        { userId, tenantId, count: result.length },
        'inProgressCourses fetched'
      );

      return result;
    });
  }
}
