import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import {
  db,
  content_embeddings,
  annotation_embeddings,
  concept_embeddings,
} from '@edusphere/db';
import { eq, sql } from 'drizzle-orm';

@Injectable()
export class EmbeddingService {
  private readonly logger = new Logger(EmbeddingService.name);

  async findById(id: string) {
    // Try to find in content_embeddings first
    const [contentEmbed] = await db
      .select()
      .from(content_embeddings)
      .where(eq(content_embeddings.id, id))
      .limit(1);

    if (contentEmbed) return contentEmbed;

    // Try annotation_embeddings
    const [annotationEmbed] = await db
      .select()
      .from(annotation_embeddings)
      .where(eq(annotation_embeddings.id, id))
      .limit(1);

    if (annotationEmbed) return annotationEmbed;

    // Try concept_embeddings
    const [conceptEmbed] = await db
      .select()
      .from(concept_embeddings)
      .where(eq(concept_embeddings.id, id))
      .limit(1);

    if (conceptEmbed) return conceptEmbed;

    throw new NotFoundException(`Embedding with ID ${id} not found`);
  }

  async findByContentItem(_contentItemId: string) {
    this.logger.warn(
      'findByContentItem is deprecated - use content_embeddings directly'
    );
    return [];
  }

  async semanticSearch(
    queryVector: number[],
    limit: number = 10,
    minSimilarity: number = 0.7
  ) {
    const vectorString = `[${queryVector.join(',')}]`;

    const results = await db.execute(sql`
      SELECT 'content' as type, ce.*,
        1 - (ce.embedding <=> ${vectorString}::vector) as similarity,
        ce.embedding <=> ${vectorString}::vector as distance
      FROM content_embeddings ce
      WHERE 1 - (ce.embedding <=> ${vectorString}::vector) >= ${minSimilarity}
      UNION ALL
      SELECT 'annotation' as type, ae.*,
        1 - (ae.embedding <=> ${vectorString}::vector) as similarity,
        ae.embedding <=> ${vectorString}::vector as distance
      FROM annotation_embeddings ae
      WHERE 1 - (ae.embedding <=> ${vectorString}::vector) >= ${minSimilarity}
      UNION ALL
      SELECT 'concept' as type, ce2.*,
        1 - (ce2.embedding <=> ${vectorString}::vector) as similarity,
        ce2.embedding <=> ${vectorString}::vector as distance
      FROM concept_embeddings ce2
      WHERE 1 - (ce2.embedding <=> ${vectorString}::vector) >= ${minSimilarity}
      ORDER BY distance ASC
      LIMIT ${limit}
    `);

    return results.rows.map((row: any) => ({
      embedding: row,
      similarity: parseFloat(row.similarity),
      distance: parseFloat(row.distance),
      type: row.type,
    }));
  }

  async semanticSearchByContentItem(
    _contentItemId: string,
    _queryVector: number[],
    _limit: number = 5
  ) {
    this.logger.warn(
      'semanticSearchByContentItem not implemented for new schema'
    );
    return [];
  }

  async create(_input: any) {
    this.logger.warn(
      'Generic create not supported - use specific embedding type methods'
    );
    throw new Error(
      'Use createContentEmbedding, createAnnotationEmbedding, or createConceptEmbedding'
    );
  }

  async delete(id: string): Promise<boolean> {
    const contentResult = await db
      .delete(content_embeddings)
      .where(eq(content_embeddings.id, id));
    if ((contentResult.rowCount ?? 0) > 0) return true;

    const annotationResult = await db
      .delete(annotation_embeddings)
      .where(eq(annotation_embeddings.id, id));
    if ((annotationResult.rowCount ?? 0) > 0) return true;

    const conceptResult = await db
      .delete(concept_embeddings)
      .where(eq(concept_embeddings.id, id));
    return (conceptResult.rowCount ?? 0) > 0;
  }

  async deleteByContentItem(_contentItemId: string): Promise<number> {
    this.logger.warn('deleteByContentItem is deprecated');
    return 0;
  }
}
