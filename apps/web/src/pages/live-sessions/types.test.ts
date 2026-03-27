import { describe, it, expect } from 'vitest';
import type { LiveSession, Tab } from './types';

describe('live-sessions/types', () => {
  it('LiveSession shape is valid', () => {
    const session: LiveSession = {
      id: '1',
      contentItemId: 'ci-1',
      meetingName: 'Session 1',
      scheduledAt: '2026-01-01T10:00:00Z',
      status: 'SCHEDULED',
      recordingUrl: null,
    };
    expect(session.status).toBe('SCHEDULED');
  });

  it('LiveSession accepts all status values', () => {
    const statuses: LiveSession['status'][] = ['SCHEDULED', 'LIVE', 'ENDED'];
    statuses.forEach((status) => {
      const session: LiveSession = {
        id: '1',
        contentItemId: 'ci-1',
        meetingName: 'Test',
        scheduledAt: '2026-01-01',
        status,
        recordingUrl: null,
      };
      expect(session.status).toBe(status);
    });
  });

  it('Tab accepts valid values', () => {
    const tabs: Tab[] = ['upcoming', 'past'];
    expect(tabs).toHaveLength(2);
  });
});
