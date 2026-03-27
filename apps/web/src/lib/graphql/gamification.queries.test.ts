import { describe, it, expect } from 'vitest';
import { MY_BADGES_QUERY, LEADERBOARD_QUERY, MY_RANK_QUERY, MY_TOTAL_POINTS_QUERY, MY_GAMIFICATION_STATS_QUERY, TENANT_LEADERBOARD_QUERY } from './gamification.queries';

describe('gamification.queries', () => {
  it('exports MY_BADGES_QUERY as a query DocumentNode', () => {
    expect(MY_BADGES_QUERY).toBeDefined();
    expect(MY_BADGES_QUERY.kind).toBe('Document');
    expect(MY_BADGES_QUERY.definitions.length).toBeGreaterThanOrEqual(1);
    const def = MY_BADGES_QUERY.definitions[0] as { kind: string; operation: string; name?: { value: string } };
    expect(def.kind).toBe('OperationDefinition');
    expect(def.operation).toBe('query');
    expect(def.name?.value).toBe('MyBadges');
  });

  it('exports LEADERBOARD_QUERY as a query DocumentNode', () => {
    expect(LEADERBOARD_QUERY).toBeDefined();
    expect(LEADERBOARD_QUERY.kind).toBe('Document');
    expect(LEADERBOARD_QUERY.definitions.length).toBeGreaterThanOrEqual(1);
    const def = LEADERBOARD_QUERY.definitions[0] as { kind: string; operation: string; name?: { value: string } };
    expect(def.kind).toBe('OperationDefinition');
    expect(def.operation).toBe('query');
    expect(def.name?.value).toBe('Leaderboard');
  });

  it('exports MY_RANK_QUERY as a query DocumentNode', () => {
    expect(MY_RANK_QUERY).toBeDefined();
    expect(MY_RANK_QUERY.kind).toBe('Document');
    expect(MY_RANK_QUERY.definitions.length).toBeGreaterThanOrEqual(1);
    const def = MY_RANK_QUERY.definitions[0] as { kind: string; operation: string; name?: { value: string } };
    expect(def.kind).toBe('OperationDefinition');
    expect(def.operation).toBe('query');
    expect(def.name?.value).toBe('MyRank');
  });

  it('exports MY_TOTAL_POINTS_QUERY as a query DocumentNode', () => {
    expect(MY_TOTAL_POINTS_QUERY).toBeDefined();
    expect(MY_TOTAL_POINTS_QUERY.kind).toBe('Document');
    expect(MY_TOTAL_POINTS_QUERY.definitions.length).toBeGreaterThanOrEqual(1);
    const def = MY_TOTAL_POINTS_QUERY.definitions[0] as { kind: string; operation: string; name?: { value: string } };
    expect(def.kind).toBe('OperationDefinition');
    expect(def.operation).toBe('query');
    expect(def.name?.value).toBe('MyTotalPoints');
  });

  it('exports MY_GAMIFICATION_STATS_QUERY as a query DocumentNode', () => {
    expect(MY_GAMIFICATION_STATS_QUERY).toBeDefined();
    expect(MY_GAMIFICATION_STATS_QUERY.kind).toBe('Document');
    expect(MY_GAMIFICATION_STATS_QUERY.definitions.length).toBeGreaterThanOrEqual(1);
    const def = MY_GAMIFICATION_STATS_QUERY.definitions[0] as { kind: string; operation: string; name?: { value: string } };
    expect(def.kind).toBe('OperationDefinition');
    expect(def.operation).toBe('query');
    expect(def.name?.value).toBe('MyGamificationStats');
  });

  it('exports TENANT_LEADERBOARD_QUERY as a query DocumentNode', () => {
    expect(TENANT_LEADERBOARD_QUERY).toBeDefined();
    expect(TENANT_LEADERBOARD_QUERY.kind).toBe('Document');
    expect(TENANT_LEADERBOARD_QUERY.definitions.length).toBeGreaterThanOrEqual(1);
    const def = TENANT_LEADERBOARD_QUERY.definitions[0] as { kind: string; operation: string; name?: { value: string } };
    expect(def.kind).toBe('OperationDefinition');
    expect(def.operation).toBe('query');
    expect(def.name?.value).toBe('TenantLeaderboard');
  });

});
