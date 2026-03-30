/**
 * Fallback implementations for EmbeddingService when sub-services
 * (EmbeddingStoreService / EmbeddingProviderService) are not injected.
 * Used primarily in unit-test paths where spec mocks @edusphere/db directly.
 */
import {
  Injectable,
  Logger,
  BadRequestException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import {
  createDatabaseConnection,
  schema,
  eq,
  sql,
} from '@edusphere/db';
import type { EmbeddingRecord, SearchResult } from './embedding.types.js';

const safeDate = (v: unknown): string =>
  v ? new Date(v as string | number).toISOString() : new Date().toISOString();

type ContentRow = { id: string; segment_id: string; embedding: number[]; created_at: Date };
type AnnotationRow = { id: string; annotation_id: string; embedding: number[]; created_at: Date };
type ConceptRow = { id: string; concept_id: string; embedding: number[]; created_at: Date };

@Injectable()
export class EmbeddingFallbackService {
  private readonly logger = new Logger(EmbeddingFallbackService.name);
  readonly db = createDatabaseConnection();

  async findById(id: string): Promise<EmbeddingRecord> {
    const [ce] = await this.db
      .select()
      .from(schema.content_embeddings)
      .where(eq(schema.content_embeddings.id, id))
      .limit(1);
    if (ce) return this.mapContent(ce as ContentRow);

    const [ae] = await this.db
      .select()
      .from(schema.annotation_embeddings)
      .where(eq(schema.annotation_embeddings.id, id))
      .limit(1);
    if (ae) return this.mapAnnotation(ae as AnnotationRow);

    const [conc] = await this.db
      .select()
      .from(schema.concept_embeddings)
      .where(eq(schema.concept_embeddings.id, id))
      .limit(1);
    if (conc) return this.mapConcept(conc as ConceptRow);

    throw new NotFoundException(`Embedding with ID ${id} not found`);
  }

  async findBySegment(segmentId: string): Promise<EmbeddingRecord[]> {
    const rows = await this.db
      .select()
      .from(schema.content_embeddings)
      .where(eq(schema.content_embeddings.segment_id, segmentId));
    return rows.map((r) => this.mapContent(r as ContentRow));
  }

  async upsertContent(segmentId: string, vector: number[]): Promise<EmbeddingRecord> {
    const vecStr = `[${vector.join(',')}]`;
    type R = { id: string; segment_id: string; embedding: number[]; created_at: Date };
    const [row] = (await this.db.execute<R>(sql`
      INSERT INTO content_embeddings (segment_id, embedding)
      VALUES (${segmentId}, ${vecStr}::vector)
      ON CONFLICT (segment_id)
      DO UPDATE SET embedding = EXCLUDED.embedding
      RETURNING id, segment_id, embedding, created_at
    `)) as unknown as R[];
    if (!row) throw new InternalServerErrorException('Failed to upsert content embedding');
    this.logger.log(`Generated embedding: segmentId=${segmentId} dim=${vector.length}`);
    return this.mapContent(row);
  }

  async ilikeFallback(query: string, limit: number): Promise<SearchResult[]> {
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

  async vectorSearch(vecStr: string, limit: number, minSimilarity = 0): Promise<SearchResult[]> {
    type R = { id: string; segment_id: string; type: string; similarity: string };
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
        id: r.id, refId: r.segment_id, type: r.type,
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
      id: r.id, refId: r.segment_id, type: 'transcript_segment',
      similarity: parseFloat(r.similarity),
    }));
  }

  async deleteByConceptId(conceptId: string): Promise<number> {
    const rows = await this.db
      .delete(schema.concept_embeddings)
      .where(eq(schema.concept_embeddings.concept_id, conceptId))
      .returning({ id: schema.concept_embeddings.id });
    if (rows.length > 0) {
      this.logger.log(
        `Cascade-deleted ${rows.length} orphaned concept embedding(s) for concept ${conceptId}`
      );
    }
    return rows.length;
  }

  async deleteById(id: string): Promise<boolean> {
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

  async directProviderCall(text: string): Promise<number[]> {
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
      if (!resp.ok) throw new BadRequestException(`Ollama error ${resp.status}`);
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
      if (!resp.ok) throw new BadRequestException(`OpenAI error ${resp.status}`);
      const json = (await resp.json()) as { data: Array<{ embedding: number[] }> };
      return json.data[0]!.embedding;
    }

    throw new BadRequestException('No embedding provider: set OLLAMA_URL or OPENAI_API_KEY');
  }

  // ── Mappers ──────────────────────────────────────────────────────────────

  mapContent(r: ContentRow & { created_at: Date | null }): EmbeddingRecord {
    return { id: r.id, type: 'content', refId: r.segment_id, embedding: r.embedding, createdAt: safeDate(r.created_at) };
  }

  mapAnnotation(r: AnnotationRow & { created_at: Date | null }): EmbeddingRecord {
    return { id: r.id, type: 'annotation', refId: r.annotation_id, embedding: r.embedding, createdAt: safeDate(r.created_at) };
  }

  mapConcept(r: ConceptRow & { created_at: Date | null }): EmbeddingRecord {
    return { id: r.id, type: 'concept', refId: r.concept_id, embedding: r.embedding, createdAt: safeDate(r.created_at) };
  }
}
