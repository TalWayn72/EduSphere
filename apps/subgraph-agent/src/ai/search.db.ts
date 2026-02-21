/**
 * Knowledge graph search — pgvector cosine similarity with ILIKE fallback.
 *
 * Two-phase strategy:
 *   Phase 1 — pgvector: generate query embedding → ORDER BY cosine distance.
 *   Phase 2 — ILIKE  : always run, dedup against Phase 1 results.
 *
 * If the embedding provider is unavailable the function falls back to ILIKE
 * silently (graceful degradation — never throws to the caller).
 */

import { Logger } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import { createDatabaseConnection, schema, withTenantContext } from '@edusphere/db';
import type { KnowledgeSearchResult } from './tools/agent-tools';

const logger = new Logger('SearchDb');

// ── Embedding provider ────────────────────────────────────────────────────────

async function generateQueryEmbedding(text: string): Promise<number[] | null> {
  const ollamaUrl = process.env.OLLAMA_URL;
  const openaiKey = process.env.OPENAI_API_KEY;
  const model = process.env.EMBEDDING_MODEL ?? 'nomic-embed-text';

  try {
    if (ollamaUrl) {
      const resp = await fetch(`${ollamaUrl.replace(/\/$/, '')}/api/embeddings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, prompt: text }),
      });
      if (!resp.ok) return null;
      const data = (await resp.json()) as { embedding: number[] };
      return data.embedding;
    }

    if (openaiKey) {
      const resp = await fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${openaiKey}`,
        },
        body: JSON.stringify({ model: 'text-embedding-3-small', input: text, dimensions: 768 }),
      });
      if (!resp.ok) return null;
      const data = (await resp.json()) as { data: Array<{ embedding: number[] }> };
      return data.data[0]?.embedding ?? null;
    }
  } catch (err) {
    logger.warn(`Embedding provider error: ${String(err)}`);
  }
  return null;
}

// ── Search implementation ─────────────────────────────────────────────────────

export async function searchKnowledgeGraph(
  query: string,
  tenantId: string,
  limit: number = 5,
): Promise<KnowledgeSearchResult[]> {
  logger.debug(`searchKnowledgeGraph: query="${query}" tenant=${tenantId} limit=${limit}`);

  const db = createDatabaseConnection();
  const seen = new Set<string>();
  const results: KnowledgeSearchResult[] = [];

  // ── Phase 1: pgvector cosine similarity ──────────────────────────────────
  const queryVector = await generateQueryEmbedding(query);
  if (queryVector !== null) {
    try {
      const vectorString = `[${queryVector.join(',')}]`;
      // Raw SQL required: Drizzle v1 has no native <=> operator support.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- raw execute returns unknown row type
      const rows = (await (db as any).execute(sql`
        SELECT
          ts.id          AS segment_id,
          ts.text        AS text,
          1 - (ce.embedding <=> ${vectorString}::vector) AS similarity
        FROM content_embeddings ce
        JOIN transcript_segments ts  ON ts.id  = ce.segment_id
        JOIN transcripts          tr ON tr.id  = ts.transcript_id
        JOIN media_assets         ma ON ma.id  = tr.asset_id
        WHERE ma.tenant_id = ${tenantId}
        ORDER BY ce.embedding <=> ${vectorString}::vector ASC
        LIMIT ${limit}
      `)) as Array<{ segment_id: string; text: string; similarity: string }>;

      for (const row of rows) {
        seen.add(row.segment_id);
        results.push({
          id: row.segment_id,
          text: row.text.slice(0, 200),
          type: 'transcript_segment',
          similarity: parseFloat(row.similarity),
        });
      }
    } catch (err) {
      logger.warn(`pgvector search failed, continuing with ILIKE: ${String(err)}`);
    }
  }

  // ── Phase 2: ILIKE fallback (always run, dedup against Phase 1) ──────────
  const remaining = limit - results.length;
  if (remaining > 0) {
    try {
      const term = `%${query.replace(/%/g, '\\%').replace(/_/g, '\\_')}%`;
      await withTenantContext(
        db,
        { tenantId, userId: 'system', userRole: 'STUDENT' },
        async (tx) => {
          const ilikeRows = await tx
            .select({
              id: schema.transcript_segments.id,
              text: schema.transcript_segments.text,
            })
            .from(schema.transcript_segments)
            .where(sql`${schema.transcript_segments.text} ILIKE ${term}`)
            .limit(remaining + seen.size); // over-fetch then dedup

          for (const row of ilikeRows) {
            if (seen.has(row.id)) continue;
            seen.add(row.id);
            results.push({ id: row.id, text: row.text.slice(0, 200), type: 'transcript_segment', similarity: 0 });
            if (results.length >= limit) break;
          }
        },
      );
    } catch (err) {
      logger.warn(`ILIKE fallback failed: ${String(err)}`);
    }
  }

  return results.slice(0, limit);
}
