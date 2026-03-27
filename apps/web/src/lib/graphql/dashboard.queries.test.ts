import { describe, it, expect } from 'vitest';
import { MY_IN_PROGRESS_COURSES_QUERY, MY_RECOMMENDED_COURSES_QUERY, MY_ACTIVITY_FEED_QUERY, MY_STATS_WITH_STREAK_QUERY, MY_TOP_MASTERY_TOPICS_QUERY } from './dashboard.queries';

describe('dashboard.queries', () => {
  it('exports MY_IN_PROGRESS_COURSES_QUERY as a query DocumentNode', () => {
    expect(MY_IN_PROGRESS_COURSES_QUERY).toBeDefined();
    expect(MY_IN_PROGRESS_COURSES_QUERY.kind).toBe('Document');
    expect(MY_IN_PROGRESS_COURSES_QUERY.definitions.length).toBeGreaterThanOrEqual(1);
    const def = MY_IN_PROGRESS_COURSES_QUERY.definitions[0] as any;
    expect(def.kind).toBe('OperationDefinition');
    expect(def.operation).toBe('query');
    expect(def.name?.value).toBe('MyInProgressCourses');
  });

  it('exports MY_RECOMMENDED_COURSES_QUERY as a query DocumentNode', () => {
    expect(MY_RECOMMENDED_COURSES_QUERY).toBeDefined();
    expect(MY_RECOMMENDED_COURSES_QUERY.kind).toBe('Document');
    expect(MY_RECOMMENDED_COURSES_QUERY.definitions.length).toBeGreaterThanOrEqual(1);
    const def = MY_RECOMMENDED_COURSES_QUERY.definitions[0] as any;
    expect(def.kind).toBe('OperationDefinition');
    expect(def.operation).toBe('query');
    expect(def.name?.value).toBe('MyRecommendedCourses');
  });

  it('exports MY_ACTIVITY_FEED_QUERY as a query DocumentNode', () => {
    expect(MY_ACTIVITY_FEED_QUERY).toBeDefined();
    expect(MY_ACTIVITY_FEED_QUERY.kind).toBe('Document');
    expect(MY_ACTIVITY_FEED_QUERY.definitions.length).toBeGreaterThanOrEqual(1);
    const def = MY_ACTIVITY_FEED_QUERY.definitions[0] as any;
    expect(def.kind).toBe('OperationDefinition');
    expect(def.operation).toBe('query');
    expect(def.name?.value).toBe('MyActivityFeed');
  });

  it('exports MY_STATS_WITH_STREAK_QUERY as a query DocumentNode', () => {
    expect(MY_STATS_WITH_STREAK_QUERY).toBeDefined();
    expect(MY_STATS_WITH_STREAK_QUERY.kind).toBe('Document');
    expect(MY_STATS_WITH_STREAK_QUERY.definitions.length).toBeGreaterThanOrEqual(1);
    const def = MY_STATS_WITH_STREAK_QUERY.definitions[0] as any;
    expect(def.kind).toBe('OperationDefinition');
    expect(def.operation).toBe('query');
    expect(def.name?.value).toBe('MyStatsWithStreak');
  });

  it('exports MY_TOP_MASTERY_TOPICS_QUERY as a query DocumentNode', () => {
    expect(MY_TOP_MASTERY_TOPICS_QUERY).toBeDefined();
    expect(MY_TOP_MASTERY_TOPICS_QUERY.kind).toBe('Document');
    expect(MY_TOP_MASTERY_TOPICS_QUERY.definitions.length).toBeGreaterThanOrEqual(1);
    const def = MY_TOP_MASTERY_TOPICS_QUERY.definitions[0] as any;
    expect(def.kind).toBe('OperationDefinition');
    expect(def.operation).toBe('query');
    expect(def.name?.value).toBe('MyTopMasteryTopics');
  });

});
