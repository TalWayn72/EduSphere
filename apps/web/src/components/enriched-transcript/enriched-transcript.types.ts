/**
 * Shared types for enriched transcript components.
 */

export type EnrichedBlockType =
  | 'TEXT'
  | 'CITATION'
  | 'VISUAL_ANCHOR'
  | 'HEADING';

export type CitationMatchStatus =
  | 'VERIFIED'
  | 'UNVERIFIED'
  | 'REJECTED'
  | 'EDITED';

export type EnrichmentStatus =
  | 'PENDING'
  | 'EXTRACTING_TRANSCRIPT'
  | 'RUNNING_NER'
  | 'RESOLVING_CITATIONS'
  | 'READY'
  | 'PUBLISHED';

export interface LessonCitation {
  id: string;
  sourceText: string;
  bookName: string;
  part?: string | null;
  page?: string | null;
  column?: string | null;
  paragraph?: string | null;
  matchStatus: CitationMatchStatus;
  confidence: number;
  resolvedText?: string | null;
  knowledgeSourceId?: string | null;
  graphSourceId?: string | null;
}

export interface BlockAnchor {
  id: string;
  anchorText: string;
  startTime?: number | null;
  endTime?: number | null;
  visualAssetId?: string | null;
}

export interface EnrichedTranscriptBlock {
  id: string;
  lessonId: string;
  segmentId?: string | null;
  blockType: EnrichedBlockType;
  blockOrder: number;
  content: Record<string, unknown>;
  startTime?: number | null;
  endTime?: number | null;
  citation?: LessonCitation | null;
  anchor?: BlockAnchor | null;
}

export interface EnrichedLessonData {
  id: string;
  youtubeVideoId?: string | null;
  transcriptReady: boolean;
  enrichmentStatus: EnrichmentStatus;
  /** Lesson metadata — available when ENRICHED_LESSON_QUERY requests the lesson field. */
  lesson?: { id: string; title: string } | null;
  blocks: EnrichedTranscriptBlock[];
  citations: LessonCitation[];
}
