import { gql } from 'urql';

export const START_AGENT_SESSION_MUTATION = gql`
  mutation StartAgentSession($input: StartAgentSessionInput!) {
    startAgentSession(input: $input) {
      id
      templateType
      status
      contextContentId
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
  query MyAgentSessions($first: Int) {
    myAgentSessions(first: $first) {
      edges {
        node {
          id
          templateType
          status
          createdAt
          messages(last: 1) {
            id
            content
            role
          }
        }
      }
    }
  }
`;

export const MESSAGE_STREAM_SUBSCRIPTION = gql`
  subscription MessageStream($sessionId: ID!) {
    messageStream(sessionId: $sessionId) {
      id
      role
      content
      isStreaming
      createdAt
    }
  }
`;

export const END_SESSION_MUTATION = gql`
  mutation EndAgentSession($sessionId: ID!) {
    endSession(sessionId: $sessionId) {
      id
      status
    }
  }
`;
