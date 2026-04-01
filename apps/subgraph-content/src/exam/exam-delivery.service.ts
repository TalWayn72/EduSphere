/**
 * ExamDeliveryService — Session lifecycle: start, answer, flag, submit, void.
 * Server-authoritative timer — client timer is UX only.
 */
import {
  Injectable,
  Logger,
  OnModuleDestroy,
  BadRequestException,
} from '@nestjs/common';
import {
  createDatabaseConnection,
  schema,
  eq,
  and,
  sql,
  closeAllPools,
  withTenantContext,
} from '@edusphere/db';
import type { TenantContext } from '@edusphere/db';
import type { ExamSession, ExamResult } from '@edusphere/db';
import { ExamGradingService } from './exam-grading.service';
import { ExamAssemblyService } from './exam-assembly.service';
import { ExamSessionHelpers } from './exam-session-helpers';

@Injectable()
export class ExamDeliveryService implements OnModuleDestroy {
  private readonly logger = new Logger(ExamDeliveryService.name);
  private readonly db = createDatabaseConnection();
  readonly helpers: ExamSessionHelpers;

  constructor(
    private readonly gradingService: ExamGradingService,
    private readonly assemblyService: ExamAssemblyService
  ) {
    this.helpers = new ExamSessionHelpers(this.db);
  }

  async onModuleDestroy(): Promise<void> {
    await closeAllPools();
    this.logger.log('ExamDeliveryService destroyed - connections closed');
  }

  async startSession(
    blueprintId: string,
    userId: string,
    tenantId: string
  ): Promise<ExamSession> {
    const ctx: TenantContext = { tenantId, userId, userRole: 'STUDENT' };
    const bp = await this.helpers.loadBlueprint(blueprintId, ctx);
    if (bp.status !== 'ACTIVE') {
      throw new BadRequestException('Blueprint is not active');
    }

    await this.helpers.checkRetakeEligibility(blueprintId, userId, ctx, bp);
    const assembly = await this.assemblyService.assembleExam(
      blueprintId,
      userId,
      tenantId
    );
    const attempts = await this.helpers.getAttemptCount(
      blueprintId,
      userId,
      ctx
    );

    const [session] = await withTenantContext(this.db, ctx, (tx) =>
      tx
        .insert(schema.examSessions)
        .values({
          tenantId,
          blueprintId,
          userId,
          status: 'IN_PROGRESS',
          attemptNumber: attempts + 1,
          startedAt: new Date(),
          timeRemainingSeconds: bp.timeLimitMinutes * 60,
          questionOrder: assembly.questionOrder,
          optionShuffleSeeds: assembly.optionShuffleSeeds,
          isAdaptive: bp.isAdaptive,
        })
        .returning()
    );

    this.logger.log(
      { sessionId: session!.id, blueprintId, userId, tenantId },
      'Exam session started'
    );
    return session!;
  }

  async submitAnswer(
    sessionId: string,
    itemId: string,
    answerData: unknown,
    userId: string,
    tenantId: string
  ): Promise<boolean> {
    const ctx: TenantContext = { tenantId, userId, userRole: 'STUDENT' };
    const session = await this.helpers.loadSession(sessionId, ctx);
    this.helpers.assertActive(session, userId);
    this.helpers.assertItemInOrder(session, itemId);

    const bp = await this.helpers.loadBlueprint(session.blueprintId, ctx);
    const remaining = this.helpers.computeRemainingFromBlueprint(
      session,
      bp.timeLimitMinutes
    );
    if (remaining <= 0) throw new BadRequestException('Session has expired');

    await withTenantContext(this.db, ctx, async (tx) => {
      await this.helpers.upsertResponse(tx, sessionId, itemId, {
        answerData,
        answeredAt: new Date(),
      });
      await tx
        .update(schema.examSessions)
        .set({ timeRemainingSeconds: remaining })
        .where(eq(schema.examSessions.id, sessionId));
    });
    return true;
  }

  async flagQuestion(
    sessionId: string,
    itemId: string,
    userId: string,
    tenantId: string
  ): Promise<boolean> {
    const ctx: TenantContext = { tenantId, userId, userRole: 'STUDENT' };
    const session = await this.helpers.loadSession(sessionId, ctx);
    this.helpers.assertActive(session, userId);
    await withTenantContext(this.db, ctx, (tx) =>
      this.helpers.toggleFlag(tx, sessionId, itemId)
    );
    return true;
  }

  async getSession(
    sessionId: string,
    userId: string,
    tenantId: string
  ): Promise<ExamSession> {
    const ctx: TenantContext = { tenantId, userId, userRole: 'STUDENT' };
    const session = await this.helpers.loadSession(sessionId, ctx);
    const bp = await this.helpers.loadBlueprint(session.blueprintId, ctx);
    const remaining = this.helpers.computeRemainingFromBlueprint(
      session,
      bp.timeLimitMinutes
    );
    return { ...session, timeRemainingSeconds: remaining };
  }

  async submitExam(
    sessionId: string,
    userId: string,
    tenantId: string
  ): Promise<ExamResult> {
    const ctx: TenantContext = { tenantId, userId, userRole: 'STUDENT' };
    const session = await this.helpers.loadSession(sessionId, ctx);
    this.helpers.assertActive(session, userId);

    await withTenantContext(this.db, ctx, (tx) =>
      tx
        .update(schema.examSessions)
        .set({ status: 'SUBMITTED', submittedAt: new Date() })
        .where(eq(schema.examSessions.id, sessionId))
    );

    const result = await this.gradingService.gradeExam(sessionId, tenantId);

    await withTenantContext(this.db, ctx, (tx) =>
      tx
        .update(schema.examSessions)
        .set({ status: 'GRADED' })
        .where(eq(schema.examSessions.id, sessionId))
    );

    this.logger.log({ sessionId, passed: result.passed }, 'Exam graded');
    return result;
  }

  async voidSession(
    sessionId: string,
    adminTenantId: string
  ): Promise<boolean> {
    const ctx: TenantContext = {
      tenantId: adminTenantId,
      userId: 'system',
      userRole: 'ORG_ADMIN',
    };
    await withTenantContext(this.db, ctx, (tx) =>
      tx
        .update(schema.examSessions)
        .set({ status: 'VOIDED' })
        .where(eq(schema.examSessions.id, sessionId))
    );
    this.logger.log({ sessionId }, 'Exam session voided');
    return true;
  }

  async recordBrowserEvent(
    sessionId: string,
    event: { type: string; timestamp: string; details?: unknown },
    userId: string,
    tenantId: string
  ): Promise<void> {
    const ctx: TenantContext = { tenantId, userId, userRole: 'STUDENT' };
    await withTenantContext(this.db, ctx, (tx) =>
      tx.execute(
        sql`UPDATE exam_sessions SET browser_events = browser_events || ${JSON.stringify(event)}::jsonb WHERE id = ${sessionId}`
      )
    );
  }

  async listUserSessions(
    blueprintId: string,
    userId: string,
    tenantId: string
  ) {
    const ctx: TenantContext = { tenantId, userId, userRole: 'STUDENT' };
    return withTenantContext(this.db, ctx, (tx) =>
      tx
        .select()
        .from(schema.examSessions)
        .where(
          and(
            eq(schema.examSessions.blueprintId, blueprintId),
            eq(schema.examSessions.userId, userId)
          )
        )
    );
  }
}
