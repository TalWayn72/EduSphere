import { describe, it, expect } from 'vitest';

function formatDisplayName(firstName: string | null, lastName: string | null, email: string): string {
  if (firstName && lastName) return `${firstName} ${lastName}`;
  if (firstName) return firstName;
  return email.split('@')[0] ?? email;
}

function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!local || !domain) return email;
  return `${local[0]}${'*'.repeat(Math.max(0, local.length - 2))}${local[local.length - 1]}@${domain}`;
}

describe('ProfileScreen — data formatting', () => {
  it('formats full name when both parts present', () => {
    expect(formatDisplayName('Alice', 'Cohen', 'alice@example.com')).toBe('Alice Cohen');
  });
  it('uses first name only when last name absent', () => {
    expect(formatDisplayName('Alice', null, 'alice@example.com')).toBe('Alice');
  });
  it('falls back to email username when no name', () => {
    expect(formatDisplayName(null, null, 'alice@example.com')).toBe('alice');
  });
  it('masks email correctly', () => {
    expect(maskEmail('alice@example.com')).toMatch(/^a\*+e@example\.com$/);
  });
  it('returns email unchanged if no @ sign', () => {
    expect(maskEmail('invalidemail')).toBe('invalidemail');
  });
});
