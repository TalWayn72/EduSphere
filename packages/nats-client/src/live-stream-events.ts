/**
 * Live Lesson Streaming Events — Stream Lifecycle, Transcription, Presence & VOD
 *
 * Covers: stream start/pause/resume/end, screen share, live transcription segments,
 * jargon hit detection, participant presence, recording archival, VOD conversion.
 *
 * Subject namespace: EDUSPHERE.live.stream.* | EDUSPHERE.live.transcript.*
 *                    EDUSPHERE.live.presence.* | EDUSPHERE.live.recording.*
 *                    EDUSPHERE.live.vod.*
 */

// ─── Stream Lifecycle Events ─────────────────────────────────────────────────

export interface LiveStreamStartedPayload {
  readonly sessionId: string;
  readonly lessonId: string;
  readonly courseId: string;
  readonly tenantId: string;
  readonly instructorId: string;
  readonly timestamp: string; // ISO 8601
}

export interface LiveStreamPausedPayload {
  readonly sessionId: string;
  readonly tenantId: string;
  readonly instructorId: string;
  readonly timestamp: string; // ISO 8601
}

export interface LiveStreamResumedPayload {
  readonly sessionId: string;
  readonly tenantId: string;
  readonly instructorId: string;
  readonly timestamp: string; // ISO 8601
}

export interface LiveStreamEndedPayload {
  readonly sessionId: string;
  readonly lessonId: string;
  readonly courseId: string;
  readonly tenantId: string;
  readonly instructorId: string;
  readonly durationSeconds: number;
  readonly timestamp: string; // ISO 8601
}

export interface LiveStreamScreenSharePayload {
  readonly sessionId: string;
  readonly tenantId: string;
  readonly instructorId: string;
  readonly active: boolean;
  readonly timestamp: string; // ISO 8601
}

// ─── Live Transcription Events ───────────────────────────────────────────────

export interface LiveTranscriptSegmentPayload {
  readonly sessionId: string;
  readonly tenantId: string;
  readonly segmentId: string;
  readonly text: string;
  readonly startMs: number;
  readonly endMs: number;
  readonly isFinal: boolean;
  readonly language?: string;
  readonly timestamp: string; // ISO 8601
}

export interface LiveTranscriptJargonHitPayload {
  readonly sessionId: string;
  readonly tenantId: string;
  readonly segmentId: string;
  readonly termId: string;
  readonly term: string;
  readonly definition?: string;
  readonly timestamp: string; // ISO 8601
}

// ─── Presence Events ─────────────────────────────────────────────────────────

export type LiveParticipantRole = 'instructor' | 'student' | 'observer';

export interface LivePresenceJoinedPayload {
  readonly sessionId: string;
  readonly tenantId: string;
  readonly userId: string;
  readonly role: LiveParticipantRole;
  readonly timestamp: string; // ISO 8601
}

export interface LivePresenceLeftPayload {
  readonly sessionId: string;
  readonly tenantId: string;
  readonly userId: string;
  readonly durationSeconds: number;
  readonly timestamp: string; // ISO 8601
}

/** Periodic broadcast — emitted every 5 seconds by the presence aggregator */
export interface LivePresenceCountPayload {
  readonly sessionId: string;
  readonly tenantId: string;
  readonly count: number;
  readonly timestamp: string; // ISO 8601
}

// ─── Recording & VOD Events ──────────────────────────────────────────────────

export interface LiveRecordingReadyPayload {
  readonly sessionId: string;
  readonly lessonId: string;
  readonly tenantId: string;
  readonly storageKey: string;
  readonly durationSeconds: number;
  readonly timestamp: string; // ISO 8601
}

export interface LiveVodConversionStartedPayload {
  readonly sessionId: string;
  readonly tenantId: string;
  readonly storageKey: string;
  readonly timestamp: string; // ISO 8601
}

export interface LiveVodConversionDonePayload {
  readonly sessionId: string;
  readonly tenantId: string;
  readonly vodUrl: string;
  readonly durationSeconds: number;
  readonly timestamp: string; // ISO 8601
}

// ─── Subject Constants ───────────────────────────────────────────────────────

export const LiveStreamSubjects = {
  STREAM_STARTED: 'EDUSPHERE.live.stream.started',
  STREAM_PAUSED: 'EDUSPHERE.live.stream.paused',
  STREAM_RESUMED: 'EDUSPHERE.live.stream.resumed',
  STREAM_ENDED: 'EDUSPHERE.live.stream.ended',
  STREAM_SCREEN_SHARE: 'EDUSPHERE.live.stream.screen_share',
  TRANSCRIPT_SEGMENT: 'EDUSPHERE.live.transcript.segment',
  TRANSCRIPT_JARGON_HIT: 'EDUSPHERE.live.transcript.jargon_hit',
  PRESENCE_JOINED: 'EDUSPHERE.live.presence.joined',
  PRESENCE_LEFT: 'EDUSPHERE.live.presence.left',
  PRESENCE_COUNT: 'EDUSPHERE.live.presence.count',
  RECORDING_READY: 'EDUSPHERE.live.recording.ready',
  VOD_CONVERSION_STARTED: 'EDUSPHERE.live.vod.conversion.started',
  VOD_CONVERSION_DONE: 'EDUSPHERE.live.vod.conversion.done',
} as const;

