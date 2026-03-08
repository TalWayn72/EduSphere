import { gql } from 'urql';

export const MY_COURSE_LESSON_PLANS_QUERY = gql`
  query MyCourseLessonPlans($courseId: ID!) {
    myCourseLessonPlans(courseId: $courseId) {
      id
      courseId
      title
      status
      steps {
        id
        stepType
        stepOrder
        config
      }
      createdAt
    }
  }
`;

export const COURSE_LESSON_PLAN_QUERY = gql`
  query CourseLessonPlan($id: ID!) {
    courseLessonPlan(id: $id) {
      id
      courseId
      title
      status
      steps {
        id
        stepType
        stepOrder
        config
      }
      createdAt
    }
  }
`;

export const CREATE_LESSON_PLAN_MUTATION = gql`
  mutation CreateLessonPlan($input: CreateLessonPlanInput!) {
    createLessonPlan(input: $input) {
      id
      courseId
      title
      status
      steps {
        id
        stepType
        stepOrder
        config
      }
      createdAt
    }
  }
`;

export const ADD_LESSON_STEP_MUTATION = gql`
  mutation AddLessonStep($input: AddLessonStepInput!) {
    addLessonStep(input: $input) {
      id
      title
      status
      steps {
        id
        stepType
        stepOrder
        config
      }
    }
  }
`;

export const REORDER_LESSON_STEPS_MUTATION = gql`
  mutation ReorderLessonSteps($planId: ID!, $stepIds: [ID!]!) {
    reorderLessonSteps(planId: $planId, stepIds: $stepIds) {
      id
      steps {
        id
        stepType
        stepOrder
      }
    }
  }
`;

export const PUBLISH_LESSON_PLAN_MUTATION = gql`
  mutation PublishLessonPlan($id: ID!) {
    publishLessonPlan(id: $id) {
      id
      status
    }
  }
`;
