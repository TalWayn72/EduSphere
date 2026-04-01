/**
 * AtRiskService — Facade that delegates to AtRiskDetectionService
 * and AtRiskFlagService. Preserves the original public API.
 * F-003 Performance Risk Detection
 */
import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import type { TenantContext } from '@edusphere/db';
import type { AtRiskLearner } from './at-risk.types.js';
import { AtRiskDetectionService } from './at-risk-detection.service';
import { AtRiskFlagService } from './at-risk-flag.service';

@Injectable()
export class AtRiskService implements OnModuleDestroy {
  private readonly logger = new Logger(AtRiskService.name);

  constructor(
    private readonly detection: AtRiskDetectionService,
    private readonly flags: AtRiskFlagService
  ) {}

  async onModuleDestroy(): Promise<void> {
    await this.flags.onModuleDestroy();
  }

  async runNightlyDetection(): Promise<void> {
    return this.detection.runNightlyDetection();
  }

  async getAtRiskLearners(
    courseId: string,
    ctx: TenantContext
  ): Promise<AtRiskLearner[]> {
    return this.flags.getAtRiskLearners(courseId, ctx);
  }

  async dismissFlag(flagId: string, ctx: TenantContext): Promise<boolean> {
    return this.flags.dismissFlag(flagId, ctx);
  }
}
