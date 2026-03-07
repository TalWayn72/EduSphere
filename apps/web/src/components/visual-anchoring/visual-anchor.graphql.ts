import { gql } from 'urql';

export const GET_VISUAL_ANCHORS = gql`
  query GetVisualAnchors($mediaAssetId: ID!) {
    getVisualAnchors(mediaAssetId: $mediaAssetId) {
      id
      mediaAssetId
      anchorText
      pageNumber
      posX posY posW posH
      pageEnd posXEnd posYEnd
      visualAssetId
      documentOrder
      isBroken
      createdAt
      updatedAt
      visualAsset {
        id storageUrl webpUrl mimeType filename scanStatus
        metadata { width height altText }
      }
    }
  }
`;

export const GET_VISUAL_ASSETS = gql`
  query GetVisualAssets($courseId: ID!) {
    getVisualAssets(courseId: $courseId) {
      id filename mimeType sizeBytes storageUrl webpUrl scanStatus
      metadata { width height altText }
      createdAt
    }
  }
`;

export const CREATE_VISUAL_ANCHOR = gql`
  mutation CreateVisualAnchor($input: CreateVisualAnchorInput!) {
    createVisualAnchor(input: $input) {
      id anchorText documentOrder visualAssetId createdAt
    }
  }
`;

export const DELETE_VISUAL_ANCHOR = gql`
  mutation DeleteVisualAnchor($id: ID!) {
    deleteVisualAnchor(id: $id)
  }
`;

export const ASSIGN_ASSET_TO_ANCHOR = gql`
  mutation AssignAssetToAnchor($anchorId: ID!, $visualAssetId: ID!) {
    assignAssetToAnchor(anchorId: $anchorId, visualAssetId: $visualAssetId) {
      id visualAssetId
      visualAsset { id storageUrl webpUrl mimeType }
    }
  }
`;

export const CONFIRM_VISUAL_ASSET_UPLOAD = gql`
  mutation ConfirmVisualAssetUpload(
    $fileKey: String!
    $courseId: ID!
    $originalName: String!
    $declaredMimeType: String!
    $declaredSize: Int!
  ) {
    confirmVisualAssetUpload(
      fileKey: $fileKey
      courseId: $courseId
      originalName: $originalName
      declaredMimeType: $declaredMimeType
      declaredSize: $declaredSize
    ) {
      id filename storageUrl webpUrl scanStatus
      metadata { width height altText }
    }
  }
`;

export const GET_PRESIGNED_UPLOAD_URL = gql`
  query GetPresignedUploadUrl($fileName: String!, $contentType: String!, $courseId: ID!) {
    getPresignedUploadUrl(fileName: $fileName, contentType: $contentType, courseId: $courseId) {
      uploadUrl
      fileKey
      expiresAt
    }
  }
`;
