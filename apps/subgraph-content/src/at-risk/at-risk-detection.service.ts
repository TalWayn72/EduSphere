/**
 * AtRiskDetectionService — Nightly cron detection + metrics computation.
 * Extracted from AtRiskService for file-size compliance (<300 lines).
 * Cron: 2 AM daily  (0 2 * * *)
 */
import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import {
  schema,
  eq,
  and,
  withTenantContext,
  withBypassRLS,
} from '@edusphere/db';
import type { TenantContext } from '@edusphere/db';
import { TIME } from '@edusphere/config';
import { computeRiskScore } from './risk-scorer.js';
import type { LearnerMetrics } from './risk-scorer.js';
import { AtRiskFlagService } from './at-risk-flag.service';

@Injectable()
export class AtRiskDetectionService {
  private readonly logger = new Logger(AtRiskDetectionService.name);

  constructor(private readonly flagService: AtRiskFlagService) {}

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
    const db = this.flagService.getDb();
    const tenants = await withBypassRLS(db, async (tx) =>
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
    const db = this.flagService.getDb();
    const enrollments = await withTenantContext(db, ctx, async (tx) =>
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
    const existingFlag = await this.flagService.findActiveFlag(
      enrollment.userId,
      enrollment.courseId,
      ctx
    );
    if (isAtRisk && !existingFlag) {
      await this.flagService.createFlag(
        enrollment.userId,
        enrollment.courseId,
        ctx.tenantId,
        score,
        factors
      );
      await this.flagService.publishFlagEvent(
        enrollment.userId,
        enrollment.courseId,
        ctx.tenantId,
        score
      );
      return 'flagged';
    }
    if (!isAtRisk && existingFlag) {
      await this.flagService.resolveFlag(existingFlag.id, ctx);
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
    const sevenDaysAgo = new Date(now - TIME.SEVEN_DAYS_MS);
    const db = this.flagService.getDb();
    const [progressRows, quizRows] = await Promise.all([
      withTenantContext(db, ctx, async (tx) =>
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
      withTenantContext(db, ctx, async (tx) =>
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
      ? Math.floor((now - latestActivity.getTime()) / TIME.DAY_MS)
      : 999;
    const estimatedDays = (enrollment.estimatedHours ?? 0) * 3;
    const elapsedDays = Math.floor(
      (now - enrollment.enrolledAt.getTime()) / TIME.DAY_MS
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
}
