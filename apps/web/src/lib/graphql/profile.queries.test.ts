import { describe, it, expect } from 'vitest';
import { PUBLIC_PROFILE_QUERY, FOLLOW_USER_MUTATION, UNFOLLOW_USER_MUTATION, MY_FOLLOWERS_QUERY, MY_FOLLOWING_QUERY, UPDATE_PROFILE_VISIBILITY_MUTATION } from './profile.queries';

describe('profile.queries', () => {
  it('exports PUBLIC_PROFILE_QUERY as a query DocumentNode', () => {
    expect(PUBLIC_PROFILE_QUERY).toBeDefined();
    expect(PUBLIC_PROFILE_QUERY.kind).toBe('Document');
    expect(PUBLIC_PROFILE_QUERY.definitions.length).toBeGreaterThanOrEqual(1);
    const def = PUBLIC_PROFILE_QUERY.definitions[0] as any;
    expect(def.kind).toBe('OperationDefinition');
    expect(def.operation).toBe('query');
    expect(def.name?.value).toBe('PublicProfile');
  });

  it('exports FOLLOW_USER_MUTATION as a mutation DocumentNode', () => {
    expect(FOLLOW_USER_MUTATION).toBeDefined();
    expect(FOLLOW_USER_MUTATION.kind).toBe('Document');
    expect(FOLLOW_USER_MUTATION.definitions.length).toBeGreaterThanOrEqual(1);
    const def = FOLLOW_USER_MUTATION.definitions[0] as any;
    expect(def.kind).toBe('OperationDefinition');
    expect(def.operation).toBe('mutation');
    expect(def.name?.value).toBe('FollowUser');
  });

  it('exports UNFOLLOW_USER_MUTATION as a mutation DocumentNode', () => {
    expect(UNFOLLOW_USER_MUTATION).toBeDefined();
    expect(UNFOLLOW_USER_MUTATION.kind).toBe('Document');
    expect(UNFOLLOW_USER_MUTATION.definitions.length).toBeGreaterThanOrEqual(1);
    const def = UNFOLLOW_USER_MUTATION.definitions[0] as any;
    expect(def.kind).toBe('OperationDefinition');
    expect(def.operation).toBe('mutation');
    expect(def.name?.value).toBe('UnfollowUser');
  });

  it('exports MY_FOLLOWERS_QUERY as a query DocumentNode', () => {
    expect(MY_FOLLOWERS_QUERY).toBeDefined();
    expect(MY_FOLLOWERS_QUERY.kind).toBe('Document');
    expect(MY_FOLLOWERS_QUERY.definitions.length).toBeGreaterThanOrEqual(1);
    const def = MY_FOLLOWERS_QUERY.definitions[0] as any;
    expect(def.kind).toBe('OperationDefinition');
    expect(def.operation).toBe('query');
    expect(def.name?.value).toBe('MyFollowers');
  });

  it('exports MY_FOLLOWING_QUERY as a query DocumentNode', () => {
    expect(MY_FOLLOWING_QUERY).toBeDefined();
    expect(MY_FOLLOWING_QUERY.kind).toBe('Document');
    expect(MY_FOLLOWING_QUERY.definitions.length).toBeGreaterThanOrEqual(1);
    const def = MY_FOLLOWING_QUERY.definitions[0] as any;
    expect(def.kind).toBe('OperationDefinition');
    expect(def.operation).toBe('query');
    expect(def.name?.value).toBe('MyFollowing');
  });

  it('exports UPDATE_PROFILE_VISIBILITY_MUTATION as a mutation DocumentNode', () => {
    expect(UPDATE_PROFILE_VISIBILITY_MUTATION).toBeDefined();
    expect(UPDATE_PROFILE_VISIBILITY_MUTATION.kind).toBe('Document');
    expect(UPDATE_PROFILE_VISIBILITY_MUTATION.definitions.length).toBeGreaterThanOrEqual(1);
    const def = UPDATE_PROFILE_VISIBILITY_MUTATION.definitions[0] as any;
    expect(def.kind).toBe('OperationDefinition');
    expect(def.operation).toBe('mutation');
    expect(def.name?.value).toBe('UpdateProfileVisibility');
  });

});
