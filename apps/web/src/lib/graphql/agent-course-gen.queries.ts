import { gql } from 'urql';

// ─── F-AI Course Generator ─────────────────────────────────────────────────────
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

/** Polling fallback — used when subscription/WebSocket is unavailable. */
export const AGENT_EXECUTION_QUERY = gql`
  query AgentExecution($id: ID!) {
    agentExecution(id: $id) {
      id
      status
      output
      completedAt
    }
  }
`;
