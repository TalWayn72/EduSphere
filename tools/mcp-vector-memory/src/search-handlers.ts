import type { CollectionName } from './collections.js';
import { getCollection, COLLECTION_NAMES, listCollectionsWithCounts, getClient } from './collections.js';
import { readMarkdownFile, mapTypeToCollection, generateDocId, isoTimestamp } from './embeddings.js';

type McpResult = { content: Array<{ type: 'text'; text: string }>; isError?: boolean };
type SearchHit = { id: string; document: string | null; metadata: Record<string, unknown> | null; distance: number; collection: string };

function ok(data: unknown): McpResult {
  return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
}
function err(msg: string): McpResult {
  return { isError: true, content: [{ type: 'text', text: JSON.stringify({ error: msg }) }] };
}

async function searchSingleCollection(name: CollectionName, query: string, nResults: number): Promise<SearchHit[]> {
  try {
    const col = await getCollection(name);
    const count = await col.count();
    if (count === 0) return [];
    const results = await col.query({ queryTexts: [query], nResults: Math.min(nResults, count) });
    const ids = results.ids?.[0] ?? [];
    const docs = results.documents?.[0] ?? [];
    const metas = results.metadatas?.[0] ?? [];
    const dists = results.distances?.[0] ?? [];
    return ids.map((id, i) => ({
      id: id ?? '', document: docs[i] ?? null, metadata: metas[i] ?? null,
      distance: dists[i] ?? Infinity, collection: name,
    }));
  } catch { return []; }
}

export async function searchAll(args: Record<string, unknown>): Promise<McpResult> {
  try {
    const query = args['query'] as string;
    const nResults = (args['n_results'] as number) ?? 5;
    const allHits: SearchHit[] = [];

    for (const name of COLLECTION_NAMES) {
      const hits = await searchSingleCollection(name, query, nResults);
      allHits.push(...hits);
    }

    allHits.sort((a, b) => a.distance - b.distance);
    return ok({ results: allHits.slice(0, nResults), total_searched: COLLECTION_NAMES.length });
  } catch (e) {
    return err(`Search failed: ${e instanceof Error ? e.message : String(e)}`);
  }
}

export async function searchCollection(
  collectionName: CollectionName,
  args: Record<string, unknown>,
): Promise<McpResult> {
  try {
    const query = args['query'] as string;
    const nResults = (args['n_results'] as number) ?? 5;
    const hits = await searchSingleCollection(collectionName, query, nResults);
    return ok({ results: hits, collection: collectionName });
  } catch (e) {
    return err(`Search failed: ${e instanceof Error ? e.message : String(e)}`);
  }
}

export async function getRecent(args: Record<string, unknown>): Promise<McpResult> {
  try {
    const n = (args['n'] as number) ?? 10;
    const colName = args['collection'] as CollectionName | undefined;
    const targets = colName ? [colName] : [...COLLECTION_NAMES];
    type DocEntry = { id: string; document: string | null; metadata: Record<string, unknown> | null; collection: string };
    const allDocs: DocEntry[] = [];

    for (const name of targets) {
      const col = await getCollection(name as CollectionName);
      const count = await col.count();
      if (count === 0) continue;
      const res = await col.get({ limit: Math.min(n, count) });
      for (let i = 0; i < (res.ids?.length ?? 0); i++) {
        allDocs.push({
          id: res.ids[i] ?? '',
          document: res.documents?.[i] ?? null,
          metadata: res.metadatas?.[i] ?? null,
          collection: name,
        });
      }
    }

    // Sort by timestamp descending if available
    allDocs.sort((a, b) => {
      const ta = (a.metadata?.['timestamp'] as string) ?? '';
      const tb = (b.metadata?.['timestamp'] as string) ?? '';
      return tb.localeCompare(ta);
    });

    return ok({ results: allDocs.slice(0, n) });
  } catch (e) {
    return err(`Get recent failed: ${e instanceof Error ? e.message : String(e)}`);
  }
}

export async function listCollections(): Promise<McpResult> {
  try {
    const collections = await listCollectionsWithCounts();
    return ok({ collections });
  } catch (e) {
    return err(`List collections failed: ${e instanceof Error ? e.message : String(e)}`);
  }
}

export async function migrateMarkdown(args: Record<string, unknown>): Promise<McpResult> {
  try {
    const filePath = args['file_path'] as string;
    const parsed = await readMarkdownFile(filePath);
    const fmType = (parsed.frontmatter['type'] as string) ?? 'reference';
    const collectionName = mapTypeToCollection(fmType) as CollectionName;
    const col = await getCollection(collectionName);
    const id = generateDocId();
    const ts = isoTimestamp();
    const name = (parsed.frontmatter['name'] as string) ?? filePath.split(/[/\\]/).pop() ?? 'unknown';
    const description = (parsed.frontmatter['description'] as string) ?? '';
    const doc = `${name}\n${description}\n\n${parsed.body}`;

    await col.add({
      ids: [id],
      documents: [doc],
      metadatas: [{ type: fmType, source_file: filePath, timestamp: ts, name }],
    });

    return ok({ id, stored: true, collection: collectionName, source: filePath, timestamp: ts });
  } catch (e) {
    return err(`Migrate failed: ${e instanceof Error ? e.message : String(e)}`);
  }
}

export async function healthCheck(): Promise<McpResult> {
  try {
    const client = getClient();
    const chromadbUrl = process.env['CHROMADB_URL'] || 'http://localhost:8000';
    await client.heartbeat();
    const collections = await listCollectionsWithCounts();
    return ok({ status: 'ok', collections: collections.length, chromadb_url: chromadbUrl });
  } catch (e) {
    const chromadbUrl = process.env['CHROMADB_URL'] || 'http://localhost:8000';
    return ok({ status: 'error', error: e instanceof Error ? e.message : String(e), chromadb_url: chromadbUrl });
  }
}
