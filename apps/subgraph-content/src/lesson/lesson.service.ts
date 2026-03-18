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

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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
      return this.mapLesson(row as Record<string, unknown>);
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
      return rows.map((r) => this.mapLesson(r as Record<string, unknown>));
    });
  }

  async create(input: CreateLessonInput, tenantCtx: TenantContext) {
    if (!UUID_REGEX.test(input.courseId)) {
      this.logger.warn(
        `[LessonService] createLesson rejected: courseId "${input.courseId}" is not a valid UUID`
      );
      throw new BadRequestException(
        'מזהה הקורס אינו תקין. ודא שהקורס קיים במערכת.'
      );
    }

    if (!tenantCtx.tenantId) {
      this.logger.error(
        '[LessonService] createLesson rejected: tenantId is missing from auth context'
      );
      throw new BadRequestException(
        'שגיאת אימות: חסר מזהה ארגון. נסה להתחבר מחדש.'
      );
    }

    // Pre-validate: course exists and belongs to this tenant
    const [course] = await this.db
      .select({ id: schema.courses.id, tenant_id: schema.courses.tenant_id })
      .from(schema.courses)
      .where(
        and(
          eq(schema.courses.id, input.courseId),
          isNull(schema.courses.deleted_at)
        )
      )
      .limit(1);

    if (!course) {
      this.logger.warn(
        `[LessonService] createLesson rejected: course "${input.courseId}" not found in DB`
      );
      throw new NotFoundException(
        'הקורס לא נמצא. ייתכן שנמחק או שהמזהה שגוי.'
      );
    }

    if (course.tenant_id !== tenantCtx.tenantId) {
      this.logger.warn(
        `[LessonService] createLesson rejected: course "${input.courseId}" belongs to tenant ` +
          `"${course.tenant_id}" but request is from tenant "${tenantCtx.tenantId}"`
      );
      throw new BadRequestException(
        'אין לך הרשאה ליצור שיעור בקורס זה.'
      );
    }

    // Pre-validate: instructor (user) exists in users table
    const [instructor] = await this.db
      .select({ id: schema.users.id })
      .from(schema.users)
      .where(eq(schema.users.id, input.instructorId))
      .limit(1);

    if (!instructor) {
      this.logger.warn(
        `[LessonService] createLesson rejected: instructorId "${input.instructorId}" not found in users table. ` +
          `This often happens when the Keycloak user ID (JWT sub) does not match any row in the users table. ` +
          `Ensure user provisioning syncs Keycloak users to the DB.`
      );
      throw new BadRequestException(
        'המשתמש לא נמצא במערכת. ייתכן שיש בעיית סנכרון עם מערכת ההזדהות.'
      );
    }

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
        const errMsg = String(err);
        this.logger.error(
          `[LessonService] Failed to create lesson for course "${input.courseId}" ` +
            `(tenant: ${tenantCtx.tenantId}, instructor: ${input.instructorId}): ${errMsg}`
        );

        // Parse specific DB constraint violations for actionable messages
        if (errMsg.includes('foreign key') && errMsg.includes('course_id')) {
          throw new BadRequestException(
            'הקורס לא נמצא במסד הנתונים.'
          );
        }
        if (errMsg.includes('foreign key') && errMsg.includes('instructor_id')) {
          throw new BadRequestException(
            'המרצה לא נמצא במערכת. בדוק את סנכרון המשתמשים.'
          );
        }
        if (errMsg.includes('foreign key') && errMsg.includes('tenant_id')) {
          throw new BadRequestException(
            'הארגון לא נמצא. נסה להתחבר מחדש.'
          );
        }
        throw new BadRequestException(
          'שגיאה ביצירת שיעור. נסה שוב או פנה לתמיכה.'
        );
      }

      const lesson = this.mapLesson(row);
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
        return this.mapLesson(row as Record<string, unknown>);
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
      } catch (err) {
        this.logger.error(
          `[LessonService] Failed to publish lesson "${id}": ${String(err)}`
        );
        throw new BadRequestException('שגיאה בפרסום השיעור.');
      }
    });
  }
}
