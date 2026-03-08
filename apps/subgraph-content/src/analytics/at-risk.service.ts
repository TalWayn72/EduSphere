/**
 * AtRiskService — queries at_risk_flags joined with courses and users to
 * return learners that have an active risk flag for the tenant.
 *
 * GDPR: returns displayName only (no email, no PII raw fields).
 * RLS: wrapped in withTenantContext — only tenant-scoped rows are visible.
 */
import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import {
  createDatabaseConnection,
  closeAllPools,
  withTenantContext,
  schema,
  sql,
  and,
  eq,
} from '@edusphere/db';

export interface AtRiskLearnerDto {
  userId: string;
  displayName: string;
  courseId: string;
  courseTitle: string;
  daysSinceActive: number;
  progressPct: number;
}

@Injectable()
export class AtRiskService implements OnModuleDestroy {
  private readonly logger = new Logger(AtRiskService.name);
  private readonly db = createDatabaseConnection();

  async onModuleDestroy(): Promise<void> {
    await closeAllPools();
  }

  async getAtRiskLearners(
    tenantId: string,
    userId: string,
    threshold = 30
  ): Promise<AtRiskLearnerDto[]> {
    this.logger.log(
      `[AtRiskService] getAtRiskLearners tenantId=${tenantId} threshold=${threshold}`
    );

    const ctx = { tenantId, userId, userRole: 'ORG_ADMIN' as const };

    return withTenantContext(this.db, ctx, async (tx) => {
      // Query active at-risk flags for this tenant, join users and courses.
      const rows = await tx
        .select({
          learnerId: schema.atRiskFlags.learnerId,
          courseId: schema.atRiskFlags.courseId,
          flaggedAt: schema.atRiskFlags.flaggedAt,
          displayName: schema.users.display_name,
          courseTitle: schema.courses.title,
          riskScore: schema.atRiskFlags.riskScore,
        })
        .from(schema.atRiskFlags)
        .innerJoin(
          schema.users,
          eq(schema.atRiskFlags.learnerId, schema.users.id)
        )
        .innerJoin(
          schema.courses,
          eq(schema.atRiskFlags.courseId, schema.courses.id)
        )
        .where(
          and(
            sql`${schema.atRiskFlags.tenantId} = ${tenantId}::uuid`,
            eq(schema.atRiskFlags.status, 'active'),
            sql`${schema.atRiskFlags.riskScore} >= ${threshold / 100}`
          )
        );

      return rows.map((r) => {
        const flaggedDate = r.flaggedAt instanceof Date ? r.flaggedAt : new Date(r.flaggedAt);
        const daysSinceActive = Math.floor(
          (Date.now() - flaggedDate.getTime()) / (1000 * 60 * 60 * 24)
        );

        return {
          userId: r.learnerId,
          displayName: r.displayName || `Learner ${r.learnerId.slice(0, 8)}`,
          courseId: r.courseId,
          courseTitle: r.courseTitle,
          daysSinceActive,
          progressPct: Math.round(r.riskScore * 100),
        };
      });
    });
  }
}
