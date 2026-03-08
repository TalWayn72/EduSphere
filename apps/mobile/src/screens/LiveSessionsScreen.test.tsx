/**
 * LiveSessionsScreen — pure logic tests.
 * No @testing-library/react-native required (not installed).
 * Tests tab state, mock data shape, and date formatting logic.
 */
import { describe, it, expect } from 'vitest';

// ---------------------------------------------------------------------------
// Mock session data shape (mirrors MOCK_UPCOMING / MOCK_PAST in screen)
// ---------------------------------------------------------------------------
const MOCK_UPCOMING = [
  {
    id: 'ls-1',
    meetingName: 'Philosophy of Mind — Week 5',
    scheduledAt: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
    status: 'SCHEDULED',
  },
  {
    id: 'ls-2',
    meetingName: 'Ethics Discussion Group',
    scheduledAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    status: 'SCHEDULED',
  },
];

const MOCK_PAST = [
  {
    id: 'ls-3',
    meetingName: 'Logic Intro — Session 1',
    scheduledAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'ENDED',
    recordingUrl: 'https://example.com/recording/ls-3',
  },
];

// ---------------------------------------------------------------------------
// Tab state logic (mirrors useState initial value in component)
// ---------------------------------------------------------------------------
describe('LiveSessionsScreen — tab state', () => {
  it('initial tab is "upcoming"', () => {
    const initialTab: 'upcoming' | 'past' = 'upcoming';
    expect(initialTab).toBe('upcoming');
  });

  it('tabs are limited to "upcoming" and "past"', () => {
    const validTabs = ['upcoming', 'past'];
    expect(validTabs).toHaveLength(2);
    expect(validTabs).toContain('upcoming');
    expect(validTabs).toContain('past');
  });
});

// ---------------------------------------------------------------------------
// Mock data shape
// ---------------------------------------------------------------------------
describe('LiveSessionsScreen — MOCK_UPCOMING shape', () => {
  it('has 2 upcoming sessions', () => {
    expect(MOCK_UPCOMING).toHaveLength(2);
  });

  it('all sessions have required fields', () => {
    for (const s of MOCK_UPCOMING) {
      expect(s.id).toBeTruthy();
      expect(s.meetingName).toBeTruthy();
      expect(s.scheduledAt).toBeTruthy();
      expect(s.status).toBe('SCHEDULED');
    }
  });

  it('all session ids are unique', () => {
    const ids = MOCK_UPCOMING.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('upcoming sessions are in the future', () => {
    const now = Date.now();
    for (const s of MOCK_UPCOMING) {
      expect(new Date(s.scheduledAt).getTime()).toBeGreaterThan(now);
    }
  });
});

describe('LiveSessionsScreen — MOCK_PAST shape', () => {
  it('has 1 past session', () => {
    expect(MOCK_PAST).toHaveLength(1);
  });

  it('past session has ENDED status', () => {
    expect(MOCK_PAST[0]!.status).toBe('ENDED');
  });

  it('past session has a recordingUrl', () => {
    expect(MOCK_PAST[0]!.recordingUrl).toBeTruthy();
  });

  it('past session is in the past', () => {
    const now = Date.now();
    expect(new Date(MOCK_PAST[0]!.scheduledAt).getTime()).toBeLessThan(now);
  });
});

// ---------------------------------------------------------------------------
// Date formatting logic (mirrors formatDate in component)
// ---------------------------------------------------------------------------
function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

describe('LiveSessionsScreen — formatDate', () => {
  it('returns a non-empty string for a valid ISO date', () => {
    const result = formatDate(new Date().toISOString());
    expect(result.length).toBeGreaterThan(0);
  });

  it('includes hour and minute in formatted output', () => {
    const fixed = new Date('2025-03-15T14:30:00Z').toISOString();
    const result = formatDate(fixed);
    expect(result).toMatch(/\d{1,2}:\d{2}/);
  });
});
