/**
 * ProgramService — F-026 Stackable Credentials / Nanodegrees
 *
 * Responsibilities:
 *  1. Expose CRUD methods for resolvers
 *  2. Delegates enrollment/progress to ProgramEnrollmentService
 */
import {
  Injectable,
  Logger,
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

export type {
  ProgramProgress,
  ProgramResult,
  EnrollmentResult,
  CreateProgramInput,
  UpdateProgramInput,
} from './program.types.js';

import type {
  ProgramResult,
  CreateProgramInput,
  UpdateProgramInput,
} from './program.types.js';

import { ProgramEnrollmentService } from './program-enrollment.service.js';

// ─── Service ──────────────────────────────────────────────────────────────────

@Injectable()
export class ProgramService implements OnModuleDestroy {
  private readonly logger = new Logger(ProgramService.name);
  private readonly db = createDatabaseConnection();

  constructor(
    private readonly enrollmentService: ProgramEnrollmentService
  ) {}

  async onModuleDestroy(): Promise<void> {
    await closeAllPools();
  }

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

    const counts = await this.enrollmentService.getEnrollmentCounts(
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
    const counts = await this.enrollmentService.getEnrollmentCounts(
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
    const counts = await this.enrollmentService.getEnrollmentCounts(
      [programId],
      tenantId,
      userId
    );
    return this.mapProgram(updated, counts.get(programId) ?? 0);
  }

  // Delegation methods — forwarded to ProgramEnrollmentService
  async enrollInProgram(programId: string, userId: string, tenantId: string) {
    return this.enrollmentService.enrollInProgram(programId, userId, tenantId);
  }

  async getUserEnrollments(userId: string, tenantId: string) {
    return this.enrollmentService.getUserEnrollments(userId, tenantId);
  }

  async getProgramProgress(programId: string, userId: string, tenantId: string) {
    return this.enrollmentService.getProgramProgress(programId, userId, tenantId);
  }

  // ─── Private helpers ──────────────────────────────────────────────────────

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
}
