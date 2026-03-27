import { describe, it, expect } from 'vitest';
import { COHORT_INSIGHTS_QUERY } from './cohort-insights.queries';

describe('cohort-insights.queries', () => {
  it('exports COHORT_INSIGHTS_QUERY as a query string', () => {
    expect(COHORT_INSIGHTS_QUERY).toBeDefined();
    expect(typeof COHORT_INSIGHTS_QUERY).toBe('string');
    expect(COHORT_INSIGHTS_QUERY).toContain('query CohortInsights');
  });

});
