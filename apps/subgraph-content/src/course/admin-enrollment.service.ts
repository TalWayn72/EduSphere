/**
 * AdminEnrollmentService — Admin-facing enrollment management (F-108).
 * Allows ORG_ADMIN / SUPER_ADMIN to enroll, unenroll, and bulk-enroll users.
 */
import {
  Injectable,
  Logger,
  NotFoundException,
  OnModuleDestroy,
} from '@nestjs/common';
import {
  createDatabaseConnection,
  schema,
  eq,
  and,
  withTenantContext,
  closeAllPools,
} from '@edusphere/db';
import type { TenantContext } from '@edusphere/db';

export interface AdminEnrollmentRecord {
  id: string;
  courseId: string;
  userId: string;
  status: string;
  enrolledAt: string;
  completedAt: string | null;
}

@Injectable()
export class AdminEnrollmentService implements OnModuleDestroy {
  private readonly logger = new Logger(AdminEnrollmentService.name);
  private db = createDatabaseConnection();

  async onModuleDestroy(): Promise<void> {
    await closeAllPools();
  }

  async getEnrollments(
    courseId: string,
    tenantCtx: TenantContext
  ): Promise<AdminEnrollmentRecord[]> {
    return withTenantContext(this.db, tenantCtx, async (tx) => {
      const rows = await tx
        .select()
        .from(schema.userCourses)
        .where(eq(schema.userCourses.courseId, courseId));
      return rows.map((r) => this.mapEnrollment(r));
    });
  }

  async enrollUser(
    courseId: string,
    targetUserId: string,
    tenantCtx: TenantContext
  ): Promise<AdminEnrollmentRecord> {
    return withTenantContext(this.db, tenantCtx, async (tx) => {
      const [course] = await tx
        .select({ id: schema.courses.id })
        .from(schema.courses)
        .where(eq(schema.courses.id, courseId))
        .limit(1);
      if (!course) {
        throw new NotFoundException(`Course ${courseId} not found`);
      }

      // Idempotent — return existing enrollment rather than throwing ConflictException
      const [existing] = await tx
        .select()
        .from(schema.userCourses)
        .where(
          and(
            eq(schema.userCourses.userId, targetUserId),
            eq(schema.userCourses.courseId, courseId)
          )
        )
        .limit(1);
      if (existing) {
        this.logger.log(
          `User ${targetUserId} already enrolled in course ${courseId} — idempotent return`
        );
        return this.mapEnrollment(existing);
      }

      const [enrollment] = await tx
        .insert(schema.userCourses)
        .values({ userId: targetUserId, courseId, status: 'ACTIVE' })
        .returning();
      if (!enrollment) throw new Error('Enrollment insert failed');
      this.logger.log(
        `Admin enrolled user ${targetUserId} in course ${courseId}`
      );
      return this.mapEnrollment(enrollment);
    });
  }

  async unenrollUser(
    courseId: string,
    targetUserId: string,
    tenantCtx: TenantContext
  ): Promise<boolean> {
    return withTenantContext(this.db, tenantCtx, async (tx) => {
      const [deleted] = await tx
        .delete(schema.userCourses)
        .where(
          and(
            eq(schema.userCourses.userId, targetUserId),
            eq(schema.userCourses.courseId, courseId)
          )
        )
        .returning();
      if (!deleted) {
        throw new NotFoundException(
          `Enrollment not found for user ${targetUserId} in course ${courseId}`
        );
      }
      this.logger.log(
        `Admin unenrolled user ${targetUserId} from course ${courseId}`
      );
      return true;
    });
  }

  async bulkEnroll(
    courseId: string,
    userIds: string[],
    tenantCtx: TenantContext
  ): Promise<number> {
    if (userIds.length === 0) return 0;
    return withTenantContext(this.db, tenantCtx, async (tx) => {
      const [course] = await tx
        .select({ id: schema.courses.id })
        .from(schema.courses)
        .where(eq(schema.courses.id, courseId))
        .limit(1);
      if (!course) {
        throw new NotFoundException(`Course ${courseId} not found`);
      }

      const existing = await tx
        .select({ userId: schema.userCourses.userId })
        .from(schema.userCourses)
        .where(eq(schema.userCourses.courseId, courseId));
      const enrolledSet = new Set(existing.map((r) => r.userId));

      const toEnroll = userIds.filter((id) => !enrolledSet.has(id));
      if (toEnroll.length === 0) return 0;

      await tx.insert(schema.userCourses).values(
        toEnroll.map((userId) => ({
          userId,
          courseId,
          status: 'ACTIVE' as const,
        }))
      );
      this.logger.log(
        `Admin bulk-enrolled ${toEnroll.length} users in course ${courseId}`
      );
      return toEnroll.length;
    });
  }

  private mapEnrollment(row: {
    id: string;
    userId: string;
    courseId: string;
    status: string;
    enrolledAt: Date;
    completedAt: Date | null;
  }): AdminEnrollmentRecord {
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
