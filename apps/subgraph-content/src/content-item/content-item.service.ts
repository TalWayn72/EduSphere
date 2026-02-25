import { Injectable, Logger, NotFoundException, OnModuleDestroy } from '@nestjs/common';
import { createDatabaseConnection, schema, eq, asc, inArray, closeAllPools } from '@edusphere/db';
import {
  microlessonContentSchema,
  MICROLESSON_MAX_DURATION_SECONDS,
} from '../microlearning/microlearning.schemas';
import { BadRequestException } from '@nestjs/common';

type DbContentItem = typeof schema.contentItems.$inferSelect;

export interface ContentItemMapped {
  id: string;
  moduleId: string;
  title: string;
  contentType: string;
  content: string | null;
  fileId: string | null;
  duration: number | null;
  orderIndex: number;
  createdAt: string;
  updatedAt: string;
}

@Injectable()
export class ContentItemService implements OnModuleDestroy {
  private readonly logger = new Logger(ContentItemService.name);
  private readonly db = createDatabaseConnection();

  async onModuleDestroy(): Promise<void> {
    await closeAllPools();
  }

  /**
   * When contentType is MICROLESSON, validate the structured JSON content and
   * enforce the 7-minute (420 s) duration ceiling.
   */
  validateMicrolessonIfNeeded(contentType: string, content: string | null): void {
    if (contentType !== 'MICROLESSON') return;
    if (!content) {
      throw new BadRequestException('MICROLESSON content is required');
    }
    let parsed: unknown;
    try { parsed = JSON.parse(content); } catch {
      throw new BadRequestException('MICROLESSON content must be valid JSON');
    }
    const result = microlessonContentSchema.safeParse(parsed);
    if (!result.success) {
      const issues = result.error.issues.map((i) => i.message).join(', ');
      throw new BadRequestException(`Invalid MICROLESSON content: ${issues}`);
    }
    if (result.data.durationSeconds > MICROLESSON_MAX_DURATION_SECONDS) {
      throw new BadRequestException(
        `MICROLESSON durationSeconds must not exceed ${MICROLESSON_MAX_DURATION_SECONDS} (7 minutes)`,
      );
    }
  }

  private map(row: DbContentItem): ContentItemMapped {
    return {
      id: row.id,
      moduleId: row.moduleId,
      title: row.title,
      contentType: row.type,
      content: row.content ?? null,
      fileId: row.fileId ?? null,
      duration: row.duration ?? null,
      orderIndex: row.orderIndex,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  async findById(id: string): Promise<ContentItemMapped> {
    const [row] = await this.db
      .select()
      .from(schema.contentItems)
      .where(eq(schema.contentItems.id, id))
      .limit(1);

    if (!row) {
      this.logger.warn(`ContentItem not found: ${id}`);
      throw new NotFoundException(`ContentItem with ID ${id} not found`);
    }

    return this.map(row);
  }

  async findByModuleIdBatch(moduleIds: string[]): Promise<Map<string, ContentItemMapped[]>> {
    if (moduleIds.length === 0) return new Map();
    const rows = await this.db
      .select()
      .from(schema.contentItems)
      .where(inArray(schema.contentItems.moduleId, moduleIds))
      .orderBy(asc(schema.contentItems.orderIndex));
    const result = new Map<string, ContentItemMapped[]>();
    for (const row of rows) {
      const key = row.moduleId;
      if (!result.has(key)) result.set(key, []);
      result.get(key)!.push(this.map(row));
    }
    return result;
  }

  async findByModule(moduleId: string): Promise<ContentItemMapped[]> {
    this.logger.debug(`Fetching content items for module: ${moduleId}`);
    const rows = await this.db
      .select()
      .from(schema.contentItems)
      .where(eq(schema.contentItems.moduleId, moduleId))
      .orderBy(asc(schema.contentItems.orderIndex));

    return rows.map((r) => this.map(r));
  }
}
