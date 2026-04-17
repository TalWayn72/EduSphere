/**
 * Transcript Polishing Workflow — Shared Types
 *
 * Used by transcript-polishing-workflow.ts and polishing-prompts.ts.
 * Mirrors DB enum values for ChangeType — must stay in sync with
 * packages/db/src/schema content table change_type enum.
 */

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

export enum ChangeType {
  FILLER_REMOVED = 'FILLER_REMOVED',
  STUTTER_REMOVED = 'STUTTER_REMOVED',
  AUDIENCE_ADDRESS_REMOVED = 'AUDIENCE_ADDRESS_REMOVED',
  TECHNICAL_INSTRUCTION_REMOVED = 'TECHNICAL_INSTRUCTION_REMOVED',
  IMPERATIVE_TO_DESCRIPTION = 'IMPERATIVE_TO_DESCRIPTION',
  RHETORICAL_Q_ANSWERED = 'RHETORICAL_Q_ANSWERED',
  PRONOUN_PLURALIZED = 'PRONOUN_PLURALIZED',
  CITATION_FORMATTED = 'CITATION_FORMATTED',
  TERMINOLOGY_NORMALIZED = 'TERMINOLOGY_NORMALIZED',
}

// ---------------------------------------------------------------------------
// Core interfaces
// ---------------------------------------------------------------------------

/** A single recorded change from raw → polished. */
export interface ChangeRecord {
  type: ChangeType;
  /** The original text that was changed or removed. */
  original: string;
  /** The replacement text, or null if the segment was removed entirely. */
  replacement: string | null;
  /** Human-readable explanation of why the change was made. */
  reason: string;
}

/** A single raw segment from the transcription engine. */
export interface RawSegment {
  id: string;
  text: string;
  startTime: number;
  endTime: number;
  speaker?: string;
}

/** Glossary entry for canonical terminology normalisation. */
export interface JargonEntry {
  /** The preferred/canonical spelling (e.g. "האר\"י"). */
  canonical: string;
  /** Alternative forms that should be converted (e.g. ["הארי", "הרב לוריא"]). */
  altForms: string[];
}

// ---------------------------------------------------------------------------
// Chunking
// ---------------------------------------------------------------------------

/** One processing chunk (10-14 min of audio mapped to text). */
export interface PolishingChunk {
  chunkIndex: number;
  segmentIds: string[];
  rawText: string;
  /** Last 2-3 sentences of the previous chunk, used as context overlap. */
  overlapPrefix: string;
  startTime: number;
  endTime: number;
}

/** Result of polishing a single chunk. */
export interface PolishedChunkResult {
  chunkIndex: number;
  polishedText: string;
  changes: ChangeRecord[];
}

// ---------------------------------------------------------------------------
// Voice Profile
// ---------------------------------------------------------------------------

/** Extracted voice/style profile for the speaker. */
export interface VoiceProfile {
  /** Typical sentence length in words (short / medium / long). */
  avgSentenceLength: 'short' | 'medium' | 'long';
  /** Overall register. */
  formality: 'formal' | 'semi-formal' | 'conversational';
  /** Common transitional phrases used by the speaker (Hebrew strings). */
  transitionPhrases: string[];
  /** Teaching rhythm markers (e.g., "כלומר", "ולכן", "נמצא"). */
  rhythmMarkers: string[];
  /** Serialised JSON string of the full profile for persistence. */
  raw: string;
}

// ---------------------------------------------------------------------------
// Output blocks
// ---------------------------------------------------------------------------

/** Block type after formatting pass. */
export type BlockType =
  | 'POLISHED_TEXT'
  | 'POLISHED_CITATION'
  | 'POLISHED_HEADING';

/** One structured output block ready for the DB. */
export interface FormattedBlock {
  blockOrder: number;
  blockType: BlockType;
  content: string;
  /** The original (raw) text this block was derived from. */
  originalText: string;
  startTime: number;
  endTime: number;
  sourceSegmentIds: string[];
  changes: ChangeRecord[];
}

// ---------------------------------------------------------------------------
// Full workflow state
// ---------------------------------------------------------------------------

/** Complete state shape for the TranscriptPolishingWorkflow. */
export interface PolishingState {
  // --- Input ---
  lessonId: string;
  tenantId: string;
  transcriptId: string;
  rawSegments: RawSegment[];
  jargonGlossary: JargonEntry[];
  /** Optional persisted voice profile JSON from a previous run. */
  existingVoiceProfile?: string;

  // --- Chunking ---
  chunks: PolishingChunk[];

  // --- Processing ---
  voiceProfile: string;
  polishedChunks: PolishedChunkResult[];

  // --- Assembly ---
  stitchedText: string;
  /** Segment IDs whose content scored below the coverage threshold. */
  coverageGaps: string[];
  repairAttempts: number;

  // --- Output ---
  formattedBlocks: FormattedBlock[];
  /** 0-1 fraction: matched segments / total segments. */
  coverageScore: number;

  // --- Metadata ---
  status: string;
  error?: string;
  /** 0-100 progress percentage for streaming updates. */
  progress: number;
}
