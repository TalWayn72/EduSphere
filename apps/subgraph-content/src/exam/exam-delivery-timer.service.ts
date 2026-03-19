/**
 * ExamDeliveryTimerService — Cron job to auto-expire timed-out sessions.
 * Runs every minute, finds IN_PROGRESS sessions past their time limit.
 */
import {
  Injectable,
  Logger,
  OnModuleDestroy,
} from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import {
  createDatabaseConnection,
  schema,
  eq,
  and,
  sql,
  closeAllPools,
  withBypassRLS,
} from '@edusphere/db';
import { ExamGradingService } from './exam-grading.service';

@Injectable()
export class ExamDeliveryTimerService implements OnModuleDestroy {
  private readonly logger = new Logger(ExamDeliveryTimerService.name);
  private readonly db = createDatabaseConnection();

  constructor(private readonly gradingService: ExamGradingService) {}

  async onModuleDestroy(): Promise<void> {
    await closeAllPools();
    this.logger.log('ExamDeliveryTimerService destroyed');
  }

  @Cron('* * * * *')
  async checkAndExpireTimedOutSessions(): Promise<void> {
    try {
      const expired = await withBypassRLS(this.db, (tx) =>
        tx.select({
          id: schema.examSessions.id,
          tenantId: schema.examSessions.tenantId,
        })
        .from(schema.examSessions)
        .where(
          and(
            eq(schema.examSessions.status, 'IN_PROGRESS'),
            sql`${schema.examSessions.startedAt} + (${schema.examSessions.timeRemainingSeconds} || ' seconds')::interval < NOW()`,
          ),
        ),
      );

      if (expired.length === 0) return;

      this.logger.log(
        { count: expired.length },
        'Auto-expiring timed-out exam sessions',
      );

      for (const session of expired) {
        try {
          await withBypassRLS(this.db, (tx) =>
            tx.update(schema.examSessions)
              .set({ status: 'TIMED_OUT', submittedAt: new Date() })
              .where(eq(schema.examSessions.id, session.id)),
          );

          await this.gradingService.gradeExam(session.id, session.tenantId);

          await withBypassRLS(this.db, (tx) =>
            tx.update(schema.examSessions)
              .set({ status: 'GRADED' })
              .where(eq(schema.examSessions.id, session.id)),
          );

          this.logger.log(
            { sessionId: session.id },
            'Timed-out session auto-graded',
          );
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          this.logger.error(
            { sessionId: session.id, error: msg },
            'Failed to auto-grade expired session',
          );
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error({ error: msg }, 'Expired session check failed');
    }
  }
}
