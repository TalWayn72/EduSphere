import { gql } from 'urql';

// ── LiveStreamSession fragment (fields that exist in SDL) ─────────────────────

const LIVE_SESSION_FIELDS = `
  id
  lessonId
  meetingName
  scheduledAt
  status
  streamType
  viewerCount
  maxViewers
  isScreenSharing
  instructor {
    id
  }
`;

// ── Queries ────────────────────────────────────────────────────────────────────

export const LIVE_STREAM_SESSION_QUERY = gql`
  query LiveStreamSession($sessionId: ID!) {
    liveStreamSession(sessionId: $sessionId) {
      ${LIVE_SESSION_FIELDS}
    }
  }
`;

export const ACTIVE_LIVE_SESSIONS_QUERY = gql`
  query ActiveLiveSessions($courseId: ID) {
    activeLiveSessions(courseId: $courseId) {
      ${LIVE_SESSION_FIELDS}
    }
  }
`;

export const LIVE_TRANSCRIPT_QUERY = gql`
  query LiveTranscript($sessionId: ID!, $afterIndex: Int) {
    liveTranscript(sessionId: $sessionId, afterIndex: $afterIndex) {
      id
      segmentIndex
      text
      isFinal
      startTime
      endTime
      jargonHits {
        termId
        form
        confidence
      }
    }
  }
`;

export const LIVE_PRESENCE_QUERY = gql`
  query LivePresence($sessionId: ID!) {
    livePresence(sessionId: $sessionId) {
      activeViewers
      viewers {
        userId
        joinedAt
      }
    }
  }
`;

// ── Mutations ─────────────────────────────────────────────────────────────────

export const JOIN_LIVE_SESSION_MUTATION = gql`
  mutation JoinLiveSession($sessionId: ID!) {
    joinLiveSession(sessionId: $sessionId) {
      activeViewers
      viewers {
        userId
        joinedAt
      }
    }
  }
`;

export const LEAVE_LIVE_SESSION_MUTATION = gql`
  mutation LeaveLiveSession($sessionId: ID!) {
    leaveLiveSession(sessionId: $sessionId)
  }
`;

export const CREATE_LIVE_STREAM_MUTATION = gql`
  mutation CreateLiveStream(
    $sessionId: ID!
    $streamType: StreamType!
    $lessonId: ID
    $maxViewers: Int
    $autoRecord: Boolean
  ) {
    createLiveStream(
      sessionId: $sessionId
      streamType: $streamType
      lessonId: $lessonId
      maxViewers: $maxViewers
      autoRecord: $autoRecord
    ) {
      ${LIVE_SESSION_FIELDS}
    }
  }
`;

export const START_LIVE_STREAM_MUTATION = gql`
  mutation StartLiveStream($sessionId: ID!) {
    startLiveStream(sessionId: $sessionId) {
      id
      status
    }
  }
`;

export const PAUSE_LIVE_STREAM_MUTATION = gql`
  mutation PauseLiveStream($sessionId: ID!) {
    pauseLiveStream(sessionId: $sessionId) {
      id
      status
    }
  }
`;

export const END_LIVE_STREAM_MUTATION = gql`
  mutation EndLiveStream($sessionId: ID!) {
    endLiveStream(sessionId: $sessionId) {
      id
      status
    }
  }
`;

export const TOGGLE_SCREEN_SHARE_MUTATION = gql`
  mutation ToggleScreenShare($sessionId: ID!, $active: Boolean!) {
    toggleScreenShare(sessionId: $sessionId, active: $active) {
      id
      isScreenSharing
    }
  }
`;

export const HIGHLIGHT_MOMENT_MUTATION = gql`
  mutation HighlightMoment($sessionId: ID!, $streamTs: Float!, $label: String) {
    highlightMoment(sessionId: $sessionId, streamTs: $streamTs, label: $label)
  }
`;

// ── Subscriptions ─────────────────────────────────────────────────────────────

export const LIVE_TRANSCRIPT_UPDATED_SUB = gql`
  subscription LiveTranscriptUpdated($sessionId: ID!) {
    liveTranscriptUpdated(sessionId: $sessionId) {
      id
      segmentIndex
      text
      isFinal
      startTime
      endTime
      jargonHits {
        termId
        form
        confidence
      }
    }
  }
`;

export const LIVE_SESSION_STATUS_SUB = gql`
  subscription LiveSessionStatusChanged($sessionId: ID!) {
    liveSessionStatusChanged(sessionId: $sessionId) {
      id
      status
      viewerCount
      isScreenSharing
    }
  }
`;

export const LIVE_PRESENCE_CHANGED_SUB = gql`
  subscription LivePresenceChanged($sessionId: ID!) {
    livePresenceChanged(sessionId: $sessionId) {
      activeViewers
      viewers {
        userId
        joinedAt
      }
    }
  }
`;
