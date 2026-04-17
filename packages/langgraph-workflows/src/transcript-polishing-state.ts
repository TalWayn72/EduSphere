/**
 * Transcript Polishing Workflow — State & Helpers
 *
 * LangGraph Annotation, shared constants, and pure utility functions.
 * Consumed by transcript-polishing-nodes.ts and transcript-polishing-workflow.ts.
 */

import { Annotation } from '@langchain/langgraph';
import { generateText } from 'ai';
import type { LanguageModel } from 'ai';
import type {
  RawSegment,
  JargonEntry,
  PolishingChunk,
  PolishedChunkResult,
  FormattedBlock,
} from './transcript-polishing-types';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const CHUNK_GAP_THRESHOLD_MS = 2000;
export const CHUNK_MAX_DURATION_MS = 14 * 60 * 1000;
export const COVERAGE_THRESHOLD = 0.3;
export const MAX_REPAIR_ATTEMPTS = 2;
export const OVERLAP_SENTENCES = 3;

// ---------------------------------------------------------------------------
// Annotation (LangGraph state)
// ---------------------------------------------------------------------------

export const PolishingAnnotation = Annotation.Root({
  lessonId: Annotation<string>(),
  tenantId: Annotation<string>(),
  transcriptId: Annotation<string>(),
  rawSegments: Annotation<RawSegment[]>({
    value: (_, u) => u,
    default: () => [],
  }),
  jargonGlossary: Annotation<JargonEntry[]>({
    value: (_, u) => u,
    default: () => [],
  }),
  existingVoiceProfile: Annotation<string | undefined>({
    value: (_, u) => u,
    default: () => undefined,
  }),
  chunks: Annotation<PolishingChunk[]>({
    value: (_, u) => u,
    default: () => [],
  }),
  voiceProfile: Annotation<string>({ value: (_, u) => u, default: () => '' }),
  polishedChunks: Annotation<PolishedChunkResult[]>({
    reducer: (existing, incoming) => {
      const map = new Map(existing.map((c) => [c.chunkIndex, c]));
      incoming.forEach((c) => map.set(c.chunkIndex, c));
      return Array.from(map.values()).sort(
        (a, b) => a.chunkIndex - b.chunkIndex
      );
    },
    default: () => [],
  }),
  stitchedText: Annotation<string>({ value: (_, u) => u, default: () => '' }),
  coverageGaps: Annotation<string[]>({ value: (_, u) => u, default: () => [] }),
  repairAttempts: Annotation<number>({ value: (_, u) => u, default: () => 0 }),
  formattedBlocks: Annotation<FormattedBlock[]>({
    value: (_, u) => u,
    default: () => [],
  }),
  coverageScore: Annotation<number>({ value: (_, u) => u, default: () => 0 }),
  status: Annotation<string>({
    value: (_, u) => u,
    default: () => 'PROCESSING',
  }),
  error: Annotation<string | undefined>({
    value: (_, u) => u,
    default: () => undefined,
  }),
  progress: Annotation<number>({ value: (_, u) => u, default: () => 0 }),
});

export type PolishingAnnotationType = typeof PolishingAnnotation.State;

// ---------------------------------------------------------------------------
// Pure utility helpers (no side effects)
// ---------------------------------------------------------------------------

export function lastNSentences(text: string, n: number): string {
  const sentences = text.split(/(?<=[.!?])\s+/);
  return sentences.slice(-n).join(' ');
}

export function jaccardSimilarity(a: string, b: string): number {
  const setA = new Set(a.split(/\s+/));
  const setB = new Set(b.split(/\s+/));
  const intersection = new Set([...setA].filter((w) => setB.has(w)));
  const union = new Set([...setA, ...setB]);
  return union.size === 0 ? 1 : intersection.size / union.size;
}

export function safeParse<T>(json: string, fallback: T): T {
  try {
    return JSON.parse(json) as T;
  } catch {
    return fallback;
  }
}

export async function callLLM(
  model: LanguageModel,
  prompt: string
): Promise<string> {
  const { text } = await generateText({ model, prompt });
  return text;
}
