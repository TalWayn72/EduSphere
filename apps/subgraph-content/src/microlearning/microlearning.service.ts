import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
  OnModuleDestroy,
} from '@nestjs/common';
import {
  createDatabaseConnection,
  closeAllPools,
  schema,
  eq,
  and,
  withTenantContext,
} from '@edusphere/db';
import type { TenantContext } from '@edusphere/db';
import {
  microlessonContentSchema,
  createMicrolearningPathInputSchema,
  MICROLESSON_MAX_DURATION_SECONDS,
  type CreateMicrolearningPathInput,
} from './microlearning.schemas';

export interface MicrolearningPathDto {
  id: string;
  title: string;
  topicClusterId: string | null;
  contentItemIds: string[];
  itemCount: number;
  createdAt: string;
}

@Injectable()
export class MicrolearningService implements OnModuleDestroy {
  private readonly logger = new Logger(MicrolearningService.name);
  private readonly db = createDatabaseConnection();

  async onModuleDestroy(): Promise<void> {
    await closeAllPools();
  }

  /** Validate that a MICROLESSON content JSON is well-formed and within limits. */
  validateMicrolessonContent(rawContent: string | null): void {
    if (!rawContent) {
      throw new BadRequestException('MICROLESSON content is required');
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(rawContent);
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
        `MICROLESSON durationSeconds must not exceed ${MICROLESSON_MAX_DURATION_SECONDS} (7 minutes)`,
      );
    }
  }

  async createPath(
    input: CreateMicrolearningPathInput,
    ctx: TenantContext,
  ): Promise<MicrolearningPathDto> {
    const validated = createMicrolearningPathInputSchema.safeParse(input);
    if (!validated.success) {
      const issues = validated.error.issues.map((i) => i.message).join(', ');
      throw new BadRequestException(`Invalid path input: ${issues}`);
    }
    const { title, contentItemIds, topicClusterId } = validated.data;
    this.logger.log(`createPath: "${title}" tenant=${ctx.tenantId}`);

    return withTenantContext(this.db, ctx, async (tx) => {
      const [row] = await tx
        .insert(schema.microlearningPaths)
        .values({
          title,
          contentItemIds: JSON.stringify(contentItemIds),
          topicClusterId: topicClusterId ?? null,
          tenantId: ctx.tenantId,
          createdBy: ctx.userId,
        })
        .returning();
      if (!row) throw new BadRequestException('Failed to create microlearning path');
      return this.mapPath(row);
    });
  }

  async getPath(pathId: string, ctx: TenantContext): Promise<MicrolearningPathDto> {
    return withTenantContext(this.db, ctx, async (tx) => {
      const [row] = await tx
        .select()
        .from(schema.microlearningPaths)
        .where(
          and(
            eq(schema.microlearningPaths.id, pathId),
            eq(schema.microlearningPaths.tenantId, ctx.tenantId),
          ),
        )
        .limit(1);
      if (!row) throw new NotFoundException(`MicrolearningPath ${pathId} not found`);
      return this.mapPath(row);
    });
  }

  async listPaths(ctx: TenantContext): Promise<MicrolearningPathDto[]> {
    return withTenantContext(this.db, ctx, async (tx) => {
      const rows = await tx
        .select()
        .from(schema.microlearningPaths)
        .where(eq(schema.microlearningPaths.tenantId, ctx.tenantId));
      return rows.map((r) => this.mapPath(r));
    });
  }

  /** Pick the first MICROLESSON content item from the first available path. */
  async getDailyLesson(ctx: TenantContext): Promise<string | null> {
    const paths = await this.listPaths(ctx);
    if (!paths.length) return null;
    const firstPath = paths[0];
    if (!firstPath) return null;
    return firstPath.contentItemIds[0] ?? null;
  }

  private mapPath(row: typeof schema.microlearningPaths.$inferSelect): MicrolearningPathDto {
    const ids: string[] = (() => {
      try { return JSON.parse(row.contentItemIds) as string[]; } catch { return []; }
    })();
    return {
      id: row.id,
      title: row.title,
      topicClusterId: row.topicClusterId ?? null,
      contentItemIds: ids,
      itemCount: ids.length,
      createdAt: row.createdAt.toISOString(),
    };
  }
}
