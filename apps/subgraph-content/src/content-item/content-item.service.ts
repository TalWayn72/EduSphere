import {
  Injectable,
  Logger,
  NotFoundException,
  OnModuleDestroy,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import {
  createDatabaseConnection,
  schema,
  eq,
  and,
  asc,
  inArray,
  isNull,
  closeAllPools,
  withReadReplica,
} from '@edusphere/db';
import {
  microlessonContentSchema,
  MICROLESSON_MAX_DURATION_SECONDS,
} from '../microlearning/microlearning.schemas';

export interface CreateContentItemInput {
  moduleId: string;
  title: string;
  contentType: string;
  body?: string | null;
  mediaAssetId?: string | null;
  order?: number | null;
}

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
  validateMicrolessonIfNeeded(
    contentType: string,
    content: string | null
  ): void {
    if (contentType !== 'MICROLESSON') return;
    if (!content) {
      throw new BadRequestException('MICROLESSON content is required');
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(content);
    } catch {
      throw new BadRequestException('MICROLESSON content must be valid JSON');
    }
    const result = microlessonContentSchema.safeParse(parsed);
    if (!result.success) {
      const issues = result.error.issues.map((i) => i.message).join(', ');
      throw new BadRequestException(`Invalid MICROLESSON content: ${issues}`);
    }
    if (result.data.durationSeconds > MICROLESSON_MAX_DURATION_SECONDS) {
      throw new BadRequestException(
        `MICROLESSON durationSeconds must not exceed ${MICROLESSON_MAX_DURATION_SECONDS} (7 minutes)`
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
    const [row] = await withReadReplica((db) =>
      db
        .select()
        .from(schema.contentItems)
        .where(eq(schema.contentItems.id, id))
        .limit(1)
    );

    if (row) return this.map(row);

    // Fallback: the ID may be a lesson ID — look up lessons + lesson_assets + media_assets
    const lessonRow = await this.findLessonAsContentItem(id);
    if (lessonRow) return lessonRow;

    this.logger.warn(`ContentItem not found: ${id}`);
    throw new NotFoundException(`ContentItem with ID ${id} not found`);
  }

  /**
   * Fallback for lesson IDs passed to contentItem(id).
   * Joins lessons → lesson_assets → media_assets to build a ContentItemMapped.
   */
  private async findLessonAsContentItem(
    id: string
  ): Promise<ContentItemMapped | null> {
    const rows = await withReadReplica((db) =>
      db
        .select({
          id: schema.lessons.id,
          moduleId: schema.lessons.module_id,
          title: schema.lessons.title,
          youtubeVideoId: schema.media_assets.youtube_video_id,
          duration: schema.media_assets.duration,
          createdAt: schema.lessons.created_at,
          updatedAt: schema.lessons.updated_at,
        })
        .from(schema.lessons)
        .leftJoin(
          schema.lesson_assets,
          eq(schema.lesson_assets.lesson_id, schema.lessons.id)
        )
        .leftJoin(
          schema.media_assets,
          eq(schema.media_assets.id, schema.lesson_assets.media_asset_id)
        )
        .where(
          and(
            eq(schema.lessons.id, id),
            isNull(schema.lessons.deleted_at)
          )
        )
        .limit(1)
    );

    const r = rows[0];
    if (!r) return null;

    this.logger.debug(`ContentItem fallback resolved lesson: ${id}`);
    return {
      id: r.id,
      moduleId: r.moduleId ?? '',
      title: r.title,
      contentType: r.youtubeVideoId ? 'YOUTUBE' : 'VIDEO',
      content: r.youtubeVideoId ?? null,
      fileId: null,
      duration: r.duration ?? null,
      orderIndex: 0,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
    };
  }

  async findByIdBatch(ids: string[]): Promise<Map<string, ContentItemMapped>> {
    if (ids.length === 0) return new Map();
    const rows = await withReadReplica((db) =>
      db
        .select()
        .from(schema.contentItems)
        .where(inArray(schema.contentItems.id, ids))
    );
    const result = new Map<string, ContentItemMapped>();
    for (const row of rows) {
      result.set(row.id, this.map(row));
    }
    return result;
  }

  async findByModuleIdBatch(
    moduleIds: string[]
  ): Promise<Map<string, ContentItemMapped[]>> {
    if (moduleIds.length === 0) return new Map();
    const rows = await withReadReplica((db) =>
      db
        .select()
        .from(schema.contentItems)
        .where(inArray(schema.contentItems.moduleId, moduleIds))
        .orderBy(asc(schema.contentItems.orderIndex))
    );
    const result = new Map<string, ContentItemMapped[]>();
    for (const row of rows) {
      const key = row.moduleId;
      if (!result.has(key)) result.set(key, []);
      result.get(key)!.push(this.map(row));
    }
    return result;
  }

  async create(
    input: CreateContentItemInput,
    _tenantId: string
  ): Promise<ContentItemMapped> {
    const orderIndex = input.order ?? 0;
    const [row] = await this.db
      .insert(schema.contentItems)
      .values({
        moduleId: input.moduleId,
        title: input.title,
        type: input.contentType as (typeof schema.contentItems.$inferInsert)['type'],
        content: input.body ?? null,
        fileId: input.mediaAssetId ?? null,
        orderIndex,
      })
      .returning();
    if (!row) {
      throw new InternalServerErrorException('Failed to create ContentItem');
    }
    this.logger.log(
      `ContentItem created: id=${row.id} module=${input.moduleId}`
    );
    return this.map(row);
  }

  async findByModule(moduleId: string): Promise<ContentItemMapped[]> {
    this.logger.debug(`Fetching content items for module: ${moduleId}`);
    const rows = await withReadReplica((db) =>
      db
        .select()
        .from(schema.contentItems)
        .where(eq(schema.contentItems.moduleId, moduleId))
        .orderBy(asc(schema.contentItems.orderIndex))
    );

    return rows.map((r) => this.map(r));
  }
}
