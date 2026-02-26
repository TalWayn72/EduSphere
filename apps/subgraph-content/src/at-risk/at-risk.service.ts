/**
 * at-risk.service.ts - Nightly cron that flags at-risk learners.
 * Cron: 2 AM daily  (0 2 * * *)
 * Publishes: EDUSPHERE.risk.learner.flagged
 * F-003 Performance Risk Detection
 */
import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import {
  createDatabaseConnection,
  schema,
  eq,
  and,
  withTenantContext,
  withBypassRLS,
  closeAllPools,
} from '@edusphere/db';
import type { TenantContext } from '@edusphere/db';
import { connect, StringCodec, type NatsConnection } from 'nats';
import { computeRiskScore } from './risk-scorer.js';
import type { LearnerMetrics } from './risk-scorer.js';
import type { AtRiskLearner } from './at-risk.types.js';

const NATS_SUBJECT = 'EDUSPHERE.risk.learner.flagged';

@Injectable()
export class AtRiskService implements OnModuleDestroy {
  private readonly logger = new Logger(AtRiskService.name);
  private readonly db = createDatabaseConnection();
  private nc: NatsConnection | null = null;
  private readonly sc = StringCodec();

  async onModuleDestroy(): Promise<void> {
    if (this.nc) await this.nc.close().catch(() => undefined);
    await closeAllPools();
    this.logger.log('AtRiskService destroyed - connections closed');
  }

  @Cron('0 2 * * *')
  async runNightlyDetection(): Promise<void> {
    this.logger.log(
      { action: 'AT_RISK_CRON_START' },
      'At-risk detection cron started'
    );
    try {
      await this.detectAcrossAllTenants();
    } catch (err) {
      this.logger.error({ err }, 'At-risk detection cron failed');
    }
  }

  private async detectAcrossAllTenants(): Promise<void> {
    const tenants = await withBypassRLS(this.db, async (tx) =>
      tx.select({ id: schema.tenants.id }).from(schema.tenants)
    );
    for (const tenant of tenants) {
      await this.detectForTenant(tenant.id);
    }
  }

  private async detectForTenant(tenantId: string): Promise<void> {
    const ctx: TenantContext = {
      tenantId,
      userId: 'system',
      userRole: 'SUPER_ADMIN',
    };
    const enrollments = await withTenantContext(this.db, ctx, async (tx) =>
      tx
        .select({
          userId: schema.userCourses.userId,
          courseId: schema.userCourses.courseId,
          enrolledAt: schema.userCourses.enrolledAt,
          estimatedHours: schema.courses.estimated_hours,
        })
        .from(schema.userCourses)
        .innerJoin(
          schema.courses,
          eq(schema.courses.id, schema.userCourses.courseId)
        )
        .where(
          and(
            eq(schema.userCourses.status, 'ACTIVE'),
            eq(schema.courses.tenant_id, tenantId)
          )
        )
    );
    let flagged = 0;
    let resolved = 0;
    for (const enrollment of enrollments) {
      const result = await this.processEnrollment(enrollment, ctx);
      if (result === 'flagged') flagged++;
      if (result === 'resolved') resolved++;
    }
    this.logger.log(
      { tenantId, flagged, resolved, total: enrollments.length },
      'At-risk detection complete for tenant'
    );
  }

  private async processEnrollment(
    enrollment: {
      userId: string;
      courseId: string;
      enrolledAt: Date;
      estimatedHours: number | null;
    },
    ctx: TenantContext
  ): Promise<'flagged' | 'resolved' | 'unchanged'> {
    const metrics = await this.buildMetrics(enrollment, ctx);
    const { score, factors, isAtRisk } = computeRiskScore(metrics);
    const existingFlag = await this.findActiveFlag(
      enrollment.userId,
      enrollment.courseId,
      ctx
    );
    if (isAtRisk && !existingFlag) {
      await this.createFlag(
        enrollment.userId,
        enrollment.courseId,
        ctx.tenantId,
        score,
        factors
      );
      await this.publishFlagEvent(
        enrollment.userId,
        enrollment.courseId,
        ctx.tenantId,
        score
      );
      return 'flagged';
    }
    if (!isAtRisk && existingFlag) {
      await this.resolveFlag(existingFlag.id, ctx);
      return 'resolved';
    }
    return 'unchanged';
  }

