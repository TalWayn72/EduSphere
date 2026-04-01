/**
 * at-risk.module.ts - NestJS module for F-003 At-Risk Detection.
 */
import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { AtRiskFlagService } from './at-risk-flag.service.js';
import { AtRiskDetectionService } from './at-risk-detection.service.js';
import { AtRiskService } from './at-risk.service.js';
import { AtRiskResolver } from './at-risk.resolver.js';

@Module({
  imports: [ScheduleModule.forRoot()],
  providers: [
    AtRiskFlagService,
    AtRiskDetectionService,
    AtRiskService,
    AtRiskResolver,
  ],
  exports: [AtRiskService],
})
export class AtRiskModule {}
