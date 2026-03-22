import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { storeDecision, storeBugPattern, storeCodePattern, storeAgentPerf } from './handlers.js';
import {
  searchAll,
  searchCollection,
  getRecent,
  listCollections,
  migrateMarkdown,
  healthCheck,
} from './search-handlers.js';

const server = new McpServer({
  name: 'vector-memory',
  version: '1.0.0',
});

// ─── Store tools ─────────────────────────────────────────────────

server.tool(
  'vm_store_decision',
  'Store an architectural decision or ADR in vector memory.',
  {
    title: z.string().describe('Decision title'),
    rationale: z.string().describe('Why this decision was made'),
    alternatives: z.string().describe('Alternatives considered'),
    chosen: z.string().describe('Chosen approach'),
    tags: z.array(z.string()).describe('Categorization tags'),
  },
  async (args) => storeDecision(args),
);

server.tool(
  'vm_store_bug_pattern',
  'Store a bug fix pattern with root cause and solution.',
  {
    error: z.string().describe('Error message or symptom'),
    root_cause: z.string().describe('Root cause analysis'),
    solution: z.string().describe('How it was fixed'),
    files: z.array(z.string()).describe('Affected files'),
  },
  async (args) => storeBugPattern(args),
);

server.tool(
  'vm_store_code_pattern',
  'Store a reusable code pattern.',
  {
    name: z.string().describe('Pattern name'),
    pattern: z.string().describe('Code pattern or template'),
    usage: z.string().describe('When and how to use'),
    tags: z.array(z.string()).describe('Tags'),
  },
  async (args) => storeCodePattern(args),
);

server.tool(
  'vm_store_agent_perf',
  'Store agent performance metrics.',
  {
    agent_id: z.string().describe('Agent identifier'),
    task: z.string().describe('Task description'),
    duration_ms: z.number().describe('Duration in milliseconds'),
    success: z.boolean().describe('Whether the task succeeded'),
    notes: z.string().describe('Additional notes'),
  },
  async (args) => storeAgentPerf(args),
);

// ─── Search tools ────────────────────────────────────────────────

server.tool(
  'vm_search',
  'Search ALL collections for relevant memories. Returns top-K by distance.',
  {
    query: z.string().describe('Search query'),
    n_results: z.number().optional().describe('Number of results (default 5)'),
  },
  async (args) => searchAll(args),
);

server.tool(
  'vm_search_decisions',
  'Search architectural decisions only.',
  {
    query: z.string().describe('Search query'),
    n_results: z.number().optional().describe('Number of results (default 5)'),
  },
  async (args) => searchCollection('edusphere_decisions', args),
);

server.tool(
  'vm_search_bugs',
  'Search bug patterns only.',
  {
    query: z.string().describe('Search query'),
    n_results: z.number().optional().describe('Number of results (default 5)'),
  },
  async (args) => searchCollection('edusphere_bug_patterns', args),
);

server.tool(
  'vm_search_patterns',
  'Search code patterns only.',
  {
    query: z.string().describe('Search query'),
    n_results: z.number().optional().describe('Number of results (default 5)'),
  },
  async (args) => searchCollection('edusphere_code_patterns', args),
);

// ─── Utility tools ───────────────────────────────────────────────

server.tool(
  'vm_get_recent',
  'Get N most recent entries from a collection or all collections.',
  {
    n: z.number().optional().describe('Number of entries (default 10)'),
    collection: z.string().optional().describe('Collection name (optional, searches all if omitted)'),
  },
  async (args) => getRecent(args),
);

server.tool(
  'vm_list_collections',
  'List all collections with document counts.',
  {},
  async () => listCollections(),
);

server.tool(
  'vm_migrate_markdown',
  'Import a markdown file with frontmatter into the appropriate collection.',
  {
    file_path: z.string().describe('Absolute path to the markdown file'),
  },
  async (args) => migrateMarkdown(args),
);

server.tool(
  'vm_health',
  'Check ChromaDB connection health and collection status.',
  {},
  async () => healthCheck(),
);

// ─── Start server ────────────────────────────────────────────────

async function main(): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((e) => {
  process.stderr.write(`[vector-memory] Fatal: ${e instanceof Error ? e.message : String(e)}\n`);
  process.exit(1);
});
