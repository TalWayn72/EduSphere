// ── Enum union types ───────────────────────────────────────────────────────────

export type LiveSessionPhase =
  | 'SCHEDULED'
  | 'LIVE'
  | 'PAUSED'
  | 'ENDED'
  | 'CANCELLED';

export type StreamType =
  | 'BROADCAST'
  | 'INTERACTIVE'
  | 'RECORDED_PLAYBACK';

export type LiveMessageType = 'TEXT' | 'EMOJI' | 'SYSTEM' | 'ANNOUNCEMENT';

export type QAStatus = 'OPEN' | 'ANSWERED' | 'DISMISSED';

// ── Session types ──────────────────────────────────────────────────────────────

export interface HighlightMoment {
  id: string;
  timestamp: number;
  label: string;
  sessionId: string;
}

export interface LiveStreamSession {
  id: string;
  title: string;
  courseId: string;
  instructorId: string;
  phase: LiveSessionPhase;
  streamType: StreamType;
  streamUrl: string | null;
  thumbnailUrl: string | null;
  viewerCount: number;
  maxViewers: number | null;
  scheduledAt: string | null;
  startedAt: string | null;
  endedAt: string | null;
  isScreenSharing: boolean;
  highlightMoments: HighlightMoment[];
  recordingUrl: string | null;
  createdAt: string;
}

// ── Transcript types ───────────────────────────────────────────────────────────

export interface JargonHit {
  termId: string;
  canonicalForm: string;
  definitionShort: string;
  startChar: number;
  endChar: number;
}

export interface LiveTranscriptSegment {
  index: number;
  text: string;
  isFinal: boolean;
  speakerLabel: string | null;
  startMs: number;
  endMs: number;
  jargonHits: JargonHit[];
}

// ── Presence types ─────────────────────────────────────────────────────────────

export interface LiveViewer {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  joinedAt: string;
}

export interface LivePresenceInfo {
  viewerCount: number;
  viewers: LiveViewer[];
}

// ── Chat types ─────────────────────────────────────────────────────────────────

export interface LiveChatMessage {
  id: string;
  sessionId: string;
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  content: string;
  messageType: LiveMessageType;
  isPinned: boolean;
  replyToId: string | null;
  createdAt: string;
}

// ── Q&A types ──────────────────────────────────────────────────────────────────

export interface LiveQAQuestion {
  id: string;
  sessionId: string;
  userId: string;
  displayName: string;
  question: string;
  upvotes: number;
  status: QAStatus;
  answeredAt: string | null;
  answeredBy: string | null;
  answer: string | null;
  createdAt: string;
}

// ── Reaction types ─────────────────────────────────────────────────────────────

export interface LiveReactionBurst {
  sessionId: string;
  emoji: string;
  count: number;
  burstAt: string;
}

// ── Bookmark types ─────────────────────────────────────────────────────────────

export interface LiveBookmark {
  id: string;
  sessionId: string;
  userId: string;
  label: string;
  timestampMs: number;
  transcriptIndex: number | null;
  createdAt: string;
}
