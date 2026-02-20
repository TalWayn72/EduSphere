import { gql } from 'urql';

/**
 * Start a new agent session.
 * Schema: startAgentSession(templateType: TemplateType!, context: JSON!): AgentSession!
 */
export const START_AGENT_SESSION_MUTATION = gql`
  mutation StartAgentSession($templateType: TemplateType!, $context: JSON!) {
    startAgentSession(templateType: $templateType, context: $context) {
      id
      templateType
      status
      createdAt
    }
  }
`;

export const SEND_AGENT_MESSAGE_MUTATION = gql`
  mutation SendAgentMessage($sessionId: ID!, $content: String!) {
    sendMessage(sessionId: $sessionId, content: $content) {
      id
      role
      content
      createdAt
    }
  }
`;

export const END_SESSION_MUTATION = gql`
  mutation EndAgentSession($sessionId: ID!) {
    endSession(sessionId: $sessionId)
  }
`;

export const AGENT_SESSION_QUERY = gql`
  query AgentSession($id: ID!) {
    agentSession(id: $id) {
      id
      templateType
      status
      messages {
        id
        role
        content
        createdAt
      }
      createdAt
    }
  }
`;

export const MY_SESSIONS_QUERY = gql`
  query MyAgentSessions {
    myAgentSessions {
      id
      templateType
      status
      createdAt
      messages {
        id
        content
        role
      }
    }
  }
`;

/**
 * Fetch all available agent templates.
 * Schema: agentTemplates: [AgentTemplate!]!
 */
export const AGENT_TEMPLATES_QUERY = gql`
  query AgentTemplates {
    agentTemplates {
      id
      name
      templateType
      systemPrompt
    }
  }
`;

export const MESSAGE_STREAM_SUBSCRIPTION = gql`
  subscription MessageStream($sessionId: ID!) {
    messageStream(sessionId: $sessionId) {
      id
      role
      content
      createdAt
    }
  }
`;
