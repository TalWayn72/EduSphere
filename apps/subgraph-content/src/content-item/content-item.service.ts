import { Injectable, Logger, NotFoundException, OnModuleDestroy } from '@nestjs/common';
import { createDatabaseConnection, schema, eq, asc, closeAllPools } from '@edusphere/db';

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
