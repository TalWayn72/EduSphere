/**
 * program-events.handler.ts — NATS event handler for program completion logic.
 *
 * Subscribes to EDUSPHERE.course.completed and checks whether all required
 * courses for enrolled programs are done. If yes → marks program completed
 * and triggers nanodegree certificate via CertificateService.
 */
import {
  Injectable,
  Logger,
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
import {
  connect,
  StringCodec,
  type NatsConnection,
  type Subscription,
} from 'nats';
import {
  buildNatsOptions,
  isCourseCompletedEvent,
} from '@edusphere/nats-client';
import type { CourseCompletedPayload } from '@edusphere/nats-client';
import { CertificateService } from '../certificate/certificate.service.js';

const COURSE_COMPLETED_SUBJECT = 'EDUSPHERE.course.completed';

@Injectable()
export class ProgramEventsHandler implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ProgramEventsHandler.name);
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
    this.logger.log('ProgramEventsHandler destroyed — connections closed');
  }

  private async connectAndSubscribe(): Promise<void> {
    try {
      this.nc = await connect(buildNatsOptions());
      this.sub = this.nc.subscribe(COURSE_COMPLETED_SUBJECT);
      this.logger.log(
        `ProgramEventsHandler: subscribed to ${COURSE_COMPLETED_SUBJECT}`
      );
      void this.processMessages();
    } catch (err) {
      this.logger.error(
        `ProgramEventsHandler: NATS connect failed: ${String(err)}`
      );
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
        this.logger.warn(
          { err },
          'ProgramEventsHandler: failed to process course.completed message'
        );
      }
    }
  }

  private async handleCourseCompleted(
    payload: CourseCompletedPayload
  ): Promise<void> {
    const { userId, tenantId } = payload;
    const ctx: TenantContext = { tenantId, userId, userRole: 'STUDENT' };

    const enrollments = await withTenantContext(this.db, ctx, async (tx) =>
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

    const incomplete = enrollments.filter((e) => !e.completedAt);
    await Promise.all(
      incomplete.map((e) =>
        this.checkProgramCompletion(userId, e.programId, tenantId)
      )
    );
  }

  private async checkProgramCompletion(
    userId: string,
    programId: string,
    tenantId: string
  ): Promise<void> {
    const ctx: TenantContext = { tenantId, userId, userRole: 'STUDENT' };

    const [program] = await withTenantContext(this.db, ctx, async (tx) =>
      tx
        .select()
        .from(schema.credentialPrograms)
        .where(eq(schema.credentialPrograms.id, programId))
        .limit(1)
    );

    if (!program) return;

    const requiredIds = program.requiredCourseIds as string[];
    if (requiredIds.length === 0) return;

    const completions = await withTenantContext(this.db, ctx, async (tx) =>
      tx
        .select({ courseId: schema.userCourses.courseId })
        .from(schema.userCourses)
        .where(eq(schema.userCourses.userId, userId))
    );

    const doneSet = new Set(
      completions.filter((c) => c.courseId !== null).map((c) => c.courseId!)
    );
    const completedCount = requiredIds.filter((id) => doneSet.has(id)).length;
    if (completedCount < requiredIds.length) return;

    const [enrollment] = await withTenantContext(this.db, ctx, async (tx) =>
      tx
        .update(schema.programEnrollments)
        .set({ completedAt: new Date() })
        .where(
          and(
            eq(schema.programEnrollments.userId, userId),
            eq(schema.programEnrollments.programId, programId)
          )
        )
        .returning()
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
        tx
          .update(schema.programEnrollments)
          .set({ certificateId: cert.id })
          .where(eq(schema.programEnrollments.id, enrollment.id))
      );

      this.logger.log(
        { userId, programId, tenantId, certId: cert.id },
        'ProgramEventsHandler: nanodegree certificate issued'
      );
    } catch (err) {
      this.logger.error(
        { err, userId, programId },
        'ProgramEventsHandler: cert generation failed'
      );
    }
  }
}
