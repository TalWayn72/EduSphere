/**
 * Shared types for the live transcription engine.
 * Used across vocab-loader, streaming-whisper, live-jargon-matcher,
 * segment-publisher, and the NATS consumer.
 */

/** Identifies an active live stream session being transcribed */
export interface LiveSession {
  sessionId: string;
  lessonId: string;
  tenantId: string;
  language: string;
}

/** A single transcribed text segment with timing metadata */
export interface LiveSegment {
  sessionId: string;
  tenantId: string;
  segmentIndex: number;
  text: string;
  startTime: number;
  endTime: number;
  /** false while window is still open; true once Whisper confirms the chunk */
  isFinal: boolean;
  speaker?: string;
}

/** A jargon match found within a finalized segment */
export interface JargonHit {
  termId: string;
  canonicalForm: string;
  matchedForm: string;
  startTime: number;
  endTime: number;
  confidence: number;
}

/** NATS payload published on stream.started */
export interface StreamStartedEvent {
  sessionId: string;
  lessonId: string;
  tenantId: string;
  language?: string;
}

/** NATS payload published on stream.audio.chunk */
export interface AudioChunkEvent {
  sessionId: string;
  tenantId: string;
  /** Base64-encoded PCM/WAV audio bytes */
  audioBase64: string;
  sequenceNumber: number;
  timestampMs: number;
}

/** NATS payload published on stream.ended */
export interface StreamEndedEvent {
  sessionId: string;
  tenantId: string;
}
