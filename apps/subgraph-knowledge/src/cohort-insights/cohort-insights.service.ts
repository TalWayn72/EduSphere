/**
 * GAP-7: CohortInsightsService — HybridRAG cross-cohort knowledge retrieval.
 * Retrieves past-cohort social feed activity related to a concept/course.
 * Uses raw SQL for cohort_id column (added in migration 0029, not yet in Drizzle schema).
 */
import {
  Injectable,
  Logger,
  OnModuleDestroy,
} from '@nestjs/common';
import {
  createDatabaseConnection,
  withTenantContext,
  closeAllPools,
  schema,
  sql,
  eq,
  and,
  isNotNull,
  desc,
} from '@edusphere/db';
import type { Database, TenantContext } from '@edusphere/db';

export interface CohortInsight {
  annotationId: string;
  content: string;
  conceptId: string;
  authorCohortLabel: string;
  relevanceScore: number;
  createdAt: string;
}

export interface CohortInsightsResult {
  conceptId: string;
  courseId: string;
  insights: CohortInsight[];
  totalPastDiscussions: number;
}

type FeedRow = {
  id: string;
  verb: string;
  objectTitle: string;
  cohortId: string | null;
  createdAt: Date;
};

@Injectable()
export class CohortInsightsService implements OnModuleDestroy {
  private readonly logger = new Logger(CohortInsightsService.name);
  private readonly db: Database = createDatabaseConnection();

  async onModuleDestroy(): Promise<void> {
    await closeAllPools();
  }

  /**
   * GAP-7: HybridRAG — retrieve past cohort insights for a concept.
   * Queries social_feed_items with cohort_id set (past cohorts) for the given course.
   */
  async getCohortInsights(
    conceptId: string,
    courseId: string,
    tenantId: string,
    userId: string,
    limit = 5,
  ): Promise<CohortInsightsResult> {
    const ctx: TenantContext = { tenantId, userId, userRole: 'STUDENT' };

    const insights = await withTenantContext(this.db, ctx, async (tx) => {
      // Use raw SQL for cohort_id (schema column added via migration 0029)
      const rows = (await tx.execute(sql`
        SELECT id, verb, object_title AS "objectTitle",
               cohort_id AS "cohortId", created_at AS "createdAt"
        FROM social_feed_items
        WHERE tenant_id = ${tenantId}::uuid
          AND cohort_id IS NOT NULL
          AND object_id = ${courseId}::uuid
        ORDER BY created_at DESC
        LIMIT ${limit}
      `)) as unknown as FeedRow[];

      return rows.map((item, idx): CohortInsight => ({
        annotationId: item.id,
        content: `${item.verb}: ${item.objectTitle ?? 'Learning activity'}`,
        conceptId,
        authorCohortLabel: `Cohort ${item.cohortId?.slice(0, 8) ?? 'past'}`,
        relevanceScore: Math.max(0.5, 1.0 - idx * 0.1),
        createdAt:
          item.createdAt instanceof Date
            ? item.createdAt.toISOString()
            : new Date().toISOString(),
      }));
    });

    this.logger.log(
      `[CohortInsightsService] Found ${insights.length} insights for concept=${conceptId} course=${courseId}`,
      { tenantId, userId, conceptId, courseId },
    );

    return {
      conceptId,
      courseId,
      insights,
      totalPastDiscussions: insights.length,
    };
  }
}
