/**
 * ProgramService — F-026 Stackable Credentials / Nanodegrees
 *
 * Responsibilities:
 *  1. Expose CRUD + progress query methods for resolvers
 *  2. NATS event handling for completion is in ProgramEventsHandler
 */
import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import {
  createDatabaseConnection,
  schema,
  eq,
  and,
  withTenantContext,
} from '@edusphere/db';
import type { TenantContext } from '@edusphere/db';

export type {
  ProgramProgress,
  ProgramResult,
  EnrollmentResult,
  CreateProgramInput,
  UpdateProgramInput,
} from './program.types.js';

import type {
  ProgramProgress,
  ProgramResult,
  EnrollmentResult,
  CreateProgramInput,
  UpdateProgramInput,
} from './program.types.js';

// ─── Service ──────────────────────────────────────────────────────────────────

@Injectable()
export class ProgramService {
  private readonly logger = new Logger(ProgramService.name);
  private readonly db = createDatabaseConnection();

  async listPrograms(
    tenantId: string,
    userId: string
  ): Promise<ProgramResult[]> {
    const ctx: TenantContext = { tenantId, userId, userRole: 'STUDENT' };

    const programs = await withTenantContext(this.db, ctx, async (tx) =>
      tx
        .select()
        .from(schema.credentialPrograms)
        .where(
          and(
            eq(schema.credentialPrograms.tenantId, tenantId),
            eq(schema.credentialPrograms.published, true)
          )
        )
    );

    const counts = await this.getEnrollmentCounts(
      programs.map((p) => p.id),
      tenantId,
      userId
    );
    return programs.map((p) => this.mapProgram(p, counts.get(p.id) ?? 0));
  }

  async getProgram(
    programId: string,
    tenantId: string,
    userId: string
  ): Promise<ProgramResult> {
    const ctx: TenantContext = { tenantId, userId, userRole: 'STUDENT' };

    const [program] = await withTenantContext(this.db, ctx, async (tx) =>
      tx
        .select()
        .from(schema.credentialPrograms)
        .where(
          and(
            eq(schema.credentialPrograms.id, programId),
            eq(schema.credentialPrograms.tenantId, tenantId)
          )
        )
        .limit(1)
    );

    if (!program) throw new NotFoundException(`Program ${programId} not found`);
    const counts = await this.getEnrollmentCounts(
      [programId],
      tenantId,
      userId
    );
    return this.mapProgram(program, counts.get(programId) ?? 0);
  }

  async createProgram(
    input: CreateProgramInput,
    tenantId: string,
    userId: string
  ): Promise<ProgramResult> {
    const ctx: TenantContext = { tenantId, userId, userRole: 'ORG_ADMIN' };

    const [program] = await withTenantContext(this.db, ctx, async (tx) =>
      tx
        .insert(schema.credentialPrograms)
        .values({
          tenantId,
          title: input.title,
          description: input.description,
          requiredCourseIds: input.requiredCourseIds,
          badgeEmoji: input.badgeEmoji ?? '\uD83C\uDF93',
          totalHours: input.totalHours ?? 0,
        })
        .returning()
    );

    this.logger.log(
      { programId: program!.id, tenantId },
      'ProgramService: program created'
    );
    return this.mapProgram(program!, 0);
  }

  async updateProgram(
    programId: string,
    input: UpdateProgramInput,
    tenantId: string,
    userId: string
  ): Promise<ProgramResult> {
    const ctx: TenantContext = { tenantId, userId, userRole: 'ORG_ADMIN' };

    const [updated] = await withTenantContext(this.db, ctx, async (tx) =>
      tx
        .update(schema.credentialPrograms)
        .set({ ...input, updatedAt: new Date() })
        .where(
          and(
            eq(schema.credentialPrograms.id, programId),
            eq(schema.credentialPrograms.tenantId, tenantId)
          )
        )
        .returning()
    );

    if (!updated) throw new NotFoundException(`Program ${programId} not found`);
    const counts = await this.getEnrollmentCounts(
      [programId],
      tenantId,
      userId
    );
    return this.mapProgram(updated, counts.get(programId) ?? 0);
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
        'ProgramService: enrollment already exists (idempotent)'
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
      'ProgramService: user enrolled in program'
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

  // ─── Private helpers ──────────────────────────────────────────────────────

  private async getEnrollmentCounts(
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

  private mapProgram(
    p: typeof schema.credentialPrograms.$inferSelect,
    enrollmentCount: number
  ): ProgramResult {
    return {
      id: p.id,
      title: p.title,
      description: p.description,
      badgeEmoji: p.badgeEmoji,
      requiredCourseIds: (p.requiredCourseIds as string[]) ?? [],
      totalHours: p.totalHours,
      published: p.published,
      enrollmentCount,
    };
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
