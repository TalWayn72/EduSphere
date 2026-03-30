import { Injectable, Logger, OnModuleDestroy, Optional } from '@nestjs/common';
import { closeAllPools } from '@edusphere/db';
import type { TenantContext } from '@edusphere/db';
import type {
  EmbeddingRecord,
  SearchResult,
  SegmentInput,
} from './embedding.types.js';
import { EmbeddingStoreService } from './embedding-store.service.js';
import { EmbeddingProviderService } from './embedding-provider.service.js';
import { EmbeddingFallbackService } from './embedding-fallback.service.js';

export type { EmbeddingRecord, SearchResult, SegmentInput };

const BATCH_SIZE = 20;

/**
 * Facade -- delegates to EmbeddingStoreService + EmbeddingProviderService.
 * Falls back to EmbeddingFallbackService when sub-services are not injected
 * (unit-test path: spec mocks @edusphere/db and constructs with new EmbeddingService()).
 */
@Injectable()
export class EmbeddingService implements OnModuleDestroy {
  private readonly logger = new Logger(EmbeddingService.name);
  private readonly fallback = new EmbeddingFallbackService();

  constructor(
    @Optional() private readonly store?: EmbeddingStoreService,
    @Optional() private readonly provider?: EmbeddingProviderService
  ) {}

  async onModuleDestroy(): Promise<void> {
    await closeAllPools();
  }

  // -- Lookup ----------------------------------------------------------------

  async findById(id: string): Promise<EmbeddingRecord> {
    if (this.store) return this.store.findById(id);
    return this.fallback.findById(id);
  }

  async findBySegment(segmentId: string): Promise<EmbeddingRecord[]> {
    if (this.store) return this.store.findBySegment(segmentId);
    return this.fallback.findBySegment(segmentId);
  }

  // -- Generation ------------------------------------------------------------

  async generateEmbedding(text: string, segmentId: string): Promise<EmbeddingRecord> {
    const vector = await this.callEmbeddingProvider(text);
    if (this.store) return this.store.upsertContentEmbedding(segmentId, vector);
    return this.fallback.upsertContent(segmentId, vector);
  }

  async generateBatchEmbeddings(segments: SegmentInput[]): Promise<number> {
    if (segments.length === 0) return 0;
    let count = 0;
    for (let i = 0; i < segments.length; i += BATCH_SIZE) {
      const batch = segments.slice(i, i + BATCH_SIZE);
      await Promise.all(
        batch.map(async (seg) => {
          try {
            await this.generateEmbedding(seg.text, seg.id);
            count++;
          } catch (err) {
            this.logger.error(`Failed to embed segment ${seg.id}: ${String(err)}`);
          }
        })
      );
    }
    this.logger.log(`Batch embed complete: ${count}/${segments.length} segments`);
    return count;
  }

  // -- Semantic Search -------------------------------------------------------

  async semanticSearch(
    queryText: string,
    tenantCtx: TenantContext,
    limit = 10
  ): Promise<SearchResult[]> {
    const hasProvider = this.provider
      ? this.provider.hasProvider()
      : !!(process.env.OLLAMA_URL ?? process.env.OPENAI_API_KEY);

    if (!hasProvider) {
      this.logger.warn('No embedding provider -- semantic search falling back to ILIKE');
      return this.store
        ? this.store.ilikeFallback(queryText, limit, tenantCtx)
        : this.fallback.ilikeFallback(queryText, limit);
    }

    let vector: number[];
    try {
      vector = await this.callEmbeddingProvider(queryText);
    } catch (err) {
      this.logger.warn(`Embedding provider error (${String(err)}) -- using ILIKE fallback`);
      return this.store
        ? this.store.ilikeFallback(queryText, limit, tenantCtx)
        : this.fallback.ilikeFallback(queryText, limit);
    }

    const vecStr = `[${vector.join(',')}]`;
    return this.store
      ? this.store.searchByVector(vecStr, limit, tenantCtx)
      : this.fallback.vectorSearch(vecStr, limit);
  }

  async semanticSearchByVector(
    queryVector: number[],
    tenantCtx: TenantContext,
    limit = 10,
    minSimilarity = 0.7
  ): Promise<SearchResult[]> {
    const vecStr = `[${queryVector.join(',')}]`;
    return this.store
      ? this.store.searchByVector(vecStr, limit, tenantCtx, minSimilarity)
      : this.fallback.vectorSearch(vecStr, limit, minSimilarity);
  }

  // -- Delete ----------------------------------------------------------------

  async deleteByConceptId(conceptId: string): Promise<number> {
    if (this.store) return this.store.deleteByConceptId(conceptId);
    return this.fallback.deleteByConceptId(conceptId);
  }

  async delete(id: string): Promise<boolean> {
    if (this.store) return this.store.delete(id);
    return this.fallback.deleteById(id);
  }

  // -- Public helper (used by tests + semanticSearch internally) -------------

  async callEmbeddingProvider(text: string): Promise<number[]> {
    if (this.provider) return this.provider.generateEmbedding(text);
    return this.fallback.directProviderCall(text);
  }

  // -- Legacy shims ----------------------------------------------------------

  async findByContentItem(_contentItemId: string): Promise<EmbeddingRecord[]> {
    this.logger.warn('findByContentItem is deprecated -- use findBySegment');
    return [];
  }

  async deleteByContentItem(_contentItemId: string): Promise<number> {
    this.logger.warn('deleteByContentItem is deprecated');
    return 0;
  }
}
