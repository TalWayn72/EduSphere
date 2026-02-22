import { gql } from 'urql';

// Fields that exist on the Annotation type in the annotation subgraph SDL.
// Key notes:
//   - `content` is a JSON scalar (string or object); text is extracted client-side.
//   - `spatialData` is JSON and holds positional/timestamp data ({ timestampStart, ... }).
//   - `user` stub only exposes `id` in the annotation subgraph.
//   - The API accepts a single optional `layer` argument; multi-layer filtering
//     is handled client-side via filterAnnotationsByLayers().
//
// Mutations and subscriptions have been moved to annotation.mutations.ts.
export const ANNOTATIONS_QUERY = gql`
  query Annotations($assetId: ID!) {
    annotations(assetId: $assetId) {
      id
      layer
      annotationType
      content
      spatialData
      parentId
      userId
      isResolved
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

export const REPLY_TO_ANNOTATION_MUTATION = gql`
  mutation ReplyToAnnotation($annotationId: ID!, $content: String!) {
    replyToAnnotation(annotationId: $annotationId, content: $content) {
      id
      content
      userId
      parentId
      layer
      annotationType
      createdAt
      updatedAt
    }
  }
`;
