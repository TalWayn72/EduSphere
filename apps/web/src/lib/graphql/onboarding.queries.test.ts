import { describe, it, expect } from 'vitest';
import {
  MY_ONBOARDING_STATE_QUERY,
  UPDATE_ONBOARDING_STEP_MUTATION,
  COMPLETE_ONBOARDING_MUTATION,
  SKIP_ONBOARDING_MUTATION,
} from './onboarding.queries';

describe('onboarding.queries', () => {
  it('exports MY_ONBOARDING_STATE_QUERY as a query DocumentNode', () => {
    expect(MY_ONBOARDING_STATE_QUERY).toBeDefined();
    expect(MY_ONBOARDING_STATE_QUERY.kind).toBe('Document');
    expect(MY_ONBOARDING_STATE_QUERY.definitions.length).toBeGreaterThanOrEqual(
      1
    );
    const def = MY_ONBOARDING_STATE_QUERY.definitions[0] as {
      kind: string;
      operation: string;
      name?: { value: string };
    };
    expect(def.kind).toBe('OperationDefinition');
    expect(def.operation).toBe('query');
    expect(def.name?.value).toBe('MyOnboardingState');
  });

  it('exports UPDATE_ONBOARDING_STEP_MUTATION as a mutation DocumentNode', () => {
    expect(UPDATE_ONBOARDING_STEP_MUTATION).toBeDefined();
    expect(UPDATE_ONBOARDING_STEP_MUTATION.kind).toBe('Document');
    expect(
      UPDATE_ONBOARDING_STEP_MUTATION.definitions.length
    ).toBeGreaterThanOrEqual(1);
    const def = UPDATE_ONBOARDING_STEP_MUTATION.definitions[0] as {
      kind: string;
      operation: string;
      name?: { value: string };
    };
    expect(def.kind).toBe('OperationDefinition');
    expect(def.operation).toBe('mutation');
    expect(def.name?.value).toBe('UpdateOnboardingStep');
  });

  it('exports COMPLETE_ONBOARDING_MUTATION as a mutation DocumentNode', () => {
    expect(COMPLETE_ONBOARDING_MUTATION).toBeDefined();
    expect(COMPLETE_ONBOARDING_MUTATION.kind).toBe('Document');
    expect(
      COMPLETE_ONBOARDING_MUTATION.definitions.length
    ).toBeGreaterThanOrEqual(1);
    const def = COMPLETE_ONBOARDING_MUTATION.definitions[0] as {
      kind: string;
      operation: string;
      name?: { value: string };
    };
    expect(def.kind).toBe('OperationDefinition');
    expect(def.operation).toBe('mutation');
    expect(def.name?.value).toBe('CompleteOnboarding');
  });

  it('exports SKIP_ONBOARDING_MUTATION as a mutation DocumentNode', () => {
    expect(SKIP_ONBOARDING_MUTATION).toBeDefined();
    expect(SKIP_ONBOARDING_MUTATION.kind).toBe('Document');
    expect(SKIP_ONBOARDING_MUTATION.definitions.length).toBeGreaterThanOrEqual(
      1
    );
    const def = SKIP_ONBOARDING_MUTATION.definitions[0] as {
      kind: string;
      operation: string;
      name?: { value: string };
    };
    expect(def.kind).toBe('OperationDefinition');
    expect(def.operation).toBe('mutation');
    expect(def.name?.value).toBe('SkipOnboarding');
  });
});
