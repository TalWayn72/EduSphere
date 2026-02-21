import { Injectable, Logger, ConflictException, NotFoundException } from '@nestjs/common';
import { createDatabaseConnection, schema, eq, and, withTenantContext } from '@edusphere/db';
import type { TenantContext } from '@edusphere/db';

@Injectable()
export class EnrollmentService {
  private readonly logger = new Logger(EnrollmentService.name);
  private db = createDatabaseConnection();

  async enrollCourse(courseId: string, ctx: TenantContext) {
    return withTenantContext(this.db, ctx, async (tx) => {
      // Check course exists
      const [course] = await tx
        .select({ id: schema.courses.id })
        .from(schema.courses)
        .where(eq(schema.courses.id, courseId))
        .limit(1);
      if (!course) {
        throw new NotFoundException(`Course ${courseId} not found`);
      }

      // Check not already enrolled
      const [existing] = await tx
        .select({ id: schema.userCourses.id })
        .from(schema.userCourses)
        .where(
          and(
            eq(schema.userCourses.userId, ctx.userId),
            eq(schema.userCourses.courseId, courseId)
          )
        )
        .limit(1);
      if (existing) {
        throw new ConflictException(`Already enrolled in course ${courseId}`);
      }

      const [enrollment] = await tx
        .insert(schema.userCourses)
        .values({ userId: ctx.userId, courseId, status: 'ACTIVE' })
        .returning();
      this.logger.log(`User ${ctx.userId} enrolled in course ${courseId}`);
      if (!enrollment) throw new Error('Enrollment failed');
      return this.mapEnrollment(enrollment);
    });
  }

  async unenrollCourse(courseId: string, ctx: TenantContext): Promise<boolean> {
    return withTenantContext(this.db, ctx, async (tx) => {
      const [deleted] = await tx
        .delete(schema.userCourses)
        .where(
          and(
            eq(schema.userCourses.userId, ctx.userId),
            eq(schema.userCourses.courseId, courseId)
          )
        )
        .returning();
      if (!deleted) {
        throw new NotFoundException(`Enrollment not found for course ${courseId}`);
      }
      this.logger.log(`User ${ctx.userId} unenrolled from course ${courseId}`);
      return true;
    });
  }

  async getMyEnrollments(ctx: TenantContext) {
    return withTenantContext(this.db, ctx, async (tx) => {
      const rows = await tx
        .select()
        .from(schema.userCourses)
        .where(eq(schema.userCourses.userId, ctx.userId));
      return rows.map((r) => this.mapEnrollment(r));
    });
  }

  async markContentViewed(contentItemId: string, ctx: TenantContext): Promise<boolean> {
    return withTenantContext(this.db, ctx, async (tx) => {
      await tx
        .insert(schema.userProgress)
        .values({
          userId: ctx.userId,
          contentItemId,
          isCompleted: true,
          progress: 100,
          lastAccessedAt: new Date(),
          completedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: [schema.userProgress.userId, schema.userProgress.contentItemId],
          set: {
            isCompleted: true,
            progress: 100,
            lastAccessedAt: new Date(),
            completedAt: new Date(),
          },
        });
      this.logger.debug(`User ${ctx.userId} marked content ${contentItemId} as viewed`);
      return true;
    });
  }

  async getCourseProgress(courseId: string, ctx: TenantContext) {
    return withTenantContext(this.db, ctx, async (tx) => {
      // Count total content items in course via modules
      const allItems = await tx
        .select({ id: schema.contentItems.id })
        .from(schema.contentItems)
        .innerJoin(schema.modules, eq(schema.contentItems.moduleId, schema.modules.id))
        .where(eq(schema.modules.course_id, courseId));

      const totalItems = allItems.length;
      if (totalItems === 0) {
        return { courseId, totalItems: 0, completedItems: 0, percentComplete: 0 };
      }

      const itemIds = allItems.map((i) => i.id);
      const completedRows = await tx
        .select({ id: schema.userProgress.id })
        .from(schema.userProgress)
        .where(
          and(
            eq(schema.userProgress.userId, ctx.userId),
            eq(schema.userProgress.isCompleted, true)
          )
        );

      // Filter completed items that belong to this course
      const completedInCourse = completedRows.filter((r) =>
        itemIds.includes(r.id)
      ).length;

      const percentComplete =
        totalItems > 0 ? Math.round((completedInCourse / totalItems) * 100 * 10) / 10 : 0;

      return { courseId, totalItems, completedItems: completedInCourse, percentComplete };
    });
  }

  private mapEnrollment(row: {
    id: string;
    userId: string;
    courseId: string;
    status: string;
    enrolledAt: Date;
    completedAt: Date | null;
  }) {
    return {
      id: row.id,
      userId: row.userId,
      courseId: row.courseId,
      status: row.status,
      enrolledAt: row.enrolledAt.toISOString(),
      completedAt: row.completedAt ? row.completedAt.toISOString() : null,
    };
  }
}