  private async buildMetrics(
    enrollment: {
      userId: string;
      courseId: string;
      enrolledAt: Date;
      estimatedHours: number | null;
    },
    ctx: TenantContext
  ): Promise<LearnerMetrics> {
    const now = Date.now();
    const sevenDaysAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
    const [progressRows, quizRows] = await Promise.all([
      withTenantContext(this.db, ctx, async (tx) =>
        tx
          .select({
            lastAccessedAt: schema.userProgress.lastAccessedAt,
            isCompleted: schema.userProgress.isCompleted,
          })
          .from(schema.userProgress)
          .innerJoin(
            schema.contentItems,
            eq(schema.contentItems.id, schema.userProgress.contentItemId)
          )
          .innerJoin(
            schema.modules,
            eq(schema.modules.id, schema.contentItems.moduleId)
          )
          .where(
            and(
              eq(schema.userProgress.userId, enrollment.userId),
              eq(schema.modules.course_id, enrollment.courseId)
            )
          )
      ),
      withTenantContext(this.db, ctx, async (tx) =>
        tx
          .select({ passed: schema.quizResults.passed })
          .from(schema.quizResults)
          .innerJoin(
            schema.contentItems,
            eq(schema.contentItems.id, schema.quizResults.contentItemId)
          )
          .innerJoin(
            schema.modules,
            eq(schema.modules.id, schema.contentItems.moduleId)
          )
          .where(
            and(
              eq(schema.quizResults.userId, enrollment.userId),
              eq(schema.modules.course_id, enrollment.courseId)
            )
          )
      ),
    ]);
    const totalItems = progressRows.length || 1;
    const completedItems = progressRows.filter((r) => r.isCompleted).length;
    const courseProgressPercent = (completedItems / totalItems) * 100;
    const latestActivity = progressRows.reduce<Date | null>(
      (acc, r) => (!acc || r.lastAccessedAt > acc ? r.lastAccessedAt : acc),
      null
    );
    const daysSinceLastActivity = latestActivity
      ? Math.floor((now - latestActivity.getTime()) / 86400000)
      : 999;
    const estimatedDays = (enrollment.estimatedHours ?? 0) * 3;
    const elapsedDays = Math.floor(
      (now - enrollment.enrolledAt.getTime()) / 86400000
    );
    const courseDaysRemaining = Math.max(0, estimatedDays - elapsedDays);
    const failedQuizzes = quizRows.filter((q) => !q.passed).length;
    const quizFailureRate =
      quizRows.length > 0 ? failedQuizzes / quizRows.length : 0;
    const activeInWindow = new Set(
      progressRows
        .filter((r) => r.lastAccessedAt >= sevenDaysAgo)
        .map((r) => r.lastAccessedAt.toDateString())
    ).size;
    return {
      daysSinceLastActivity,
      courseProgressPercent,
      courseDaysRemaining,
      quizFailureRate,
      weeklyActivityDays: activeInWindow,
    };
  }

  private async findActiveFlag(
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

  private async createFlag(
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

  private async resolveFlag(flagId: string, ctx: TenantContext): Promise<void> {
    await withTenantContext(this.db, ctx, async (tx) =>
      tx
        .update(schema.atRiskFlags)
        .set({ status: 'resolved', resolvedAt: new Date() })
        .where(eq(schema.atRiskFlags.id, flagId))
    );
  }

  private async publishFlagEvent(
    learnerId: string,
    courseId: string,
    tenantId: string,
    riskScore: number
  ): Promise<void> {
    try {
      if (!this.nc) {
        const natsUrl = process.env.NATS_URL ?? 'nats://localhost:4222';
        this.nc = await connect({ servers: natsUrl });
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
