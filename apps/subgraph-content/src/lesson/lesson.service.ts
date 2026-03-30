import {
  Injectable,
  Logger,
  OnModuleDestroy,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
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
import { connect, StringCodec, type NatsConnection } from 'nats';
import { buildNatsOptions, NatsSubjects } from '@edusphere/nats-client';
import type { LessonPayload } from '@edusphere/nats-client';

export type { CreateLessonInput, UpdateLessonInput, MappedLesson } from './lesson.helpers.js';
export { mapLesson, UUID_REGEX } from './lesson.helpers.js';

import { mapLesson, UUID_REGEX } from './lesson.helpers.js';
import type { CreateLessonInput, UpdateLessonInput } from './lesson.helpers.js';

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
      .then((nc) =>
        nc.publish(subject, this.sc.encode(JSON.stringify(payload)))
      )
      .catch((err: unknown) => {
        this.logger.warn(`Failed to publish ${subject}: ${String(err)}`);
      });
  }

  async findById(id: string, tenantCtx: TenantContext) {
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
  ) {
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

  async create(input: CreateLessonInput, tenantCtx: TenantContext) {
    this.validateCreateInput(input, tenantCtx);
    await this.validateCourseExists(input.courseId, tenantCtx);
    await this.validateInstructorExists(input.instructorId);

    return withTenantContext(this.db, tenantCtx, async (db) => {
      let row: Record<string, unknown> | undefined;
      try {
        [row] = (await db
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
          .returning()) as unknown as [Record<string, unknown>];
      } catch (err) {
        this.handleCreateError(err, input, tenantCtx);
      }

      const lesson = mapLesson(row);
      this.logger.log(
        `[LessonService] Lesson created: ${String(row?.['id'])} - "${input.title}" ` +
          `(course: ${input.courseId}, tenant: ${tenantCtx.tenantId})`
      );

      const payload: LessonPayload = {
        type: 'lesson.created',
        lessonId: String(row?.['id']),
        courseId: input.courseId,
        tenantId: tenantCtx.tenantId,
        timestamp: new Date().toISOString(),
      };
      this.publishEvent(NatsSubjects.LESSON_CREATED, payload);
      return lesson;
    });
  }

  async update(id: string, input: UpdateLessonInput, tenantCtx: TenantContext) {
    const updateData: Record<string, unknown> = {};
    if (input.title !== undefined) updateData['title'] = input.title;
    if (input.type !== undefined) updateData['type'] = input.type;
    if (input.series !== undefined) updateData['series'] = input.series;
    if (input.lessonDate !== undefined)
      updateData['lesson_date'] = input.lessonDate
        ? new Date(input.lessonDate)
        : null;
    if (input.status !== undefined) updateData['status'] = input.status;

    return withTenantContext(this.db, tenantCtx, async (db) => {
      try {
        const [row] = await db
          .update(schema.lessons)
          .set(updateData)
          .where(
            and(
              eq(schema.lessons.id, id),
              eq(schema.lessons.tenant_id, tenantCtx.tenantId)
            )
          )
          .returning();
        return mapLesson(row as Record<string, unknown>);
      } catch (err) {
        this.logger.error(
          `[LessonService] Failed to update lesson "${id}": ${String(err)}`
        );
        throw new BadRequestException('שגיאה בעדכון השיעור.');
      }
    });
  }

  async delete(id: string, tenantCtx: TenantContext): Promise<boolean> {
    return withTenantContext(this.db, tenantCtx, async (db) => {
      try {
        await db
          .update(schema.lessons)
          .set({ deleted_at: new Date() })
          .where(
            and(
              eq(schema.lessons.id, id),
              eq(schema.lessons.tenant_id, tenantCtx.tenantId)
            )
          );
        return true;
      } catch (err) {
        this.logger.error(
          `[LessonService] Failed to delete lesson "${id}": ${String(err)}`
        );
        throw new BadRequestException('שגיאה במחיקת השיעור.');
      }
    });
  }

  async publish(id: string, tenantCtx: TenantContext) {
    const lesson = await this.findById(id, tenantCtx);
    if (!lesson) throw new NotFoundException(`Lesson ${id} not found`);

    return withTenantContext(this.db, tenantCtx, async (db) => {
      try {
        const [row] = await db
          .update(schema.lessons)
          .set({ status: 'PUBLISHED' })
          .where(
            and(
              eq(schema.lessons.id, id),
              eq(schema.lessons.tenant_id, tenantCtx.tenantId)
            )
          )
          .returning();

        const published = mapLesson(row as Record<string, unknown>);
        const payload: LessonPayload = {
          type: 'lesson.published',
          lessonId: id,
          courseId: String(lesson.courseId),
          tenantId: tenantCtx.tenantId,
          timestamp: new Date().toISOString(),
        };
        this.publishEvent(NatsSubjects.LESSON_PUBLISHED, payload);
        return published;
      } catch (err) {
        this.logger.error(
          `[LessonService] Failed to publish lesson "${id}": ${String(err)}`
        );
        throw new BadRequestException('שגיאה בפרסום השיעור.');
      }
    });
  }

  // ─── Private validation helpers ───────────────────────────────────────────

  private validateCreateInput(input: CreateLessonInput, tenantCtx: TenantContext): void {
    if (!UUID_REGEX.test(input.courseId)) {
      this.logger.warn(`[LessonService] createLesson rejected: invalid courseId "${input.courseId}"`);
      throw new BadRequestException('מזהה הקורס אינו תקין. ודא שהקורס קיים במערכת.');
    }
    if (!tenantCtx.tenantId) {
      this.logger.error('[LessonService] createLesson rejected: tenantId missing');
      throw new BadRequestException('שגיאת אימות: חסר מזהה ארגון. נסה להתחבר מחדש.');
    }
  }

  private async validateCourseExists(courseId: string, tenantCtx: TenantContext): Promise<void> {
    const [course] = await this.db
      .select({ id: schema.courses.id, tenant_id: schema.courses.tenant_id })
      .from(schema.courses)
      .where(and(eq(schema.courses.id, courseId), isNull(schema.courses.deleted_at)))
      .limit(1);

    if (!course) {
      this.logger.warn(`[LessonService] createLesson rejected: course "${courseId}" not found in DB`);
      throw new NotFoundException('הקורס לא נמצא. ייתכן שנמחק או שהמזהה שגוי.');
    }
    if (course.tenant_id !== tenantCtx.tenantId) {
      this.logger.warn(
        `[LessonService] createLesson rejected: course "${courseId}" belongs to tenant ` +
          `"${course.tenant_id}" but request is from tenant "${tenantCtx.tenantId}"`
      );
      throw new BadRequestException('אין לך הרשאה ליצור שיעור בקורס זה.');
    }
  }

  private async validateInstructorExists(instructorId: string): Promise<void> {
    const [instructor] = await this.db
      .select({ id: schema.users.id })
      .from(schema.users)
      .where(eq(schema.users.id, instructorId))
      .limit(1);

    if (!instructor) {
      this.logger.warn(
        `[LessonService] createLesson rejected: instructorId "${instructorId}" not found in users table.`
      );
      throw new BadRequestException('המשתמש לא נמצא במערכת. ייתכן שיש בעיית סנכרון עם מערכת ההזדהות.');
    }
  }

  private handleCreateError(err: unknown, input: CreateLessonInput, tenantCtx: TenantContext): never {
    const errMsg = String(err);
    this.logger.error(
      `[LessonService] Failed to create lesson for course "${input.courseId}" ` +
        `(tenant: ${tenantCtx.tenantId}, instructor: ${input.instructorId}): ${errMsg}`
    );
    if (errMsg.includes('foreign key') && errMsg.includes('course_id')) {
      throw new BadRequestException('הקורס לא נמצא במסד הנתונים.');
    }
    if (errMsg.includes('foreign key') && errMsg.includes('instructor_id')) {
      throw new BadRequestException('המרצה לא נמצא במערכת. בדוק את סנכרון המשתמשים.');
    }
    if (errMsg.includes('foreign key') && errMsg.includes('tenant_id')) {
      throw new BadRequestException('הארגון לא נמצא. נסה להתחבר מחדש.');
    }
    throw new BadRequestException('שגיאה ביצירת שיעור. נסה שוב או פנה לתמיכה.');
  }
}
