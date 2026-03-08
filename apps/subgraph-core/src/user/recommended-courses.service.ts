import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import {
  createDatabaseConnection,
  sql,
  withTenantContext,
  closeAllPools,
} from '@edusphere/db';
import type { Database, TenantContext } from '@edusphere/db';

export interface RecommendedCourseDto {
  courseId: string;
  title: string;
  instructorName: string | null;
  reason: string;
}

interface RawGapRow {
  course_id: string;
  course_title: string | null;
  instructor_name: string | null;
  concept_name: string | null;
}

interface RawTrendingRow {
  course_id: string;
  course_title: string | null;
  instructor_name: string | null;
}

@Injectable()
export class RecommendedCoursesService implements OnModuleDestroy {
  private readonly logger = new Logger(RecommendedCoursesService.name);
  private db: Database;

  constructor() {
    this.db = createDatabaseConnection();
  }

  async onModuleDestroy(): Promise<void> {
    await closeAllPools();
  }

  async getRecommendedCourses(
    userId: string,
    tenantId: string,
    limit = 5
  ): Promise<RecommendedCourseDto[]> {
    const safeLimit = Math.min(limit, 20);
    const ctx: TenantContext = { tenantId, userId, userRole: 'STUDENT' };

    return withTenantContext(this.db, ctx, async (tx) => {
      // First attempt: find courses covering concepts where user has below-PROFICIENT mastery
      const gapRows = await tx.execute(sql`
        SELECT DISTINCT
          c.id AS course_id,
          c.title AS course_title,
          COALESCE(u.display_name, u.first_name || ' ' || u.last_name) AS instructor_name,
          usm.concept_id::text AS concept_name
        FROM user_skill_mastery usm
        JOIN courses c ON c.tenant_id = ${tenantId}::uuid
          AND c.is_published = TRUE
          AND c.deleted_at IS NULL
        LEFT JOIN users u ON u.id = c.instructor_id
        LEFT JOIN user_courses uc
          ON uc.course_id = c.id AND uc.user_id = ${userId}::uuid
        WHERE usm.user_id = ${userId}::uuid
          AND usm.tenant_id = ${tenantId}::uuid
          AND usm.mastery_level IN ('NONE', 'ATTEMPTED', 'FAMILIAR')
          AND uc.id IS NULL
        ORDER BY c.id
        LIMIT ${safeLimit}
      `);

      const gapResults = gapRows.rows as unknown as RawGapRow[];

      if (gapResults.length > 0) {
        const recommendations = gapResults.map((row) => ({
          courseId: row.course_id,
          title: row.course_title ?? 'Untitled Course',
          instructorName: row.instructor_name ?? null,
          reason: `Based on your gap in ${row.concept_name ?? 'this topic'}`,
        }));

        this.logger.debug(
          { userId, tenantId, count: recommendations.length, source: 'gap-based' },
          'recommendedCourses fetched'
        );

        return recommendations;
      }

      // Fallback: top-N most enrolled courses in the tenant that the user is not already in
      const trendingRows = await tx.execute(sql`
        SELECT
          c.id AS course_id,
          c.title AS course_title,
          COALESCE(u.display_name, u.first_name || ' ' || u.last_name) AS instructor_name
        FROM courses c
        LEFT JOIN users u ON u.id = c.instructor_id
        LEFT JOIN user_courses uc_self
          ON uc_self.course_id = c.id AND uc_self.user_id = ${userId}::uuid
        WHERE c.tenant_id = ${tenantId}::uuid
          AND c.is_published = TRUE
          AND c.deleted_at IS NULL
          AND uc_self.id IS NULL
        ORDER BY (
          SELECT COUNT(*) FROM user_courses uc2
          WHERE uc2.course_id = c.id AND uc2.status = 'ACTIVE'
        ) DESC
        LIMIT ${safeLimit}
      `);

      const trendingResults = trendingRows.rows as unknown as RawTrendingRow[];

      const recommendations = trendingResults.map((row) => ({
        courseId: row.course_id,
        title: row.course_title ?? 'Untitled Course',
        instructorName: row.instructor_name ?? null,
        reason: 'Trending in your organization',
      }));

      this.logger.debug(
        { userId, tenantId, count: recommendations.length, source: 'trending-fallback' },
        'recommendedCourses fetched (fallback)'
      );

      return recommendations;
    });
  }
}
