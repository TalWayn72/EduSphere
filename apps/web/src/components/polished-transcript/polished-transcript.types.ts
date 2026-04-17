/**
 * Shared types for polished transcript track-changes UI.
 *
 * A PolishedTranscript is the AI-polished version of a raw lecture transcript.
 * The instructor reviews each PolishedChange (addition/deletion/substitution)
 * and accepts or rejects individually before approving the whole transcript.
 */

export type PolishingChangeType =
  | 'FILLER_REMOVED'
  | 'GRAMMAR_FIXED'
  | 'CITATION_FORMATTED'
  | 'REPETITION_REMOVED'
  | 'PUNCTUATION_ADDED'
  | 'PARAGRAPH_BREAK'
  | 'TERM_NORMALIZED';

export type PolishingStatus = 'PROCESSING' | 'DRAFT' | 'APPROVED' | 'PUBLISHED';

export type ChangeDecision = 'PENDING' | 'ACCEPTED' | 'REJECTED';

export interface PolishedChange {
  id: string;
  changeType: PolishingChangeType;
  /** The original fragment the AI replaced. Empty string = pure insertion. */
  originalText: string;
  /** The AI's proposed replacement. Empty string = pure deletion. */
  replacementText: string;
  charOffsetStart: number;
  charOffsetEnd: number;
  decision: ChangeDecision;
}

export interface PolishedTranscript {
  id: string;
  lessonId: string;
  rawText: string;
  polishedText: string;
  status: PolishingStatus;
  /** 0-100, only meaningful while status === 'PROCESSING' */
  polishingProgress?: number | null;
  changes: PolishedChange[];
  voiceProfile?: VoiceProfile | null;
}

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
  decisions: Record<string, ChangeDecision>;
  setDecision: (changeId: string, decision: ChangeDecision) => void;
  acceptAll: (changeIds: string[]) => void;
  rejectAll: (changeIds: string[]) => void;
  resetDecisions: () => void;
}
