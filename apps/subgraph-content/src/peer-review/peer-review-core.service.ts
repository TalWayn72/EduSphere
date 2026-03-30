/**
 * PeerReviewCoreService — Shared DB/NATS infrastructure + rubric + query logic.
 * Extracted from PeerReviewService for file-size compliance (<300 lines).
 * Memory: NATS connection opened in onModuleInit, drained in onModuleDestroy.
 */
import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import {
  connect,
  StringCodec,
  type NatsConnection,
} from 'nats';
import { buildNatsOptions } from '@edusphere/nats-client';
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
import type { AuthContext, CreateRubricInput } from './peer-review.service';

const NATS_PEER_REVIEW_COMPLETED = 'EDUSPHERE.peer.review.completed';
const DEFAULT_MIN_REVIEWERS = 3;

@Injectable()
export class PeerReviewCoreService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PeerReviewCoreService.name);
  private readonly db = createDatabaseConnection();
  private readonly sc = StringCodec();
  private natsConn: NatsConnection | null = null;

  // SI-7: Uses buildNatsOptions() for TLS/NKey authentication support.
  async onModuleInit(): Promise<void> {
    try {
      this.natsConn = await connect(buildNatsOptions());
      this.logger.log('PeerReviewCoreService NATS connected');
    } catch (err) {
      this.logger.warn({ err }, 'PeerReviewCoreService NATS connect failed — running without events');
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.natsConn) {
      await this.natsConn.drain().catch(() => undefined);
      this.natsConn = null;
    }
    await closeAllPools();
    this.logger.log('PeerReviewCoreService destroyed — NATS drained, DB pools closed');
  }

  getDb() {
    return this.db;
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
  // NATS helpers
  // ---------------------------------------------------------------------------

  publishEvent(subject: string, data: Record<string, unknown>): void {
    if (!this.natsConn) return;
    try {
      this.natsConn.publish(subject, this.sc.encode(JSON.stringify(data)));
    } catch (err) {
      this.logger.warn({ subject, err }, 'Failed to publish NATS event');
    }
  }

  async checkAndPublishCompletion(
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
