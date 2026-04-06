/**
 * KnowledgeSourceProcessingService — Source processing and reindexing.
 *
 * Handles text extraction, chunking, embedding generation, and
 * reindexing of knowledge sources.
 */
import {
  Injectable,
  Logger,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import {
  createDatabaseConnection,
  schema,
  eq,
  and,
  inArray,
} from '@edusphere/db';
import type { KnowledgeSource, SourceType } from '@edusphere/db';
import { createSourceNode } from '@edusphere/db';
import { randomUUID } from 'node:crypto';
import { DocumentParserService } from './document-parser.service.js';
import { EmbeddingService } from '../embedding/embedding.service.js';
import { KsChunkEmbeddingStoreService } from '../embedding/ks-chunk-embedding-store.service.js';
import { KnowledgeSourceReindexService } from './knowledge-source-reindex.service.js';
import { MinioUrlService } from './minio-url.service.js';

/** Map source type to MIME for MinIO upload ContentType header. */
const SOURCE_TYPE_MIME: Record<string, string> = {
  FILE_PDF: 'application/pdf',
  FILE_DOCX:
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  FILE_TXT: 'text/plain',
};

export type CreateSourceInput = {
  tenantId: string;
  courseId: string;
  title: string;
  sourceType: SourceType;
  origin: string;
  rawText?: string;
  fileBuffer?: Buffer;
};

/** Max processing time before the background task is considered timed out. */
const PROCESS_TIMEOUT_MS = 5 * 60 * 1000;

@Injectable()
export class KnowledgeSourceProcessingService {
  private readonly logger = new Logger(KnowledgeSourceProcessingService.name);
  private readonly db = createDatabaseConnection();

  constructor(
    private readonly parser: DocumentParserService,
    private readonly embeddings: EmbeddingService,
    private readonly ksChunkStore: KsChunkEmbeddingStoreService,
    private readonly reindex: KnowledgeSourceReindexService,
    private readonly minioUrl: MinioUrlService
  ) {}

  async createAndProcess(input: CreateSourceInput): Promise<KnowledgeSource> {
    const safeOrigin = input.origin
      .replace(/\.\.\//g, '')
      .replace(/\.\.\\/g, '')
      .replace(/[/\\]/g, '_');
    const fileKey = input.fileBuffer
      ? `${input.tenantId}/${input.courseId}/${randomUUID()}/${safeOrigin}`
      : undefined;

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
        ...(fileKey ? { file_key: fileKey } : {}),
      })
      .returning();

    if (!source)
      throw new InternalServerErrorException(
        'Failed to create knowledge source'
      );

    if (input.fileBuffer && fileKey) {
      const contentType =
        SOURCE_TYPE_MIME[input.sourceType] ?? 'application/octet-stream';
      try {
        await this.minioUrl.uploadFile(fileKey, input.fileBuffer, contentType);
      } catch (err) {
        this.logger.error(
          `[KnowledgeSourceProcessingService] MinIO upload failed for key=${fileKey}: ${err}`
        );
        const [failed] = await this.db
          .update(schema.knowledgeSources)
          .set({
            status: 'FAILED',
            error_message: `MinIO upload failed: ${err}`,
          })
          .where(eq(schema.knowledgeSources.id, source.id))
          .returning();
        return failed ?? source;
      }
    }

    const processTask = this.processSource(source.id, input);
    const timeoutTask = new Promise<never>((_, reject) =>
      setTimeout(
        () => reject(new Error('Processing timed out after 5 minutes')),
        PROCESS_TIMEOUT_MS
      )
    );

    void Promise.race([processTask, timeoutTask]).catch(
      async (err: unknown) => {
        this.logger.error(`Source ${source.id} background error: ${err}`);
        await this.db
          .update(schema.knowledgeSources)
          .set({ status: 'FAILED', error_message: String(err) })
          .where(
            and(
              eq(schema.knowledgeSources.id, source.id),
              inArray(schema.knowledgeSources.status, ['PENDING', 'PROCESSING'])
            )
          )
          .catch((dbErr: unknown) =>
            this.logger.error(
              `Failed to mark timed-out source as FAILED: ${dbErr}`
            )
          );
      }
    );

    return source;
  }

  async processSource(
    sourceId: string,
    input: CreateSourceInput
  ): Promise<KnowledgeSource> {
    try {
      await this.db
        .update(schema.knowledgeSources)
        .set({ status: 'PROCESSING' })
        .where(eq(schema.knowledgeSources.id, sourceId));

      const parsed = await this.extractText(input);
      const chunks = this.parser.chunkText(parsed.text);

      let embeddedCount = 0;
      for (const chunk of chunks) {
        try {
          const vector = await this.embeddings.callEmbeddingProvider(chunk.text);
          await this.ksChunkStore.upsert(sourceId, chunk.index, vector);
          embeddedCount++;
        } catch (err) {
          this.logger.warn(`Embedding failed for chunk ${chunk.index}: ${err}`);
        }
      }

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

      if (!updated) {
        throw new InternalServerErrorException(
          `Failed to update source ${sourceId} to READY`
        );
      }

      await this.indexSourceInGraph(updated, input);
      return updated;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`Source ${sourceId} failed: ${errorMessage}`);

      const [failed] = await this.db
        .update(schema.knowledgeSources)
        .set({ status: 'FAILED', error_message: errorMessage })
        .where(eq(schema.knowledgeSources.id, sourceId))
        .returning();

      if (!failed) {
        throw new InternalServerErrorException(
          `Failed to mark source ${sourceId} as FAILED`
        );
      }
      return failed;
    }
  }

  /** Index source in knowledge graph — non-fatal on failure. */
  private async indexSourceInGraph(
    source: KnowledgeSource,
    input: CreateSourceInput
  ): Promise<void> {
    try {
      await createSourceNode(this.db, {
        id: source.id,
        tenant_id: input.tenantId,
        name: input.title,
        source_type: input.sourceType,
        origin: input.origin,
        course_id: input.courseId,
        chunk_count: source.chunk_count,
      });
      this.logger.log(`Graph: indexed Source node ${source.id}`);
    } catch (err) {
      this.logger.warn(`Graph indexing failed for source ${source.id}: ${err}`);
    }
  }

  private async extractText(input: CreateSourceInput): Promise<{
    text: string;
    wordCount: number;
    metadata: Record<string, unknown>;
  }> {
    if (input.sourceType === 'FILE_DOCX') {
      return this.parser.parseDocx(input.fileBuffer ?? input.origin);
    } else if (input.sourceType === 'FILE_PDF') {
      if (!input.fileBuffer)
        throw new BadRequestException('FILE_PDF requires a file buffer');
      return this.parser.parsePdf(input.fileBuffer);
    } else if (input.sourceType === 'FILE_TXT') {
      const text = input.fileBuffer?.toString('utf-8') ?? '';
      return this.parser.parseText(text);
    } else if (input.sourceType === 'URL') {
      return this.parser.parseUrl(input.origin);
    } else if (input.sourceType === 'YOUTUBE') {
      return this.parser.parseYoutube(input.origin);
    } else if (input.sourceType === 'TEXT') {
      return this.parser.parseText(input.rawText ?? '');
    }
    return { text: '', wordCount: 0, metadata: { note: 'unsupported type' } };
  }

  /** Delegates to KnowledgeSourceReindexService (split for file-size compliance). */
  async reindexCourseEmbeddings(
    tenantId: string,
    courseId: string
  ): Promise<{
    sourcesProcessed: number;
    embeddingsGenerated: number;
    errors: string[];
  }> {
    return this.reindex.reindexCourseEmbeddings(tenantId, courseId);
  }
}
