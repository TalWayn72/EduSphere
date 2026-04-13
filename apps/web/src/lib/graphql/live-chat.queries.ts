import { gql } from 'urql';

// ── Queries ────────────────────────────────────────────────────────────────────

export const LIVE_CHAT_MESSAGES_QUERY = gql`
  query LiveChatMessages($sessionId: ID!, $limit: Int, $beforeCursor: String) {
    liveChatMessages(
      sessionId: $sessionId
      limit: $limit
      beforeCursor: $beforeCursor
    ) {
      messages {
        id
        sessionId
        userId
        displayName
        avatarUrl
        content
        messageType
        isPinned
        replyToId
        createdAt
      }
      pageInfo {
        hasNextPage
        hasPreviousPage
        startCursor
        endCursor
      }
    }
  }
`;

export const LIVE_QA_QUESTIONS_QUERY = gql`
  query LiveQAQuestions($sessionId: ID!, $status: String) {
    liveQAQuestions(sessionId: $sessionId, status: $status) {
      id
      sessionId
      userId
      displayName
      question
      upvotes
      status
      answeredAt
      answeredBy
      answer
      createdAt
    }
  }
`;

export const LIVE_BOOKMARKS_QUERY = gql`
  query LiveBookmarks($sessionId: ID!) {
    liveBookmarks(sessionId: $sessionId) {
      id
      sessionId
      userId
      label
      timestampMs
      transcriptIndex
      createdAt
    }
  }
`;

// ── Chat Mutations ─────────────────────────────────────────────────────────────

export const SEND_LIVE_CHAT_MESSAGE_MUTATION = gql`
  mutation SendLiveChatMessage(
    $sessionId: ID!
    $content: String!
    $messageType: String
    $replyToId: ID
  ) {
    sendLiveChatMessage(
      sessionId: $sessionId
      content: $content
      messageType: $messageType
      replyToId: $replyToId
    ) {
      id
      sessionId
      userId
      displayName
      avatarUrl
      content
      messageType
      isPinned
      replyToId
      createdAt
    }
  }
`;

export const PIN_LIVE_CHAT_MESSAGE_MUTATION = gql`
  mutation PinLiveChatMessage($sessionId: ID!, $messageId: ID!, $pinned: Boolean!) {
    pinLiveChatMessage(
      sessionId: $sessionId
      messageId: $messageId
      pinned: $pinned
    ) {
      id
      isPinned
    }
  }
`;

export const DELETE_LIVE_CHAT_MESSAGE_MUTATION = gql`
  mutation DeleteLiveChatMessage($sessionId: ID!, $messageId: ID!) {
    deleteLiveChatMessage(sessionId: $sessionId, messageId: $messageId) {
      deleted
    }
  }
`;

// ── Reaction Mutations ─────────────────────────────────────────────────────────

export const SEND_LIVE_REACTION_MUTATION = gql`
  mutation SendLiveReaction($sessionId: ID!, $emoji: String!) {
    sendLiveReaction(sessionId: $sessionId, emoji: $emoji) {
      sessionId
      emoji
      count
      burstAt
    }
  }
`;

// ── Q&A Mutations ──────────────────────────────────────────────────────────────

export const ASK_LIVE_QUESTION_MUTATION = gql`
  mutation AskLiveQuestion($sessionId: ID!, $question: String!) {
    askLiveQuestion(sessionId: $sessionId, question: $question) {
      id
      sessionId
      userId
      displayName
      question
      upvotes
      status
      createdAt
    }
  }
`;

export const UPVOTE_LIVE_QUESTION_MUTATION = gql`
  mutation UpvoteLiveQuestion($questionId: ID!) {
    upvoteLiveQuestion(questionId: $questionId) {
      id
      upvotes
    }
  }
`;

export const ANSWER_LIVE_QUESTION_MUTATION = gql`
  mutation AnswerLiveQuestion($questionId: ID!, $answer: String!) {
    answerLiveQuestion(questionId: $questionId, answer: $answer) {
      id
      status
      answer
      answeredAt
      answeredBy
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
    $label: String!
    $timestampMs: Int!
    $transcriptIndex: Int
  ) {
    addLiveBookmark(
      sessionId: $sessionId
      label: $label
      timestampMs: $timestampMs
      transcriptIndex: $transcriptIndex
    ) {
      id
      sessionId
      userId
      label
      timestampMs
      transcriptIndex
      createdAt
    }
  }
`;

export const REMOVE_LIVE_BOOKMARK_MUTATION = gql`
  mutation RemoveLiveBookmark($bookmarkId: ID!) {
    removeLiveBookmark(bookmarkId: $bookmarkId) {
      removed
    }
  }
`;

// ── Subscriptions ─────────────────────────────────────────────────────────────

export const LIVE_CHAT_MESSAGE_ADDED_SUB = gql`
  subscription LiveChatMessageAdded($sessionId: ID!) {
    liveChatMessageAdded(sessionId: $sessionId) {
      id
      sessionId
      userId
      displayName
      avatarUrl
      content
      messageType
      isPinned
      replyToId
      createdAt
    }
  }
`;

export const LIVE_REACTION_BURST_SUB = gql`
  subscription LiveReactionBurst($sessionId: ID!) {
    liveReactionBurst(sessionId: $sessionId) {
      sessionId
      emoji
      count
      burstAt
    }
  }
`;

export const LIVE_QA_UPDATED_SUB = gql`
  subscription LiveQAUpdated($sessionId: ID!) {
    liveQAUpdated(sessionId: $sessionId) {
      id
      sessionId
      userId
      displayName
      question
      upvotes
      status
      answeredAt
      answeredBy
      answer
      createdAt
    }
  }
`;
