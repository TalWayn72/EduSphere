/**
 * GraphQL queries and mutations for F-007 Role-Play Scenarios.
 */
import { gql } from 'urql';

export const SCENARIO_TEMPLATES_QUERY = gql`
  query ScenarioTemplates {
    scenarioTemplates {
      id
      title
      domain
      difficultyLevel
      sceneDescription
      maxTurns
      isBuiltin
    }
  }
`;

export const START_ROLEPLAY_MUTATION = gql`
  mutation StartRoleplaySession($scenarioId: ID!) {
    startRoleplaySession(scenarioId: $scenarioId) {
      id
      scenarioId
      status
      turnCount
      startedAt
    }
  }
`;

export const SEND_ROLEPLAY_MESSAGE_MUTATION = gql`
  mutation SendRoleplayMessage($sessionId: ID!, $message: String!) {
    sendRoleplayMessage(sessionId: $sessionId, message: $message)
  }
`;

export const MY_SCENARIO_SESSION_QUERY = gql`
  query MyScenarioSession($sessionId: ID!) {
    myScenarioSession(sessionId: $sessionId) {
      id
      scenarioId
      status
      turnCount
      startedAt
      completedAt
      evaluation {
        overallScore
        criteriaScores {
          name
          score
          feedback
        }
        strengths
        areasForImprovement
        summary
      }
    }
  }
`;

export const CREATE_SCENARIO_TEMPLATE_MUTATION = gql`
  mutation CreateScenarioTemplate(
    $title: String!
    $domain: String!
    $difficultyLevel: String!
    $characterPersona: String!
    $sceneDescription: String!
    $maxTurns: Int
  ) {
    createScenarioTemplate(
      title: $title
      domain: $domain
      difficultyLevel: $difficultyLevel
      characterPersona: $characterPersona
      sceneDescription: $sceneDescription
      maxTurns: $maxTurns
    ) {
      id
      title
      domain
      difficultyLevel
      sceneDescription
      maxTurns
    }
  }
`;
