import { gql } from 'urql';

// ── Shared fragments ───────────────────────────────────────────────────────────

const LIVE_CHAT_MESSAGE_FIELDS = `
  id
  sessionId
  userId
  content
  messageType
  isPinned
  replyTo {
    id
    content
  }
  createdAt
`;

const LIVE_QA_QUESTION_FIELDS = `
  id
  sessionId
  userId
  question
  upvotes
  status
  answer
  isUpvotedByMe
  streamTs
  createdAt
`;

// ── Queries ────────────────────────────────────────────────────────────────────

export const LIVE_CHAT_MESSAGES_QUERY = gql`
  query LiveChatMessages($sessionId: ID!, $limit: Int, $before: String) {
    liveChatMessages(
      sessionId: $sessionId
      limit: $limit
      before: $before
    ) {
      ${LIVE_CHAT_MESSAGE_FIELDS}
    }
  }
`;

export const LIVE_QA_QUESTIONS_QUERY = gql`
  query LiveQAQuestions($sessionId: ID!, $status: QAStatus) {
    liveQAQuestions(sessionId: $sessionId, status: $status) {
      ${LIVE_QA_QUESTION_FIELDS}
    }
  }
`;

export const LIVE_BOOKMARKS_QUERY = gql`
  query LiveBookmarks($sessionId: ID!) {
    liveBookmarks(sessionId: $sessionId) {
      id
      sessionId
      streamTs
      label
      note
      createdAt
    }
  }
`;

// ── Chat Mutations ─────────────────────────────────────────────────────────────

export const SEND_LIVE_CHAT_MESSAGE_MUTATION = gql`
  mutation SendLiveChatMessage(
    $sessionId: ID!
    $content: String!
    $replyToId: ID
  ) {
    sendLiveChatMessage(
      sessionId: $sessionId
      content: $content
      replyToId: $replyToId
    ) {
      ${LIVE_CHAT_MESSAGE_FIELDS}
    }
  }
`;

export const PIN_LIVE_CHAT_MESSAGE_MUTATION = gql`
  mutation PinLiveChatMessage($messageId: ID!) {
    pinLiveChatMessage(messageId: $messageId) {
      id
      isPinned
    }
  }
`;

export const DELETE_LIVE_CHAT_MESSAGE_MUTATION = gql`
  mutation DeleteLiveChatMessage($messageId: ID!) {
    deleteLiveChatMessage(messageId: $messageId)
  }
`;

// ── Reaction Mutations ─────────────────────────────────────────────────────────

export const SEND_LIVE_REACTION_MUTATION = gql`
  mutation SendLiveReaction(
    $sessionId: ID!
    $emoji: String!
    $streamTs: Float
  ) {
    sendLiveReaction(sessionId: $sessionId, emoji: $emoji, streamTs: $streamTs)
  }
`;

// ── Q&A Mutations ──────────────────────────────────────────────────────────────

export const ASK_LIVE_QUESTION_MUTATION = gql`
  mutation AskLiveQuestion(
    $sessionId: ID!
    $question: String!
    $streamTs: Float
  ) {
    askLiveQuestion(
      sessionId: $sessionId
      question: $question
      streamTs: $streamTs
    ) {
      ${LIVE_QA_QUESTION_FIELDS}
    }
  }
`;

export const UPVOTE_LIVE_QUESTION_MUTATION = gql`
  mutation UpvoteLiveQuestion($questionId: ID!) {
    upvoteLiveQuestion(questionId: $questionId) {
      id
      upvotes
      isUpvotedByMe
    }
  }
`;

export const ANSWER_LIVE_QUESTION_MUTATION = gql`
  mutation AnswerLiveQuestion($questionId: ID!, $answer: String!) {
    answerLiveQuestion(questionId: $questionId, answer: $answer) {
      id
      status
      answer
    }
  }
`;

export const DISMISS_LIVE_QUESTION_MUTATION = gql`
  mutation DismissLiveQuestion($questionId: ID!) {
    dismissLiveQuestion(questionId: $questionId) {
      id
      status
    }
  }
`;

// ── Bookmark Mutations ────────────────────────────────────────────────────────

export const ADD_LIVE_BOOKMARK_MUTATION = gql`
  mutation AddLiveBookmark(
    $sessionId: ID!
    $streamTs: Float!
    $label: String
    $note: String
  ) {
    addLiveBookmark(
      sessionId: $sessionId
      streamTs: $streamTs
      label: $label
      note: $note
    ) {
      id
      sessionId
      streamTs
      label
      note
      createdAt
    }
  }
`;

export const REMOVE_LIVE_BOOKMARK_MUTATION = gql`
  mutation RemoveLiveBookmark($bookmarkId: ID!) {
    removeLiveBookmark(bookmarkId: $bookmarkId)
  }
`;

// ── Subscriptions ─────────────────────────────────────────────────────────────

export const LIVE_CHAT_MESSAGE_ADDED_SUB = gql`
  subscription LiveChatMessageAdded($sessionId: ID!) {
    liveChatMessageAdded(sessionId: $sessionId) {
      ${LIVE_CHAT_MESSAGE_FIELDS}
    }
  }
`;

export const LIVE_REACTION_BURST_SUB = gql`
  subscription LiveReactionBurst($sessionId: ID!) {
    liveReactionBurst(sessionId: $sessionId) {
      emoji
      count
      recentUsers
    }
  }
`;

export const LIVE_QA_UPDATED_SUB = gql`
  subscription LiveQAUpdated($sessionId: ID!) {
    liveQAUpdated(sessionId: $sessionId) {
      ${LIVE_QA_QUESTION_FIELDS}
    }
  }
`;
