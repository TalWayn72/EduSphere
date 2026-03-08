import { describe, it, expect } from 'vitest';

// Test thread date formatting logic — mirrors DiscussionsScreen createdAt display
function formatThreadDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  return `${diffDays} days ago`;
}

describe('DiscussionsScreen — thread date formatting', () => {
  it('returns "Today" for today', () => {
    expect(formatThreadDate(new Date().toISOString())).toBe('Today');
  });
  it('returns "Yesterday" for yesterday', () => {
    const yesterday = new Date(Date.now() - 86_400_000).toISOString();
    expect(formatThreadDate(yesterday)).toBe('Yesterday');
  });
  it('returns days ago for older dates', () => {
    const fiveDaysAgo = new Date(Date.now() - 5 * 86_400_000).toISOString();
    expect(formatThreadDate(fiveDaysAgo)).toBe('5 days ago');
  });
});
