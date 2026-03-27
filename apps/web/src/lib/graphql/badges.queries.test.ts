import { describe, it, expect } from 'vitest';
import { MY_OPEN_BADGES_QUERY } from './badges.queries';

describe('badges.queries', () => {
  it('exports MY_OPEN_BADGES_QUERY as a query DocumentNode', () => {
    expect(MY_OPEN_BADGES_QUERY).toBeDefined();
    expect(MY_OPEN_BADGES_QUERY.kind).toBe('Document');
    expect(MY_OPEN_BADGES_QUERY.definitions.length).toBeGreaterThanOrEqual(1);
    const def = MY_OPEN_BADGES_QUERY.definitions[0] as any;
    expect(def.kind).toBe('OperationDefinition');
    expect(def.operation).toBe('query');
    expect(def.name?.value).toBe('MyOpenBadges');
  });

});
