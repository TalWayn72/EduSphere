/**
 * KsChunkEmbeddingStoreService — pgvector persistence for knowledge source
 * text chunks.
 *
 * Separate from EmbeddingStoreService because content_embeddings has a hard
 * FK to transcript_segments(id) which knowledge source chunks cannot satisfy.
 * This service writes to the dedicated knowledge_source_chunk_embeddings table
 * (migration 0046) and exposes a tenant-scoped cosine similarity search.
 */
import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import {
  createDatabaseConnection,
  schema,
  eq,
  sql,
  closeAllPools,
} from '@edusphere/db';

export interface KsChunkSearchResult {
  sourceId: string;
  chunkIndex: number;
  chunkText: string;
  similarity: number;
}

@Injectable()
export class KsChunkEmbeddingStoreService implements OnModuleDestroy {
  private readonly logger = new Logger(KsChunkEmbeddingStoreService.name);
  private readonly db = createDatabaseConnection();

  async onModuleDestroy(): Promise<void> {
    await closeAllPools();
  }

  async upsert(
    sourceId: string,
    chunkIndex: number,
    vector: number[],
    chunkText: string
  ): Promise<void> {
    const vecStr = `[${vector.join(',')}]`;
    await this.db.execute(sql`
      INSERT INTO knowledge_source_chunk_embeddings (source_id, chunk_index, embedding, chunk_text)
      VALUES (${sourceId}::uuid, ${chunkIndex}, ${vecStr}::vector, ${chunkText})
      ON CONFLICT (source_id, chunk_index)
      DO UPDATE SET embedding = EXCLUDED.embedding, chunk_text = EXCLUDED.chunk_text
    `);
    this.logger.debug(
      `Upserted KS chunk embedding source=${sourceId} chunk=${chunkIndex}`
    );
  }

  async search(
    vecStr: string,
    tenantId: string,
    limit: number,
    minSimilarity = 0
  ): Promise<KsChunkSearchResult[]> {
    type KsRow = {
      source_id: string;
      chunk_index: number;
      chunk_text: string;
      similarity: string;
    };
    const rows = (await this.db.execute<KsRow>(sql`
      SELECT ksce.source_id, ksce.chunk_index, ksce.chunk_text,
             1 - (ksce.embedding <=> ${vecStr}::vector) AS similarity
      FROM knowledge_source_chunk_embeddings ksce
      JOIN knowledge_sources ks ON ks.id = ksce.source_id
      WHERE ks.tenant_id = ${tenantId}::uuid
        AND ks.status = 'READY'
        AND 1 - (ksce.embedding <=> ${vecStr}::vector) >= ${minSimilarity}
      ORDER BY ksce.embedding <=> ${vecStr}::vector ASC
      LIMIT ${limit}
    `)) as unknown as KsRow[];
    return rows.map((r) => ({
      sourceId: r.source_id,
      chunkIndex: r.chunk_index,
      chunkText: r.chunk_text,
      similarity: parseFloat(r.similarity),
    }));
  }

  async deleteBySource(sourceId: string): Promise<number> {
    const rows = await this.db
      .delete(schema.knowledge_source_chunk_embeddings)
      .where(eq(schema.knowledge_source_chunk_embeddings.source_id, sourceId))
      .returning({ id: schema.knowledge_source_chunk_embeddings.id });
    if (rows.length > 0) {
      this.logger.log(
        `Deleted ${rows.length} chunk embeddings for source ${sourceId}`
      );
    }
    return rows.length;
  }
}
