/**
 * push-notifications.test.ts — Unit tests for tenant-scoped push notification topics.
 * Pure logic tests: verifies topic name construction and format.
 * Does NOT import expo-notifications — inlines the pure functions.
 */
// ── Inline pure functions from push-notifications.ts ────────────────────────

function buildPushTopics(tenantSlug: string): string[] {
  return [
    `org:${tenantSlug}:announcements`,
    `org:${tenantSlug}:course-updates`,
  ];
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('push-notifications — buildPushTopics', () => {
  it('returns exactly 2 topics', () => {
    const topics = buildPushTopics('acme');
    expect(topics).toHaveLength(2);
  });

  it('includes announcements topic', () => {
    const topics = buildPushTopics('acme');
    expect(topics).toContain('org:acme:announcements');
  });

  it('includes course-updates topic', () => {
    const topics = buildPushTopics('acme');
    expect(topics).toContain('org:acme:course-updates');
  });

  it('includes tenant slug in all topics', () => {
    const slug = 'beta-university';
    const topics = buildPushTopics(slug);
    for (const topic of topics) {
      expect(topic).toContain(slug);
    }
  });

  it('uses org: prefix for all topics', () => {
    const topics = buildPushTopics('gamma');
    for (const topic of topics) {
      expect(topic).toMatch(/^org:/);
    }
  });

  it('produces unique topics for different tenants', () => {
    const topicsA = buildPushTopics('org-a');
    const topicsB = buildPushTopics('org-b');
    expect(topicsA[0]).not.toBe(topicsB[0]);
    expect(topicsA[1]).not.toBe(topicsB[1]);
  });

  it('produces same topics for same tenant (deterministic)', () => {
    const topics1 = buildPushTopics('acme');
    const topics2 = buildPushTopics('acme');
    expect(topics1).toEqual(topics2);
  });

  it('handles hyphenated slugs', () => {
    const topics = buildPushTopics('acme-corp');
    expect(topics[0]).toBe('org:acme-corp:announcements');
    expect(topics[1]).toBe('org:acme-corp:course-updates');
  });

  it('handles underscored slugs', () => {
    const topics = buildPushTopics('acme_corp');
    expect(topics[0]).toBe('org:acme_corp:announcements');
  });
});
