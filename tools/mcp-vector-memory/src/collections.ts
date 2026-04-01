import { ChromaClient, type Collection } from 'chromadb';
import { withRetry, logError } from './resilience.js';

/** All managed collection names. */
export const COLLECTION_NAMES = [
  'edusphere_decisions',
  'edusphere_bug_patterns',
  'edusphere_code_patterns',
  'edusphere_feedback',
  'edusphere_agent_perf',
] as const;

export type CollectionName = (typeof COLLECTION_NAMES)[number];

/** Singleton ChromaDB client instance. */
let clientInstance: ChromaClient | null = null;

/** Cache of initialized collections. */
const collectionCache = new Map<CollectionName, Collection>();

/**
 * Get or create the singleton ChromaClient.
 */
export function getClient(): ChromaClient {
  if (!clientInstance) {
    const url = process.env['CHROMADB_URL'] || 'http://localhost:8100';
    clientInstance = new ChromaClient({ path: url });
  }
  return clientInstance;
}

/**
 * Get or create a ChromaDB collection by name (lazy init).
 * Uses retry with exponential backoff for transient failures.
 */
export async function getCollection(name: CollectionName): Promise<Collection> {
  const cached = collectionCache.get(name);
  if (cached) return cached;

  const client = getClient();
  const collection = await withRetry(
    () => client.getOrCreateCollection({ name }),
    { maxAttempts: 3, initialDelayMs: 500 }
  );
  collectionCache.set(name, collection);
  return collection;
}

/**
 * Safe version of getCollection — returns null instead of throwing.
 * Logs the error to stderr when ChromaDB is unreachable.
 */
export async function getCollectionSafe(
  name: CollectionName
): Promise<Collection | null> {
  try {
    return await getCollection(name);
  } catch (e) {
    logError('getCollectionSafe', e);
    return null;
  }
}

/**
 * Get all collections with their document counts.
 */
export async function listCollectionsWithCounts(): Promise<
  Array<{ name: string; count: number }>
> {
  const results: Array<{ name: string; count: number }> = [];

  for (const name of COLLECTION_NAMES) {
    try {
      const collection = await getCollection(name);
      const count = await collection.count();
      results.push({ name, count });
    } catch (e) {
      logError('listCollectionsWithCounts', e);
      results.push({ name, count: -1 });
    }
  }

  return results;
}

/**
 * Reset the client instance (for testing).
 */
export function resetClient(): void {
  clientInstance = null;
  collectionCache.clear();
}
