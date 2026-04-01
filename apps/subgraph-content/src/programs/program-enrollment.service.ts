/**
 * ProgramEnrollmentService — enrollment and progress tracking for
 * F-026 Stackable Credentials / Nanodegrees.
 */
import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
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

import type { ProgramProgress, EnrollmentResult } from './program.types.js';

@Injectable()
export class ProgramEnrollmentService implements OnModuleDestroy {
  private readonly logger = new Logger(ProgramEnrollmentService.name);
  private readonly db = createDatabaseConnection();

  async onModuleDestroy(): Promise<void> {
    await closeAllPools();
  }

  async enrollInProgram(
    programId: string,
    userId: string,
    tenantId: string
  ): Promise<EnrollmentResult> {
    const ctx: TenantContext = { tenantId, userId, userRole: 'STUDENT' };

    const existing = await withTenantContext(this.db, ctx, async (tx) =>
      tx
        .select()
        .from(schema.programEnrollments)
        .where(
          and(
            eq(schema.programEnrollments.userId, userId),
            eq(schema.programEnrollments.programId, programId)
          )
        )
        .limit(1)
    );

    if (existing.length > 0) {
      const record = existing[0]!;
      this.logger.log(
        { userId, programId },
        'ProgramEnrollmentService: enrollment already exists (idempotent)'
      );
      return this.mapEnrollment(record);
    }

    const [program] = await withTenantContext(this.db, ctx, async (tx) =>
      tx
        .select()
        .from(schema.credentialPrograms)
        .where(eq(schema.credentialPrograms.id, programId))
        .limit(1)
    );

    if (!program) throw new NotFoundException(`Program ${programId} not found`);
    if (!program.published)
      throw new ConflictException('Program is not yet published');

    const [enrollment] = await withTenantContext(this.db, ctx, async (tx) =>
      tx
        .insert(schema.programEnrollments)
        .values({ userId, programId, tenantId })
        .returning()
    );

    this.logger.log(
      { userId, programId, tenantId },
      'ProgramEnrollmentService: user enrolled in program'
    );
    return this.mapEnrollment(enrollment!);
  }

  async getUserEnrollments(
    userId: string,
    tenantId: string
  ): Promise<EnrollmentResult[]> {
    const ctx: TenantContext = { tenantId, userId, userRole: 'STUDENT' };

    const rows = await withTenantContext(this.db, ctx, async (tx) =>
      tx
        .select()
        .from(schema.programEnrollments)
        .where(
          and(
            eq(schema.programEnrollments.userId, userId),
            eq(schema.programEnrollments.tenantId, tenantId)
          )
        )
    );

    return rows.map((r) => this.mapEnrollment(r));
  }

  async getProgramProgress(
    programId: string,
    userId: string,
    tenantId: string
  ): Promise<ProgramProgress> {
    const ctx: TenantContext = { tenantId, userId, userRole: 'STUDENT' };

    const [program] = await withTenantContext(this.db, ctx, async (tx) =>
      tx
        .select()
        .from(schema.credentialPrograms)
        .where(eq(schema.credentialPrograms.id, programId))
        .limit(1)
    );

    if (!program) throw new NotFoundException(`Program ${programId} not found`);

    const requiredIds = program.requiredCourseIds as string[];
    if (requiredIds.length === 0) {
      return {
        totalCourses: 0,
        completedCourses: 0,
        completedCourseIds: [],
        percentComplete: 100,
      };
    }

    const completions = await withTenantContext(this.db, ctx, async (tx) =>
      tx
        .select({ courseId: schema.userCourses.courseId })
        .from(schema.userCourses)
        .where(eq(schema.userCourses.userId, userId))
    );

    const doneSet = new Set(
      completions.filter((c) => c.courseId !== null).map((c) => c.courseId!)
    );
    const completedCourseIds = requiredIds.filter((id) => doneSet.has(id));
    const completedCourses = completedCourseIds.length;
    const totalCourses = requiredIds.length;
    const percentComplete = Math.round((completedCourses / totalCourses) * 100);

    return {
      totalCourses,
      completedCourses,
      completedCourseIds,
      percentComplete,
    };
  }

  async getEnrollmentCounts(
    programIds: string[],
    tenantId: string,
    userId: string
  ): Promise<Map<string, number>> {
    if (programIds.length === 0) return new Map();
    const ctx: TenantContext = { tenantId, userId, userRole: 'ORG_ADMIN' };

    const rows = await withTenantContext(this.db, ctx, async (tx) =>
      tx
        .select({
          programId: schema.programEnrollments.programId,
        })
        .from(schema.programEnrollments)
        .where(eq(schema.programEnrollments.tenantId, tenantId))
    );

    const counts = new Map<string, number>();
    for (const row of rows) {
      const prev = counts.get(row.programId) ?? 0;
      counts.set(row.programId, prev + 1);
    }
    return counts;
  }

  private mapEnrollment(
    e: typeof schema.programEnrollments.$inferSelect
  ): EnrollmentResult {
    return {
      id: e.id,
      programId: e.programId,
      userId: e.userId,
      enrolledAt: e.enrolledAt.toISOString(),
      completedAt: e.completedAt?.toISOString() ?? null,
      certificateId: e.certificateId ?? null,
    };
  }
}
