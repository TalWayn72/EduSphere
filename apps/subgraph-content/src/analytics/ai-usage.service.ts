import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import {
  createDatabaseConnection,
  closeAllPools,
  schema,
  withTenantContext,
} from '@edusphere/db';
import type { TenantContext } from '@edusphere/db';
import { sql, count } from 'drizzle-orm';

export interface AiUsageStats {
  totalRequests: number;
  uniqueLearnersUsed: number;
  estimatedTokensUsed: number;
  topCourseId: string | null;
  topCourseRequests: number;
}

const AVG_TOKENS_PER_REQUEST = 500;
// xAPI verb IDs for AI tutor usage (stored in verb.id inside the jsonb column)
const AI_VERB_IDS = [
  'https://edusphere.io/xapi/verbs/used-ai-tutor',
  'used-ai-tutor',
];

@Injectable()
export class AiUsageService implements OnModuleDestroy {
  private readonly logger = new Logger(AiUsageService.name);
  private readonly db = createDatabaseConnection();

  async onModuleDestroy(): Promise<void> {
    await closeAllPools();
  }

  async getAiUsageStats(tenantId: string): Promise<AiUsageStats> {
    const ctx: TenantContext = {
      tenantId,
      userId: 'system',
      userRole: 'ORG_ADMIN',
    };

    return withTenantContext(this.db, ctx, async (tx) => {
      // verb is jsonb: match on verb->>'id' for known AI tutor verb IDs
      const verbFilter = sql`(
        verb->>'id' = ANY(ARRAY[${sql.join(AI_VERB_IDS.map((v) => sql`${v}`), sql`, `)}])
      )`;

      // Total AI requests
      const [totalRow] = await tx
        .select({ total: count() })
        .from(schema.xapiStatements)
        .where(verbFilter);

      const totalRequests = Number(totalRow?.total ?? 0);

      if (totalRequests === 0) {
        this.logger.warn(
          `[AiUsageService] getAiUsageStats: no AI tutor xAPI statements found for tenant=${tenantId}`
        );
        return {
          totalRequests: 0,
          uniqueLearnersUsed: 0,
          estimatedTokensUsed: 0,
          topCourseId: null,
          topCourseRequests: 0,
        };
      }

      // Unique learners — actor is jsonb, use actor->>'mbox' as actor identifier
      const [uniqueRow] = await tx
        .select({
          unique: sql<number>`COUNT(DISTINCT (actor->>'mbox'))`,
        })
        .from(schema.xapiStatements)
        .where(verbFilter);

      const uniqueLearnersUsed = Number(uniqueRow?.unique ?? 0);

      // Top course — context->>'courseId' if present
      const topRows = await tx
        .select({
          courseId: sql<string>`context->>'courseId'`,
          requestCount: count(),
        })
        .from(schema.xapiStatements)
        .where(sql`${verbFilter} AND context->>'courseId' IS NOT NULL`)
        .groupBy(sql`context->>'courseId'`)
        .orderBy(sql`COUNT(*) DESC`)
        .limit(1);

      const topCourse = topRows[0] ?? null;

      this.logger.log(
        `[AiUsageService] tenant=${tenantId} totalRequests=${totalRequests} unique=${uniqueLearnersUsed}`
      );

      return {
        totalRequests,
        uniqueLearnersUsed,
        estimatedTokensUsed: totalRequests * AVG_TOKENS_PER_REQUEST,
        topCourseId: topCourse?.courseId ?? null,
        topCourseRequests: Number(topCourse?.requestCount ?? 0),
      };
    });
  }

  async getAiUsageStatsByTenantCtx(ctx: TenantContext): Promise<AiUsageStats> {
    return this.getAiUsageStats(ctx.tenantId);
  }
}
