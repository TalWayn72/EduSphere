/**
 * Certification Exam Generator — shared types.
 *
 * Used by all 7 pipeline nodes and the adapter layer.
 */

export interface GeneratedItemOption {
  text: string;
  isCorrect: boolean;
  explanation?: string;
}

export interface GeneratedItem {
  question: string;
  options: GeneratedItemOption[];
  bloomLevel: string;
  domainTag: string;
  difficulty: string;
  iwfFlags: string[];
  verified: boolean;
}

/** Callback for HybridRAG semantic search — injected at runtime. */
export type CitationSearchFn = (
  query: string,
  limit: number
) => Promise<{ id: string; text: string; similarity: number; source?: string }[]>;
