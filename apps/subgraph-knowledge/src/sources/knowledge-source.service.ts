/**
 * KnowledgeSourceService
 *
 * Facade managing knowledge source lifecycle:
 *   1. CRUD queries (list, find, delete)
 *   2. Processing delegation (create+process, reindex)
 *
 * Processing logic lives in KnowledgeSourceProcessingService.
 */

import {
  Injectable,
  Logger,
  NotFoundException,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import {
  createDatabaseConnection,
  schema,
  eq,
  and,
  inArray,
  closeAllPools,
} from '@edusphere/db';
import type { KnowledgeSource } from '@edusphere/db';
import {
  KnowledgeSourceProcessingService,
  type CreateSourceInput,
} from './knowledge-source-processing.service.js';

export { KnowledgeSource };
export type { CreateSourceInput };

@Injectable()
export class KnowledgeSourceService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(KnowledgeSourceService.name);
  private readonly db = createDatabaseConnection();

  constructor(
    private readonly processingService: KnowledgeSourceProcessingService
  ) {}

  async onModuleInit(): Promise<void> {
    try {
      const stale = await this.db
        .update(schema.knowledgeSources)
        .set({
          status: 'FAILED',
          error_message: 'Processing was interrupted (service restarted)',
        })
        .where(inArray(schema.knowledgeSources.status, ['PENDING', 'PROCESSING']))
        .returning();

      if (stale.length > 0) {
        this.logger.warn(
          `Startup cleanup: marked ${stale.length} stale PENDING/PROCESSING source(s) as FAILED`
        );
      }
    } catch (err) {
      this.logger.warn(
        { err: (err as Error).message },
        'Startup cleanup skipped — knowledge_sources table may not exist yet (run migrations)',
      );
    }
  }

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
  // Mutations (delegated)
  // ---------------------------------------------------------------------------

  async createAndProcess(input: CreateSourceInput): Promise<KnowledgeSource> {
    return this.processingService.createAndProcess(input);
  }

  async deleteSource(id: string, tenantId: string): Promise<void> {
    await this.findById(id, tenantId);
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

  // ---------------------------------------------------------------------------
  // Reindex (delegated)
  // ---------------------------------------------------------------------------

  async reindexCourseEmbeddings(
    tenantId: string,
    courseId: string
  ): Promise<{ sourcesProcessed: number; embeddingsGenerated: number; errors: string[] }> {
    return this.processingService.reindexCourseEmbeddings(tenantId, courseId);
  }
}
