/**
 * ProgramService — F-026 Stackable Credentials / Nanodegrees
 *
 * Responsibilities:
 *  1. Subscribe to EDUSPHERE.course.completed NATS events
 *  2. Check whether all required courses for enrolled programs are done
 *  3. If yes → mark program as completed + trigger nanodegree certificate
 *  4. Expose CRUD + progress query methods for resolvers
 */
import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
  OnModuleInit,
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
import { connect, StringCodec, type NatsConnection, type Subscription } from 'nats';
import { buildNatsOptions, isCourseCompletedEvent } from '@edusphere/nats-client';
import type { CourseCompletedPayload } from '@edusphere/nats-client';
import { CertificateService } from '../certificate/certificate.service.js';

// ─── Result types ─────────────────────────────────────────────────────────────

export interface ProgramProgress {
  totalCourses: number;
  completedCourses: number;
  completedCourseIds: string[];
  percentComplete: number;
}

export interface ProgramResult {
  id: string;
  title: string;
  description: string;
  badgeEmoji: string;
  requiredCourseIds: string[];
  totalHours: number;
  published: boolean;
  enrollmentCount: number;
}

export interface EnrollmentResult {
  id: string;
  programId: string;
  userId: string;
  enrolledAt: string;
  completedAt: string | null;
  certificateId: string | null;
}

export interface CreateProgramInput {
  title: string;
  description: string;
  requiredCourseIds: string[];
  badgeEmoji?: string;
  totalHours?: number;
}

export interface UpdateProgramInput {
  title?: string;
  description?: string;
  published?: boolean;
}

const COURSE_COMPLETED_SUBJECT = 'EDUSPHERE.course.completed';

// ─── Service ──────────────────────────────────────────────────────────────────

