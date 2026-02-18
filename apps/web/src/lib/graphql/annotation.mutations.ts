import { gql } from 'urql';

export const CREATE_ANNOTATION_MUTATION = gql`
  mutation CreateAnnotation($input: CreateAnnotationInput!) {
    createAnnotation(input: $input) {
      id
      assetId
      userId
      layer
      annotationType
      content
      startTime
      endTime
      position
      parentId
      createdAt
      updatedAt
    }
  }
`;

export const UPDATE_ANNOTATION_MUTATION = gql`
  mutation UpdateAnnotation($id: ID!, $input: UpdateAnnotationInput!) {
    updateAnnotation(id: $id, input: $input) {
      id
      content
      updatedAt
    }
  }
`;

export const DELETE_ANNOTATION_MUTATION = gql`
  mutation DeleteAnnotation($id: ID!) {
    deleteAnnotation(id: $id)
  }
`;

export const ANNOTATIONS_BY_ASSET_QUERY = gql`
  query AnnotationsByAsset($assetId: ID!, $layer: AnnotationLayer) {
    annotationsByAsset(assetId: $assetId, layer: $layer) {
      id
      assetId
      userId
      user {
        id
        displayName
      }
      layer
      annotationType
      content
      startTime
      endTime
      position
      parentId
      replies {
        id
        userId
        user {
          id
          displayName
        }
        content
        createdAt
      }
      createdAt
      updatedAt
    }
  }
`;

export const ANNOTATION_ADDED_SUBSCRIPTION = gql`
  subscription AnnotationAdded($assetId: ID!) {
    annotationAdded(assetId: $assetId) {
      id
      assetId
      userId
      user {
        id
        displayName
      }
      layer
      annotationType
      content
      startTime
      endTime
      createdAt
    }
  }
`;
