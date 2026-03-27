import { describe, it, expect } from 'vitest';
import { ADMIN_BADGES_QUERY, CREATE_BADGE_MUTATION, UPDATE_BADGE_MUTATION, DELETE_BADGE_MUTATION } from './admin-gamification.queries';

describe('admin-gamification.queries', () => {
  it('exports ADMIN_BADGES_QUERY as a query string', () => {
    expect(ADMIN_BADGES_QUERY).toBeDefined();
    expect(typeof ADMIN_BADGES_QUERY).toBe('string');
    expect(ADMIN_BADGES_QUERY).toContain('query AdminBadges');
  });

  it('exports CREATE_BADGE_MUTATION as a mutation string', () => {
    expect(CREATE_BADGE_MUTATION).toBeDefined();
    expect(typeof CREATE_BADGE_MUTATION).toBe('string');
    expect(CREATE_BADGE_MUTATION).toContain('mutation CreateBadge');
  });

  it('exports UPDATE_BADGE_MUTATION as a mutation string', () => {
    expect(UPDATE_BADGE_MUTATION).toBeDefined();
    expect(typeof UPDATE_BADGE_MUTATION).toBe('string');
    expect(UPDATE_BADGE_MUTATION).toContain('mutation UpdateBadge');
  });

  it('exports DELETE_BADGE_MUTATION as a mutation string', () => {
    expect(DELETE_BADGE_MUTATION).toBeDefined();
    expect(typeof DELETE_BADGE_MUTATION).toBe('string');
    expect(DELETE_BADGE_MUTATION).toContain('mutation DeleteBadge');
  });

});
