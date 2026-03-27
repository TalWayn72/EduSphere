import { describe, it, expect } from 'vitest';
import { MY_BADGES_QUERY, VERIFY_BADGE_QUERY, BADGE_DEFINITIONS_QUERY, CREATE_BADGE_DEFINITION_MUTATION, ISSUE_BADGE_MUTATION, REVOKE_BADGE_MUTATION } from './badge.queries';

describe('badge.queries', () => {
  it('exports MY_BADGES_QUERY as a query string', () => {
    expect(MY_BADGES_QUERY).toBeDefined();
    expect(typeof MY_BADGES_QUERY).toBe('string');
    expect(MY_BADGES_QUERY).toContain('query MyBadges');
  });

  it('exports VERIFY_BADGE_QUERY as a query string', () => {
    expect(VERIFY_BADGE_QUERY).toBeDefined();
    expect(typeof VERIFY_BADGE_QUERY).toBe('string');
    expect(VERIFY_BADGE_QUERY).toContain('query VerifyBadge');
  });

  it('exports BADGE_DEFINITIONS_QUERY as a query string', () => {
    expect(BADGE_DEFINITIONS_QUERY).toBeDefined();
    expect(typeof BADGE_DEFINITIONS_QUERY).toBe('string');
    expect(BADGE_DEFINITIONS_QUERY).toContain('query BadgeDefinitions');
  });

  it('exports CREATE_BADGE_DEFINITION_MUTATION as a mutation string', () => {
    expect(CREATE_BADGE_DEFINITION_MUTATION).toBeDefined();
    expect(typeof CREATE_BADGE_DEFINITION_MUTATION).toBe('string');
    expect(CREATE_BADGE_DEFINITION_MUTATION).toContain('mutation CreateBadgeDefinition');
  });

  it('exports ISSUE_BADGE_MUTATION as a mutation string', () => {
    expect(ISSUE_BADGE_MUTATION).toBeDefined();
    expect(typeof ISSUE_BADGE_MUTATION).toBe('string');
    expect(ISSUE_BADGE_MUTATION).toContain('mutation IssueBadge');
  });

  it('exports REVOKE_BADGE_MUTATION as a mutation string', () => {
    expect(REVOKE_BADGE_MUTATION).toBeDefined();
    expect(typeof REVOKE_BADGE_MUTATION).toBe('string');
    expect(REVOKE_BADGE_MUTATION).toContain('mutation RevokeBadge');
  });

});
