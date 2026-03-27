import { describe, it, expect } from 'vitest';
import { LIST_AT_RISK_LEARNERS_QUERY } from './at-risk.queries';

describe('at-risk.queries', () => {
  it('exports LIST_AT_RISK_LEARNERS_QUERY as a query DocumentNode', () => {
    expect(LIST_AT_RISK_LEARNERS_QUERY).toBeDefined();
    expect(LIST_AT_RISK_LEARNERS_QUERY.kind).toBe('Document');
    expect(LIST_AT_RISK_LEARNERS_QUERY.definitions.length).toBeGreaterThanOrEqual(1);
    const def = LIST_AT_RISK_LEARNERS_QUERY.definitions[0] as any;
    expect(def.kind).toBe('OperationDefinition');
    expect(def.operation).toBe('query');
    expect(def.name?.value).toBe('ListAtRiskLearners');
  });

});
