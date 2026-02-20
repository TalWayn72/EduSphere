import { gql } from 'urql';

export const ANNOTATIONS_QUERY = gql`
  query Annotations($assetId: ID!, $layers: [AnnotationLayer!]) {
    annotations(assetId: $assetId, layers: $layers) {
      id
      layer
      type
      content
      startOffset
      endOffset
      timestampStart
      timestampEnd
      userId
      user {
        id
        displayName
      }
      replies {
        id
        content
        userId
        user {
          id
          displayName
        }
        createdAt
      }
      isResolved
      isPinned
      createdAt
      updatedAt
    }
  }
`;

/** Fetch all annotations belonging to the current user (by userId). */
export const MY_ANNOTATIONS_QUERY = gql`
  query MyAnnotations($userId: ID!, $limit: Int, $offset: Int) {
    annotationsByUser(userId: $userId, limit: $limit, offset: $offset) {
      id
      assetId
      userId
      layer
      annotationType
      content
      spatialData
      parentId
      isResolved
      createdAt
      updatedAt
    }
  }
`;

export const CREATE_ANNOTATION_MUTATION = gql`
  mutation CreateAnnotation($input: CreateAnnotationInput!) {
    createAnnotation(input: $input) {
      id
      layer
      type
      content
      startOffset
      endOffset
      timestampStart
      userId
      createdAt
    }
  }
`;

export const UPDATE_ANNOTATION_MUTATION = gql`
  mutation UpdateAnnotation($id: ID!, $input: UpdateAnnotationInput!) {
    updateAnnotation(id: $id, input: $input) {
      id
      content
      layer
      isPinned
      isResolved
      updatedAt
    }
  }
`;

export const DELETE_ANNOTATION_MUTATION = gql`
  mutation DeleteAnnotation($id: ID!) {
    deleteAnnotation(id: $id)
  }
`;

export const REPLY_TO_ANNOTATION_MUTATION = gql`
  mutation ReplyToAnnotation($annotationId: ID!, $content: String!) {
    replyToAnnotation(annotationId: $annotationId, content: $content) {
      id
      content
      userId
      createdAt
    }
  }
`;

export const ANNOTATION_ADDED_SUBSCRIPTION = gql`
  subscription AnnotationAdded($assetId: ID!) {
    annotationAdded(assetId: $assetId) {
      id
      layer
      type
      content
      userId
      user {
        id
        displayName
      }
      createdAt
    }
  }
`;
