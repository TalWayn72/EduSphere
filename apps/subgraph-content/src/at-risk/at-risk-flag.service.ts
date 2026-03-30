/**
 * AtRiskFlagService — Flag CRUD, queries, NATS publishing, and helpers.
 * Extracted from AtRiskService for file-size compliance (<300 lines).
 * Publishes: EDUSPHERE.risk.learner.flagged
 */
import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import {
  createDatabaseConnection,
  schema,
  eq,
  and,
  withTenantContext,
  closeAllPools,
} from '@edusphere/db';
import type { TenantContext } from '@edusphere/db';
import { connect, StringCodec, type NatsConnection } from 'nats';
import { buildNatsOptions } from '@edusphere/nats-client';
import type { AtRiskLearner } from './at-risk.types.js';

const NATS_SUBJECT = 'EDUSPHERE.risk.learner.flagged';

@Injectable()
export class AtRiskFlagService implements OnModuleDestroy {
  private readonly logger = new Logger(AtRiskFlagService.name);
  private readonly db = createDatabaseConnection();
  private nc: NatsConnection | null = null;
  private readonly sc = StringCodec();

  async onModuleDestroy(): Promise<void> {
    if (this.nc) await this.nc.close().catch(() => undefined);
    await closeAllPools();
    this.logger.log('AtRiskFlagService destroyed - connections closed');
  }

  getDb() {
    return this.db;
  }

  async findActiveFlag(
    learnerId: string,
    courseId: string,
    ctx: TenantContext
  ) {
    const rows = await withTenantContext(this.db, ctx, async (tx) =>
      tx
        .select({ id: schema.atRiskFlags.id })
        .from(schema.atRiskFlags)
        .where(
          and(
            eq(schema.atRiskFlags.learnerId, learnerId),
            eq(schema.atRiskFlags.courseId, courseId),
            eq(schema.atRiskFlags.status, 'active')
          )
        )
        .limit(1)
    );
    return rows[0] ?? null;
  }

  async createFlag(
    learnerId: string,
    courseId: string,
    tenantId: string,
    riskScore: number,
    factors: object
  ): Promise<void> {
    const sysCtx: TenantContext = {
      tenantId,
      userId: 'system',
      userRole: 'SUPER_ADMIN',
    };
    await withTenantContext(this.db, sysCtx, async (tx) =>
      tx.insert(schema.atRiskFlags).values({
        learnerId,
        courseId,
        tenantId,
        riskScore,
        riskFactors: factors,
        status: 'active',
        flaggedAt: new Date(),
      })
    );
    this.logger.log(
      { learnerId, courseId, tenantId, riskScore },
      'Learner flagged as at-risk'
    );
  }

  async resolveFlag(flagId: string, ctx: TenantContext): Promise<void> {
    await withTenantContext(this.db, ctx, async (tx) =>
      tx
        .update(schema.atRiskFlags)
        .set({ status: 'resolved', resolvedAt: new Date() })
        .where(eq(schema.atRiskFlags.id, flagId))
    );
  }

  async publishFlagEvent(
    learnerId: string,
    courseId: string,
    tenantId: string,
    riskScore: number
  ): Promise<void> {
    try {
      // SI-7: Uses buildNatsOptions() for TLS/NKey authentication support.
      if (!this.nc) {
        this.nc = await connect(buildNatsOptions());
      }
      const payload = JSON.stringify({
        learnerId,
        courseId,
        tenantId,
        riskScore,
        flaggedAt: new Date().toISOString(),
      });
      this.nc.publish(NATS_SUBJECT, this.sc.encode(payload));
    } catch (err) {
      this.logger.warn(
        { learnerId, courseId, err },
        'Failed to publish at-risk NATS event'
      );
    }
  }

  async getAtRiskLearners(
    courseId: string,
    ctx: TenantContext
  ): Promise<AtRiskLearner[]> {
    const rows = await withTenantContext(this.db, ctx, async (tx) =>
      tx
        .select()
        .from(schema.atRiskFlags)
        .where(
          and(
            eq(schema.atRiskFlags.courseId, courseId),
            eq(schema.atRiskFlags.status, 'active')
          )
        )
    );
    return rows.map((r) => ({
      id: r.id,
      learnerId: r.learnerId,
      courseId: r.courseId,
      riskScore: r.riskScore,
      riskFactors: toRiskFactorsList(r.riskFactors as Record<string, boolean>),
      flaggedAt: r.flaggedAt.toISOString(),
      daysSinceLastActivity: 0,
      progressPercent: 0,
    }));
  }

  async dismissFlag(flagId: string, ctx: TenantContext): Promise<boolean> {
    await withTenantContext(this.db, ctx, async (tx) =>
      tx
        .update(schema.atRiskFlags)
        .set({ status: 'dismissed', resolvedAt: new Date() })
        .where(
          and(
            eq(schema.atRiskFlags.id, flagId),
            eq(schema.atRiskFlags.tenantId, ctx.tenantId)
          )
        )
    );
    this.logger.log({ flagId, userId: ctx.userId }, 'At-risk flag dismissed');
    return true;
  }
}

function toRiskFactorsList(
  factors: Record<string, boolean>
): Array<{ key: string; description: string }> {
  const labels: Record<string, string> = {
    inactiveForDays: 'No activity for more than 7 days',
    lowProgress: 'Course progress below 30%',
    approachingDeadline: 'Course deadline within 14 days',
    lowQuizPerformance: 'Quiz failure rate above 50%',
    noRecentActivity: 'Active fewer than 2 days this week',
  };
  return Object.entries(factors)
    .filter(([, v]) => v)
    .map(([key]) => ({
      key,
      description: Object.prototype.hasOwnProperty.call(labels, key)
        ? (labels[key as keyof typeof labels] as string)
        : key,
    }));
}
