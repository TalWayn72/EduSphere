import { gql } from 'urql';

export const MY_COMPETENCY_GOALS_QUERY = gql`
  query MyCompetencyGoals {
    myCompetencyGoals {
      id
      targetConceptName
      currentLevel
      targetLevel
      createdAt
    }
  }
`;

export const MY_LEARNING_PATH_QUERY = gql`
  query MyLearningPath($targetConceptName: String!) {
    myLearningPath(targetConceptName: $targetConceptName) {
      targetConceptName
      nodes {
        conceptName
        isCompleted
        contentItems
      }
      totalSteps
      completedSteps
    }
  }
`;

export const ADD_COMPETENCY_GOAL_MUTATION = gql`
  mutation AddCompetencyGoal(
    $targetConceptName: String!
    $targetLevel: String
  ) {
    addCompetencyGoal(
      targetConceptName: $targetConceptName
      targetLevel: $targetLevel
    ) {
      id
      targetConceptName
      currentLevel
      targetLevel
      createdAt
    }
  }
`;

export const REMOVE_COMPETENCY_GOAL_MUTATION = gql`
  mutation RemoveCompetencyGoal($goalId: ID!) {
    removeCompetencyGoal(goalId: $goalId)
  }
`;
