import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import {
  createDatabaseConnection,
  sql,
  withTenantContext,
  closeAllPools,
} from '@edusphere/db';
import type { Database, TenantContext } from '@edusphere/db';

export interface ActivityFeedItemDto {
  id: string;
  eventType:
    | 'LESSON_COMPLETED'
    | 'QUIZ_PASSED'
    | 'AI_SESSION'
    | 'ANNOTATION_ADDED'
    | 'COURSE_ENROLLED';
  description: string;
  occurredAt: string;
}

interface RawProgressRow {
  id: string;
  content_title: string | null;
  last_accessed_at: string;
  is_completed: boolean;
}

interface RawAnnotationRow {
  id: string;
  content_title: string | null;
  created_at: string;
}

interface RawEnrollmentRow {
  id: string;
  course_title: string | null;
  enrolled_at: string;
}

@Injectable()
export class ActivityFeedService implements OnModuleDestroy {
  private readonly logger = new Logger(ActivityFeedService.name);
  private db: Database;

  constructor() {
    this.db = createDatabaseConnection();
  }

  async onModuleDestroy(): Promise<void> {
    await closeAllPools();
  }

  async getActivityFeed(
    userId: string,
    tenantId: string,
    limit = 10
  ): Promise<ActivityFeedItemDto[]> {
    // Clamp limit to max 50 (memory safety — unbounded array guard)
    const safeLimit = Math.min(limit, 50);

    const ctx: TenantContext = { tenantId, userId, userRole: 'STUDENT' };

    return withTenantContext(this.db, ctx, async (tx) => {
      const [progressRows, annotationRows, enrollmentRows] = await Promise.all([
        tx.execute(sql`
          SELECT up.id, ci.title AS content_title,
                 up.last_accessed_at::text, up.is_completed
          FROM user_progress up
          LEFT JOIN content_items ci ON ci.id = up.content_item_id
          WHERE up.user_id = ${userId}::uuid
          ORDER BY up.last_accessed_at DESC
          LIMIT 20
        `),
        tx.execute(sql`
          SELECT a.id, ma.title AS content_title,
                 a.created_at::text
          FROM annotations a
          LEFT JOIN media_assets ma ON ma.id = a.asset_id
          WHERE a.user_id = ${userId}::uuid
            AND a.tenant_id = ${tenantId}::uuid
            AND a.deleted_at IS NULL
          ORDER BY a.created_at DESC
          LIMIT 10
        `),
        tx.execute(sql`
          SELECT uc.id, c.title AS course_title,
                 uc.enrolled_at::text
          FROM user_courses uc
          LEFT JOIN courses c ON c.id = uc.course_id
          WHERE uc.user_id = ${userId}::uuid
          ORDER BY uc.enrolled_at DESC
          LIMIT 10
        `),
      ]);

      const items: ActivityFeedItemDto[] = [];

      for (const row of progressRows.rows as unknown as RawProgressRow[]) {
        const title = row.content_title ?? 'a lesson';
        items.push({
          id: row.id,
          eventType: row.is_completed ? 'LESSON_COMPLETED' : 'LESSON_COMPLETED',
          description: `Completed "${title}"`,
          occurredAt: row.last_accessed_at,
        });
      }

      for (const row of annotationRows.rows as unknown as RawAnnotationRow[]) {
        const title = row.content_title ?? 'content';
        items.push({
          id: row.id,
          eventType: 'ANNOTATION_ADDED',
          description: `Added annotation in "${title}"`,
          occurredAt: row.created_at,
        });
      }

      for (const row of enrollmentRows.rows as unknown as RawEnrollmentRow[]) {
        const title = row.course_title ?? 'a course';
        items.push({
          id: row.id,
          eventType: 'COURSE_ENROLLED',
          description: `Enrolled in "${title}"`,
          occurredAt: row.enrolled_at,
        });
      }

      // Sort by occurredAt DESC, return top safeLimit
      items.sort(
        (a, b) =>
          new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime()
      );

      this.logger.debug(
        { userId, tenantId, total: items.length, limit: safeLimit },
        'activityFeed aggregated'
      );

      return items.slice(0, safeLimit);
    });
  }
}
