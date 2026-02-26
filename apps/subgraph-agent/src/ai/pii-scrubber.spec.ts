import { describe, it, expect } from 'vitest';
import { scrubPII, containsPII } from './pii-scrubber.js';

describe('scrubPII', () => {
  it('redacts email addresses', () => {
    const { text, types } = scrubPII('Contact me at user@example.com please');
    expect(text).toContain('[EMAIL]');
    expect(text).not.toContain('user@example.com');
    expect(types).toContain('EMAIL');
  });

  it('redacts Israeli phone numbers', () => {
    const { text } = scrubPII('Call me at 050-1234567');
    expect(text).toContain('[PHONE]');
    expect(text).not.toContain('050-1234567');
  });

  it('redacts international phone numbers', () => {
    const { text } = scrubPII('Phone: +1-555-0100');
    expect(text).not.toContain('+1-555-0100');
  });

  it('redacts IP addresses', () => {
    const { text, types } = scrubPII('Server IP is 192.168.1.100');
    expect(text).toContain('[IP_ADDRESS]');
    expect(types).toContain('IP_ADDRESS');
  });

  it('returns redactedCount > 0 when PII found', () => {
    const { redactedCount } = scrubPII(
      'Email: test@test.com, also test2@test.com'
    );
    expect(redactedCount).toBeGreaterThan(0);
  });

  it('returns redactedCount 0 for clean text', () => {
    const { redactedCount, text } = scrubPII('What is the capital of France?');
    expect(redactedCount).toBe(0);
    expect(text).toBe('What is the capital of France?');
  });

  it('preserves non-PII content', () => {
    const { text } = scrubPII(
      'Hello, I want to learn about TypeScript email@test.com'
    );
    expect(text).toContain('Hello, I want to learn about TypeScript');
    expect(text).toContain('[EMAIL]');
  });

  it('handles empty string', () => {
    const { text, redactedCount } = scrubPII('');
    expect(text).toBe('');
    expect(redactedCount).toBe(0);
  });
});

describe('containsPII', () => {
  it('returns true for text with email', () => {
    expect(containsPII('my email is test@example.com')).toBe(true);
  });

  it('returns false for clean educational text', () => {
    expect(containsPII('Explain the Pythagorean theorem to me')).toBe(false);
  });
});
