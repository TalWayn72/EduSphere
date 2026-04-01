import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import {
  createDatabaseConnection,
  schema,
  eq,
  desc,
  and,
  isNull,
  closeAllPools,
} from '@edusphere/db';
import type { TenantContext } from '@edusphere/db';
import { withTenantContext } from '@edusphere/db';

import { mapLesson, type MappedLesson } from './lesson.helpers.js';

@Injectable()
export class LessonQueryService implements OnModuleDestroy {
  private readonly logger = new Logger(LessonQueryService.name);
  private readonly db = createDatabaseConnection();

  async onModuleDestroy(): Promise<void> {
    await closeAllPools();
  }

  async findById(
    id: string,
    tenantCtx: TenantContext
  ): Promise<MappedLesson | null> {
    return withTenantContext(this.db, tenantCtx, async (db) => {
      const [row] = await db
        .select()
        .from(schema.lessons)
        .where(
          and(
            eq(schema.lessons.id, id),
            eq(schema.lessons.tenant_id, tenantCtx.tenantId),
            isNull(schema.lessons.deleted_at)
          )
        )
        .limit(1);
      return mapLesson(row as Record<string, unknown>);
    });
  }

  async findByCourse(
    courseId: string,
    tenantCtx: TenantContext,
    limit: number,
    offset: number
  ): Promise<(MappedLesson | null)[]> {
    return withTenantContext(this.db, tenantCtx, async (db) => {
      const rows = await db
        .select()
        .from(schema.lessons)
        .where(
          and(
            eq(schema.lessons.course_id, courseId),
            eq(schema.lessons.tenant_id, tenantCtx.tenantId),
            isNull(schema.lessons.deleted_at)
          )
        )
        .orderBy(desc(schema.lessons.created_at))
        .limit(limit)
        .offset(offset);
      return rows.map((r) => mapLesson(r as Record<string, unknown>));
    });
  }
}
