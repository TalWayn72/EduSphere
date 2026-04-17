/**
 * Shared types for polished transcript track-changes UI.
 *
 * A PolishedTranscript is the AI-polished version of a raw lecture transcript.
 * The instructor reviews each PolishedBlockChange (accept/reject) and approves
 * the whole transcript to PUBLISHED status.
 *
 * These types mirror the SDL in:
 *   apps/subgraph-content/src/polished-transcript/polished-transcript.graphql
 */

// ── Enums ──────────────────────────────────────────────────────────────────────

export type PolishingStatus =
  | 'PROCESSING'
  | 'DRAFT'
  | 'INSTRUCTOR_REVIEW'
  | 'APPROVED'
  | 'PUBLISHED';

export type PolishedBlockType =
  | 'POLISHED_TEXT'
  | 'POLISHED_CITATION'
  | 'POLISHED_HEADING';

export type PolishedChangeType =
  | 'FILLER_REMOVED'
  | 'REPETITION_REMOVED'
  | 'AUDIENCE_ADDRESS_REMOVED'
  | 'IMPERATIVE_TO_DESCRIPTION'
  | 'RHETORICAL_SIMPLIFIED'
  | 'PERSON_CHANGED'
  | 'CITATION_FORMATTED'
  | 'SPELLING_CORRECTED'
  | 'SENTENCE_RESTRUCTURED';

export type PolishedChangeStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface PolishedBlockChange {
  id: string;
  blockId: string;
  changeType: PolishedChangeType | null;
  originalFragment: string;
  replacementFragment: string | null;
  charOffsetStart: number;
  charOffsetEnd: number;
  status: PolishedChangeStatus;
  reviewedAt: string | null;
  createdAt: string;
}

export interface PolishedTranscriptBlock {
  id: string;
  polishedId: string;
  blockType: PolishedBlockType | null;
  blockOrder: number;
  content: string;
  originalText: string | null;
  startTime: number | null;
  endTime: number | null;
  sourceSegmentIds: unknown;
  instructorEdited: boolean;
  instructorText: string | null;
  changes: PolishedBlockChange[];
}

export interface PolishedTranscript {
  id: string;
  lessonId: string;
  version: number;
  status: PolishingStatus;
  fullText: string | null;
  coverageScore: number | null;
  polishedBy: string;
  approvedAt: string | null;
  blocks: PolishedTranscriptBlock[];
  createdAt: string;
  updatedAt: string;
}

export interface InstructorVoiceProfile {
  id: string;
  instructorId: string;
  voiceData: unknown;
  sampleCount: number;
  lastUpdatedFrom: string | null;
  updatedAt: string;
}

/**
 * Display shape for the voice profile card UI.
 * Derived from InstructorVoiceProfile.voiceData when present.
 * Kept as a separate UI type to decouple the card from the raw JSON backend type.
 */
export interface VoiceProfile {
  id: string;
  instructorId: string;
  displayName: string;
  avgWordsPerSentence: number;
  /** 0-100 formality score derived from writing samples */
  formalityScore: number;
  topPhrases: string[];
  lastUpdatedAt: string;
}

/**
 * Zustand store shape for local track-changes state.
 * Keeps optimistic decision overrides before server confirmation.
 */
export interface TrackChangesUIState {
  decisions: Record<string, PolishedChangeStatus>;
  setDecision: (changeId: string, decision: PolishedChangeStatus) => void;
  acceptAll: (changeIds: string[]) => void;
  rejectAll: (changeIds: string[]) => void;
  resetDecisions: () => void;
}
