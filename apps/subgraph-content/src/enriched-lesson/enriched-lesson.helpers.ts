/** Map a raw enriched_transcript_blocks row to GraphQL-friendly shape. */
export function mapBlock(row: Record<string, unknown>) {
  return {
    id: String(row['id']),
    lessonId: String(row['lesson_id']),
    segmentId: row['segment_id'] ? String(row['segment_id']) : null,
    blockType: String(row['block_type']),
    blockOrder: Number(row['block_order']),
    content: row['content'] ?? {},
    citationId: row['citation_id'] ? String(row['citation_id']) : null,
    anchorId: row['anchor_id'] ? String(row['anchor_id']) : null,
    startTime: row['start_time'] ? Number(row['start_time']) : null,
    endTime: row['end_time'] ? Number(row['end_time']) : null,
  };
}

/** Map a raw lesson_citations row to GraphQL-friendly shape. */
export function mapCitation(row: Record<string, unknown>) {
  return {
    id: String(row['id']),
    lessonId: String(row['lesson_id']),
    sourceText: String(row['source_text'] ?? ''),
    bookName: String(row['book_name'] ?? ''),
    part: row['part'] ? String(row['part']) : null,
    page: row['page'] ? String(row['page']) : null,
    column: row['column'] ? String(row['column']) : null,
    paragraph: row['paragraph'] ? String(row['paragraph']) : null,
    matchStatus: String(row['match_status'] ?? 'UNVERIFIED'),
    confidence: row['confidence'] ? Number(row['confidence']) : null,
  };
}

/** View type returned by enriched lesson queries. */
export interface EnrichedLessonView {
  id: string;
  lessonId: string;
  youtubeVideoId: string | null;
  transcriptReady: boolean;
  enrichmentStatus: string;
}
