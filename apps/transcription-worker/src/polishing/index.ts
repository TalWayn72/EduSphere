export { PolishingOrchestratorService } from './polishing.orchestrator';
export { PolishingModule } from './polishing.module';
export { POLISHING_EVENTS } from './polishing.events';
export type { TenantCtx, SegmentRow } from './polishing.pipeline';
export {
  buildPolishingModel,
  loadSegments,
  loadGlossary,
  loadInstructorId,
  runWithProgress,
  publishCompletion,
  AUTO_PUBLISH_THRESHOLD,
} from './polishing.pipeline';
