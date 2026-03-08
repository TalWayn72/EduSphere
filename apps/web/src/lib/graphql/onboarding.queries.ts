import { gql } from 'urql';

export const MY_ONBOARDING_STATE_QUERY = gql`
  query MyOnboardingState {
    myOnboardingState {
      userId
      currentStep
      totalSteps
      completed
      skipped
      role
      data
    }
  }
`;

export const UPDATE_ONBOARDING_STEP_MUTATION = gql`
  mutation UpdateOnboardingStep($input: UpdateOnboardingStepInput!) {
    updateOnboardingStep(input: $input) {
      userId
      currentStep
      totalSteps
      completed
      skipped
      role
      data
    }
  }
`;

export const COMPLETE_ONBOARDING_MUTATION = gql`
  mutation CompleteOnboarding {
    completeOnboarding {
      userId
      currentStep
      totalSteps
      completed
      skipped
      role
      data
    }
  }
`;

export const SKIP_ONBOARDING_MUTATION = gql`
  mutation SkipOnboarding {
    skipOnboarding {
      userId
      currentStep
      totalSteps
      completed
      skipped
      role
      data
    }
  }
`;
