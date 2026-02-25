/**
 * SubmissionService — handles creating text submissions and fetching plagiarism reports (F-005)
 */
import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  OnModuleDestroy,
} from '@nestjs/common';
import {
  createDatabaseConnection,
  closeAllPools,
  schema,
  eq,
  and,
  withTenantContext,
  sql,
} from '@edusphere/db';
import type { TenantContext } from '@edusphere/db';
import { connect, StringCodec } from 'nats';
import { buildNatsOptions } from '@edusphere/nats-client';
import { randomUUID } from 'crypto';
import type {
  TextSubmissionResult,
  PlagiarismReport,
  SubmissionCreatedPayload,
} from './plagiarism.types.js';
import { DEFAULT_TOP_K } from './plagiarism.types.js';

type SimRow = {
  submission_id: string;
  user_id: string;
  similarity: string;
  submitted_at: Date;
};

@Injectable()
export class SubmissionService implements OnModuleDestroy {
  private readonly logger = new Logger(SubmissionService.name);
  private readonly db = createDatabaseConnection();
  private readonly sc = StringCodec();

  async onModuleDestroy(): Promise<void> {
    await closeAllPools();
  }

  // ── Submit assignment ──────────────────────────────────────────────────────

  async submitAssignment(
    contentItemId: string,
    userId: string,
    tenantId: string,
    courseId: string,
    textContent: string,
    ctx: TenantContext,
  ): Promise<TextSubmissionResult> {
    const wordCount = textContent.trim().split(/\s+/).filter(Boolean).length;

    const submission = await withTenantContext(this.db, ctx, async (tx) => {
      const [row] = await tx
        .insert(schema.textSubmissions)
        .values({
          id: randomUUID(),
          userId,
          contentItemId,
          tenantId,
          courseId,
          textContent,
          wordCount,
          isFlagged: false,
          submittedAt: new Date(),
        })
        .returning();
      if (!row) throw new Error('Failed to insert text submission');
      return row;
    });

    await this.publishSubmissionCreated({
      submissionId: submission.id,
      tenantId,
      courseId,
      userId,
      timestamp: submission.submittedAt.toISOString(),
    });

    this.logger.log(
      `SubmissionService: submitted ${submission.id} for user=${userId} contentItem=${contentItemId}`,
    );

    return {
      id: submission.id,
      contentItemId: submission.contentItemId,
      submittedAt: submission.submittedAt.toISOString(),
      wordCount: submission.wordCount,
      plagiarismReport: null,
    };
  }

  // ── Query submissions ──────────────────────────────────────────────────────

  async getMySubmissions(
    contentItemId: string,
    userId: string,
    ctx: TenantContext,
  ): Promise<TextSubmissionResult[]> {
    const rows = await withTenantContext(this.db, ctx, async (tx) =>
      tx
        .select()
        .from(schema.textSubmissions)
        .where(
          and(
            eq(schema.textSubmissions.contentItemId, contentItemId),
            eq(schema.textSubmissions.userId, userId),
          ),
        ),
    );

    return rows.map((r) => ({
      id: r.id,
      contentItemId: r.contentItemId,
      submittedAt: r.submittedAt.toISOString(),
      wordCount: r.wordCount,
      plagiarismReport: null,
    }));
  }

  // ── Plagiarism report ──────────────────────────────────────────────────────

  async getPlagiarismReport(
    submissionId: string,
    requesterId: string,
    ctx: TenantContext,
  ): Promise<PlagiarismReport | null> {
    const adminCtx: TenantContext = { ...ctx, userRole: 'SUPER_ADMIN' };

    const [sub] = await withTenantContext(this.db, adminCtx, async (tx) =>
      tx
        .select()
        .from(schema.textSubmissions)
        .where(eq(schema.textSubmissions.id, submissionId))
        .limit(1),
    );

    if (!sub) throw new NotFoundException(`Submission ${submissionId} not found`);

    const isOwner = sub.userId === requesterId;
    const isElevated = ['SUPER_ADMIN', 'ORG_ADMIN', 'INSTRUCTOR'].includes(ctx.userRole);
    if (!isOwner && !isElevated) {
      throw new ForbiddenException('Access denied to this submission');
    }

    const [embRow] = await withTenantContext(this.db, adminCtx, async (tx) =>
      tx
        .select()
        .from(schema.submissionEmbeddings)
        .where(eq(schema.submissionEmbeddings.submissionId, submissionId))
        .limit(1),
    );

    if (!embRow) return null;

    const similarRows = (await this.db.execute<SimRow>(sql`
      SELECT
        e2.submission_id,
        s2.user_id,
        1 - (e1.embedding <=> e2.embedding) AS similarity,
        s2.submitted_at
      FROM submission_embeddings e1
      JOIN submission_embeddings e2
        ON  e2.tenant_id = e1.tenant_id
        AND e2.id <> e1.id
      JOIN text_submissions s2 ON s2.id = e2.submission_id
      WHERE e1.submission_id = ${submissionId}
      ORDER BY e1.embedding <=> e2.embedding ASC
      LIMIT ${DEFAULT_TOP_K}
    `)) as unknown as SimRow[];

    return {
      submissionId,
      isFlagged: sub.isFlagged,
      highestSimilarity: embRow.highestSimilarity,
      similarSubmissions: similarRows.map((r) => ({
        submissionId: r.submission_id,
        userId: r.user_id,
        similarity: parseFloat(r.similarity),
        submittedAt: new Date(r.submitted_at).toISOString(),
      })),
      checkedAt: embRow.checkedAt.toISOString(),
    };
  }

  // ── NATS publish ───────────────────────────────────────────────────────────

  private async publishSubmissionCreated(payload: SubmissionCreatedPayload): Promise<void> {
    let nc;
    try {
      nc = await connect(buildNatsOptions());
      nc.publish('EDUSPHERE.submission.created', this.sc.encode(JSON.stringify(payload)));
      await nc.flush();
      this.logger.debug(`Published EDUSPHERE.submission.created: id=${payload.submissionId}`);
    } catch (err) {
      this.logger.error(`Failed to publish EDUSPHERE.submission.created: ${String(err)}`);
    } finally {
      if (nc) await nc.close().catch(() => undefined);
    }
  }
}
