import type {
  PolishedTranscript,
  PolishedTranscriptBlock,
  PolishedBlockChange,
  InstructorVoiceProfile,
} from '@edusphere/db';

/** Map a polished_block_changes DB row to GraphQL shape. */
export function mapChange(row: PolishedBlockChange) {
  return {
    id: row.id,
    blockId: row.block_id,
    changeType: row.change_type ?? null,
    originalFragment: row.original_fragment,
    replacementFragment: row.replacement_fragment ?? null,
    charOffsetStart: row.char_offset_start,
    charOffsetEnd: row.char_offset_end,
    status: row.status,
    reviewedAt: row.reviewed_at?.toISOString() ?? null,
    createdAt: row.created_at.toISOString(),
  };
}

/** Map a polished_transcript_blocks DB row to GraphQL shape. */
export function mapBlock(
  row: PolishedTranscriptBlock,
  changes: ReturnType<typeof mapChange>[] = []
) {
  return {
    id: row.id,
    polishedId: row.polished_id,
    blockType: row.block_type ?? null,
    blockOrder: row.block_order,
    content: row.content,
    originalText: row.original_text ?? null,
    startTime: row.start_time ? Number(row.start_time) : null,
    endTime: row.end_time ? Number(row.end_time) : null,
    sourceSegmentIds: row.source_segment_ids,
    instructorEdited: row.instructor_edited,
    instructorText: row.instructor_text ?? null,
    changes,
  };
}

/** Map a polished_transcripts DB row to GraphQL shape (blocks pre-loaded). */
export function mapTranscript(
  row: PolishedTranscript,
  blocks: ReturnType<typeof mapBlock>[] = []
) {
  return {
    id: row.id,
    lessonId: row.lesson_id,
    version: row.version,
    status: row.status,
    fullText: row.full_text ?? null,
    coverageScore: row.coverage_score ? Number(row.coverage_score) : null,
    polishedBy: row.polished_by,
    approvedBy: row.approved_by ?? null,
    approvedAt: row.approved_at?.toISOString() ?? null,
    blocks,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

/** Map an instructor_voice_profiles DB row to GraphQL shape. */
export function mapVoiceProfile(row: InstructorVoiceProfile) {
  return {
    id: row.id,
    instructorId: row.instructor_id,
    voiceData: row.voice_data ?? null,
    sampleCount: row.sample_count,
    lastUpdatedFrom: row.last_updated_from ?? null,
    updatedAt: row.updated_at.toISOString(),
  };
}

/** GraphQL view type for a polished transcript. */
export type PolishedTranscriptView = ReturnType<typeof mapTranscript>;
