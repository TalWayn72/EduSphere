/**
 * PeerReviewService — Phase 45: Social Learning
 * Handles rubric creation, assignment distribution, and review submission.
 * Security: submitReview enforces reviewerId === assignment.reviewerId (IDOR prevention).
 * Memory: NATS connection opened in onModuleInit, drained in onModuleDestroy.
 */
import {
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import {
  connect,
  StringCodec,
  type NatsConnection,
} from 'nats';
import {
  createDatabaseConnection,
  closeAllPools,
  schema,
  eq,
  and,
  withTenantContext,
} from '@edusphere/db';
import type { TenantContext } from '@edusphere/db';
import type { RubricCriteria } from '@edusphere/db';

const NATS_PEER_REVIEW_ASSIGNED = 'EDUSPHERE.peer.review.assigned';
const NATS_PEER_REVIEW_COMPLETED = 'EDUSPHERE.peer.review.completed';
const DEFAULT_MIN_REVIEWERS = 3;

export interface CreateRubricInput {
  contentItemId: string;
  criteria: string;
  minReviewers?: number;
  isAnonymous?: boolean;
}

export interface AuthContext {
  tenantId: string;
  userId: string;
  userRole: TenantContext['userRole'];
}

@Injectable()
export class PeerReviewService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PeerReviewService.name);
  private readonly db = createDatabaseConnection();
  private readonly sc = StringCodec();
  private natsConn: NatsConnection | null = null;

  async onModuleInit(): Promise<void> {
    try {
      this.natsConn = await connect({ servers: process.env['NATS_URL'] ?? 'nats://localhost:4222' });
      this.logger.log('PeerReviewService NATS connected');
    } catch (err) {
      this.logger.warn({ err }, 'PeerReviewService NATS connect failed — running without events');
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.natsConn) {
      await this.natsConn.drain().catch(() => undefined);
      this.natsConn = null;
    }
    await closeAllPools();
    this.logger.log('PeerReviewService destroyed — NATS drained, DB pools closed');
  }

  // ---------------------------------------------------------------------------
  // Rubric
  // ---------------------------------------------------------------------------

  async createRubric(
    input: CreateRubricInput,
    ctx: AuthContext,
  ): Promise<typeof schema.peerReviewRubrics.$inferSelect> {
    const tenantCtx: TenantContext = {
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      userRole: ctx.userRole,
    };
    const parsedCriteria = JSON.parse(input.criteria) as RubricCriteria[];
    const [rubric] = await withTenantContext(this.db, tenantCtx, async (tx) =>
      tx
        .insert(schema.peerReviewRubrics)
        .values({
          tenantId: ctx.tenantId,
          contentItemId: input.contentItemId,
          criteria: parsedCriteria,
          minReviewers: input.minReviewers ?? DEFAULT_MIN_REVIEWERS,
          isAnonymous: input.isAnonymous ?? false,
        })
        .returning(),
    );
    this.logger.log(
      { rubricId: rubric!.id, contentItemId: input.contentItemId, tenantId: ctx.tenantId },
      'Peer review rubric created',
    );
    return rubric!;
  }

  async getRubric(
    contentItemId: string,
    ctx: AuthContext,
  ): Promise<typeof schema.peerReviewRubrics.$inferSelect | null> {
    const tenantCtx: TenantContext = {
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      userRole: ctx.userRole,
    };
    const rows = await withTenantContext(this.db, tenantCtx, async (tx) =>
      tx
        .select()
        .from(schema.peerReviewRubrics)
        .where(
          and(
            eq(schema.peerReviewRubrics.contentItemId, contentItemId),
            eq(schema.peerReviewRubrics.tenantId, ctx.tenantId),
          ),
        ),
    );
    return rows[0] ?? null;
  }

  // ---------------------------------------------------------------------------
  // Assignment creation
  // ---------------------------------------------------------------------------

  async createAssignment(
    contentItemId: string,
    submitterId: string,
    submissionText: string,
    ctx: AuthContext,
  ): Promise<(typeof schema.peerReviewAssignments.$inferSelect)[]> {
    const tenantCtx: TenantContext = {
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      userRole: ctx.userRole,
    };

    // Look up rubric to determine minReviewers
    const rubric = await this.getRubric(contentItemId, ctx);
    const minReviewers = rubric?.minReviewers ?? DEFAULT_MIN_REVIEWERS;

    // Fetch enrolled users in the same tenant (exclude submitter)
    // userCourses is the enrollment table (no tenant_id column — scoped via RLS)
    const enrollments = await withTenantContext(this.db, tenantCtx, async (tx) =>
      tx
        .select({ userId: schema.userCourses.userId })
        .from(schema.userCourses)
        .where(eq(schema.userCourses.status, 'ACTIVE')),
    );

    const candidates = enrollments
      .map((e) => e.userId)
      .filter((id) => id !== submitterId);

    // Random shuffle and take minReviewers
    const shuffled = candidates.sort(() => Math.random() - 0.5);
    const reviewers = shuffled.slice(0, minReviewers);

    if (reviewers.length === 0) {
      this.logger.warn(
        { contentItemId, submitterId, tenantId: ctx.tenantId },
        'No eligible peer reviewers found — creating assignment with empty reviewer list',
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

    const created = await withTenantContext(this.db, tenantCtx, async (tx) =>
      tx
        .insert(schema.peerReviewAssignments)
        .values(insertRows)
        .returning(),
    );

    // Publish NATS event per reviewer
    for (const assignment of created) {
      this.publishEvent(NATS_PEER_REVIEW_ASSIGNED, {
        assignmentId: assignment.id,
        contentItemId,
        submitterId,
        reviewerId: assignment.reviewerId,
        tenantId: ctx.tenantId,
      });
    }

    this.logger.log(
      { contentItemId, submitterId, reviewerCount: created.length, tenantId: ctx.tenantId },
      'Peer review assignments created',
    );
    return created;
  }

  // ---------------------------------------------------------------------------
  // Review submission
  // ---------------------------------------------------------------------------

  async submitReview(
    assignmentId: string,
    reviewerId: string,
    criteriaScores: string,
    feedback: string,
    ctx: AuthContext,
  ): Promise<boolean> {
    const tenantCtx: TenantContext = {
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      userRole: ctx.userRole,
    };

    // Fetch the assignment first
    const rows = await withTenantContext(this.db, tenantCtx, async (tx) =>
      tx
        .select()
        .from(schema.peerReviewAssignments)
        .where(
          and(
            eq(schema.peerReviewAssignments.id, assignmentId),
            eq(schema.peerReviewAssignments.tenantId, ctx.tenantId),
          ),
        ),
    );

    const assignment = rows[0];
    if (!assignment) {
      throw new NotFoundException(`Peer review assignment ${assignmentId} not found`);
    }

    // IDOR prevention: reviewer MUST match assignment.reviewerId
    if (assignment.reviewerId !== reviewerId) {
      this.logger.warn(
        { assignmentId, reviewerId, expectedReviewerId: assignment.reviewerId, tenantId: ctx.tenantId },
        'IDOR attempt — reviewerId does not match assignment.reviewerId',
      );
      throw new UnauthorizedException('You are not the assigned reviewer for this assignment');
    }

    const parsed = JSON.parse(criteriaScores) as Record<string, number>;
    const scores = Object.values(parsed);
    const score = scores.length > 0
      ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
      : null;

    await withTenantContext(this.db, tenantCtx, async (tx) =>
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
            eq(schema.peerReviewAssignments.tenantId, ctx.tenantId),
          ),
        ),
    );

    this.logger.log(
      { assignmentId, reviewerId, tenantId: ctx.tenantId },
      'Peer review submitted',
    );

    // Check if all assignments for this submitter are complete
    await this.checkAndPublishCompletion(assignment.submitterId, assignment.contentItemId, ctx, tenantCtx);

    return true;
  }

  // ---------------------------------------------------------------------------
  // Queries
  // ---------------------------------------------------------------------------

  async getMyAssignmentsToReview(
    reviewerId: string,
    ctx: AuthContext,
  ): Promise<(typeof schema.peerReviewAssignments.$inferSelect)[]> {
    const tenantCtx: TenantContext = {
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      userRole: ctx.userRole,
    };
    return withTenantContext(this.db, tenantCtx, async (tx) =>
      tx
        .select()
        .from(schema.peerReviewAssignments)
        .where(
          and(
            eq(schema.peerReviewAssignments.reviewerId, reviewerId),
            eq(schema.peerReviewAssignments.tenantId, ctx.tenantId),
            eq(schema.peerReviewAssignments.status, 'PENDING'),
          ),
        ),
    );
  }

  async getMySubmissions(
    submitterId: string,
    ctx: AuthContext,
  ): Promise<(typeof schema.peerReviewAssignments.$inferSelect)[]> {
    const tenantCtx: TenantContext = {
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      userRole: ctx.userRole,
    };
    return withTenantContext(this.db, tenantCtx, async (tx) =>
      tx
        .select()
        .from(schema.peerReviewAssignments)
        .where(
          and(
            eq(schema.peerReviewAssignments.submitterId, submitterId),
            eq(schema.peerReviewAssignments.tenantId, ctx.tenantId),
          ),
        ),
    );
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private publishEvent(subject: string, data: Record<string, unknown>): void {
    if (!this.natsConn) return;
    try {
      this.natsConn.publish(subject, this.sc.encode(JSON.stringify(data)));
    } catch (err) {
      this.logger.warn({ subject, err }, 'Failed to publish NATS event');
    }
  }

  private async checkAndPublishCompletion(
    submitterId: string,
    contentItemId: string,
    ctx: AuthContext,
    tenantCtx: TenantContext,
  ): Promise<void> {
    const allAssignments = await withTenantContext(this.db, tenantCtx, async (tx) =>
      tx
        .select()
        .from(schema.peerReviewAssignments)
        .where(
          and(
            eq(schema.peerReviewAssignments.submitterId, submitterId),
            eq(schema.peerReviewAssignments.contentItemId, contentItemId),
            eq(schema.peerReviewAssignments.tenantId, ctx.tenantId),
          ),
        ),
    );

    const allDone = allAssignments.length > 0 && allAssignments.every((a) => a.status !== 'PENDING');
    if (allDone) {
      this.publishEvent(NATS_PEER_REVIEW_COMPLETED, {
        submitterId,
        contentItemId,
        tenantId: ctx.tenantId,
        assignmentCount: allAssignments.length,
      });
      this.logger.log(
        { submitterId, contentItemId, tenantId: ctx.tenantId },
        'All peer reviews complete — published NATS event',
      );
    }
  }
}
