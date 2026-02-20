/**
 * AI service database helpers for agent tool calls.
 *
 * This barrel module re-exports the concrete implementations from the
 * focused sub-modules:
 *   - search.db.ts  — pgvector cosine similarity + ILIKE fallback
 *   - content.db.ts — Drizzle content_items fetch with RLS
 *
 * The split keeps each file under the 150-line guideline while
 * preserving the original import path used by ai.service.ts.
 */

export { searchKnowledgeGraph } from './search.db';
export { fetchContentItem } from './content.db';
