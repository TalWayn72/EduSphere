/**
 * PeerReviewAssignmentService — Assignment creation and review submission logic.
 * Extracted from PeerReviewService for file-size compliance (<300 lines).
 * Security: submitReview enforces reviewerId === assignment.reviewerId (IDOR prevention).
 */
import {
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { schema, eq, and, withTenantContext } from '@edusphere/db';
import type { TenantContext } from '@edusphere/db';
import type { AuthContext } from './peer-review.service';
import { PeerReviewCoreService } from './peer-review-core.service';

const DEFAULT_MIN_REVIEWERS = 3;

@Injectable()
export class PeerReviewAssignmentService {
  private readonly logger = new Logger(PeerReviewAssignmentService.name);

  constructor(private readonly core: PeerReviewCoreService) {}

  async createAssignment(
    contentItemId: string,
    submitterId: string,
    submissionText: string,
    ctx: AuthContext
  ): Promise<(typeof schema.peerReviewAssignments.$inferSelect)[]> {
    const tenantCtx: TenantContext = {
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      userRole: ctx.userRole,
    };

    const rubric = await this.core.getRubric(contentItemId, ctx);
    const minReviewers = rubric?.minReviewers ?? DEFAULT_MIN_REVIEWERS;

    const enrollments = await withTenantContext(
      this.core.getDb(),
      tenantCtx,
      async (tx) =>
        tx
          .select({ userId: schema.userCourses.userId })
          .from(schema.userCourses)
          .where(eq(schema.userCourses.status, 'ACTIVE'))
    );

    const candidates = enrollments
      .map((e) => e.userId)
      .filter((id) => id !== submitterId);

    const shuffled = candidates.sort(() => Math.random() - 0.5);
    const reviewers = shuffled.slice(0, minReviewers);

    if (reviewers.length === 0) {
      this.logger.warn(
        { contentItemId, submitterId, tenantId: ctx.tenantId },
        'No eligible peer reviewers found — creating assignment with empty reviewer list'
      );
      return [];
    }

    const insertRows = reviewers.map((reviewerId) => ({
      tenantId: ctx.tenantId,
      contentItemId,
      submitterId,
      reviewerId,
      status: 'PENDING' as const,
      submissionText,
    }));

    const created = await withTenantContext(
      this.core.getDb(),
      tenantCtx,
      async (tx) =>
        tx.insert(schema.peerReviewAssignments).values(insertRows).returning()
    );

    for (const assignment of created) {
      this.core.publishEvent('EDUSPHERE.peer.review.assigned', {
        assignmentId: assignment.id,
        contentItemId,
        submitterId,
        reviewerId: assignment.reviewerId,
        tenantId: ctx.tenantId,
      });
    }

    this.logger.log(
      {
        contentItemId,
        submitterId,
        reviewerCount: created.length,
        tenantId: ctx.tenantId,
      },
      'Peer review assignments created'
    );
    return created;
  }

  async submitReview(
    assignmentId: string,
    reviewerId: string,
    criteriaScores: string,
    feedback: string,
    ctx: AuthContext
  ): Promise<boolean> {
    const tenantCtx: TenantContext = {
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      userRole: ctx.userRole,
    };

    const rows = await withTenantContext(
      this.core.getDb(),
      tenantCtx,
      async (tx) =>
        tx
          .select()
          .from(schema.peerReviewAssignments)
          .where(
            and(
              eq(schema.peerReviewAssignments.id, assignmentId),
              eq(schema.peerReviewAssignments.tenantId, ctx.tenantId)
            )
          )
    );

    const assignment = rows[0];
    if (!assignment) {
      throw new NotFoundException(
        `Peer review assignment ${assignmentId} not found`
      );
    }

    if (assignment.reviewerId !== reviewerId) {
      this.logger.warn(
        {
          assignmentId,
          reviewerId,
          expectedReviewerId: assignment.reviewerId,
          tenantId: ctx.tenantId,
        },
        'IDOR attempt — reviewerId does not match assignment.reviewerId'
      );
      throw new UnauthorizedException(
        'You are not the assigned reviewer for this assignment'
      );
    }

    const parsed = JSON.parse(criteriaScores) as Record<string, number>;
    const scores = Object.values(parsed);
    const score =
      scores.length > 0
        ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
        : null;

    await withTenantContext(this.core.getDb(), tenantCtx, async (tx) =>
      tx
        .update(schema.peerReviewAssignments)
        .set({
          status: 'SUBMITTED',
          feedback,
          score,
          submittedAt: new Date(),
        })
        .where(
          and(
            eq(schema.peerReviewAssignments.id, assignmentId),
            eq(schema.peerReviewAssignments.tenantId, ctx.tenantId)
          )
        )
    );

    this.logger.log(
      { assignmentId, reviewerId, tenantId: ctx.tenantId },
      'Peer review submitted'
    );

    await this.core.checkAndPublishCompletion(
      assignment.submitterId,
      assignment.contentItemId,
      ctx,
      tenantCtx
    );

    return true;
  }
}
