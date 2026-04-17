/**
 * Polishing Pipeline — NATS Event Subject Constants & Payload Types
 *
 * All subjects follow the EDUSPHERE.polishing.* namespace.
 * Payload interfaces mirror the PolishingState shape from
 * packages/langgraph-workflows/src/transcript-polishing-types.ts.
 */

// ─── Subject Constants ───────────────────────────────────────────────────────

export const POLISHING_EVENTS = {
  STARTED: 'EDUSPHERE.polishing.started',
  PROGRESS: 'EDUSPHERE.polishing.progress',
  CHUNK_COMPLETED: 'EDUSPHERE.polishing.chunk.completed',
  COMPLETED: 'EDUSPHERE.polishing.completed',
  AUTO_PUBLISHED: 'EDUSPHERE.polishing.auto_published',
  FAILED: 'EDUSPHERE.polishing.failed',
  APPROVED: 'EDUSPHERE.polishing.approved',
} as const;

export type PolishingEventSubject =
  (typeof POLISHING_EVENTS)[keyof typeof POLISHING_EVENTS];

// ─── Payload Interfaces ───────────────────────────────────────────────────────

export interface PolishingStartedPayload {
  readonly lessonId: string;
  readonly tenantId: string;
  readonly polishedTranscriptId: string;
  readonly timestamp: string;
}

export interface PolishingProgressPayload {
  readonly lessonId: string;
  readonly tenantId: string;
  readonly polishedTranscriptId: string;
  /** 0–100 integer percentage. */
  readonly progress: number;
  readonly timestamp: string;
}

export interface PolishingChunkCompletedPayload {
  readonly lessonId: string;
  readonly tenantId: string;
  readonly polishedTranscriptId: string;
  readonly chunkIndex: number;
  readonly totalChunks: number;
  readonly timestamp: string;
}

export interface PolishingCompletedPayload {
  readonly lessonId: string;
  readonly tenantId: string;
  readonly polishedTranscriptId: string;
  readonly coverageScore: number;
  readonly blockCount: number;
  readonly changeCount: number;
  readonly timestamp: string;
}

export interface PolishingAutoPublishedPayload {
  readonly lessonId: string;
  readonly tenantId: string;
  readonly polishedTranscriptId: string;
  readonly coverageScore: number;
  readonly timestamp: string;
}

export interface PolishingFailedPayload {
  readonly lessonId: string;
  readonly tenantId: string;
  readonly polishedTranscriptId?: string;
  readonly errorMessage: string;
  readonly timestamp: string;
}

export interface PolishingApprovedPayload {
  readonly lessonId: string;
  readonly tenantId: string;
  readonly polishedTranscriptId: string;
  readonly approvedBy: string;
  readonly timestamp: string;
}

// ─── Trigger (inbound) ────────────────────────────────────────────────────────

/** Shape of the event that triggers the polishing pipeline. */
export interface JargonDetectionCompletedPayload {
  readonly lessonId: string;
  readonly tenantId: string;
  readonly transcriptId: string;
  readonly domainCount: number;
  readonly occurrenceCount: number;
  readonly correctedSegmentCount: number;
  readonly timestamp: string;
}

/** Zod-compatible type guard for the inbound trigger payload. */
export function isJargonDetectionCompleted(
  v: unknown
): v is JargonDetectionCompletedPayload {
  if (!v || typeof v !== 'object') return false;
  const obj = v as Record<string, unknown>;
  return (
    typeof obj['lessonId'] === 'string' &&
    typeof obj['tenantId'] === 'string' &&
    typeof obj['transcriptId'] === 'string'
  );
}
