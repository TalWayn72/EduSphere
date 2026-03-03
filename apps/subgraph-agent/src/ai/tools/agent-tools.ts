import { z } from 'zod';
import { tool } from 'ai';

// ── Result shapes ─────────────────────────────────────────────────────────────

export interface KnowledgeSearchResult {
  id: string;
  text: string;
  type: string;
  similarity: number;
}

export interface ContentItemResult {
  id: string;
  title: string;
  type: string;
  content: string | null;
}

// ── Tool factories ────────────────────────────────────────────────────────────
// Each factory accepts the actual execute implementation as a closure so that
// the service can inject DB-bound logic without coupling the schema definitions
// to any infrastructure dependency.
//
// Uses tool() from 'ai' to produce a properly-typed Tool that satisfies
// the AI SDK v5 ToolSet constraint (requires inputSchema internally).

export function buildSearchKnowledgeGraphTool(
  execute: (query: string, limit: number) => Promise<KnowledgeSearchResult[]>
) {
  return tool({
    description:
      'Search the knowledge graph for concepts and transcript segments related to a query. ' +
      'Use this when the user asks about a topic to find relevant knowledge and context.',
    inputSchema: z.object({
      query: z
        .string()
        .describe('The search query to find relevant concepts or content'),
      limit: z
        .number()
        .int()
        .min(1)
        .max(20)
        .default(5)
        .describe('Maximum number of results to return'),
    }),
    execute: async (input: { query: string; limit: number }) =>
      execute(input.query, input.limit),
  });
}

export function buildFetchCourseContentTool(
  execute: (contentItemId: string) => Promise<ContentItemResult | null>
) {
  return tool({
    description:
      'Fetch the title, type, and text content of a specific content item by its ID. ' +
      'Use this to retrieve context about what the user is currently studying.',
    inputSchema: z.object({
      contentItemId: z
        .string()
        .uuid()
        .describe('The UUID of the content item to fetch'),
    }),
    execute: async (input: { contentItemId: string }) =>
      execute(input.contentItemId),
  });
}

// ── Parameter schemas (re-exported for testing) ───────────────────────────────

export const searchKnowledgeGraphSchema = z.object({
  query: z.string(),
  limit: z.number().int().min(1).max(20).default(5),
});

export const fetchCourseContentSchema = z.object({
  contentItemId: z.string().uuid(),
});
