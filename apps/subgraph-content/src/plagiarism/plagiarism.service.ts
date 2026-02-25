/**
 * PlagiarismService — F-005 Plagiarism Detection via Semantic Similarity
 *
 * Responsibilities:
 *  1. Subscribe to EDUSPHERE.submission.created NATS events
 *  2. Generate 768-dim embeddings for new submissions
 *  3. Run pgvector cosine similarity search within the same tenant
 *  4. Flag submissions above configurable threshold
 *  5. Store results in submission_embeddings
 */
import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import {
  createDatabaseConnection,
  closeAllPools,
  schema,
  sql,
  eq,
  withTenantContext,
} from '@edusphere/db';
import type { TenantContext } from '@edusphere/db';
import { connect, StringCodec, type NatsConnection, type Subscription } from 'nats';
import { buildNatsOptions } from '@edusphere/nats-client';
import { EmbeddingClient } from './embedding.client.js';
import type { SimilarSubmission, SubmissionCreatedPayload } from './plagiarism.types.js';
import { DEFAULT_SIMILARITY_THRESHOLD, DEFAULT_TOP_K } from './plagiarism.types.js';

type SimRow = {
  submission_id: string;
  user_id: string;
  similarity: string;
  submitted_at: Date;
};

@Injectable()
export class PlagiarismService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PlagiarismService.name);
  private readonly db = createDatabaseConnection();
  private readonly sc = StringCodec();
  private nc: NatsConnection | null = null;
  private sub: Subscription | null = null;

  constructor(private readonly embeddingClient: EmbeddingClient) {}

  // ── Lifecycle ──────────────────────────────────────────────────────────────

  async onModuleInit(): Promise<void> {
    await this.connectAndSubscribe();
  }

  async onModuleDestroy(): Promise<void> {
    this.sub?.unsubscribe();
    this.sub = null;
    if (this.nc) {
      await this.nc.drain().catch(() => undefined);
      this.nc = null;
    }
    await closeAllPools();
  }

  // ── NATS subscription ──────────────────────────────────────────────────────

  private async connectAndSubscribe(): Promise<void> {
    try {
      this.nc = await connect(buildNatsOptions());
      this.sub = this.nc.subscribe('EDUSPHERE.submission.created');
      this.logger.log('PlagiarismService: subscribed to EDUSPHERE.submission.created');
      void this.processMessages();
    } catch (err) {
      this.logger.error(`PlagiarismService: NATS connect failed: ${String(err)}`);
    }
  }

  private async processMessages(): Promise<void> {
    if (!this.sub) return;
    for await (const msg of this.sub) {
      try {
        const payload = JSON.parse(this.sc.decode(msg.data)) as SubmissionCreatedPayload;
        await this.processSubmission(payload.submissionId, payload.tenantId, payload.courseId);
      } catch (err) {
        this.logger.error(`PlagiarismService: message processing error: ${String(err)}`);
      }
    }
  }

  // ── Core detection logic ───────────────────────────────────────────────────

  async processSubmission(
    submissionId: string,
    tenantId: string,
    courseId: string,
  ): Promise<void> {
    const adminCtx: TenantContext = {
      tenantId,
      userId: 'system',
      userRole: 'SUPER_ADMIN',
    };

    const submission = await withTenantContext(this.db, adminCtx, async (tx) => {
      const [row] = await tx
        .select()
        .from(schema.textSubmissions)
        .where(eq(schema.textSubmissions.id, submissionId))
        .limit(1);
      return row ?? null;
    });

    if (!submission) {
      this.logger.warn(`PlagiarismService: submission ${submissionId} not found`);
      return;
    }

    let vector: number[];
    try {
      vector = await this.embeddingClient.embed(submission.textContent);
    } catch (err) {
      this.logger.error(`PlagiarismService: embedding failed for ${submissionId}: ${String(err)}`);
      return;
    }

    const similar = await this.runSimilarityQuery(submissionId, tenantId, courseId, vector, adminCtx);
    const threshold = await this.getThreshold(tenantId);
    const highest = similar[0]?.similarity ?? 0;
    const isFlagged = highest >= threshold;
    const vecStr = `[${vector.join(',')}]`;

    await withTenantContext(this.db, adminCtx, async (tx) => {
      await tx.execute(sql`
        INSERT INTO submission_embeddings
          (submission_id, tenant_id, course_id, embedding, highest_similarity, checked_at)
        VALUES (
          ${submissionId}, ${tenantId}, ${courseId},
          ${vecStr}::vector, ${highest}, NOW()
        )
        ON CONFLICT (submission_id)
        DO UPDATE SET
          embedding = EXCLUDED.embedding,
          highest_similarity = EXCLUDED.highest_similarity,
          checked_at = NOW()
      `);
      if (isFlagged) {
        await tx
          .update(schema.textSubmissions)
          .set({ isFlagged: true })
          .where(eq(schema.textSubmissions.id, submissionId));
      }
    });

    this.logger.log(
      `PlagiarismService: checked ${submissionId} — highest=${highest.toFixed(3)} flagged=${isFlagged}`,
    );
  }

  async getSimilarSubmissions(
    submissionId: string,
    tenantId: string,
    topK: number = DEFAULT_TOP_K,
  ): Promise<SimilarSubmission[]> {
    const rows = (await this.db.execute<SimRow>(sql`
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
        AND e1.tenant_id = ${tenantId}
      ORDER BY e1.embedding <=> e2.embedding ASC
      LIMIT ${topK}
    `)) as unknown as SimRow[];

    return rows.map((r) => ({
      submissionId: r.submission_id,
      userId: r.user_id,
      similarity: parseFloat(r.similarity),
      submittedAt: new Date(r.submitted_at).toISOString(),
    }));
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  private async runSimilarityQuery(
    submissionId: string,
    tenantId: string,
    courseId: string,
    vector: number[],
    adminCtx: TenantContext,
  ): Promise<SimilarSubmission[]> {
    const vecStr = `[${vector.join(',')}]`;

    return withTenantContext(this.db, adminCtx, async (tx) => {
      const rows = (await tx.execute<SimRow>(sql`
        SELECT
          e2.submission_id,
          s2.user_id,
          1 - (${vecStr}::vector <=> e2.embedding) AS similarity,
          s2.submitted_at
        FROM submission_embeddings e2
        JOIN text_submissions s2 ON s2.id = e2.submission_id
        WHERE e2.tenant_id = ${tenantId}
          AND e2.course_id = ${courseId}
          AND e2.submission_id <> ${submissionId}
        ORDER BY ${vecStr}::vector <=> e2.embedding ASC
        LIMIT ${DEFAULT_TOP_K}
      `)) as unknown as SimRow[];

      return rows.map((r) => ({
        submissionId: r.submission_id,
        userId: r.user_id,
        similarity: parseFloat(r.similarity),
        submittedAt: new Date(r.submitted_at).toISOString(),
      }));
    });
  }

  private async getThreshold(tenantId: string): Promise<number> {
    const [tenant] = await this.db
      .select({ settings: schema.tenants.settings })
      .from(schema.tenants)
      .where(eq(schema.tenants.id, tenantId))
      .limit(1);

    if (!tenant) return DEFAULT_SIMILARITY_THRESHOLD;
    const settings = tenant.settings as Record<string, unknown> | null;
    const val = settings?.['plagiarism_threshold'];
    return typeof val === 'number' ? val : DEFAULT_SIMILARITY_THRESHOLD;
  }
}
