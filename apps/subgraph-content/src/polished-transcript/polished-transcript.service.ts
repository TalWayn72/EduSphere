import {
  Injectable,
  Logger,
  OnModuleDestroy,
  NotFoundException,
} from '@nestjs/common';
import {
  createDatabaseConnection,
  schema,
  eq,
  and,
  isNull,
  desc,
  closeAllPools,
} from '@edusphere/db';
import type { TenantContext } from '@edusphere/db';
import { withTenantContext } from '@edusphere/db';
import { mapChange, mapBlock, mapTranscript, mapVoiceProfile } from './polished-transcript.helpers';
import type { PolishedTranscriptView } from './polished-transcript.helpers';

/**
 * PolishedTranscriptQueriesService — read queries and shared DB helpers.
 * Mutations service injects this to reuse findBlockOrThrow, loadBlocksWithChanges, etc.
 */
@Injectable()
export class PolishedTranscriptService implements OnModuleDestroy {
  readonly logger = new Logger(PolishedTranscriptService.name);
  readonly db = createDatabaseConnection();

  async onModuleDestroy(): Promise<void> {
    await closeAllPools();
  }

  // ─── Public Queries ────────────────────────────────────────────────────────

  async getPolishedTranscript(
    lessonId: string,
    tenantCtx: TenantContext
  ): Promise<PolishedTranscriptView | null> {
    const rows = await withTenantContext(this.db, tenantCtx, async (db) =>
      db
        .select()
        .from(schema.polished_transcripts)
        .where(
          and(
            eq(schema.polished_transcripts.lesson_id, lessonId),
            eq(schema.polished_transcripts.tenant_id, tenantCtx.tenantId),
            isNull(schema.polished_transcripts.deleted_at)
          )
        )
        .orderBy(desc(schema.polished_transcripts.version))
        .limit(1)
    );
    const transcript = rows[0];
    if (!transcript) return null;
    const blocks = await this.loadBlocksWithChanges(transcript.id);
    return mapTranscript(transcript, blocks);
  }

  async listPolishedTranscriptVersions(
    lessonId: string,
    tenantCtx: TenantContext
  ): Promise<PolishedTranscriptView[]> {
    const rows = await withTenantContext(this.db, tenantCtx, async (db) =>
      db
        .select()
        .from(schema.polished_transcripts)
        .where(
          and(
            eq(schema.polished_transcripts.lesson_id, lessonId),
            eq(schema.polished_transcripts.tenant_id, tenantCtx.tenantId),
            isNull(schema.polished_transcripts.deleted_at)
          )
        )
        .orderBy(desc(schema.polished_transcripts.version))
    );
    return Promise.all(
      rows.map(async (row) => {
        const blocks = await this.loadBlocksWithChanges(row.id);
        return mapTranscript(row, blocks);
      })
    );
  }

  async getMyVoiceProfile(tenantCtx: TenantContext) {
    const rows = await withTenantContext(this.db, tenantCtx, async (db) =>
      db
        .select()
        .from(schema.instructor_voice_profiles)
        .where(
          and(
            eq(schema.instructor_voice_profiles.tenant_id, tenantCtx.tenantId),
            eq(schema.instructor_voice_profiles.instructor_id, tenantCtx.userId)
          )
        )
        .limit(1)
    );
    return rows[0] ? mapVoiceProfile(rows[0]) : null;
  }

  // ─── Shared helpers (used by mutations service) ───────────────────────────

  async loadBlocksWithChanges(polishedId: string) {
    const blocks = await this.db
      .select()
      .from(schema.polished_transcript_blocks)
      .where(eq(schema.polished_transcript_blocks.polished_id, polishedId))
      .orderBy(schema.polished_transcript_blocks.block_order);
    return Promise.all(
      blocks.map(async (block) => {
        const changes = await this.loadChangesForBlock(block.id);
        return mapBlock(block, changes.map(mapChange));
      })
    );
  }

  async loadChangesForBlock(blockId: string) {
    return this.db
      .select()
      .from(schema.polished_block_changes)
      .where(eq(schema.polished_block_changes.block_id, blockId));
  }

  async findBlockOrThrow(blockId: string, tenantCtx: TenantContext) {
    const [block] = await withTenantContext(this.db, tenantCtx, async (db) =>
      db
        .select({
          id: schema.polished_transcript_blocks.id,
          polishedId: schema.polished_transcript_blocks.polished_id,
        })
        .from(schema.polished_transcript_blocks)
        .where(eq(schema.polished_transcript_blocks.id, blockId))
        .limit(1)
    );
    if (!block) throw new NotFoundException(`Block ${blockId} not found`);
    return block;
  }

  async findTranscriptOrThrow(id: string, tenantCtx: TenantContext) {
    const [row] = await withTenantContext(this.db, tenantCtx, async (db) =>
      db
        .select()
        .from(schema.polished_transcripts)
        .where(
          and(
            eq(schema.polished_transcripts.id, id),
            eq(schema.polished_transcripts.tenant_id, tenantCtx.tenantId)
          )
        )
        .limit(1)
    );
    if (!row) throw new NotFoundException(`PolishedTranscript ${id} not found`);
    return row;
  }

  async findLessonOrThrow(lessonId: string, tenantCtx: TenantContext) {
    const [lesson] = await this.db
      .select({ id: schema.lessons.id })
      .from(schema.lessons)
      .where(
        and(
          eq(schema.lessons.id, lessonId),
          eq(schema.lessons.tenant_id, tenantCtx.tenantId),
          isNull(schema.lessons.deleted_at)
        )
      )
      .limit(1);
    if (!lesson) throw new NotFoundException(`Lesson ${lessonId} not found`);
    return lesson;
  }
}
