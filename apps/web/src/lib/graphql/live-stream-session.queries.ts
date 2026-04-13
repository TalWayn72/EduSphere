import { gql } from 'urql';

// ── Queries ────────────────────────────────────────────────────────────────────

export const LIVE_STREAM_SESSION_QUERY = gql`
  query LiveStreamSession($sessionId: ID!) {
    liveStreamSession(sessionId: $sessionId) {
      id
      title
      courseId
      instructorId
      phase
      streamType
      streamUrl
      thumbnailUrl
      viewerCount
      maxViewers
      scheduledAt
      startedAt
      endedAt
      isScreenSharing
      highlightMoments {
        id
        timestamp
        label
        sessionId
      }
      recordingUrl
      createdAt
    }
  }
`;

export const ACTIVE_LIVE_SESSIONS_QUERY = gql`
  query ActiveLiveSessions($courseId: ID!) {
    activeLiveSessions(courseId: $courseId) {
      id
      title
      courseId
      instructorId
      phase
      streamType
      streamUrl
      thumbnailUrl
      viewerCount
      maxViewers
      scheduledAt
      startedAt
      endedAt
      isScreenSharing
      highlightMoments {
        id
        timestamp
        label
        sessionId
      }
      recordingUrl
      createdAt
    }
  }
`;

export const LIVE_TRANSCRIPT_QUERY = gql`
  query LiveTranscript($sessionId: ID!, $afterIndex: Int) {
    liveTranscript(sessionId: $sessionId, afterIndex: $afterIndex) {
      index
      text
      isFinal
      speakerLabel
      startMs
      endMs
      jargonHits {
        termId
        canonicalForm
        definitionShort
        startChar
        endChar
      }
    }
  }
`;

export const LIVE_PRESENCE_QUERY = gql`
  query LivePresence($sessionId: ID!) {
    livePresence(sessionId: $sessionId) {
      viewerCount
      viewers {
        userId
        displayName
        avatarUrl
        joinedAt
      }
    }
  }
`;

// ── Mutations ─────────────────────────────────────────────────────────────────

export const JOIN_LIVE_SESSION_MUTATION = gql`
  mutation JoinLiveStream($sessionId: ID!) {
    joinLiveStream(sessionId: $sessionId) {
      sessionId
      viewerToken
      streamUrl
    }
  }
`;

export const LEAVE_LIVE_SESSION_MUTATION = gql`
  mutation LeaveLiveStream($sessionId: ID!) {
    leaveLiveStream(sessionId: $sessionId) {
      success
    }
  }
`;

export const CREATE_LIVE_STREAM_MUTATION = gql`
  mutation CreateLiveStream(
    $courseId: ID!
    $title: String!
    $scheduledAt: String
    $streamType: String!
    $maxViewers: Int
  ) {
    createLiveStream(
      courseId: $courseId
      title: $title
      scheduledAt: $scheduledAt
      streamType: $streamType
      maxViewers: $maxViewers
    ) {
      id
      title
      courseId
      instructorId
      phase
      streamType
      streamUrl
      thumbnailUrl
      viewerCount
      maxViewers
      scheduledAt
      startedAt
      endedAt
      isScreenSharing
      highlightMoments { id timestamp label sessionId }
      recordingUrl
      createdAt
    }
  }
`;

export const START_LIVE_STREAM_MUTATION = gql`
  mutation StartLiveStream($sessionId: ID!) {
    startLiveStream(sessionId: $sessionId) {
      sessionId
      phase
      startedAt
      streamUrl
    }
  }
`;

export const PAUSE_LIVE_STREAM_MUTATION = gql`
  mutation PauseLiveStream($sessionId: ID!) {
    pauseLiveStream(sessionId: $sessionId) {
      sessionId
      phase
    }
  }
`;

export const END_LIVE_STREAM_MUTATION = gql`
  mutation EndLiveStream($sessionId: ID!) {
    endLiveStream(sessionId: $sessionId) {
      sessionId
      phase
      endedAt
      recordingUrl
    }
  }
`;

export const TOGGLE_SCREEN_SHARE_MUTATION = gql`
  mutation ToggleScreenShare($sessionId: ID!, $enabled: Boolean!) {
    toggleScreenShare(sessionId: $sessionId, enabled: $enabled) {
      sessionId
      isScreenSharing
    }
  }
`;

export const HIGHLIGHT_MOMENT_MUTATION = gql`
  mutation HighlightMoment($sessionId: ID!, $label: String!) {
    highlightMoment(sessionId: $sessionId, label: $label) {
      id
      timestamp
      label
      sessionId
    }
  }
`;

// ── Subscriptions ─────────────────────────────────────────────────────────────

export const LIVE_TRANSCRIPT_UPDATED_SUB = gql`
  subscription LiveTranscriptUpdated($sessionId: ID!) {
    liveTranscriptUpdated(sessionId: $sessionId) {
      index
      text
      isFinal
      speakerLabel
      startMs
      endMs
      jargonHits {
        termId
        canonicalForm
        definitionShort
        startChar
        endChar
      }
    }
  }
`;

export const LIVE_SESSION_STATUS_SUB = gql`
  subscription LiveSessionStatus($sessionId: ID!) {
    liveSessionStatus(sessionId: $sessionId) {
      sessionId
      phase
      viewerCount
      isScreenSharing
      highlightMoments {
        id
        timestamp
        label
      }
    }
  }
`;

export const LIVE_PRESENCE_CHANGED_SUB = gql`
  subscription LivePresenceChanged($sessionId: ID!) {
    livePresenceChanged(sessionId: $sessionId) {
      viewerCount
      viewers {
        userId
        displayName
        avatarUrl
        joinedAt
      }
    }
  }
`;
