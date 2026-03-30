/**
 * AITutor — shared types and GraphQL operations.
 */
import { gql } from '@apollo/client';

export const CREATE_SESSION = gql`
  mutation CreateAgentSession($templateType: String!, $context: JSON) {
    startAgentSession(templateType: $templateType, context: $context) {
      id
    }
  }
`;

export const SEND_MESSAGE = gql`
  mutation SendMessage($sessionId: ID!, $content: String!) {
    createAgentMessage(
      input: {
        sessionId: $sessionId
        role: "USER"
        content: $content
      }
    ) {
      id
    }
  }
`;

export const MESSAGE_SUB = gql`
  subscription OnMessage($sessionId: ID!) {
    agentMessageCreated(sessionId: $sessionId) {
      id
      role
      content
      createdAt
    }
  }
`;

export interface AgentMessage {
  id: string;
  role: string;
  content: string;
  createdAt: string;
}

/**
 * Pure logic: resolve sessionId from mutation result or fallback.
 * Exported for unit testing without render.
 */
export function resolveSessionId(
  mutationResult: string | null,
  fallback: string
): string {
  if (mutationResult && mutationResult.trim().length > 0) {
    return mutationResult;
  }
  return fallback;
}
