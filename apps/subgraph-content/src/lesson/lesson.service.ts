import { Injectable, Logger, OnModuleDestroy, NotFoundException } from '@nestjs/common';
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
import { connect, StringCodec, type NatsConnection } from 'nats';
import { buildNatsOptions, NatsSubjects } from '@edusphere/nats-client';
import type { LessonPayload } from '@edusphere/nats-client';

export interface CreateLessonInput {
  courseId: string;
  moduleId?: string;
  title: string;
  type: 'THEMATIC' | 'SEQUENTIAL';
  series?: string;
  lessonDate?: string;
  instructorId: string;
}

export interface UpdateLessonInput {
  title?: string;
  type?: 'THEMATIC' | 'SEQUENTIAL';
  series?: string;
  lessonDate?: string;
  status?: 'DRAFT' | 'PROCESSING' | 'READY' | 'PUBLISHED';
}

@Injectable()
export class LessonService implements OnModuleDestroy {
  private readonly logger = new Logger(LessonService.name);
  private readonly db = createDatabaseConnection();
  private readonly sc = StringCodec();
  private nc: NatsConnection | null = null;

  async onModuleDestroy(): Promise<void> {
    if (this.nc) {
      await this.nc.drain().catch(() => undefined);
      this.nc = null;
    }
    await closeAllPools();
  }

  private async getNats(): Promise<NatsConnection> {
    if (!this.nc) this.nc = await connect(buildNatsOptions());
    return this.nc;
  }

  private publishEvent(subject: string, payload: LessonPayload): void {
    this.getNats()
      .then((nc) => nc.publish(subject, this.sc.encode(JSON.stringify(payload))))
      .catch((err: unknown) => {
        this.logger.warn(`Failed to publish ${subject}: ${String(err)}`);
      });
  }

  private mapLesson(row: Record<string, unknown> | null | undefined) {
    if (!row) return null;
    return {
      id: row['id'],
      courseId: row['course_id'] ?? row['courseId'],
      moduleId: row['module_id'] ?? row['moduleId'] ?? null,
      title: row['title'],
      type: row['type'],
      series: row['series'] ?? null,
      lessonDate: row['lesson_date'] ? String(row['lesson_date']) : null,
      instructorId: row['instructor_id'] ?? row['instructorId'],
      status: row['status'],
      createdAt: row['created_at'] ? String(row['created_at']) : null,
      updatedAt: row['updated_at'] ? String(row['updated_at']) : null,
    };
  }

  async findById(id: string, tenantCtx: TenantContext) {
    const [row] = await this.db
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
    return this.mapLesson(row as Record<string, unknown>);
  }

  async findByCourse(
    courseId: string,
    tenantCtx: TenantContext,
    limit: number,
    offset: number
  ) {
    const rows = await this.db
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
    return rows.map((r) => this.mapLesson(r as Record<string, unknown>));
  }

  async create(input: CreateLessonInput, tenantCtx: TenantContext) {
    const [row] = await this.db
      .insert(schema.lessons)
      .values({
        tenant_id: tenantCtx.tenantId,
        course_id: input.courseId,
        module_id: input.moduleId ?? null,
        title: input.title,
        type: input.type,
        series: input.series ?? null,
        lesson_date: input.lessonDate ? new Date(input.lessonDate) : null,
        instructor_id: input.instructorId,
        status: 'DRAFT',
      })
      .returning();

    const lesson = this.mapLesson(row as Record<string, unknown>);
    this.logger.log(`Lesson created: ${String(row?.['id'])} - "${input.title}"`);

    const payload: LessonPayload = {
      type: 'lesson.created',
      lessonId: String(row?.['id']),
      courseId: input.courseId,
      tenantId: tenantCtx.tenantId,
      timestamp: new Date().toISOString(),
    };
    this.publishEvent(NatsSubjects.LESSON_CREATED, payload);

    return lesson;
  }

  async update(id: string, input: UpdateLessonInput, tenantCtx: TenantContext) {
    const updateData: Record<string, unknown> = {};
    if (input.title !== undefined) updateData['title'] = input.title;
    if (input.type !== undefined) updateData['type'] = input.type;
    if (input.series !== undefined) updateData['series'] = input.series;
    if (input.lessonDate !== undefined)
      updateData['lesson_date'] = input.lessonDate ? new Date(input.lessonDate) : null;
    if (input.status !== undefined) updateData['status'] = input.status;

    const [row] = await this.db
      .update(schema.lessons)
      .set(updateData)
      .where(
        and(
          eq(schema.lessons.id, id),
          eq(schema.lessons.tenant_id, tenantCtx.tenantId)
        )
      )
      .returning();
    return this.mapLesson(row as Record<string, unknown>);
  }

  async delete(id: string, tenantCtx: TenantContext): Promise<boolean> {
    await this.db
      .update(schema.lessons)
      .set({ deleted_at: new Date() })
      .where(
        and(
          eq(schema.lessons.id, id),
          eq(schema.lessons.tenant_id, tenantCtx.tenantId)
        )
      );
    return true;
  }

  async publish(id: string, tenantCtx: TenantContext) {
    const lesson = await this.findById(id, tenantCtx);
    if (!lesson) throw new NotFoundException(`Lesson ${id} not found`);

    const [row] = await this.db
      .update(schema.lessons)
      .set({ status: 'PUBLISHED' })
      .where(
        and(
          eq(schema.lessons.id, id),
          eq(schema.lessons.tenant_id, tenantCtx.tenantId)
        )
      )
      .returning();

    const published = this.mapLesson(row as Record<string, unknown>);
    const payload: LessonPayload = {
      type: 'lesson.published',
      lessonId: id,
      courseId: String(lesson.courseId),
      tenantId: tenantCtx.tenantId,
      timestamp: new Date().toISOString(),
    };
    this.publishEvent(NatsSubjects.LESSON_PUBLISHED, payload);

    return published;
  }
}
