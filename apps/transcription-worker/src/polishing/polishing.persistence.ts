/**
 * PolishingPersistenceHelper
 *
 * Encapsulates all Drizzle DB operations for the polishing pipeline:
 * - Create / update polished_transcripts records
 * - Insert polished_transcript_blocks
 * - Insert polished_block_changes
 */
import { Logger } from '@nestjs/common';
import { db, schema, withTenantContext, eq } from '@edusphere/db';
import type { TenantContext } from '@edusphere/db';
import type {
  FormattedBlock,
  PolishingState,
} from '@edusphere/langgraph-workflows';

const logger = new Logger('PolishingPersistence');

const AUTO_PUBLISH_THRESHOLD = 0.95;

type TenantCtx = TenantContext;

// ─── Public API ───────────────────────────────────────────────────────────────

export async function createPolishedRecord(
  lessonId: string,
  tenantId: string,
  tenantCtx: TenantCtx
): Promise<string> {
  const rows = await withTenantContext(db, tenantCtx, async (txDb) =>
    txDb
      .insert(schema.polished_transcripts)
      .values({
        tenant_id: tenantId,
        lesson_id: lessonId,
        status: 'PROCESSING',
        metadata: {},
      })
      .returning({ id: schema.polished_transcripts.id })
  );
  return rows[0].id;
}

export async function markFailed(
  polishedId: string,
  tenantCtx: TenantCtx,
  err: unknown
): Promise<void> {
  try {
    await withTenantContext(db, tenantCtx, async (txDb) =>
      txDb
        .update(schema.polished_transcripts)
        .set({
          status: 'PROCESSING',
          metadata: {
            error: err instanceof Error ? err.message : String(err),
            failedAt: new Date().toISOString(),
          },
        })
        .where(eq(schema.polished_transcripts.id, polishedId))
    );
  } catch (updateErr) {
    logger.error({ updateErr }, 'Failed to mark polished record as failed');
  }
}

export async function persistResults(
  polishedId: string,
  lessonId: string,
  tenantId: string,
  result: PolishingState,
  tenantCtx: TenantCtx
): Promise<void> {
  const blocks = result.formattedBlocks ?? [];
  const coverageScore = result.coverageScore ?? 0;
  const voiceSnapshot = result.voiceProfile
    ? (JSON.parse(result.voiceProfile) as Record<string, unknown>)
    : null;

  await withTenantContext(db, tenantCtx, async (txDb) => {
    await txDb
      .update(schema.polished_transcripts)
      .set({
        status: coverageScore >= AUTO_PUBLISH_THRESHOLD ? 'PUBLISHED' : 'DRAFT',
        full_text: result.stitchedText ?? null,
        coverage_score: String(coverageScore),
        voice_profile_snapshot: voiceSnapshot,
      })
      .where(eq(schema.polished_transcripts.id, polishedId));

    if (blocks.length === 0) return;

    const blockRows = await txDb
      .insert(schema.polished_transcript_blocks)
      .values(
        blocks.map((b: FormattedBlock) => ({
          polished_id: polishedId,
          block_type: b.blockType,
          block_order: b.blockOrder,
          content: b.content,
          original_text: b.originalText,
          start_time: String(b.startTime),
          end_time: String(b.endTime),
          source_segment_ids: b.sourceSegmentIds,
        }))
      )
      .returning({
        id: schema.polished_transcript_blocks.id,
        block_order: schema.polished_transcript_blocks.block_order,
      });

    await insertBlockChanges(txDb, blockRows, blocks);
  });

  logger.log(
    { polishedId, lessonId, tenantId, blocks: blocks.length },
    'Persisted polishing results'
  );
}

// ─── Private helpers ──────────────────────────────────────────────────────────

async function insertBlockChanges(
  txDb: typeof db,
  blockRows: Array<{ id: string; block_order: number }>,
  blocks: FormattedBlock[]
): Promise<void> {
  const changeInserts: (typeof schema.polished_block_changes.$inferInsert)[] =
    [];

  for (const blockRow of blockRows) {
    const block = blocks.find(
      (b: FormattedBlock) => b.blockOrder === blockRow.block_order
    );
    if (!block?.changes?.length) continue;

    let charOffset = 0;
    for (const change of block.changes) {
      const origLen = change.original?.length ?? 0;
      changeInserts.push({
        block_id: blockRow.id,
        change_type: mapChangeType(change.type),
        original_fragment: change.original ?? '',
        replacement_fragment: change.replacement ?? null,
        char_offset_start: charOffset,
        char_offset_end: charOffset + origLen,
        status: 'PENDING',
      });
      charOffset += origLen;
    }
  }

  if (changeInserts.length > 0) {
    await txDb
      .insert(schema.polished_block_changes)
      .values(changeInserts)
      .onConflictDoNothing();
  }
}

function mapChangeType(
  type: string
): typeof schema.polished_block_changes.$inferInsert.change_type {
  const map: Record<
    string,
    typeof schema.polished_block_changes.$inferInsert.change_type
  > = {
    FILLER_REMOVED: 'FILLER_REMOVED',
    REPETITION_REMOVED: 'REPETITION_REMOVED',
    AUDIENCE_ADDRESS_REMOVED: 'AUDIENCE_ADDRESS_REMOVED',
    IMPERATIVE_TO_DESCRIPTION: 'IMPERATIVE_TO_DESCRIPTION',
    RHETORICAL_Q_ANSWERED: 'RHETORICAL_SIMPLIFIED',
    PRONOUN_PLURALIZED: 'PERSON_CHANGED',
    CITATION_FORMATTED: 'CITATION_FORMATTED',
    TERMINOLOGY_NORMALIZED: 'SPELLING_CORRECTED',
    STUTTER_REMOVED: 'REPETITION_REMOVED',
    TECHNICAL_INSTRUCTION_REMOVED: 'AUDIENCE_ADDRESS_REMOVED',
  };
  return map[type] ?? 'SENTENCE_RESTRUCTURED';
}
