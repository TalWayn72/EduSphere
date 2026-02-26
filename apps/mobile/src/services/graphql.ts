/**
 * graphql.ts — shared GraphQL queries and mutations for the mobile app.
 * Used by CourseViewerScreen, AnnotationPanel, and AIChatScreen.
 */
import { gql } from '@apollo/client';

export const GET_COURSE_DETAILS = gql`
  query GetCourseDetails($id: ID!) {
    course(id: $id) {
      id
      title
      description
      modules {
        id
        title
        contentItems {
          id
          title
          type
        }
      }
    }
  }
`;

export const GET_ANNOTATIONS = gql`
  query GetAnnotations($contentId: ID!) {
    annotations(contentItemId: $contentId) {
      id
      text
      createdAt
      author {
        displayName
      }
    }
  }
`;

export const CREATE_ANNOTATION = gql`
  mutation CreateAnnotation($contentId: ID!, $text: String!) {
    createAnnotation(input: { contentItemId: $contentId, text: $text }) {
      id
      text
    }
  }
`;

export const SEND_AGENT_MESSAGE = gql`
  mutation SendAgentMessage($sessionId: ID!, $content: String!) {
    sendMessage(sessionId: $sessionId, content: $content) {
      id
      role
      content
      createdAt
    }
  }
`;
