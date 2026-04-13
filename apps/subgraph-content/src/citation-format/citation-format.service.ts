import {
  Injectable,
  Logger,
  OnModuleDestroy,
  NotFoundException,
} from '@nestjs/common';
import {
  createDatabaseConnection,
  schema,
  eq,
  and,
  closeAllPools,
} from '@edusphere/db';
import type { TenantContext } from '@edusphere/db';
import { withTenantContext } from '@edusphere/db';

@Injectable()
export class CitationFormatService implements OnModuleDestroy {
  private readonly logger = new Logger(CitationFormatService.name);
  private readonly db = createDatabaseConnection();

  async onModuleDestroy(): Promise<void> {
    await closeAllPools();
  }

  /** List active citation format configs for a course. */
  async getForCourse(tenantCtx: TenantContext, courseId: string) {
    return withTenantContext(this.db, tenantCtx, async (db) => {
      return db
        .select()
        .from(schema.citation_format_configs)
        .where(
          and(
            eq(schema.citation_format_configs.course_id, courseId),
            eq(schema.citation_format_configs.is_active, true)
          )
        );
    });
  }

  /** Upsert a citation format config for a course. */
  async setFormat(
    tenantCtx: TenantContext,
    courseId: string,
    presetName: string,
    formatDescription?: string | null
  ) {
    return withTenantContext(this.db, tenantCtx, async (db) => {
      const existing = await db
        .select()
        .from(schema.citation_format_configs)
        .where(
          and(
            eq(schema.citation_format_configs.tenant_id, tenantCtx.tenantId),
            eq(schema.citation_format_configs.course_id, courseId),
            eq(schema.citation_format_configs.preset_name, presetName)
          )
        )
        .limit(1);

      if (existing.length > 0) {
        const [row] = await db
          .update(schema.citation_format_configs)
          .set({
            format_description: formatDescription ?? undefined,
            is_active: true,
            updated_at: new Date(),
          })
          .where(eq(schema.citation_format_configs.id, existing[0]!.id))
          .returning();
        if (!row)
          throw new NotFoundException(
            'Citation format config not found after update'
          );
        this.logger.log(
          `Updated citation format: course=${courseId} preset=${presetName}`
        );
        return row;
      }

      const [row] = await db
        .insert(schema.citation_format_configs)
        .values({
          tenant_id: tenantCtx.tenantId,
          course_id: courseId,
          preset_name: presetName,
          format_description: formatDescription ?? null,
        })
        .returning();
      if (!row)
        throw new NotFoundException(
          'Citation format config not found after insert'
        );
      this.logger.log(
        `Created citation format: course=${courseId} preset=${presetName}`
      );
      return row;
    });
  }
}
