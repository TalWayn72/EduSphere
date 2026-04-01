import type { CollectionName } from './collections.js';
import {
  getCollection,
  COLLECTION_NAMES,
  listCollectionsWithCounts,
  getClient,
} from './collections.js';
import {
  generateDocId,
  isoTimestamp,
  readMarkdownFile,
  mapTypeToCollection,
} from './embeddings.js';
import { isChromaAvailable, logError } from './resilience.js';

type McpResult = {
  content: Array<{ type: 'text'; text: string }>;
  isError?: boolean;
};

function ok(data: unknown): McpResult {
  return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
}

function err(message: string): McpResult {
  return {
    isError: true,
    content: [{ type: 'text', text: JSON.stringify({ error: message }) }],
  };
}

const CHROMADB_UNAVAILABLE_MSG =
  'ChromaDB is currently unreachable. Store operation skipped.';

// ─── Store Handlers ──────────────────────────────────────────────

export async function storeDecision(
  args: Record<string, unknown>
): Promise<McpResult> {
  try {
    if (!(await isChromaAvailable())) {
      logError('storeDecision', CHROMADB_UNAVAILABLE_MSG);
      return err(CHROMADB_UNAVAILABLE_MSG);
    }
    const col = await getCollection('edusphere_decisions');
    const id = generateDocId();
    const ts = isoTimestamp();
    const doc = `${args['title']}\n\nRationale: ${args['rationale']}\nAlternatives: ${args['alternatives']}\nChosen: ${args['chosen']}`;
    await col.add({
      ids: [id],
      documents: [doc],
      metadatas: [
        {
          type: 'decision',
          timestamp: ts,
          tags: (args['tags'] as string[]).join(','),
        },
      ],
    });
    return ok({
      id,
      stored: true,
      collection: 'edusphere_decisions',
      timestamp: ts,
    });
  } catch (e) {
    logError('storeDecision', e);
    return err(
      `Failed to store decision: ${e instanceof Error ? e.message : String(e)}`
    );
  }
}

export async function storeBugPattern(
  args: Record<string, unknown>
): Promise<McpResult> {
  try {
    if (!(await isChromaAvailable())) {
      logError('storeBugPattern', CHROMADB_UNAVAILABLE_MSG);
      return err(CHROMADB_UNAVAILABLE_MSG);
    }
    const col = await getCollection('edusphere_bug_patterns');
    const id = generateDocId();
    const ts = isoTimestamp();
    const doc = `Error: ${args['error']}\n\nRoot Cause: ${args['root_cause']}\nSolution: ${args['solution']}`;
    await col.add({
      ids: [id],
      documents: [doc],
      metadatas: [
        {
          type: 'bug',
          timestamp: ts,
          files: (args['files'] as string[]).join(','),
        },
      ],
    });
    return ok({
      id,
      stored: true,
      collection: 'edusphere_bug_patterns',
      timestamp: ts,
    });
  } catch (e) {
    logError('storeBugPattern', e);
    return err(
      `Failed to store bug pattern: ${e instanceof Error ? e.message : String(e)}`
    );
  }
}

export async function storeCodePattern(
  args: Record<string, unknown>
): Promise<McpResult> {
  try {
    if (!(await isChromaAvailable())) {
      logError('storeCodePattern', CHROMADB_UNAVAILABLE_MSG);
      return err(CHROMADB_UNAVAILABLE_MSG);
    }
    const col = await getCollection('edusphere_code_patterns');
    const id = generateDocId();
    const ts = isoTimestamp();
    const doc = `${args['name']}\n\nPattern: ${args['pattern']}\nUsage: ${args['usage']}`;
    await col.add({
      ids: [id],
      documents: [doc],
      metadatas: [
        {
          type: 'code_pattern',
          timestamp: ts,
          tags: (args['tags'] as string[]).join(','),
        },
      ],
    });
    return ok({
      id,
      stored: true,
      collection: 'edusphere_code_patterns',
      timestamp: ts,
    });
  } catch (e) {
    logError('storeCodePattern', e);
    return err(
      `Failed to store code pattern: ${e instanceof Error ? e.message : String(e)}`
    );
  }
}

export async function storeAgentPerf(
  args: Record<string, unknown>
): Promise<McpResult> {
  try {
    if (!(await isChromaAvailable())) {
      logError('storeAgentPerf', CHROMADB_UNAVAILABLE_MSG);
      return err(CHROMADB_UNAVAILABLE_MSG);
    }
    const col = await getCollection('edusphere_agent_perf');
    const id = generateDocId();
    const ts = isoTimestamp();
    const doc = `Agent: ${args['agent_id']}\nTask: ${args['task']}\nDuration: ${args['duration_ms']}ms\nSuccess: ${args['success']}\nNotes: ${args['notes']}`;
    await col.add({
      ids: [id],
      documents: [doc],
      metadatas: [
        {
          type: 'agent_perf',
          agent_id: args['agent_id'] as string,
          success: String(args['success']),
          timestamp: ts,
        },
      ],
    });
    return ok({
      id,
      stored: true,
      collection: 'edusphere_agent_perf',
      timestamp: ts,
    });
  } catch (e) {
    logError('storeAgentPerf', e);
    return err(
      `Failed to store agent perf: ${e instanceof Error ? e.message : String(e)}`
    );
  }
}