// ─── Discriminated Union ─────────────────────────────────────────────────────

export type LiveStreamEvent =
  | LiveStreamStartedPayload
  | LiveStreamPausedPayload
  | LiveStreamResumedPayload
  | LiveStreamEndedPayload
  | LiveStreamScreenSharePayload
  | LiveTranscriptSegmentPayload
  | LiveTranscriptJargonHitPayload
  | LivePresenceJoinedPayload
  | LivePresenceLeftPayload
  | LivePresenceCountPayload
  | LiveRecordingReadyPayload
  | LiveVodConversionStartedPayload
  | LiveVodConversionDonePayload;

// ─── Type Guards ─────────────────────────────────────────────────────────────

function hasSessionAndTenant(
  e: unknown
): e is { sessionId: string; tenantId: string } {
  if (!e || typeof e !== 'object') return false;
  const obj = e as Record<string, unknown>;
  return (
    typeof obj['sessionId'] === 'string' && typeof obj['tenantId'] === 'string'
  );
}

export function isLiveStreamStartedEvent(
  e: unknown
): e is LiveStreamStartedPayload {
  if (!hasSessionAndTenant(e)) return false;
  const obj = e as Record<string, unknown>;
  return (
    typeof obj['lessonId'] === 'string' &&
    typeof obj['instructorId'] === 'string'
  );
}

export function isLiveStreamPausedEvent(
  e: unknown
): e is LiveStreamPausedPayload {
  if (!hasSessionAndTenant(e)) return false;
  const obj = e as Record<string, unknown>;
  return typeof obj['instructorId'] === 'string' && !('lessonId' in obj);
}

export function isLiveStreamResumedEvent(
  e: unknown
): e is LiveStreamResumedPayload {
  return isLiveStreamPausedEvent(e);
}

export function isLiveStreamEndedEvent(
  e: unknown
): e is LiveStreamEndedPayload {
  if (!hasSessionAndTenant(e)) return false;
  const obj = e as Record<string, unknown>;
  return (
    typeof obj['lessonId'] === 'string' &&
    typeof obj['instructorId'] === 'string' &&
    typeof obj['durationSeconds'] === 'number'
  );
}

export function isLiveStreamScreenShareEvent(
  e: unknown
): e is LiveStreamScreenSharePayload {
  if (!hasSessionAndTenant(e)) return false;
  const obj = e as Record<string, unknown>;
  return (
    typeof obj['active'] === 'boolean' &&
    typeof obj['instructorId'] === 'string'
  );
}

export function isLiveTranscriptSegmentEvent(
  e: unknown
): e is LiveTranscriptSegmentPayload {
  if (!hasSessionAndTenant(e)) return false;
  const obj = e as Record<string, unknown>;
  return (
    typeof obj['segmentId'] === 'string' &&
    typeof obj['text'] === 'string' &&
    typeof obj['isFinal'] === 'boolean'
  );
}

export function isLiveTranscriptJargonHitEvent(
  e: unknown
): e is LiveTranscriptJargonHitPayload {
  if (!hasSessionAndTenant(e)) return false;
  const obj = e as Record<string, unknown>;
  return typeof obj['termId'] === 'string' && typeof obj['term'] === 'string';
}

export function isLivePresenceJoinedEvent(
  e: unknown
): e is LivePresenceJoinedPayload {
  if (!hasSessionAndTenant(e)) return false;
  const obj = e as Record<string, unknown>;
  return (
    typeof obj['userId'] === 'string' &&
    (obj['role'] === 'instructor' ||
      obj['role'] === 'student' ||
      obj['role'] === 'observer')
  );
}

export function isLivePresenceLeftEvent(
  e: unknown
): e is LivePresenceLeftPayload {
  if (!hasSessionAndTenant(e)) return false;
  const obj = e as Record<string, unknown>;
  return (
    typeof obj['userId'] === 'string' &&
    typeof obj['durationSeconds'] === 'number'
  );
}

export function isLivePresenceCountEvent(
  e: unknown
): e is LivePresenceCountPayload {
  if (!hasSessionAndTenant(e)) return false;
  const obj = e as Record<string, unknown>;
  return typeof obj['count'] === 'number' && !('userId' in obj);
}

export function isLiveRecordingReadyEvent(
  e: unknown
): e is LiveRecordingReadyPayload {
  if (!hasSessionAndTenant(e)) return false;
  const obj = e as Record<string, unknown>;
  return (
    typeof obj['storageKey'] === 'string' && typeof obj['lessonId'] === 'string'
  );
}

export function isLiveVodConversionStartedEvent(
  e: unknown
): e is LiveVodConversionStartedPayload {
  if (!hasSessionAndTenant(e)) return false;
  const obj = e as Record<string, unknown>;
  return typeof obj['storageKey'] === 'string' && !('vodUrl' in obj);
}

export function isLiveVodConversionDoneEvent(
  e: unknown
): e is LiveVodConversionDonePayload {
  if (!hasSessionAndTenant(e)) return false;
  const obj = e as Record<string, unknown>;
  return (
    typeof obj['vodUrl'] === 'string' &&
    typeof obj['durationSeconds'] === 'number'
  );
}
