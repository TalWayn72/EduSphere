/**
 * KnowledgeSourceService
 *
 * Manages the lifecycle of user-attached information sources:
 *   1. createSource  — save metadata, trigger async processing
 *   2. processSource — extract text, chunk, embed (called via NATS or inline)
 *   3. listSources   — fetch all sources for a course
 *   4. deleteSource  — remove source + its embeddings
 */

import {
  Injectable,
  Logger,
  NotFoundException,
  OnModuleDestroy,
} from '@nestjs/common';
import {
  createDatabaseConnection,
  schema,
  eq,
  and,
  closeAllPools,
} from '@edusphere/db';
import type { KnowledgeSource, SourceType } from '@edusphere/db';
import { DocumentParserService } from './document-parser.service.js';
import { EmbeddingService } from '../embedding/embedding.service.js';

export { KnowledgeSource };

export type CreateSourceInput = {
  tenantId: string;
  courseId: string;
  title: string;
  sourceType: SourceType;
  /** Local file path (FILE_* types) or URL string */
  origin: string;
  /** Raw text for TEXT type */
  rawText?: string;
};

@Injectable()
export class KnowledgeSourceService implements OnModuleDestroy {
  private readonly logger = new Logger(KnowledgeSourceService.name);
  private readonly db = createDatabaseConnection();

  constructor(
    private readonly parser: DocumentParserService,
    private readonly embeddings: EmbeddingService
  ) {}

  async onModuleDestroy(): Promise<void> {
    await closeAllPools();
  }

  // ---------------------------------------------------------------------------
  // Queries
  // ---------------------------------------------------------------------------

  async listByCourseSources(
    tenantId: string,
    courseId: string
  ): Promise<KnowledgeSource[]> {
    return this.db
      .select()
      .from(schema.knowledgeSources)
      .where(
        and(
          eq(schema.knowledgeSources.tenant_id, tenantId),
          eq(schema.knowledgeSources.course_id, courseId)
        )
      )
      .orderBy(schema.knowledgeSources.created_at);
  }

  async findById(id: string, tenantId: string): Promise<KnowledgeSource> {
    const [source] = await this.db
      .select()
      .from(schema.knowledgeSources)
      .where(
        and(
          eq(schema.knowledgeSources.id, id),
          eq(schema.knowledgeSources.tenant_id, tenantId)
        )
      );

    if (!source) throw new NotFoundException(`KnowledgeSource ${id} not found`);
    return source;
  }

  // ---------------------------------------------------------------------------
  // Mutations
  // ---------------------------------------------------------------------------

  /** Create a source record and process it synchronously (for demo/seed) */
  async createAndProcess(input: CreateSourceInput): Promise<KnowledgeSource> {
    // 1. Insert as PENDING
    const [source] = await this.db
      .insert(schema.knowledgeSources)
      .values({
        tenant_id: input.tenantId,
        course_id: input.courseId,
        title: input.title,
        source_type: input.sourceType,
        origin: input.origin,
        status: 'PENDING',
        metadata: {},
      })
      .returning();

    if (!source) throw new Error('Failed to create knowledge source');

    // 2. Process inline (could be deferred via NATS in production)
    return this.processSource(source.id, input);
  }

  private async processSource(
    sourceId: string,
    input: CreateSourceInput
  ): Promise<KnowledgeSource> {
    try {
      // Mark as PROCESSING
      await this.db
        .update(schema.knowledgeSources)
        .set({ status: 'PROCESSING' })
        .where(eq(schema.knowledgeSources.id, sourceId));

      // Extract text based on type
      let parsed: {
        text: string;
        wordCount: number;
        metadata: Record<string, unknown>;
      };

      if (input.sourceType === 'FILE_DOCX') {
        parsed = await this.parser.parseDocx(input.origin);
      } else if (input.sourceType === 'URL') {
        parsed = await this.parser.parseUrl(input.origin);
      } else if (input.sourceType === 'TEXT') {
        parsed = this.parser.parseText(input.rawText ?? '');
      } else {
        parsed = {
          text: '',
          wordCount: 0,
          metadata: { note: 'unsupported type' },
        };
      }

      // Chunk
      const chunks = this.parser.chunkText(parsed.text);

      // Embed each chunk — segmentId = "ks:{sourceId}:{chunkIndex}"
      let embeddedCount = 0;
      for (const chunk of chunks) {
        try {
          const segmentId = `ks:${sourceId}:${chunk.index}`;
          await this.embeddings.generateEmbedding(chunk.text, segmentId);
          embeddedCount++;
        } catch (err) {
          this.logger.warn(`Embedding failed for chunk ${chunk.index}: ${err}`);
        }
      }

      // Mark READY
      const [updated] = await this.db
        .update(schema.knowledgeSources)
        .set({
          status: 'READY',
          raw_content: parsed.text,
          chunk_count: embeddedCount,
          metadata: parsed.metadata,
        })
        .where(eq(schema.knowledgeSources.id, sourceId))
        .returning();

      this.logger.log(
        `Source ${sourceId} ready: ${embeddedCount}/${chunks.length} chunks embedded`
      );

      return updated!;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`Source ${sourceId} failed: ${errorMessage}`);

      const [failed] = await this.db
        .update(schema.knowledgeSources)
        .set({ status: 'FAILED', error_message: errorMessage })
        .where(eq(schema.knowledgeSources.id, sourceId))
        .returning();

      return failed!;
    }
  }

  async deleteSource(id: string, tenantId: string): Promise<void> {
    await this.findById(id, tenantId); // throws if not found
    await this.db
      .delete(schema.knowledgeSources)
      .where(
        and(
          eq(schema.knowledgeSources.id, id),
          eq(schema.knowledgeSources.tenant_id, tenantId)
        )
      );
    this.logger.log(`Deleted knowledge source ${id}`);
  }
}
