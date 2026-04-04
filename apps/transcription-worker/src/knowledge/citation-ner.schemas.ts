/**
 * Zod schemas for Hebrew sacred text citation NER output.
 *
 * These schemas validate the structured output from the LLM-enhanced
 * NER service that identifies Hebrew sacred text references in transcripts.
 */
import { z } from 'zod';

// ─── Citation Candidate Schema ────────────────────────────────────────────────

export const CitationCandidateSchema = z.object({
  /** Hebrew book name (e.g., "עץ חיים", "זוהר") */
  bookName: z.string().min(1),

  /** Section/gate/part identifier (e.g., "שער ממז\"א") */
  part: z.string().optional(),

  /** Page/folio number (e.g., "דף לב") */
  page: z.string().optional(),

  /** Column indicator (e.g., "עמוד א") */
  column: z.string().optional(),

  /** Paragraph or section subdivision */
  paragraph: z.string().optional(),

  /** The original Hebrew text from the transcript containing the citation */
  originalText: z.string().min(1),

  /** Start time in the transcript (seconds) */
  startTime: z.number().nonnegative(),

  /** End time in the transcript (seconds) */
  endTime: z.number().nonnegative(),

  /** Confidence score from 0.0 to 1.0 */
  confidence: z.number().min(0).max(1),

  /** The transcript segment ID this citation was found in */
  segmentId: z.string().uuid().optional(),
});

export type CitationCandidate = z.infer<typeof CitationCandidateSchema>;

// ─── NER Output Schema (LLM structured output) ───────────────────────────────

export const CitationNerOutputSchema = z.object({
  citations: z.array(CitationCandidateSchema),
});

export type CitationNerOutput = z.infer<typeof CitationNerOutputSchema>;

// ─── NATS Event Payloads ──────────────────────────────────────────────────────

export const CitationCandidatesPayloadSchema = z.object({
  lessonId: z.string().uuid(),
  tenantId: z.string().uuid(),
  courseId: z.string().uuid().optional(),
  candidates: z.array(CitationCandidateSchema),
  timestamp: z.string(),
});

export type CitationCandidatesPayload = z.infer<
  typeof CitationCandidatesPayloadSchema
>;

export const TranscriptReadyPayloadSchema = z.object({
  lessonId: z.string().uuid(),
  transcriptId: z.string().uuid(),
  segmentCount: z.number().int().nonnegative(),
  tenantId: z.string().uuid(),
  courseId: z.string().uuid().optional(),
});

export type TranscriptReadyPayload = z.infer<
  typeof TranscriptReadyPayloadSchema
>;

// ─── Citation Resolution Types ────────────────────────────────────────────────

export const CitationMatchStatusSchema = z.enum([
  'VERIFIED',
  'UNVERIFIED',
  'REJECTED',
  'PENDING',
]);

export type CitationMatchStatus = z.infer<typeof CitationMatchStatusSchema>;

export const ResolvedCitationSchema = z.object({
  candidate: CitationCandidateSchema,
  matchStatus: CitationMatchStatusSchema,
  resolvedText: z.string().optional(),
  knowledgeSourceId: z.string().uuid().optional(),
  graphSourceId: z.string().optional(),
});

export type ResolvedCitation = z.infer<typeof ResolvedCitationSchema>;
