/**
 * ExamGradingService — Score calculation engine.
 * Per-item grading, raw/scaled/domain/bloom scores, IRT theta, certificate event.
 */
import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { createDatabaseConnection, closeAllPools } from '@edusphere/db';
import type { TenantContext } from '@edusphere/db';
import type { ExamResult, ExamItem, ExamResponse } from '@edusphere/db';
import { connect, StringCodec, type NatsConnection } from 'nats';
import { buildNatsOptions } from '@edusphere/nats-client';
import { gradeExamItem } from './exam-item-grader';
import { ExamIrtCalculator } from './exam-irt-calculator';
import { ExamGradingPersistence } from './exam-grading-persistence';

const CERT_SUBJECT = 'EDUSPHERE.exam.passed';

interface GradedItem {
  itemId: string;
  correct: boolean;
  timeSpentMs: number | null;
}

@Injectable()
export class ExamGradingService implements OnModuleDestroy {
  private readonly logger = new Logger(ExamGradingService.name);
  private readonly db = createDatabaseConnection();
  private readonly sc = StringCodec();
  private readonly persistence: ExamGradingPersistence;
  private nc: NatsConnection | null = null;
  private connectingPromise: Promise<NatsConnection> | null = null;

  constructor() {
    this.persistence = new ExamGradingPersistence(this.db);
  }

  async onModuleDestroy(): Promise<void> {
    if (this.nc) await this.nc.close().catch(() => undefined);
    await closeAllPools();
    this.logger.log('ExamGradingService destroyed');
  }

  async gradeExam(sessionId: string, tenantId: string): Promise<ExamResult> {
    const ctx: TenantContext = {
      tenantId,
      userId: 'system',
      userRole: 'INSTRUCTOR',
    };

    const session = await this.persistence.loadSession(sessionId, ctx);
    const responses = await this.persistence.loadResponses(sessionId, ctx);
    const questionOrder = (session.questionOrder as string[]) ?? [];
    const items = await this.persistence.loadItems(questionOrder, ctx);
    const itemMap = new Map(items.map((i) => [i.id, i]));

    const graded = this.gradeAllResponses(responses, itemMap);
    const totalItems = questionOrder.length || 1;
    const correctCount = graded.filter((g) => g.correct).length;
    const rawScore = correctCount / totalItems;
    const scaledScore = Math.round(200 + 800 * rawScore);

    const bp = await this.persistence.loadBlueprint(session.blueprintId, ctx);
    const passed = scaledScore >= bp.passingScore;

    const domainScores = this.calcDomainScores(graded, itemMap);
    const bloomScores = this.calcBloomScores(graded, itemMap);
    const irt = ExamIrtCalculator.calculateTheta(graded, itemMap);
    const ci = irt
      ? ExamIrtCalculator.confidenceInterval(scaledScore, irt.sem)
      : null;

    const result = await this.persistence.insertResult(ctx, {
      tenantId,
      sessionId,
      blueprintId: session.blueprintId,
      userId: session.userId,
      rawScore,
      scaledScore,
      passed,
      thetaEstimate: irt?.theta ?? null,
      sem: irt?.sem ?? null,
      confidenceInterval: ci,
      domainScores,
      bloomScores,
      itemAnalysis: graded.map((g) => ({
        itemId: g.itemId,
        correct: g.correct,
        timeSpentMs: g.timeSpentMs,
      })),
      gradedAt: new Date(),
    });

    await this.persistence.writeResponseLog(
      graded,
      tenantId,
      session.userId,
      ctx
    );
    await this.persistence.updateExposureCounts(questionOrder, ctx);
    await this.persistence.markResponseCorrectness(sessionId, graded, ctx);

    if (passed) await this.publishCertificateEvent(result, tenantId);

    this.logger.log(
      {
        sessionId,
        rawScore,
        scaledScore,
        passed,
        theta: irt?.theta,
      },
      'Exam graded'
    );

    return result;
  }

  private gradeAllResponses(
    responses: ExamResponse[],
    itemMap: Map<string, ExamItem>
  ): GradedItem[] {
    return responses.map((r) => {
      const item = itemMap.get(r.itemId);
      if (!item)
        return { itemId: r.itemId, correct: false, timeSpentMs: r.timeSpentMs };
      const correct = gradeExamItem(
        item.questionData as Record<string, unknown>,
        r.answerData
      );
      return { itemId: r.itemId, correct, timeSpentMs: r.timeSpentMs };
    });
  }

  private calcDomainScores(
    graded: GradedItem[],
    itemMap: Map<string, ExamItem>
  ) {
    const map = new Map<string, { correct: number; total: number }>();
    for (const g of graded) {
      const domain = itemMap.get(g.itemId)?.domainTag ?? 'unknown';
      const e = map.get(domain) ?? { correct: 0, total: 0 };
      e.total++;
      if (g.correct) e.correct++;
      map.set(domain, e);
    }
    return [...map.entries()].map(([domain, s]) => ({
      domain,
      correct: s.correct,
      total: s.total,
      scaledScore: Math.round(200 + 800 * (s.correct / (s.total || 1))),
    }));
  }

  private calcBloomScores(
    graded: GradedItem[],
    itemMap: Map<string, ExamItem>
  ) {
    const map = new Map<string, { correct: number; total: number }>();
    for (const g of graded) {
      const level = itemMap.get(g.itemId)?.bloomLevel ?? 'REMEMBER';
      const e = map.get(level) ?? { correct: 0, total: 0 };
      e.total++;
      if (g.correct) e.correct++;
      map.set(level, e);
    }
    return [...map.entries()].map(([level, s]) => ({
      level,
      correct: s.correct,
      total: s.total,
    }));
  }

  private async ensureNatsConnection(): Promise<NatsConnection> {
    if (this.nc) return this.nc;
    if (!this.connectingPromise) {
      this.connectingPromise = connect(buildNatsOptions())
        .then((nc) => {
          this.nc = nc;
          this.connectingPromise = null;
          return nc;
        })
        .catch((err) => {
          this.connectingPromise = null;
          throw err;
        });
    }
    return this.connectingPromise;
  }

  private async publishCertificateEvent(
    result: ExamResult,
    tenantId: string
  ): Promise<void> {
    try {
      const nc = await this.ensureNatsConnection();
      nc.publish(
        CERT_SUBJECT,
        this.sc.encode(
          JSON.stringify({
            resultId: result.id,
            sessionId: result.sessionId,
            userId: result.userId,
            blueprintId: result.blueprintId,
            scaledScore: result.scaledScore,
            tenantId,
            timestamp: new Date().toISOString(),
          })
        )
      );
      this.logger.log(
        { resultId: result.id },
        'Certificate issuance event published'
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error({ error: msg }, 'Failed to publish certificate event');
    }
  }
}
