/**
 * at-risk.module.ts - NestJS module for F-003 At-Risk Detection.
 */
import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { AtRiskService } from './at-risk.service.js';
import { AtRiskResolver } from './at-risk.resolver.js';

@Module({
  imports: [ScheduleModule.forRoot()],
  providers: [AtRiskService, AtRiskResolver],
  exports: [AtRiskService],
})
export class AtRiskModule {}
