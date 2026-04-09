/**
 * KnowledgeSourceReindexService — batch reindex of course knowledge sources.
 *
 * Iterates all READY sources for a course, regenerates embeddings via
 * EmbeddingService + KsChunkEmbeddingStoreService, and updates chunk_count.
 * Split from KnowledgeSourceProcessingService to keep files under 300 lines.
 */
import { Injectable, Logger } from '@nestjs/common';
import { createDatabaseConnection, schema, eq, and } from '@edusphere/db';
import type { KnowledgeSource } from '@edusphere/db';
import { DocumentParserService } from './document-parser.service.js';
import { EmbeddingService } from '../embedding/embedding.service.js';
import { KsChunkEmbeddingStoreService } from '../embedding/ks-chunk-embedding-store.service.js';

export interface ReindexResult {
  sourcesProcessed: number;
  embeddingsGenerated: number;
  errors: string[];
}

@Injectable()
export class KnowledgeSourceReindexService {
  private readonly logger = new Logger(KnowledgeSourceReindexService.name);
  private readonly db = createDatabaseConnection();

  constructor(
    private readonly parser: DocumentParserService,
    private readonly embeddings: EmbeddingService,
    private readonly ksChunkStore: KsChunkEmbeddingStoreService
  ) {}

  async reindexCourseEmbeddings(
    tenantId: string,
    courseId: string
  ): Promise<ReindexResult> {
    const sources = await this.db
      .select()
      .from(schema.knowledgeSources)
      .where(
        and(
          eq(schema.knowledgeSources.tenant_id, tenantId),
          eq(schema.knowledgeSources.course_id, courseId),
          eq(schema.knowledgeSources.status, 'READY')
        )
      );

    this.logger.log(
      `Reindexing ${sources.length} READY sources for course ${courseId} (tenant: ${tenantId})`
    );

    let sourcesProcessed = 0;
    let embeddingsGenerated = 0;
    const errors: string[] = [];

    for (const source of sources) {
      try {
        const result = await this.reindexSingleSource(source);
        embeddingsGenerated += result.count;
        sourcesProcessed++;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        errors.push(`Source ${source.id}: ${msg}`);
        this.logger.error(`Reindex failed for source ${source.id}: ${msg}`);
      }
    }

    this.logger.log(
      `Reindex complete: ${sourcesProcessed}/${sources.length} sources, ${embeddingsGenerated} embeddings`
    );

    return { sourcesProcessed, embeddingsGenerated, errors };
  }

  private async reindexSingleSource(
    source: KnowledgeSource
  ): Promise<{ count: number }> {
    const text = source.raw_content ?? '';
    if (text.trim().length === 0) {
      throw new Error('no raw_content available');
    }

    const chunks = this.parser.chunkText(text);
    let count = 0;

    for (const chunk of chunks) {
      try {
        const vector = await this.embeddings.callEmbeddingProvider(chunk.text);
        await this.ksChunkStore.upsert(source.id, chunk.index, vector, chunk.text);
        count++;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        this.logger.warn(
          `Reindex embed failed for source ${source.id} chunk ${chunk.index}: ${msg}`
        );
      }
    }

    await this.db
      .update(schema.knowledgeSources)
      .set({ chunk_count: count })
      .where(eq(schema.knowledgeSources.id, source.id));

    this.logger.log(
      `Reindexed source ${source.id}: ${count}/${chunks.length} chunks`
    );
    return { count };
  }
}
