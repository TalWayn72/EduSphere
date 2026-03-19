/**
 * Psychometric Analysis Engine — barrel export
 */
export { PsychometricsModule } from './psychometrics.module.js';
export { ClassicalAnalysisService } from './classical-analysis.service.js';
export { IRTCalibrationService } from './irt-calibration.service.js';
export { TestReliabilityService } from './test-reliability.service.js';
export { ItemHealthMonitorService } from './item-health-monitor.service.js';
export { PsychometricsResolver } from './psychometrics.resolver.js';
export * from './ctt-math.js';
export * from './irt-math.js';
export * from './reliability-math.js';
export type {
  ClassicalItemStats,
  DistractorStat,
  DistractorReport,
  IRTParameters,
  AbilityEstimate,
  ItemResponse,
  ExamReliabilityReport,
  HealthCheckReport,
} from './psychometrics.types.js';
