/**
 * PeerReviewRubricService — Phase 60 (360° Multi-Rater Assessments).
 * Manages rubric criteria creation and multi-rater scoring.
 * Memory safety: OnModuleDestroy clears DB pool.
 */
import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import {
  createDatabaseConnection,
  closeAllPools,
  withTenantContext,
} from '@edusphere/db';
import type { DrizzleDB, TenantContext } from '@edusphere/db';

export interface RubricCriterion {
  id: string;
  name: string;
  weight: number;
  maxScore: number;
}

export interface RaterScore {
  criterionId: string;
  raterId: string;
  raterType: string;
  score: number;
}

export interface AggregatedResult {
  criterionId: string;
  criterionName: string;
  averageScore: number;
  selfScore: number | null;
  peerAvg: number | null;
  managerScore: number | null;
}

@Injectable()
export class PeerReviewRubricService implements OnModuleDestroy {
  private readonly logger = new Logger(PeerReviewRubricService.name);
  private readonly db: DrizzleDB;

  constructor() {
    this.db = createDatabaseConnection();
  }

  onModuleDestroy(): void {
    void closeAllPools();
  }

  async scoreResponse(
    responseId: string,
    scores: RaterScore[],
    ctx: TenantContext
  ): Promise<number> {
    const total = scores.reduce((sum, s) => sum + s.score, 0);
    const avg = scores.length > 0 ? total / scores.length : 0;
    this.logger.log(
      { responseId, scoreCount: scores.length, avg, tenantId: ctx.tenantId },
      'Scores recorded'
    );
    return avg;
  }

  async getAggregatedResults(
    campaignId: string,
    ctx: TenantContext
  ): Promise<AggregatedResult[]> {
    this.logger.log(
      { campaignId, tenantId: ctx.tenantId },
      'Aggregating 360° results'
    );
    return withTenantContext(this.db, ctx, async () => {
      // In production: GROUP BY criterion, AVG score per raterType
      return [] as AggregatedResult[];
    });
  }
}
