/**
 * PsychometricsModule — NestJS module for psychometric analysis services
 *
 * Registers CTT, IRT, reliability, and item health monitor services
 * along with the thin GraphQL resolver.
 */
import { Module } from '@nestjs/common';
import { ClassicalAnalysisService } from './classical-analysis.service.js';
import { IRTCalibrationService } from './irt-calibration.service.js';
import { TestReliabilityService } from './test-reliability.service.js';
import { ItemHealthMonitorService } from './item-health-monitor.service.js';
import { PsychometricsResolver } from './psychometrics.resolver.js';

@Module({
  providers: [
    ClassicalAnalysisService,
    IRTCalibrationService,
    TestReliabilityService,
    ItemHealthMonitorService,
    PsychometricsResolver,
  ],
  exports: [
    ClassicalAnalysisService,
    IRTCalibrationService,
    TestReliabilityService,
    ItemHealthMonitorService,
  ],
})
export class PsychometricsModule {}
