import { gql } from 'urql';

export const DISCUSSIONS_QUERY = gql`
  query Discussions($courseId: ID!, $limit: Int, $offset: Int) {
    discussions(courseId: $courseId, limit: $limit, offset: $offset) {
      id
      courseId
      title
      description
      creatorId
      discussionType
      participantCount
      messageCount
      createdAt
      updatedAt
    }
  }
`;

/** Fetch all discussions the authenticated user has participated in. */
export const MY_DISCUSSIONS_QUERY = gql`
  query MyDiscussions($limit: Int, $offset: Int) {
    myDiscussions(limit: $limit, offset: $offset) {
      id
      courseId
      title
      description
      creatorId
      discussionType
      participantCount
      messageCount
      createdAt
      updatedAt
    }
  }
`;

export const DISCUSSION_QUERY = gql`
  query Discussion($id: ID!) {
    discussion(id: $id) {
      id
      courseId
      title
      description
      creatorId
      discussionType
      participantCount
      messageCount
      messages(limit: 50, offset: 0) {
        id
        userId
        content
        messageType
        parentMessageId
        replyCount
        createdAt
      }
      participants {
        id
        userId
        joinedAt
      }
      createdAt
      updatedAt
    }
  }
`;

export const CREATE_DISCUSSION_MUTATION = gql`
  mutation CreateDiscussion($input: CreateDiscussionInput!) {
    createDiscussion(input: $input) {
      id
      courseId
      title
      description
      discussionType
      participantCount
      messageCount
      createdAt
      updatedAt
    }
  }
`;

export const ADD_MESSAGE_MUTATION = gql`
  mutation AddMessage($discussionId: ID!, $input: AddMessageInput!) {
    addMessage(discussionId: $discussionId, input: $input) {
      id
      discussionId
      userId
      content
      messageType
      parentMessageId
      replyCount
      createdAt
    }
  }
`;

export const JOIN_DISCUSSION_MUTATION = gql`
  mutation JoinDiscussion($discussionId: ID!) {
    joinDiscussion(discussionId: $discussionId)
  }
`;

export const LEAVE_DISCUSSION_MUTATION = gql`
  mutation LeaveDiscussion($discussionId: ID!) {
    leaveDiscussion(discussionId: $discussionId)
  }
`;

export const MESSAGE_ADDED_SUBSCRIPTION = gql`
  subscription MessageAdded($discussionId: ID!) {
    messageAdded(discussionId: $discussionId) {
      id
      discussionId
      userId
      content
      messageType
      parentMessageId
      createdAt
    }
  }
`;
