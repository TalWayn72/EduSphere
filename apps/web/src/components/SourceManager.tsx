/**
 * Re-export shim — the SourceManager component has been split into
 * smaller files under ./source-manager/. This file preserves backward
 * compatibility for existing imports.
 */
export {
  SourceManager,
  getSourceErrorKey,
  getFriendlySourceErrorKey,
  parseSourceError,
} from './source-manager';
export type {
  KnowledgeSource,
  SourceType,
  SourceStatus,
} from './source-manager';
