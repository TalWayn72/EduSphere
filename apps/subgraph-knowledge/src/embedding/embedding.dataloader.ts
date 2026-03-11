/**
 * EmbeddingDataLoader — batches N concept-name semantic searches into
 * the minimum number of DB round-trips possible.
 *
 * Strategy:
 *  1. Embed all concept strings in parallel (unavoidable — 1 HTTP call per string).
 *  2. Issue ONE pgvector kNN query per concept using the pre-computed vectors,
 *     via semanticSearchByVector (bypasses embedding provider on the second call).
 *  3. Group results by concept name and return a Map.
 *
 * This reduces N separate EmbeddingProvider + DB round-trips to
 * N parallel provider calls + N parallel vector reads (vectorised with HNSW).
 */
import { Injectable, Logger } from '@nestjs/common';
import type { TenantContext } from '@edusphere/db';
import { EmbeddingService } from './embedding.service.js';
import type { SearchResult } from './embedding.types.js';

const DEFAULT_LIMIT = 5;

@Injectable()
export class EmbeddingDataLoader {
  private readonly logger = new Logger(EmbeddingDataLoader.name);

  constructor(private readonly embeddingService: EmbeddingService) {}

  /**
   * Batch-load search results for a list of concept names.
   * Returns a Map keyed by concept name with up to DEFAULT_LIMIT results each.
   */
  async batchLoad(
    conceptNames: readonly string[],
    tenantCtx: TenantContext,
    limit = DEFAULT_LIMIT
  ): Promise<Map<string, SearchResult[]>> {
    const result = new Map<string, SearchResult[]>();
    if (conceptNames.length === 0) return result;

    // Step 1 — embed all concepts in parallel
    const vectorEntries = await Promise.all(
      conceptNames.map(async (name) => {
        try {
          const vector = await this.embeddingService.callEmbeddingProvider(name);
          return { name, vector };
        } catch (err) {
          this.logger.warn(
            { conceptName: name, err: String(err) },
            '[EmbeddingDataLoader] embed failed for concept'
          );
          return { name, vector: null };
        }
      })
    );

    // Step 2 — search by vector in parallel (HNSW — each is a fast index scan)
    await Promise.all(
      vectorEntries.map(async ({ name, vector }) => {
        if (!vector) {
          result.set(name, []);
          return;
        }
        try {
          const hits = await this.embeddingService.semanticSearchByVector(
            vector,
            tenantCtx,
            limit
          );
          result.set(name, hits);
        } catch (err) {
          this.logger.warn(
            { conceptName: name, err: String(err) },
            '[EmbeddingDataLoader] vector search failed'
          );
          result.set(name, []);
        }
      })
    );

    // Ensure every input concept has an entry (even on total failure)
    for (const name of conceptNames) {
      if (!result.has(name)) result.set(name, []);
    }

    return result;
  }
}
