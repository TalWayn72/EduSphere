import {
  Injectable,
  NotFoundException,
  Logger,
  OnModuleDestroy,
} from '@nestjs/common';
import {
  createDatabaseConnection,
  schema,
  eq,
  sql,
  closeAllPools,
} from '@edusphere/db';
import type { EmbeddingRecord, SearchResult } from './embedding.types.js';

type ContentRow = {
  id: string;
  segment_id: string;
  embedding: number[];
  created_at: Date;
};
type AnnotationRow = {
  id: string;
  annotation_id: string;
  embedding: number[];
  created_at: Date;
};
type ConceptRow = {
  id: string;
  concept_id: string;
  embedding: number[];
  created_at: Date;
};
type SimRow = {
  id: string;
  segment_id: string;
  type: string;
  similarity: string;
};

function mapContent(r: ContentRow): EmbeddingRecord {
  return {
    id: r.id,
    type: 'content',
    refId: r.segment_id,
    embedding: r.embedding,
    createdAt: new Date(r.created_at).toISOString(),
  };
}
function mapAnnotation(r: AnnotationRow): EmbeddingRecord {
  return {
    id: r.id,
    type: 'annotation',
    refId: r.annotation_id,
    embedding: r.embedding,
    createdAt: new Date(r.created_at).toISOString(),
  };
}
function mapConcept(r: ConceptRow): EmbeddingRecord {
  return {
    id: r.id,
    type: 'concept',
    refId: r.concept_id,
    embedding: r.embedding,
    createdAt: new Date(r.created_at).toISOString(),
  };
}

@Injectable()
export class EmbeddingStoreService implements OnModuleDestroy {
  private readonly logger = new Logger(EmbeddingStoreService.name);
  private readonly db = createDatabaseConnection();

  async onModuleDestroy(): Promise<void> {
    await closeAllPools();
  }

  async findById(id: string): Promise<EmbeddingRecord> {
    const [ce] = await this.db
      .select()
      .from(schema.content_embeddings)
      .where(eq(schema.content_embeddings.id, id))
      .limit(1);
    if (ce) return mapContent(ce as ContentRow);

    const [ae] = await this.db
      .select()
      .from(schema.annotation_embeddings)
      .where(eq(schema.annotation_embeddings.id, id))
      .limit(1);
    if (ae) return mapAnnotation(ae as AnnotationRow);

    const [conc] = await this.db
      .select()
      .from(schema.concept_embeddings)
      .where(eq(schema.concept_embeddings.id, id))
      .limit(1);
    if (conc) return mapConcept(conc as ConceptRow);

    throw new NotFoundException(`Embedding with ID ${id} not found`);
  }

  async findBySegment(segmentId: string): Promise<EmbeddingRecord[]> {
    const rows = await this.db
      .select()
      .from(schema.content_embeddings)
      .where(eq(schema.content_embeddings.segment_id, segmentId));
    return rows.map((r) => mapContent(r as ContentRow));
  }

  async upsertContentEmbedding(
    segmentId: string,
    vector: number[]
  ): Promise<EmbeddingRecord> {
    const vecStr = `[${vector.join(',')}]`;
    const [row] = (await this.db.execute<ContentRow>(sql`
      INSERT INTO content_embeddings (segment_id, embedding)
      VALUES (${segmentId}, ${vecStr}::vector)
      ON CONFLICT (segment_id)
      DO UPDATE SET embedding = EXCLUDED.embedding
      RETURNING id, segment_id, embedding, created_at
    `)) as unknown as ContentRow[];
    if (!row) throw new Error('Failed to upsert content embedding');
    return mapContent(row);
  }

  async searchByVector(
    vecStr: string,
    limit: number,
    minSimilarity = 0
  ): Promise<SearchResult[]> {
    if (minSimilarity > 0) {
      const rows = (await this.db.execute<SimRow>(sql`
        SELECT 'content' AS type, ce.id, ce.segment_id,
          1 - (ce.embedding <=> ${vecStr}::vector) AS similarity
        FROM content_embeddings ce
        WHERE 1 - (ce.embedding <=> ${vecStr}::vector) >= ${minSimilarity}
        ORDER BY ce.embedding <=> ${vecStr}::vector ASC
        LIMIT ${limit}
      `)) as unknown as SimRow[];
      return rows.map((r) => ({
        id: r.id,
        refId: r.segment_id,
        type: r.type,
        similarity: parseFloat(r.similarity),
      }));
    }

    const rows = (await this.db.execute<SimRow>(sql`
      SELECT ce.id, ce.segment_id,
        1 - (ce.embedding <=> ${vecStr}::vector) AS similarity
      FROM content_embeddings ce
      JOIN transcript_segments ts ON ts.id = ce.segment_id
      ORDER BY ce.embedding <=> ${vecStr}::vector ASC
      LIMIT ${limit}
    `)) as unknown as SimRow[];
    return rows.map((r) => ({
      id: r.id,
      refId: r.segment_id,
      type: 'transcript_segment',
      similarity: parseFloat(r.similarity),
    }));
  }

  async ilikeFallback(query: string, limit: number): Promise<SearchResult[]> {
    const term = `%${query.replace(/%/g, '\%').replace(/_/g, '\_')}%`;
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

  async delete(id: string): Promise<boolean> {
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
}
