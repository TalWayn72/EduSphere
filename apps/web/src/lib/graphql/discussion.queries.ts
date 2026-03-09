import { gql } from '@urql/core';

export const MY_DISCUSSIONS_QUERY = gql`
  query MyDiscussions($limit: Int) {
    myDiscussions(limit: $limit) {
      id
      title
      courseId
      participantsCount
      messagesCount
      createdAt
    }
  }
`;

export const DISCUSSION_QUERY = gql`
  query Discussion($id: ID!) {
    discussion(id: $id) {
      id
      title
      courseId
      participantsCount
      messagesCount
      createdAt
    }
  }
`;

export const DISCUSSION_MESSAGES_QUERY = gql`
  query DiscussionMessages($discussionId: ID!, $limit: Int, $offset: Int) {
    discussionMessages(discussionId: $discussionId, limit: $limit, offset: $offset) {
      id
      userId
      content
      messageType
      parentMessageId
      likesCount
      isLikedByMe
      createdAt
    }
  }
`;

export const ADD_MESSAGE_MUTATION = gql`
  mutation AddMessage($discussionId: ID!, $input: AddMessageInput!) {
    addMessage(discussionId: $discussionId, input: $input) {
      id
      content
      createdAt
    }
  }
`;

export const LIKE_MESSAGE_MUTATION = gql`
  mutation LikeMessage($messageId: ID!) {
    likeMessage(messageId: $messageId)
  }
`;

export const MESSAGE_ADDED_SUBSCRIPTION = gql`
  subscription MessageAdded($discussionId: ID!) {
    messageAdded(discussionId: $discussionId) {
      id
      userId
      content
      messageType
      parentMessageId
      likesCount
      isLikedByMe
      createdAt
    }
  }
`;

export const JOIN_DISCUSSION_MUTATION = gql`
  mutation JoinDiscussion($discussionId: ID!) {
    joinDiscussion(discussionId: $discussionId)
  }
`;
