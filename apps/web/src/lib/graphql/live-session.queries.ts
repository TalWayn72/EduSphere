import { gql } from 'urql';

export const LIVE_SESSION_QUERY = gql`
  query LiveSession($contentItemId: ID!) {
    liveSession(contentItemId: $contentItemId) {
      id
      contentItemId
      meetingName
      scheduledAt
      status
      recordingUrl
    }
  }
`;

export const CREATE_LIVE_SESSION_MUTATION = gql`
  mutation CreateLiveSession(
    $contentItemId: ID!
    $scheduledAt: String!
    $meetingName: String!
  ) {
    createLiveSession(
      contentItemId: $contentItemId
      scheduledAt: $scheduledAt
      meetingName: $meetingName
    ) {
      id
      contentItemId
      meetingName
      scheduledAt
      status
      recordingUrl
    }
  }
`;

export const JOIN_LIVE_SESSION_MUTATION = gql`
  mutation JoinLiveSession($sessionId: ID!) {
    joinLiveSession(sessionId: $sessionId)
  }
`;

export const END_LIVE_SESSION_MUTATION = gql`
  mutation EndLiveSession($sessionId: ID!) {
    endLiveSession(sessionId: $sessionId) {
      id
      status
      recordingUrl
    }
  }
`;

// ── Polls ─────────────────────────────────────────────────────────────────────

export const SESSION_POLLS_QUERY = gql`
  query SessionPolls($sessionId: ID!) {
    sessionPolls(sessionId: $sessionId) {
      id
      sessionId
      question
      options
      isActive
    }
  }
`;

export const POLL_RESULTS_QUERY = gql`
  query PollResults($pollId: ID!) {
    pollResults(pollId: $pollId) {
      pollId
      question
      totalVotes
      options {
        text
        count
        percentage
      }
    }
  }
`;

export const CREATE_POLL_MUTATION = gql`
  mutation CreatePoll($sessionId: ID!, $question: String!, $options: [String!]!) {
    createPoll(sessionId: $sessionId, question: $question, options: $options) {
      id
      question
      options
      isActive
    }
  }
`;

export const ACTIVATE_POLL_MUTATION = gql`
  mutation ActivatePoll($pollId: ID!) {
    activatePoll(pollId: $pollId) {
      id
      isActive
    }
  }
`;

export const CLOSE_POLL_MUTATION = gql`
  mutation ClosePoll($pollId: ID!) {
    closePoll(pollId: $pollId) {
      pollId
      question
      totalVotes
      options {
        text
        count
        percentage
      }
    }
  }
`;

export const VOTE_POLL_MUTATION = gql`
  mutation VotePoll($pollId: ID!, $optionIndex: Int!) {
    votePoll(pollId: $pollId, optionIndex: $optionIndex)
  }
`;

export const POLL_UPDATED_SUBSCRIPTION = gql`
  subscription PollUpdated($pollId: ID!) {
    pollUpdated(pollId: $pollId) {
      pollId
      question
      totalVotes
      options {
        text
        count
        percentage
      }
    }
  }
`;

// ── Breakout Rooms ────────────────────────────────────────────────────────────

export const BREAKOUT_ROOMS_QUERY = gql`
  query BreakoutRooms($sessionId: ID!) {
    breakoutRooms(sessionId: $sessionId) {
      id
      sessionId
      roomName
      capacity
      assignedUserIds
    }
  }
`;

export const CREATE_BREAKOUT_ROOMS_MUTATION = gql`
  mutation CreateBreakoutRooms($sessionId: ID!, $rooms: [CreateBreakoutRoomInput!]!) {
    createBreakoutRooms(sessionId: $sessionId, rooms: $rooms) {
      id
      roomName
      capacity
      assignedUserIds
    }
  }
`;
