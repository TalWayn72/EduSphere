import { gql } from 'urql';

export const CONTENT_TRANSLATION_QUERY = gql`
  query ContentTranslation($contentItemId: ID!, $locale: String!) {
    contentTranslation(contentItemId: $contentItemId, locale: $locale) {
      id
      locale
      translatedTitle
      translatedTranscript
      translationStatus
      qualityScore
      createdAt
    }
  }
`;

export const REQUEST_CONTENT_TRANSLATION_MUTATION = gql`
  mutation RequestContentTranslation(
    $contentItemId: ID!
    $targetLocale: String!
  ) {
    requestContentTranslation(
      contentItemId: $contentItemId
      targetLocale: $targetLocale
    ) {
      id
      locale
      translationStatus
    }
  }
`;
