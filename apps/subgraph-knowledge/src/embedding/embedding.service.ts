import { Injectable, NotFoundException, Logger, OnModuleDestroy } from '@nestjs/common';
import {
  createDatabaseConnection,
  schema,
  eq,
  sql,
  closeAllPools,
} from '@edusphere/db';

export interface EmbeddingRecord {
  id: string;
  type: 'content' | 'annotation' | 'concept';
  refId: string;
  embedding: number[];
  createdAt: string;
}

export interface SearchResult {
  id: string;
  refId: string;
  type: string;
  similarity: number;
}

export interface SegmentInput {
  id: string;
  text: string;
  transcriptId: string;
}

const BATCH_SIZE = 20;

@Injectable()
export class EmbeddingService implements OnModuleDestroy {
  private readonly logger = new Logger(EmbeddingService.name);
  private readonly db = createDatabaseConnection();

  async onModuleDestroy(): Promise<void> {
    await closeAllPools();
  }

  // ── Lookup ────────────────────────────────────────────────────────────────

  async findById(id: string): Promise<EmbeddingRecord> {
    const [ce] = await this.db
      .select()
      .from(schema.content_embeddings)
      .where(eq(schema.content_embeddings.id, id))
      .limit(1);
    if (ce) return this.mapContent(ce);

    const [ae] = await this.db
      .select()
      .from(schema.annotation_embeddings)
      .where(eq(schema.annotation_embeddings.id, id))
      .limit(1);
    if (ae) return this.mapAnnotation(ae);

    const [conc] = await this.db
      .select()
      .from(schema.concept_embeddings)
      .where(eq(schema.concept_embeddings.id, id))
      .limit(1);
    if (conc) return this.mapConcept(conc);

    throw new NotFoundException(`Embedding with ID ${id} not found`);
  }

  async findBySegment(segmentId: string): Promise<EmbeddingRecord[]> {
    const rows = await this.db
      .select()
      .from(schema.content_embeddings)
      .where(eq(schema.content_embeddings.segment_id, segmentId));
    return rows.map((r) => this.mapContent(r));
  }

  // ── Generation ───────────────────────────────────────────────────────────

  async generateEmbedding(
    text: string,
    segmentId: string
  ): Promise<EmbeddingRecord> {
    const vector = await this.callEmbeddingProvider(text);
    const vectorString = `[${vector.join(',')}]`;

    type InsertRow = { id: string; segment_id: string; embedding: number[]; created_at: Date };
    const [row] = (await this.db.execute<InsertRow>(sql`
      INSERT INTO content_embeddings (segment_id, embedding)
      VALUES (${segmentId}, ${vectorString}::vector)
      ON CONFLICT (segment_id)
      DO UPDATE SET embedding = EXCLUDED.embedding
      RETURNING id, segment_id, embedding, created_at
    `)) as unknown as InsertRow[];

    if (!row) throw new Error('Failed to upsert content embedding');

    this.logger.log(
      `Generated embedding: segmentId=${segmentId} dim=${vector.length}`
    );

    return {
      id: row.id,
      type: 'content',
      refId: row.segment_id,
      embedding: vector,
      createdAt: new Date(row.created_at).toISOString(),
    };
  }

