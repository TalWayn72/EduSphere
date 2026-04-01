import { describe, it, expect } from 'vitest';
import {
  SOCIAL_FEED_QUERY,
  SOCIAL_RECOMMENDATIONS_QUERY,
  MY_FOLLOWERS_QUERY,
  MY_FOLLOWING_QUERY,
  SEARCH_USERS_QUERY,
} from './social.queries';

describe('social.queries', () => {
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

  it('exports MY_FOLLOWERS_QUERY as a query DocumentNode', () => {
    expect(MY_FOLLOWERS_QUERY).toBeDefined();
    expect(MY_FOLLOWERS_QUERY.kind).toBe('Document');
    expect(MY_FOLLOWERS_QUERY.definitions.length).toBeGreaterThanOrEqual(1);
    const def = MY_FOLLOWERS_QUERY.definitions[0] as {
      kind: string;
      operation: string;
      name?: { value: string };
    };
    expect(def.kind).toBe('OperationDefinition');
    expect(def.operation).toBe('query');
    expect(def.name?.value).toBe('MyFollowers');
  });

  it('exports MY_FOLLOWING_QUERY as a query DocumentNode', () => {
    expect(MY_FOLLOWING_QUERY).toBeDefined();
    expect(MY_FOLLOWING_QUERY.kind).toBe('Document');
    expect(MY_FOLLOWING_QUERY.definitions.length).toBeGreaterThanOrEqual(1);
    const def = MY_FOLLOWING_QUERY.definitions[0] as {
      kind: string;
      operation: string;
      name?: { value: string };
    };
    expect(def.kind).toBe('OperationDefinition');
    expect(def.operation).toBe('query');
    expect(def.name?.value).toBe('MyFollowing');
  });

  it('exports SEARCH_USERS_QUERY as a query DocumentNode', () => {
    expect(SEARCH_USERS_QUERY).toBeDefined();
    expect(SEARCH_USERS_QUERY.kind).toBe('Document');
    expect(SEARCH_USERS_QUERY.definitions.length).toBeGreaterThanOrEqual(1);
    const def = SEARCH_USERS_QUERY.definitions[0] as {
      kind: string;
      operation: string;
      name?: { value: string };
    };
    expect(def.kind).toBe('OperationDefinition');
    expect(def.operation).toBe('query');
    expect(def.name?.value).toBe('SearchUsers');
  });
});
