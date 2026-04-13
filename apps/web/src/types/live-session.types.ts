// ── Enum union types ───────────────────────────────────────────────────────────

export type LiveSessionPhase =
  | 'PRE_LIVE'
  | 'LIVE'
  | 'PAUSED'
  | 'ENDED'
  | 'VOD_READY';

export type StreamType = 'BBB' | 'LIVEKIT' | 'EXTERNAL';

export type LiveMessageType = 'TEXT' | 'REACTION' | 'SYSTEM' | 'PINNED';

export type QAStatus = 'PENDING' | 'ANSWERED' | 'DISMISSED';

// ── Session types ──────────────────────────────────────────────────────────────

export interface LiveStreamSession {
  id: string;
  lessonId: string | null;
  meetingName: string;
  scheduledAt: string;
  /** status maps to LiveSessionPhase enum */
  status: LiveSessionPhase;
  /** Alias for status — used by UI components */
  phase?: LiveSessionPhase;
  streamType: StreamType;
  viewerCount: number;
  maxViewers: number;
  instructor: { id: string };
  isScreenSharing: boolean;
  // Extended fields used by components (may be null if not in query result)
  title?: string;
  startedAt?: string | null;
  endedAt?: string | null;
  streamUrl?: string | null;
}

// ── Transcript types ───────────────────────────────────────────────────────────

export interface JargonHit {
  termId: string;
  form: string;
  confidence: number | null;
}

export interface LiveTranscriptSegment {
  id: string;
  segmentIndex: number;
  text: string;
  isFinal: boolean;
  startTime: string | null;
  endTime: string | null;
  jargonHits: JargonHit[];
}

// ── Presence types ─────────────────────────────────────────────────────────────

export interface LiveViewer {
  userId: string;
  joinedAt: string;
}

export interface LivePresenceInfo {
  activeViewers: number;
  viewers: LiveViewer[];
}

// ── Chat types ─────────────────────────────────────────────────────────────────

export interface LiveChatMessage {
  id: string;
  sessionId: string;
  userId: string;
  content: string;
  messageType: LiveMessageType;
  isPinned: boolean;
  replyTo: { id: string; content: string } | null;
  createdAt: string;
}

// ── Q&A types ──────────────────────────────────────────────────────────────────

export interface LiveQAQuestion {
  id: string;
  sessionId: string;
  userId: string;
  question: string;
  upvotes: number;
  status: QAStatus;
  answer: string | null;
  isUpvotedByMe: boolean;
  streamTs: number | null;
  createdAt: string;
  // UI-only augmented fields
  displayName?: string;
}

// ── Reaction types ─────────────────────────────────────────────────────────────

export interface LiveReactionBurst {
  emoji: string;
  count: number;
  recentUsers: string[];
}

// ── Bookmark types ─────────────────────────────────────────────────────────────

export interface LiveBookmark {
  id: string;
  sessionId: string;
  streamTs: number;
  label: string | null;
  note: string | null;
  createdAt: string;
}
