import { gql } from 'graphql-tag';

export const COURSE_KNOWLEDGE_SOURCES = gql`
  query CourseKnowledgeSources($courseId: ID!) {
    courseKnowledgeSources(courseId: $courseId) {
      id
      title
      sourceType
      origin
      preview
      status
      chunkCount
      errorMessage
      createdAt
    }
  }
`;

export const KNOWLEDGE_SOURCE_DETAIL = gql`
  query KnowledgeSourceDetail($id: ID!) {
    knowledgeSource(id: $id) {
      id
      title
      sourceType
      origin
      rawContent
      status
      chunkCount
      createdAt
    }
  }
`;

export const ADD_URL_SOURCE = gql`
  mutation AddUrlSource($input: AddUrlSourceInput!) {
    addUrlSource(input: $input) {
      id
      title
      sourceType
      status
      origin
      preview
    }
  }
`;

export const ADD_TEXT_SOURCE = gql`
  mutation AddTextSource($input: AddTextSourceInput!) {
    addTextSource(input: $input) {
      id
      title
      sourceType
      status
    }
  }
`;

export const DELETE_KNOWLEDGE_SOURCE = gql`
  mutation DeleteKnowledgeSource($id: ID!) {
    deleteKnowledgeSource(id: $id)
  }
`;
