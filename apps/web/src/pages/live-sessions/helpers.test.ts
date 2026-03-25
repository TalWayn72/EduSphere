import { describe, it, expect, vi, afterEach } from 'vitest';
import { formatRelativeTime } from './helpers';

describe('formatRelativeTime', () => {
  afterEach(() => vi.useRealTimers());

  it('returns Started for past dates', () => {
    vi.useFakeTimers({ now: new Date('2026-03-24T12:00:00Z') });
    expect(formatRelativeTime('2026-03-24T11:00:00Z')).toBe('Started');
  });

  it('returns Starts in Xm for minutes away', () => {
    vi.useFakeTimers({ now: new Date('2026-03-24T12:00:00Z') });
    expect(formatRelativeTime('2026-03-24T12:30:00Z')).toBe('Starts in 30m');
  });

  it('returns Starts in Xh for hours away', () => {
    vi.useFakeTimers({ now: new Date('2026-03-24T12:00:00Z') });
    expect(formatRelativeTime('2026-03-24T15:00:00Z')).toBe('Starts in 3h');
  });

  it('returns Starts in Xd for days away', () => {
    vi.useFakeTimers({ now: new Date('2026-03-24T12:00:00Z') });
    expect(formatRelativeTime('2026-03-27T12:00:00Z')).toBe('Starts in 3d');
  });
});
