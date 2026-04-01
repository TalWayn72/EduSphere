/**
 * ExamSecurityService — Browser lockdown event recording + violation evaluation.
 *
 * Tracks tab switches, fullscreen exits, clipboard attempts, DevTools detection.
 * Risk-weighted scoring determines whether to void an exam session.
 */
import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import {
  createDatabaseConnection,
  schema,
  eq,
  closeAllPools,
  withTenantContext,
  sql,
} from '@edusphere/db';
import type { TenantContext } from '@edusphere/db';
import { ExamSessionHelpers } from './exam-session-helpers.js';

interface BrowserEvent {
  type: string;
  timestamp: string;
  details?: unknown;
}

interface ViolationEvaluation {
  riskScore: number;
  shouldVoid: boolean;
  violationCount: number;
}

const RISK_WEIGHTS: Record<string, number> = {
  TAB_SWITCH: 0.3,
  FULLSCREEN_EXIT: 0.25,
  CLIPBOARD_ATTEMPT: 0.2,
  DEVTOOLS_DETECTED: 0.25,
  RIGHT_CLICK: 0.1,
  KEYBOARD_SHORTCUT: 0.15,
  SCREENSHOT_ATTEMPT: 0.2,
};

const DEFAULT_RISK_THRESHOLD = 3.0;

@Injectable()
export class ExamSecurityService implements OnModuleDestroy {
  private readonly logger = new Logger(ExamSecurityService.name);
  private readonly db = createDatabaseConnection();
  private readonly helpers: ExamSessionHelpers;

  constructor() {
    this.helpers = new ExamSessionHelpers(this.db);
  }

  async onModuleDestroy(): Promise<void> {
    await closeAllPools();
    this.logger.log('ExamSecurityService destroyed — connections closed');
  }

  async recordBrowserEvent(
    sessionId: string,
    event: BrowserEvent,
    tenantId: string
  ): Promise<void> {
    const ctx: TenantContext = {
      tenantId,
      userId: 'system',
      userRole: 'INSTRUCTOR',
    };

    await withTenantContext(this.db, ctx, (tx) =>
      tx.execute(
        sql`UPDATE exam_sessions
            SET browser_events = browser_events || ${JSON.stringify(event)}::jsonb
            WHERE id = ${sessionId}`
      )
    );

    this.logger.warn(
      { sessionId, eventType: event.type, tenantId },
      '[ExamSecurity] Browser violation event recorded'
    );
  }

  async evaluateViolations(
    sessionId: string,
    tenantId: string
  ): Promise<ViolationEvaluation> {
    const ctx: TenantContext = {
      tenantId,
      userId: 'system',
      userRole: 'INSTRUCTOR',
    };
    const session = await this.helpers.loadSession(sessionId, ctx);
    const events = (session.browserEvents ?? []) as BrowserEvent[];

    let riskScore = 0;
    for (const evt of events) {
      riskScore += RISK_WEIGHTS[evt.type] ?? 0.1;
    }

    const violationCount = events.length;
    const shouldVoid = riskScore > DEFAULT_RISK_THRESHOLD;

    return { riskScore, shouldVoid, violationCount };
  }

  async voidSessionOnViolation(
    sessionId: string,
    tenantId: string
  ): Promise<boolean> {
    const ctx: TenantContext = {
      tenantId,
      userId: 'system',
      userRole: 'ORG_ADMIN',
    };

    await withTenantContext(this.db, ctx, (tx) =>
      tx
        .update(schema.examSessions)
        .set({ status: 'VOIDED' })
        .where(eq(schema.examSessions.id, sessionId))
    );

    this.logger.error(
      { sessionId, tenantId },
      '[ExamSecurity] Session voided due to integrity violations'
    );
    return true;
  }
}
