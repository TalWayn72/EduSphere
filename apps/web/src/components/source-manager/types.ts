/**
 * Types and constants for the SourceManager component family.
 */

export type SourceStatus = 'PENDING' | 'PROCESSING' | 'READY' | 'FAILED';
export type SourceType =
  | 'FILE_DOCX'
  | 'FILE_PDF'
  | 'FILE_TXT'
  | 'URL'
  | 'YOUTUBE'
  | 'TEXT';

export interface KnowledgeSource {
  id: string;
  title: string;
  sourceType: SourceType;
  origin?: string;
  preview?: string;
  rawContent?: string;
  status: SourceStatus;
  chunkCount: number;
  errorMessage?: string;
  createdAt: string;
}

export type AddTab = 'url' | 'text' | 'file' | 'youtube';

export const TAB_KEYS: AddTab[] = ['url', 'text', 'youtube', 'file'];

export const TAB_LABEL_KEYS: Record<AddTab, string> = {
  url: 'sources.tabUrl',
  text: 'sources.tabText',
  youtube: 'sources.tabYoutube',
  file: 'sources.tabFile',
};

export const SOURCE_ICONS: Record<SourceType, string> = {
  FILE_DOCX: '\u{1F4C4}',
  FILE_PDF: '\u{1F4D5}',
  FILE_TXT: '\u{1F4DD}',
  URL: '\u{1F310}',
  YOUTUBE: '\u25B6\uFE0F',
  TEXT: '\u270F\uFE0F',
};

export const STATUS_COLORS: Record<SourceStatus, string> = {
  PENDING: 'text-yellow-500',
  PROCESSING: 'text-blue-500 animate-pulse',
  READY: 'text-green-600',
  FAILED: 'text-red-500',
};

export const STATUS_I18N_KEYS: Record<SourceStatus, string> = {
  PENDING: 'sources.statusPending',
  PROCESSING: 'sources.statusProcessing',
  READY: 'sources.statusReady',
  FAILED: 'sources.statusFailed',
};
