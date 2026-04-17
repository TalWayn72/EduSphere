import {
  Injectable,
  Logger,
  OnModuleDestroy,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import {
  createDatabaseConnection,
  schema,
  eq,
  and,
  closeAllPools,
} from '@edusphere/db';
import type { TenantContext } from '@edusphere/db';
import { withTenantContext } from '@edusphere/db';
import { connect, StringCodec, type NatsConnection } from 'nats';
import { buildNatsOptions } from '@edusphere/nats-client';
import type {
  EditPolishedBlockInput,
  ChangeDecisionInput,
  BulkChangeDecisionInput,
} from './polished-transcript.schemas';
import {
  mapChange,
  mapBlock,
  mapTranscript,
} from './polished-transcript.helpers';
import type { PolishedTranscriptView } from './polished-transcript.helpers';
import { PolishedTranscriptService } from './polished-transcript.service';

// NATS subject constants for the polishing pipeline
const POLISHING_EVENTS = {
  APPROVED: 'EDUSPHERE.polishing.approved',
  STARTED: 'EDUSPHERE.polishing.started',
} as const;

@Injectable()
export class PolishedTranscriptMutationsService implements OnModuleDestroy {
  private readonly logger = new Logger(PolishedTranscriptMutationsService.name);
  private readonly db = createDatabaseConnection();
  private readonly sc = StringCodec();
  private nc: NatsConnection | null = null;

  constructor(private readonly queries: PolishedTranscriptService) {}

  async onModuleDestroy(): Promise<void> {
    if (this.nc) {
      await this.nc.drain().catch(() => undefined);
      this.nc = null;
    }
    await closeAllPools();
  }

  private async getNats(): Promise<NatsConnection> {
    if (!this.nc) this.nc = await connect(buildNatsOptions());
    return this.nc;
  }

  private publishEvent(
    subject: string,
    payload: Record<string, unknown>
  ): void {
    this.getNats()
      .then((nc) =>
        nc.publish(subject, this.sc.encode(JSON.stringify(payload)))
      )
      .catch((err: unknown) => {
        this.logger.warn(`Failed to publish ${subject}: ${String(err)}`);
      });
  }

  async approvePolishedTranscript(
    polishedTranscriptId: string,
    tenantCtx: TenantContext
  ): Promise<PolishedTranscriptView> {
    const now = new Date();
    const [updated] = await withTenantContext(this.db, tenantCtx, async (db) =>
      db
        .update(schema.polished_transcripts)
        .set({
          status: 'PUBLISHED',
          approved_by: tenantCtx.userId,
          approved_at: now,
          updated_at: now,
        })
        .where(
          and(
            eq(schema.polished_transcripts.id, polishedTranscriptId),
            eq(schema.polished_transcripts.tenant_id, tenantCtx.tenantId)
          )
        )
        .returning()
    );
    if (!updated) {
      throw new NotFoundException(
        `PolishedTranscript ${polishedTranscriptId} not found`
      );
    }
    this.publishEvent(POLISHING_EVENTS.APPROVED, {
      lessonId: updated.lesson_id,
      tenantId: tenantCtx.tenantId,
      polishedTranscriptId,
      approvedBy: tenantCtx.userId,
      timestamp: now.toISOString(),
    });
    this.logger.log(`Polished transcript approved: id=${polishedTranscriptId}`);
    const blocks = await this.queries.loadBlocksWithChanges(updated.id);
    return mapTranscript(updated, blocks);
  }

  async editPolishedBlock(
    input: EditPolishedBlockInput,
    tenantCtx: TenantContext
  ) {
    await this.queries.findBlockOrThrow(input.blockId, tenantCtx);
    const [updated] = await this.db
      .update(schema.polished_transcript_blocks)
      .set({
        instructor_text: input.content,
        instructor_edited: true,
        updated_at: new Date(),
      })
      .where(eq(schema.polished_transcript_blocks.id, input.blockId))
      .returning();
    if (!updated)
      throw new NotFoundException(`Block ${input.blockId} not found`);
    const changes = await this.queries.loadChangesForBlock(input.blockId);
    return mapBlock(updated, changes.map(mapChange));
  }

  async revertPolishedBlock(blockId: string, tenantCtx: TenantContext) {
    await this.queries.findBlockOrThrow(blockId, tenantCtx);
    const [updated] = await this.db
      .update(schema.polished_transcript_blocks)
      .set({
        instructor_text: null,
        instructor_edited: false,
        updated_at: new Date(),
      })
      .where(eq(schema.polished_transcript_blocks.id, blockId))
      .returning();
    if (!updated) throw new NotFoundException(`Block ${blockId} not found`);
    const changes = await this.queries.loadChangesForBlock(blockId);
    return mapBlock(updated, changes.map(mapChange));
  }

  async decidePolishedChange(
    input: ChangeDecisionInput,
    tenantCtx: TenantContext
  ) {
    const now = new Date();
    const [updated] = await withTenantContext(this.db, tenantCtx, async (db) =>
      db
        .update(schema.polished_block_changes)
        .set({ status: input.decision, reviewed_at: now })
        .where(eq(schema.polished_block_changes.id, input.changeId))
        .returning()
    );
    if (!updated)
      throw new NotFoundException(`Change ${input.changeId} not found`);
    return mapChange(updated);
  }

  async bulkDecidePolishedChanges(
    input: BulkChangeDecisionInput,
    tenantCtx: TenantContext
  ): Promise<PolishedTranscriptView> {
    const transcript = await this.queries.findTranscriptOrThrow(
      input.polishedTranscriptId,
      tenantCtx
    );
    const now = new Date();
    const blockRows = await this.db
      .select({ id: schema.polished_transcript_blocks.id })
      .from(schema.polished_transcript_blocks)
      .where(eq(schema.polished_transcript_blocks.polished_id, transcript.id));

    for (const block of blockRows) {
      await this.db
        .update(schema.polished_block_changes)
        .set({ status: input.decision, reviewed_at: now })
        .where(
          and(
            eq(schema.polished_block_changes.block_id, block.id),
            eq(schema.polished_block_changes.status, 'PENDING')
          )
        );
    }
    const blocks = await this.queries.loadBlocksWithChanges(transcript.id);
    return mapTranscript(transcript, blocks);
  }

  async regeneratePolishedTranscript(
    lessonId: string,
    tenantCtx: TenantContext
  ): Promise<PolishedTranscriptView> {
    await this.queries.findLessonOrThrow(lessonId, tenantCtx);
    const now = new Date();
    const [created] = await withTenantContext(this.db, tenantCtx, async (db) =>
      db
        .insert(schema.polished_transcripts)
        .values({
          tenant_id: tenantCtx.tenantId,
          lesson_id: lessonId,
          status: 'PROCESSING',
          polished_by: 'AI',
          created_at: now,
          updated_at: now,
          metadata: {},
        })
        .returning()
    );
    if (!created)
      throw new BadRequestException('Failed to create transcript record');
    this.publishEvent(POLISHING_EVENTS.STARTED, {
      lessonId,
      tenantId: tenantCtx.tenantId,
      polishedTranscriptId: created.id,
      timestamp: now.toISOString(),
    });
    this.logger.log(`Polishing regeneration triggered: lesson=${lessonId}`);
    return mapTranscript(created, []);
  }
}
