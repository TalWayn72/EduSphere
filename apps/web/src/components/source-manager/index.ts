/**
 * Barrel re-exports for the source-manager module.
 * Preserves the same public API as the original SourceManager.tsx.
 */

export { SourceManager } from './SourceManager';
export {
  getSourceErrorKey,
  getFriendlySourceErrorKey,
  parseSourceError,
  hasValidAuth,
} from './utils';
export type {
  KnowledgeSource,
  SourceType,
  SourceStatus,
  AddTab,
} from './types';
