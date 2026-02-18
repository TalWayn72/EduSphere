import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { formatRelativeTime } from './activity-feed.utils';

describe('formatRelativeTime', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-02-15T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns "Just now" for timestamps less than 1 hour ago', () => {
    const thirtyMinsAgo = new Date('2024-02-15T11:30:00Z').toISOString();
    expect(formatRelativeTime(thirtyMinsAgo)).toBe('Just now');
  });

  it('returns "Just now" for timestamp 59 minutes ago', () => {
    const fiftyNineMinsAgo = new Date('2024-02-15T11:01:00Z').toISOString();
    expect(formatRelativeTime(fiftyNineMinsAgo)).toBe('Just now');
  });

  it('returns "1h ago" for exactly 1 hour ago', () => {
    const oneHourAgo = new Date('2024-02-15T11:00:00Z').toISOString();
    expect(formatRelativeTime(oneHourAgo)).toBe('1h ago');
  });

  it('returns "5h ago" for 5 hours ago', () => {
    const fiveHoursAgo = new Date('2024-02-15T07:00:00Z').toISOString();
    expect(formatRelativeTime(fiveHoursAgo)).toBe('5h ago');
  });

  it('returns "23h ago" for 23 hours ago', () => {
    const twentyThreeHoursAgo = new Date('2024-02-14T13:00:00Z').toISOString();
    expect(formatRelativeTime(twentyThreeHoursAgo)).toBe('23h ago');
  });

  it('returns "1d ago" for exactly 24 hours ago', () => {
    const oneDayAgo = new Date('2024-02-14T12:00:00Z').toISOString();
    expect(formatRelativeTime(oneDayAgo)).toBe('1d ago');
  });

  it('returns "3d ago" for 3 days ago', () => {
    const threeDaysAgo = new Date('2024-02-12T12:00:00Z').toISOString();
    expect(formatRelativeTime(threeDaysAgo)).toBe('3d ago');
  });

  it('returns "7d ago" for 1 week ago', () => {
    const oneWeekAgo = new Date('2024-02-08T12:00:00Z').toISOString();
    expect(formatRelativeTime(oneWeekAgo)).toBe('7d ago');
  });
});
