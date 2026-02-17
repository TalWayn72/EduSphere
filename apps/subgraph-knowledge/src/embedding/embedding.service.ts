import { Injectable, NotFoundException } from '@nestjs/common';
import { db } from '@edusphere/db';
import { embeddings, NewEmbedding } from '@edusphere/db';
import { eq, sql } from 'drizzle-orm';

@Injectable()
export class EmbeddingService {
  async findById(id: string) {
    const [embedding] = await db
      .select()
      .from(embeddings)
      .where(eq(embeddings.id, id))
      .limit(1);

    if (!embedding) {
      throw new NotFoundException(`Embedding with ID ${id} not found`);
    }

    return embedding;
  }

  async findByContentItem(contentItemId: string) {
    return db
      .select()
      .from(embeddings)
      .where(eq(embeddings.contentItemId, contentItemId));
  }

  async semanticSearch(queryVector: number[], limit: number = 10, minSimilarity: number = 0.7) {
    // pgvector cosine similarity search with HNSW index
    // Returns results sorted by similarity (1 = identical, 0 = orthogonal, -1 = opposite)
    const vectorString = `[${queryVector.join(',')}]`;

    const results = await db.execute(sql`
      SELECT
        e.*,
        1 - (e.embedding <=> ${vectorString}::vector) as similarity,
        e.embedding <=> ${vectorString}::vector as distance
      FROM embeddings e
      WHERE 1 - (e.embedding <=> ${vectorString}::vector) >= ${minSimilarity}
      ORDER BY e.embedding <=> ${vectorString}::vector
      LIMIT ${limit}
    `);

    return results.rows.map((row: any) => ({
      embedding: row,
      similarity: parseFloat(row.similarity),
      distance: parseFloat(row.distance),
    }));
  }

  async semanticSearchByContentItem(
    contentItemId: string,
    queryVector: number[],
    limit: number = 5,
  ) {
    const vectorString = `[${queryVector.join(',')}]`;

    const results = await db.execute(sql`
      SELECT
        e.*,
        1 - (e.embedding <=> ${vectorString}::vector) as similarity,
        e.embedding <=> ${vectorString}::vector as distance
      FROM embeddings e
      WHERE e.content_item_id = ${contentItemId}
      ORDER BY e.embedding <=> ${vectorString}::vector
      LIMIT ${limit}
    `);

    return results.rows.map((row: any) => ({
      embedding: row,
      similarity: parseFloat(row.similarity),
      distance: parseFloat(row.distance),
    }));
  }

  async create(input: Partial<NewEmbedding>) {
    const [embedding] = await db
      .insert(embeddings)
      .values(input as NewEmbedding)
      .returning();

    return embedding;
  }

  async delete(id: string): Promise<boolean> {
    const result = await db.delete(embeddings).where(eq(embeddings.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  async deleteByContentItem(contentItemId: string): Promise<number> {
    const result = await db
      .delete(embeddings)
      .where(eq(embeddings.contentItemId, contentItemId));

    return result.rowCount ?? 0;
  }
}
