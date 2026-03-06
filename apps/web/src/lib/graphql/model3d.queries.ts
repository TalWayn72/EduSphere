import { gql } from '@urql/core';

export const UPLOAD_MODEL_3D_MUTATION = gql`
  mutation UploadModel3D(
    $courseId: ID!
    $lessonId: ID!
    $filename: String!
    $format: String!
    $contentLength: Int!
  ) {
    uploadModel3D(
      courseId: $courseId
      lessonId: $lessonId
      filename: $filename
      format: $format
      contentLength: $contentLength
    ) {
      assetId
      uploadUrl
      key
    }
  }
`;

export const GET_MEDIA_ASSET_MODEL_QUERY = gql`
  query GetMediaAssetModel($assetId: ID!) {
    mediaAsset(id: $assetId) {
      id
      filename
      assetType
      src
      model3d {
        format
        polyCount
        animations {
          name
          duration
        }
      }
    }
  }
`;
