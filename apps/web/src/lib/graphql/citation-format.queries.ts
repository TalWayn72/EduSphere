/**
 * GraphQL queries and mutations for citation format configuration.
 */
import { gql } from 'urql';

// ── Queries ───────────────────────────────────────────────────────────────────

export const CITATION_FORMAT_CONFIGS_QUERY = gql`
  query CitationFormatConfigs($courseId: ID!) {
    citationFormatConfigs(courseId: $courseId) {
      id
      courseId
      preset
      customDescription
      createdAt
      updatedAt
    }
  }
`;

// ── Mutations ─────────────────────────────────────────────────────────────────

export const SET_CITATION_FORMAT_MUTATION = gql`
  mutation SetCitationFormat($input: SetCitationFormatInput!) {
    setCitationFormat(input: $input) {
      id
      courseId
      preset
      customDescription
      updatedAt
    }
  }
`;