@Injectable()
export class ProgramService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ProgramService.name);
  private readonly db = createDatabaseConnection();
  private readonly sc = StringCodec();
  private nc: NatsConnection | null = null;
  private sub: Subscription | null = null;

  constructor(private readonly certificateService: CertificateService) {}

  async onModuleInit(): Promise<void> {
    await this.connectAndSubscribe();
  }

  async onModuleDestroy(): Promise<void> {
    this.sub?.unsubscribe();
    this.sub = null;
    if (this.nc) {
      await this.nc.drain().catch(() => undefined);
      this.nc = null;
    }
    await closeAllPools();
    this.logger.log('ProgramService destroyed — connections closed');
  }

  // ─── NATS subscription ────────────────────────────────────────────────────

  private async connectAndSubscribe(): Promise<void> {
    try {
      this.nc = await connect(buildNatsOptions());
      this.sub = this.nc.subscribe(COURSE_COMPLETED_SUBJECT);
      this.logger.log(`ProgramService: subscribed to ${COURSE_COMPLETED_SUBJECT}`);
      void this.processMessages();
    } catch (err) {
      this.logger.error(`ProgramService: NATS connect failed: ${String(err)}`);
    }
  }

  private async processMessages(): Promise<void> {
    if (!this.sub) return;
    for await (const msg of this.sub) {
      try {
        const raw = JSON.parse(this.sc.decode(msg.data)) as unknown;
        if (isCourseCompletedEvent(raw)) {
          await this.handleCourseCompleted(raw);
        }
      } catch (err) {
        this.logger.warn({ err }, 'ProgramService: failed to process course.completed message');
      }
    }
  }

  private async handleCourseCompleted(payload: CourseCompletedPayload): Promise<void> {
    const { userId, tenantId } = payload;
    const ctx: TenantContext = { tenantId, userId, userRole: 'STUDENT' };

    const enrollments = await withTenantContext(this.db, ctx, async (tx) =>
      tx.select()
        .from(schema.programEnrollments)
        .where(and(
          eq(schema.programEnrollments.userId, userId),
          eq(schema.programEnrollments.tenantId, tenantId),
        )),
    );

    const incomplete = enrollments.filter((e) => !e.completedAt);
    await Promise.all(
      incomplete.map((e) => this.checkProgramCompletion(userId, e.programId, tenantId)),
    );
  }

  // ─── Completion check ─────────────────────────────────────────────────────

  private async checkProgramCompletion(
    userId: string,
    programId: string,
    tenantId: string,
  ): Promise<void> {
    const ctx: TenantContext = { tenantId, userId, userRole: 'STUDENT' };

    const [program] = await withTenantContext(this.db, ctx, async (tx) =>
      tx.select()
        .from(schema.credentialPrograms)
        .where(eq(schema.credentialPrograms.id, programId))
        .limit(1),
    );

    if (!program) return;

    const progress = await this.getProgramProgress(programId, userId, tenantId);
    if (progress.percentComplete < 100) return;

    const [enrollment] = await withTenantContext(this.db, ctx, async (tx) =>
      tx.update(schema.programEnrollments)
        .set({ completedAt: new Date() })
        .where(and(
          eq(schema.programEnrollments.userId, userId),
          eq(schema.programEnrollments.programId, programId),
        ))
        .returning(),
    );

    if (!enrollment) return;

    try {
      const cert = await this.certificateService.generateCertificate({
        userId,
        tenantId,
        courseId: programId,
        learnerName: userId,
        courseName: `${program.badgeEmoji} ${program.title} Nanodegree`,
      });

      await withTenantContext(this.db, ctx, async (tx) =>
        tx.update(schema.programEnrollments)
          .set({ certificateId: cert.id })
          .where(eq(schema.programEnrollments.id, enrollment.id)),
      );

      this.logger.log(
        { userId, programId, tenantId, certId: cert.id },
        'ProgramService: nanodegree certificate issued',
      );
    } catch (err) {
      this.logger.error({ err, userId, programId }, 'ProgramService: cert generation failed');
    }
  }

  // ─── Public API ───────────────────────────────────────────────────────────

  async listPrograms(tenantId: string, userId: string): Promise<ProgramResult[]> {
    const ctx: TenantContext = { tenantId, userId, userRole: 'STUDENT' };

    const programs = await withTenantContext(this.db, ctx, async (tx) =>
      tx.select().from(schema.credentialPrograms)
        .where(and(
          eq(schema.credentialPrograms.tenantId, tenantId),
          eq(schema.credentialPrograms.published, true),
        )),
    );

    const counts = await this.getEnrollmentCounts(programs.map((p) => p.id), tenantId, userId);
    return programs.map((p) => this.mapProgram(p, counts.get(p.id) ?? 0));
  }

  async getProgram(programId: string, tenantId: string, userId: string): Promise<ProgramResult> {
    const ctx: TenantContext = { tenantId, userId, userRole: 'STUDENT' };

    const [program] = await withTenantContext(this.db, ctx, async (tx) =>
      tx.select()
        .from(schema.credentialPrograms)
        .where(and(
          eq(schema.credentialPrograms.id, programId),
          eq(schema.credentialPrograms.tenantId, tenantId),
        ))
        .limit(1),
    );

    if (!program) throw new NotFoundException(`Program ${programId} not found`);
    const counts = await this.getEnrollmentCounts([programId], tenantId, userId);
    return this.mapProgram(program, counts.get(programId) ?? 0);
  }

  async createProgram(
    input: CreateProgramInput,
    tenantId: string,
    userId: string,
  ): Promise<ProgramResult> {
    const ctx: TenantContext = { tenantId, userId, userRole: 'ORG_ADMIN' };

    const [program] = await withTenantContext(this.db, ctx, async (tx) =>
      tx.insert(schema.credentialPrograms)
        .values({
          tenantId,
          title: input.title,
          description: input.description,
          requiredCourseIds: input.requiredCourseIds,
          badgeEmoji: input.badgeEmoji ?? '🎓',
          totalHours: input.totalHours ?? 0,
        })
        .returning(),
    );

    this.logger.log({ programId: program!.id, tenantId }, 'ProgramService: program created');
    return this.mapProgram(program!, 0);
  }

  async updateProgram(
    programId: string,
    input: UpdateProgramInput,
    tenantId: string,
    userId: string,
  ): Promise<ProgramResult> {
    const ctx: TenantContext = { tenantId, userId, userRole: 'ORG_ADMIN' };

    const [updated] = await withTenantContext(this.db, ctx, async (tx) =>
      tx.update(schema.credentialPrograms)
        .set({ ...input, updatedAt: new Date() })
        .where(and(
          eq(schema.credentialPrograms.id, programId),
          eq(schema.credentialPrograms.tenantId, tenantId),
        ))
        .returning(),
    );

    if (!updated) throw new NotFoundException(`Program ${programId} not found`);
    const counts = await this.getEnrollmentCounts([programId], tenantId, userId);
    return this.mapProgram(updated, counts.get(programId) ?? 0);
  }

  async enrollInProgram(
    programId: string,
    userId: string,
    tenantId: string,
  ): Promise<EnrollmentResult> {
    const ctx: TenantContext = { tenantId, userId, userRole: 'STUDENT' };

    const existing = await withTenantContext(this.db, ctx, async (tx) =>
      tx.select()
        .from(schema.programEnrollments)
        .where(and(
          eq(schema.programEnrollments.userId, userId),
          eq(schema.programEnrollments.programId, programId),
        ))
        .limit(1),
    );

    if (existing.length > 0) {
      const record = existing[0]!;
      this.logger.log({ userId, programId }, 'ProgramService: enrollment already exists (idempotent)');
      return this.mapEnrollment(record);
    }

    const [program] = await withTenantContext(this.db, ctx, async (tx) =>
      tx.select()
        .from(schema.credentialPrograms)
        .where(eq(schema.credentialPrograms.id, programId))
        .limit(1),
    );

    if (!program) throw new NotFoundException(`Program ${programId} not found`);
    if (!program.published) throw new ConflictException('Program is not yet published');

    const [enrollment] = await withTenantContext(this.db, ctx, async (tx) =>
      tx.insert(schema.programEnrollments)
        .values({ userId, programId, tenantId })
        .returning(),
    );

    this.logger.log({ userId, programId, tenantId }, 'ProgramService: user enrolled in program');
    return this.mapEnrollment(enrollment!);
  }

  async getUserEnrollments(userId: string, tenantId: string): Promise<EnrollmentResult[]> {
    const ctx: TenantContext = { tenantId, userId, userRole: 'STUDENT' };

    const rows = await withTenantContext(this.db, ctx, async (tx) =>
      tx.select()
        .from(schema.programEnrollments)
        .where(and(
          eq(schema.programEnrollments.userId, userId),
          eq(schema.programEnrollments.tenantId, tenantId),
        )),
    );

    return rows.map((r) => this.mapEnrollment(r));
  }

  async getProgramProgress(
    programId: string,
    userId: string,
    tenantId: string,
  ): Promise<ProgramProgress> {
    const ctx: TenantContext = { tenantId, userId, userRole: 'STUDENT' };

    const [program] = await withTenantContext(this.db, ctx, async (tx) =>
      tx.select()
        .from(schema.credentialPrograms)
        .where(eq(schema.credentialPrograms.id, programId))
        .limit(1),
    );

    if (!program) throw new NotFoundException(`Program ${programId} not found`);

    const requiredIds = program.requiredCourseIds as string[];
    if (requiredIds.length === 0) {
      return { totalCourses: 0, completedCourses: 0, completedCourseIds: [], percentComplete: 100 };
    }

    const completions = await withTenantContext(this.db, ctx, async (tx) =>
      tx.select({ courseId: schema.userCourses.courseId })
        .from(schema.userCourses)
        .where(eq(schema.userCourses.userId, userId)),
    );

    const doneSet = new Set(completions.filter((c) => c.courseId !== null).map((c) => c.courseId!));
    const completedCourseIds = requiredIds.filter((id) => doneSet.has(id));
    const completedCourses = completedCourseIds.length;
    const totalCourses = requiredIds.length;
    const percentComplete = Math.round((completedCourses / totalCourses) * 100);

    return { totalCourses, completedCourses, completedCourseIds, percentComplete };
  }

  // ─── Private helpers ──────────────────────────────────────────────────────

  private async getEnrollmentCounts(
    programIds: string[],
    tenantId: string,
    userId: string,
  ): Promise<Map<string, number>> {
    if (programIds.length === 0) return new Map();
    const ctx: TenantContext = { tenantId, userId, userRole: 'ORG_ADMIN' };

    const rows = await withTenantContext(this.db, ctx, async (tx) =>
      tx.select({
        programId: schema.programEnrollments.programId,
      })
        .from(schema.programEnrollments)
        .where(eq(schema.programEnrollments.tenantId, tenantId)),
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
    enrollmentCount: number,
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

  private mapEnrollment(e: typeof schema.programEnrollments.$inferSelect): EnrollmentResult {
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
