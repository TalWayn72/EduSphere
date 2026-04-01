import { describe, it, expect } from 'vitest';
import {
  SKILL_GAP_ANALYSIS_QUERY,
  SKILL_PROFILES_QUERY,
  CREATE_SKILL_PROFILE_MUTATION,
  SOCIAL_RECOMMENDATIONS_QUERY,
  SOCIAL_FEED_QUERY,
} from './knowledge-tier3.queries';

describe('knowledge-tier3.queries', () => {
  it('exports SKILL_GAP_ANALYSIS_QUERY as a query DocumentNode', () => {
    expect(SKILL_GAP_ANALYSIS_QUERY).toBeDefined();
    expect(SKILL_GAP_ANALYSIS_QUERY.kind).toBe('Document');
    expect(SKILL_GAP_ANALYSIS_QUERY.definitions.length).toBeGreaterThanOrEqual(
      1
    );
    const def = SKILL_GAP_ANALYSIS_QUERY.definitions[0] as {
      kind: string;
      operation: string;
      name?: { value: string };
    };
    expect(def.kind).toBe('OperationDefinition');
    expect(def.operation).toBe('query');
    expect(def.name?.value).toBe('SkillGapReport');
  });

  it('exports SKILL_PROFILES_QUERY as a query DocumentNode', () => {
    expect(SKILL_PROFILES_QUERY).toBeDefined();
    expect(SKILL_PROFILES_QUERY.kind).toBe('Document');
    expect(SKILL_PROFILES_QUERY.definitions.length).toBeGreaterThanOrEqual(1);
    const def = SKILL_PROFILES_QUERY.definitions[0] as {
      kind: string;
      operation: string;
      name?: { value: string };
    };
    expect(def.kind).toBe('OperationDefinition');
    expect(def.operation).toBe('query');
    expect(def.name?.value).toBe('SkillProfiles');
  });

  it('exports CREATE_SKILL_PROFILE_MUTATION as a mutation DocumentNode', () => {
    expect(CREATE_SKILL_PROFILE_MUTATION).toBeDefined();
    expect(CREATE_SKILL_PROFILE_MUTATION.kind).toBe('Document');
    expect(
      CREATE_SKILL_PROFILE_MUTATION.definitions.length
    ).toBeGreaterThanOrEqual(1);
    const def = CREATE_SKILL_PROFILE_MUTATION.definitions[0] as {
      kind: string;
      operation: string;
      name?: { value: string };
    };
    expect(def.kind).toBe('OperationDefinition');
    expect(def.operation).toBe('mutation');
    expect(def.name?.value).toBe('CreateSkillProfile');
  });

  it('exports SOCIAL_RECOMMENDATIONS_QUERY as a query DocumentNode', () => {
    expect(SOCIAL_RECOMMENDATIONS_QUERY).toBeDefined();
    expect(SOCIAL_RECOMMENDATIONS_QUERY.kind).toBe('Document');
    expect(
      SOCIAL_RECOMMENDATIONS_QUERY.definitions.length
    ).toBeGreaterThanOrEqual(1);
    const def = SOCIAL_RECOMMENDATIONS_QUERY.definitions[0] as {
      kind: string;
      operation: string;
      name?: { value: string };
    };
    expect(def.kind).toBe('OperationDefinition');
    expect(def.operation).toBe('query');
    expect(def.name?.value).toBe('SocialRecommendations');
  });

  it('exports SOCIAL_FEED_QUERY as a query DocumentNode', () => {
    expect(SOCIAL_FEED_QUERY).toBeDefined();
    expect(SOCIAL_FEED_QUERY.kind).toBe('Document');
    expect(SOCIAL_FEED_QUERY.definitions.length).toBeGreaterThanOrEqual(1);
    const def = SOCIAL_FEED_QUERY.definitions[0] as {
      kind: string;
      operation: string;
      name?: { value: string };
    };
    expect(def.kind).toBe('OperationDefinition');
    expect(def.operation).toBe('query');
    expect(def.name?.value).toBe('SocialFeed');
  });
});