  async generateBatchEmbeddings(
    segments: SegmentInput[]
  ): Promise<number> {
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

  // ── Semantic Search ───────────────────────────────────────────────────────

  async semanticSearch(
    queryText: string,
    tenantId: string,
    limit: number = 10
  ): Promise<SearchResult[]> {
    const ollamaUrl = process.env.OLLAMA_URL;

    if (!ollamaUrl && !process.env.OPENAI_API_KEY) {
      this.logger.warn(
        'No embedding provider — semantic search falling back to ILIKE'
      );
      return this.ilikeFallback(queryText, limit);
    }

    let vector: number[];
    try {
      vector = await this.callEmbeddingProvider(queryText);
    } catch (err) {
      this.logger.warn(
        `Embedding provider error (${String(err)}) — using ILIKE fallback`
      );
      return this.ilikeFallback(queryText, limit);
    }

    const vectorString = `[${vector.join(',')}]`;

    type SimilarityRow = { id: string; segment_id: string; similarity: string };
    const rows = (await this.db.execute<SimilarityRow>(sql`
      SELECT ce.id, ce.segment_id,
        1 - (ce.embedding <=> ${vectorString}::vector) AS similarity
      FROM content_embeddings ce
      JOIN transcript_segments ts ON ts.id = ce.segment_id
      ORDER BY ce.embedding <=> ${vectorString}::vector ASC
      LIMIT ${limit}
    `)) as unknown as SimilarityRow[];

    return rows.map((r) => ({
      id: r.id,
      refId: r.segment_id,
      type: 'transcript_segment',
      similarity: parseFloat(r.similarity),
    }));
  }

  // ── Delete ────────────────────────────────────────────────────────────────

  async delete(id: string): Promise<boolean> {
    const c = await this.db
      .delete(schema.content_embeddings)
      .where(eq(schema.content_embeddings.id, id));
    if ((c.rowCount ?? 0) > 0) return true;

    const a = await this.db
      .delete(schema.annotation_embeddings)
      .where(eq(schema.annotation_embeddings.id, id));
    if ((a.rowCount ?? 0) > 0) return true;

    const conc = await this.db
      .delete(schema.concept_embeddings)
      .where(eq(schema.concept_embeddings.id, id));
    return (conc.rowCount ?? 0) > 0;
  }

  // ── Private helpers ───────────────────────────────────────────────────────

  async callEmbeddingProvider(text: string): Promise<number[]> {
    const ollamaUrl = process.env.OLLAMA_URL;
    const openaiKey = process.env.OPENAI_API_KEY;
    const model = process.env.EMBEDDING_MODEL ?? 'nomic-embed-text';

    if (ollamaUrl) {
      const resp = await fetch(
        `${ollamaUrl.replace(/\/$/, '')}/api/embeddings`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ model, prompt: text }),
        }
      );
      if (!resp.ok) {
        throw new Error(`Ollama error ${resp.status}`);
      }
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
      if (!resp.ok) {
        throw new Error(`OpenAI error ${resp.status}`);
      }
      const json = (await resp.json()) as {
        data: Array<{ embedding: number[] }>;
      };
      return json.data[0]!.embedding;
    }

    throw new Error(
      'No embedding provider: set OLLAMA_URL or OPENAI_API_KEY'
    );
  }

  private async ilikeFallback(
    query: string,
    limit: number
  ): Promise<SearchResult[]> {
    const term = `%${query.replace(/%/g, '\\%').replace(/_/g, '\\_')}%`;
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

  // Legacy shims kept for resolver compatibility
  async findByContentItem(_contentItemId: string): Promise<EmbeddingRecord[]> {
    this.logger.warn('findByContentItem is deprecated — use findBySegment');
    return [];
  }

  async semanticSearchByVector(
    queryVector: number[],
    limit: number = 10,
    minSimilarity: number = 0.7
  ): Promise<SearchResult[]> {
    const vectorString = `[${queryVector.join(',')}]`;
    type VectorRow = { id: string; segment_id: string; type: string; similarity: string };
    const rows = (await this.db.execute<VectorRow>(sql`
      SELECT 'content' AS type, ce.id, ce.segment_id,
        1 - (ce.embedding <=> ${vectorString}::vector) AS similarity
      FROM content_embeddings ce
      WHERE 1 - (ce.embedding <=> ${vectorString}::vector) >= ${minSimilarity}
      ORDER BY ce.embedding <=> ${vectorString}::vector ASC
      LIMIT ${limit}
    `)) as unknown as VectorRow[];

    return rows.map((r) => ({
      id: r.id,
      refId: r.segment_id,
      type: r.type,
      similarity: parseFloat(r.similarity),
    }));
  }

  async deleteByContentItem(_contentItemId: string): Promise<number> {
    this.logger.warn('deleteByContentItem is deprecated');
    return 0;
  }
}
