/**
 * Payload published on NATS subject `media.uploaded`
 */
export interface MediaUploadedEvent {
  fileKey: string;
  assetId: string;
  courseId: string;
  tenantId: string;
  fileName: string;
  contentType: string;
}

/**
 * A single timed segment returned by Whisper
 */
export interface WhisperSegment {
  id: number;
  start: number;
  end: number;
  text: string;
  speaker?: string;
}

/**
 * Full response from either OpenAI Whisper or local faster-whisper
 */
export interface WhisperResponse {
  text: string;
  language?: string;
  segments: WhisperSegment[];
}

/**
 * Payload published on NATS subject `transcription.completed`
 */
export interface TranscriptionCompletedEvent {
  assetId: string;
  courseId: string;
  tenantId: string;
  transcriptId: string;
  segmentCount: number;
  language: string;
}

/**
 * Payload published on NATS subject `transcription.failed`
 */
export interface TranscriptionFailedEvent {
  assetId: string;
  courseId: string;
  tenantId: string;
  error: string;
}
