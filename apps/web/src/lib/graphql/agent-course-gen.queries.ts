import { gql } from 'urql';

// ─── F-AI Course Generator ─────────────────────────────────────────────────────
// generateCourseFromPrompt not yet in supergraph.
// Excluded from codegen until the supergraph is recomposed.
// Used by: AiCourseCreatorModal.tsx

export const GENERATE_COURSE_FROM_PROMPT_MUTATION = gql`
  mutation GenerateCourseFromPrompt($input: GenerateCourseInput!) {
    generateCourseFromPrompt(input: $input) {
      executionId
      status
      courseTitle
      courseDescription
      modules {
        title
        description
        contentItemTitles
      }
      draftCourseId
    }
  }
`;

export const EXECUTION_STATUS_SUBSCRIPTION = gql`
  subscription ExecutionStatusChanged($executionId: ID!) {
    executionStatusChanged(executionId: $executionId) {
      id
      status
      output
      completedAt
    }
  }
`;
