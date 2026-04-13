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
      presetName
      formatDescription
      parsedStructure
      isActive
    }
  }
`;

// ── Mutations ─────────────────────────────────────────────────────────────────

export const SET_CITATION_FORMAT_MUTATION = gql`
  mutation SetCitationFormat(
    $courseId: ID!
    $presetName: String!
    $formatDescription: String
  ) {
    setCitationFormat(
      courseId: $courseId
      presetName: $presetName
      formatDescription: $formatDescription
    ) {
      id
      courseId
      presetName
      formatDescription
      isActive
    }
  }
`;
