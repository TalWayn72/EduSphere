/**
 * Content, Media, Transcription & Translation Events
 *
 * Covers: content lifecycle, media uploads, transcription pipeline,
 * content translation requests
 */

// ─── Content Events ──────────────────────────────────────────────────────────

export type ContentEventType =
  | 'content.created'
  | 'content.updated'
  | 'content.deleted'
  | 'content.published'
  | 'content.transcription.completed';

export interface ContentPayload {
  readonly type: ContentEventType;
  readonly contentItemId: string;
  readonly courseId?: string;
  readonly tenantId: string;
  readonly timestamp: string; // ISO 8601
}

// ─── Media Events ────────────────────────────────────────────────────────────

export interface MediaPayload {
  readonly assetId: string;
  readonly contentItemId: string;
  readonly tenantId: string;
  readonly storageKey: string;
  readonly mimeType?: string;
  readonly sizeBytes?: number;
}

// ─── Transcription Events ────────────────────────────────────────────────────

export type TranscriptionEventType =
  | 'transcription.completed'
  | 'transcription.failed';

export interface TranscriptionPayload {
  readonly type: TranscriptionEventType;
  readonly assetId: string;
  readonly segmentCount?: number;
  readonly language?: string;
  readonly errorMessage?: string;
}

// ─── Content Translation Events ──────────────────────────────────────────────

export interface ContentTranslationPayload {
  readonly contentItemId: string;
  readonly targetLanguage: string;
  readonly tenantId: string;
  readonly requestedBy?: string;
}

// ─── Type Guards ─────────────────────────────────────────────────────────────

export function isContentEvent(e: unknown): e is ContentPayload {
  if (!e || typeof e !== 'object') return false;
  const obj = e as Record<string, unknown>;
  return typeof obj['contentItemId'] === 'string';
}

export function isTranscriptionEvent(e: unknown): e is TranscriptionPayload {
  if (!e || typeof e !== 'object') return false;
  const obj = e as Record<string, unknown>;
  return (
    typeof obj['assetId'] === 'string' &&
    (obj['type'] === 'transcription.completed' ||
      obj['type'] === 'transcription.failed')
  );
}
