import { describe, it, expect } from 'vitest';
import { PLATFORM_BADGES, POINT_AWARDS } from './badge-definitions.js';
import type { BadgeDefinition } from './badge-definitions.js';

describe('PLATFORM_BADGES', () => {
  it('is a non-empty readonly array', () => {
    expect(Array.isArray(PLATFORM_BADGES)).toBe(true);
    expect(PLATFORM_BADGES.length).toBeGreaterThan(0);
  });

  it('every badge has all required fields with correct types', () => {
    for (const badge of PLATFORM_BADGES) {
      expect(typeof badge.name).toBe('string');
      expect(badge.name.length).toBeGreaterThan(0);
      expect(typeof badge.description).toBe('string');
      expect(typeof badge.icon).toBe('string');
      expect(['STREAK', 'COMPLETION', 'ENGAGEMENT', 'SOCIAL']).toContain(
        badge.category
      );
      expect(typeof badge.pointsReward).toBe('number');
      expect(badge.pointsReward).toBeGreaterThan(0);
      expect(typeof badge.conditionType).toBe('string');
      expect(typeof badge.conditionValue).toBe('number');
      expect(badge.conditionValue).toBeGreaterThan(0);
    }
  });

  it('contains the "First Step" completion badge', () => {
    const badge = PLATFORM_BADGES.find((b) => b.name === 'First Step');
    expect(badge).toBeDefined();
    expect(badge?.category).toBe('COMPLETION');
    expect(badge?.conditionType).toBe('courses_completed');
    expect(badge?.conditionValue).toBe(1);
    expect(badge?.pointsReward).toBe(100);
  });

  it('contains the "Scholar" badge for 5 courses', () => {
    const badge = PLATFORM_BADGES.find((b) => b.name === 'Scholar');
    expect(badge).toBeDefined();
    expect(badge?.conditionValue).toBe(5);
    expect(badge?.pointsReward).toBe(500);
  });

  it('contains streak badges for 7 and 30 days', () => {
    const streakBadges = PLATFORM_BADGES.filter((b) => b.category === 'STREAK');
    expect(streakBadges.length).toBeGreaterThanOrEqual(2);
    const values = streakBadges.map((b) => b.conditionValue);
    expect(values).toContain(7);
    expect(values).toContain(30);
  });

  it('contains at least one badge per category', () => {
    const categories = new Set(PLATFORM_BADGES.map((b) => b.category));
    expect(categories.has('STREAK')).toBe(true);
    expect(categories.has('COMPLETION')).toBe(true);
    expect(categories.has('ENGAGEMENT')).toBe(true);
    expect(categories.has('SOCIAL')).toBe(true);
  });

  it('contains "Annotator" engagement badge with correct values', () => {
    const badge = PLATFORM_BADGES.find((b) => b.name === 'Annotator');
    expect(badge).toBeDefined();
    expect(badge?.category).toBe('ENGAGEMENT');
    expect(badge?.conditionType).toBe('annotations_created');
    expect(badge?.conditionValue).toBe(10);
  });

  it('all badge names are unique', () => {
    const names = PLATFORM_BADGES.map((b) => b.name);
    const uniqueNames = new Set(names);
    expect(uniqueNames.size).toBe(names.length);
  });

  it('COMPLETION badges are ordered by conditionValue (progressive)', () => {
    const completion = PLATFORM_BADGES.filter(
      (b): b is BadgeDefinition => b.category === 'COMPLETION'
    );
    const sorted = [...completion].sort((a, b) => a.conditionValue - b.conditionValue);
    expect(completion.map((b) => b.conditionValue)).toEqual(
      sorted.map((b) => b.conditionValue)
    );
  });
});

describe('POINT_AWARDS', () => {
  it('is a non-empty plain object', () => {
    expect(typeof POINT_AWARDS).toBe('object');
    expect(Object.keys(POINT_AWARDS).length).toBeGreaterThan(0);
  });

  it('awards points for course.completed', () => {
    expect(POINT_AWARDS['course.completed']).toBe(100);
  });

  it('awards points for annotation.created', () => {
    expect(POINT_AWARDS['annotation.created']).toBe(10);
  });

  it('awards points for quiz.passed', () => {
    expect(POINT_AWARDS['quiz.passed']).toBe(50);
  });

  it('awards milestone streak points for 7 days', () => {
    expect(POINT_AWARDS['streak.milestone.7']).toBe(200);
  });

  it('awards milestone streak points for 30 days', () => {
    expect(POINT_AWARDS['streak.milestone.30']).toBe(1000);
  });

  it('30-day streak milestone awards more points than 7-day', () => {
    expect(POINT_AWARDS['streak.milestone.30']!).toBeGreaterThan(
      POINT_AWARDS['streak.milestone.7']!
    );
  });

  it('all point values are positive numbers', () => {
    for (const [event, points] of Object.entries(POINT_AWARDS)) {
      expect(
        typeof points === 'number' && points > 0,
        `Event '${event}' should have positive points`
      ).toBe(true);
    }
  });
});
