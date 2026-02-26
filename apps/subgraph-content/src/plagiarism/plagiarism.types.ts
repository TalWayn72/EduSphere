/**
 * Shared types for the plagiarism detection feature (F-005)
 */

export interface SimilarSubmission {
  submissionId: string;
  userId: string;
  similarity: number;
  submittedAt: string;
}

export interface PlagiarismReport {
  submissionId: string;
  isFlagged: boolean;
  highestSimilarity: number;
  similarSubmissions: SimilarSubmission[];
  checkedAt: string;
}

export interface TextSubmissionResult {
  id: string;
  contentItemId: string;
  submittedAt: string;
  wordCount: number;
  plagiarismReport?: PlagiarismReport | null;
}

export interface SubmissionCreatedPayload {
  readonly submissionId: string;
  readonly tenantId: string;
  readonly courseId: string;
  readonly userId: string;
  readonly timestamp: string;
}

export const DEFAULT_SIMILARITY_THRESHOLD = 0.85;
export const DEFAULT_TOP_K = 5;
