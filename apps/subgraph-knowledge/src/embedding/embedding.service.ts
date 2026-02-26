import { Injectable, Logger, OnModuleDestroy, Optional } from '@nestjs/common';
import {
  createDatabaseConnection,
  schema,
  eq,
  sql,
  closeAllPools,
} from '@edusphere/db';
import type {
  EmbeddingRecord,
  SearchResult,
  SegmentInput,
} from './embedding.types.js';
import { EmbeddingStoreService } from './embedding-store.service.js';
import { EmbeddingProviderService } from './embedding-provider.service.js';

export type { EmbeddingRecord, SearchResult, SegmentInput };

const BATCH_SIZE = 20;

/**
 * Facade -- delegates to EmbeddingStoreService + EmbeddingProviderService.
 * Falls back to direct DB/HTTP when sub-services are not injected (unit-test
 * path: spec mocks @edusphere/db and constructs with new EmbeddingService()).
 */
@Injectable()
export class EmbeddingService implements OnModuleDestroy {
  private readonly logger = new Logger(EmbeddingService.name);
  /** Used only in the no-sub-services fallback path (unit tests). */
  private readonly db = createDatabaseConnection();

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
    return this.fallbackFindById(id);
  }

  async findBySegment(segmentId: string): Promise<EmbeddingRecord[]> {
    if (this.store) return this.store.findBySegment(segmentId);
    return this.fallbackFindBySegment(segmentId);
  }

  // -- Generation ------------------------------------------------------------

  async generateEmbedding(
    text: string,
    segmentId: string
  ): Promise<EmbeddingRecord> {
    const vector = await this.callEmbeddingProvider(text);
    if (this.store) return this.store.upsertContentEmbedding(segmentId, vector);
    return this.fallbackUpsertContent(segmentId, vector);
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
            this.logger.error(
              `Failed to embed segment ${seg.id}: ${String(err)}`
            );
          }
        })
      );
    }
    this.logger.log(
      `Batch embed complete: ${count}/${segments.length} segments`
    );
    return count;
  }

  // -- Semantic Search -------------------------------------------------------

  async semanticSearch(
    queryText: string,
    tenantId: string,
    limit = 10
  ): Promise<SearchResult[]> {
    const hasProvider = this.provider
      ? this.provider.hasProvider()
      : !!(process.env.OLLAMA_URL ?? process.env.OPENAI_API_KEY);

    if (!hasProvider) {
      this.logger.warn(
        'No embedding provider -- semantic search falling back to ILIKE'
      );
      return this.store
        ? this.store.ilikeFallback(queryText, limit)
        : this.fallbackIlike(queryText, limit);
    }

    let vector: number[];
    try {
      vector = await this.callEmbeddingProvider(queryText);
    } catch (err) {
      this.logger.warn(
        `Embedding provider error (${String(err)}) -- using ILIKE fallback`
      );
      return this.store
        ? this.store.ilikeFallback(queryText, limit)
        : this.fallbackIlike(queryText, limit);
    }

    const vecStr = `[${vector.join(',')}]`;
    return this.store
      ? this.store.searchByVector(vecStr, limit)
      : this.fallbackVectorSearch(vecStr, limit);
  }

  async semanticSearchByVector(
    queryVector: number[],
    limit = 10,
    minSimilarity = 0.7
  ): Promise<SearchResult[]> {
    const vecStr = `[${queryVector.join(',')}]`;
    return this.store
      ? this.store.searchByVector(vecStr, limit, minSimilarity)
      : this.fallbackVectorSearch(vecStr, limit, minSimilarity);
  }

  // -- Delete ----------------------------------------------------------------

  async delete(id: string): Promise<boolean> {
    if (this.store) return this.store.delete(id);
    return this.fallbackDelete(id);
  }

  // -- Public helper (used by tests + semanticSearch internally) -------------

  async callEmbeddingProvider(text: string): Promise<number[]> {
    if (this.provider) return this.provider.generateEmbedding(text);
    return this.directProviderCall(text);
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

  // -- Fallback implementations (no-sub-services / unit-test path) -----------

  private async fallbackFindById(id: string): Promise<EmbeddingRecord> {
    const { NotFoundException } = await import('@nestjs/common');

    const [ce] = await this.db
      .select()
      .from(schema.content_embeddings)
      .where(eq(schema.content_embeddings.id, id))
      .limit(1);
    if (ce)
      return this.mapContent(
        ce as {
          id: string;
          segment_id: string;
          embedding: number[];
          created_at: Date;
        }
      );

    const [ae] = await this.db
      .select()
      .from(schema.annotation_embeddings)
      .where(eq(schema.annotation_embeddings.id, id))
      .limit(1);
    if (ae)
      return this.mapAnnotation(
        ae as {
          id: string;
          annotation_id: string;
          embedding: number[];
          created_at: Date;
        }
      );

    const [conc] = await this.db
      .select()
      .from(schema.concept_embeddings)
      .where(eq(schema.concept_embeddings.id, id))
      .limit(1);
    if (conc)
      return this.mapConcept(
        conc as {
          id: string;
          concept_id: string;
          embedding: number[];
          created_at: Date;
        }
      );

    throw new NotFoundException(`Embedding with ID ${id} not found`);
  }

  private async fallbackFindBySegment(
    segmentId: string
  ): Promise<EmbeddingRecord[]> {
    const rows = await this.db
      .select()
      .from(schema.content_embeddings)
      .where(eq(schema.content_embeddings.segment_id, segmentId));
    return rows.map((r) =>
      this.mapContent(
        r as {
          id: string;
          segment_id: string;
          embedding: number[];
          created_at: Date;
        }
      )
    );
  }

  private async fallbackUpsertContent(
    segmentId: string,
    vector: number[]
  ): Promise<EmbeddingRecord> {
    const vecStr = `[${vector.join(',')}]`;
    type R = {
      id: string;
      segment_id: string;
      embedding: number[];
      created_at: Date;
    };
    const [row] = (await this.db.execute<R>(sql`
      INSERT INTO content_embeddings (segment_id, embedding)
      VALUES (${segmentId}, ${vecStr}::vector)
      ON CONFLICT (segment_id)
      DO UPDATE SET embedding = EXCLUDED.embedding
      RETURNING id, segment_id, embedding, created_at
    `)) as unknown as R[];
    if (!row) throw new Error('Failed to upsert content embedding');
    this.logger.log(
      `Generated embedding: segmentId=${segmentId} dim=${vector.length}`
    );
    return this.mapContent(row);
  }

  private async fallbackIlike(
    query: string,
    limit: number
  ): Promise<SearchResult[]> {
    const escaped = query.replace(/%/g, '\\%').replace(/_/g, '\\_');
    const term = '%' + escaped + '%';
    const rows = await this.db
      .select({
        id: schema.transcript_segments.id,
        text: schema.transcript_segments.text,
      })
      .from(schema.transcript_segments)
      .where(sql`${schema.transcript_segments.text} ILIKE ${term}`)
      .limit(limit);
    return rows.map((r) => ({
      id: r.id,
      refId: r.id,
      type: 'transcript_segment',
      similarity: 0.75,
    }));
  }

  private async fallbackVectorSearch(
    vecStr: string,
    limit: number,
    minSimilarity = 0
  ): Promise<SearchResult[]> {
    type R = {
      id: string;
      segment_id: string;
      type: string;
      similarity: string;
    };
    if (minSimilarity > 0) {
      const rows = (await this.db.execute<R>(sql`
        SELECT 'content' AS type, ce.id, ce.segment_id,
          1 - (ce.embedding <=> ${vecStr}::vector) AS similarity
        FROM content_embeddings ce
        WHERE 1 - (ce.embedding <=> ${vecStr}::vector) >= ${minSimilarity}
        ORDER BY ce.embedding <=> ${vecStr}::vector ASC
        LIMIT ${limit}
      `)) as unknown as R[];
      return rows.map((r) => ({
        id: r.id,
        refId: r.segment_id,
        type: r.type,
        similarity: parseFloat(r.similarity),
      }));
    }
    const rows = (await this.db.execute<R>(sql`
      SELECT ce.id, ce.segment_id,
        1 - (ce.embedding <=> ${vecStr}::vector) AS similarity
      FROM content_embeddings ce
      JOIN transcript_segments ts ON ts.id = ce.segment_id
      ORDER BY ce.embedding <=> ${vecStr}::vector ASC
      LIMIT ${limit}
    `)) as unknown as R[];
    return rows.map((r) => ({
      id: r.id,
      refId: r.segment_id,
      type: 'transcript_segment',
      similarity: parseFloat(r.similarity),
    }));
  }

  private async fallbackDelete(id: string): Promise<boolean> {
    const [c] = await this.db
      .delete(schema.content_embeddings)
      .where(eq(schema.content_embeddings.id, id))
      .returning({ id: schema.content_embeddings.id });
    if (c) return true;

    const [a] = await this.db
      .delete(schema.annotation_embeddings)
      .where(eq(schema.annotation_embeddings.id, id))
      .returning({ id: schema.annotation_embeddings.id });
    if (a) return true;

    const [conc] = await this.db
      .delete(schema.concept_embeddings)
      .where(eq(schema.concept_embeddings.id, id))
      .returning({ id: schema.concept_embeddings.id });
    return !!conc;
  }

  private async directProviderCall(text: string): Promise<number[]> {
    const ollamaUrl = process.env.OLLAMA_URL;
    const openaiKey = process.env.OPENAI_API_KEY;
    const model = process.env.EMBEDDING_MODEL ?? 'nomic-embed-text';

    if (ollamaUrl) {
      const resp = await fetch(
        `${ollamaUrl.replace(/\/$/g, '')}/api/embeddings`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ model, prompt: text }),
        }
      );
      if (!resp.ok) throw new Error(`Ollama error ${resp.status}`);
      const json = (await resp.json()) as { embedding: number[] };
      return json.embedding;
    }

    if (openaiKey) {
      const resp = await fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${openaiKey}`,
        },
        body: JSON.stringify({
          model: 'text-embedding-3-small',
          input: text,
          dimensions: 768,
        }),
      });
      if (!resp.ok) throw new Error(`OpenAI error ${resp.status}`);
      const json = (await resp.json()) as {
        data: Array<{ embedding: number[] }>;
      };
      return json.data[0]!.embedding;
    }

    throw new Error('No embedding provider: set OLLAMA_URL or OPENAI_API_KEY');
  }

  private mapContent(r: {
    id: string;
    segment_id: string;
    embedding: number[];
    created_at: Date;
  }): EmbeddingRecord {
    return {
      id: r.id,
      type: 'content',
      refId: r.segment_id,
      embedding: r.embedding,
      createdAt: new Date(r.created_at).toISOString(),
    };
  }

  private mapAnnotation(r: {
    id: string;
    annotation_id: string;
    embedding: number[];
    created_at: Date;
  }): EmbeddingRecord {
    return {
      id: r.id,
      type: 'annotation',
      refId: r.annotation_id,
      embedding: r.embedding,
      createdAt: new Date(r.created_at).toISOString(),
    };
  }

  private mapConcept(r: {
    id: string;
    concept_id: string;
    embedding: number[];
    created_at: Date;
  }): EmbeddingRecord {
    return {
      id: r.id,
      type: 'concept',
      refId: r.concept_id,
      embedding: r.embedding,
      createdAt: new Date(r.created_at).toISOString(),
    };
  }
}
