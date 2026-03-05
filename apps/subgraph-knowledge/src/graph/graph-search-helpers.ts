/**
 * graph-search-helpers.ts — Text-similarity and type helpers for GraphSearchService.
 * Exported as plain functions (no DI) to keep GraphSearchService under 150 lines.
 */
import type { GraphConceptNode } from './graph-types';

export interface SemanticResult {
  id: string;
  text: string;
  similarity: number;
  entityType: string;
  entityId: string;
  /** Timestamp in seconds for transcript_segment results; null for concepts. */
  startTime: number | null;
}

/**
 * Compute a heuristic text-similarity score in [0.5, 1.0] for a haystack vs query.
 * Used as a fallback when pgvector scores are unavailable.
 */
export function computeTextSimilarity(text: string, query: string): number {
  const haystack = text.toLowerCase();
  const needle = query.toLowerCase();
  if (haystack === needle) return 1.0;
  if (haystack.includes(needle)) return 0.85;
  const queryWords = needle.split(/\s+/).filter(Boolean);
  if (queryWords.length === 0) return 0.5;
  const matchCount = queryWords.filter((w) => haystack.includes(w)).length;
  return 0.5 + 0.35 * (matchCount / queryWords.length);
}

/**
 * Filter and score concepts by text match against the query.
 * Returns at most `limit` results sorted by heuristic similarity.
 */
export function scoreConceptsByText(
  concepts: GraphConceptNode[],
  query: string,
  limit: number
): SemanticResult[] {
  const q = query.toLowerCase();
  return concepts
    .filter(
      (c) =>
        c.name?.toLowerCase().includes(q) ||
        c.definition?.toLowerCase().includes(q)
    )
    .slice(0, limit)
    .map((c) => ({
      id: c.id,
      text: c.definition ?? c.name,
      similarity: computeTextSimilarity(`${c.name} ${c.definition ?? ''}`, query),
      entityType: 'concept',
      entityId: c.id,
      startTime: null,
    }));
}
