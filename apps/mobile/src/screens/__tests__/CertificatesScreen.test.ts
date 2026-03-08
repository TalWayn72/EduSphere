/**
 * CertificatesScreen — pure logic tests.
 * No @testing-library/react-native required (not installed).
 * Imports pure helper functions from certificates.logic.ts directly.
 */
import { describe, it, expect } from 'vitest';
import { formatCertIssuedDate, maskVerificationCode } from '../certificates.logic';

// ---------------------------------------------------------------------------
// formatCertIssuedDate
// ---------------------------------------------------------------------------
describe('CertificatesScreen — formatCertIssuedDate', () => {
  it('formats a known ISO date correctly', () => {
    const result = formatCertIssuedDate('2024-06-15T12:00:00.000Z');
    expect(result).toContain('2024');
    expect(result).toContain('June');
    expect(result).toContain('15');
  });

  it('returns "Unknown date" for an invalid string', () => {
    expect(formatCertIssuedDate('not-a-date')).toBe('Unknown date');
  });

  it('returns "Unknown date" for an empty string', () => {
    expect(formatCertIssuedDate('')).toBe('Unknown date');
  });

  it('handles January correctly (month boundary)', () => {
    const result = formatCertIssuedDate('2025-01-01T00:00:00.000Z');
    expect(result).toContain('2025');
    expect(result).toContain('January');
  });

  it('handles December correctly (month boundary)', () => {
    // Use a date/time that stays in December in any UTC-offset timezone
    const result = formatCertIssuedDate('2023-12-15T12:00:00.000Z');
    expect(result).toContain('2023');
    expect(result).toContain('December');
  });

  it('returns a non-empty string for a valid ISO date', () => {
    const result = formatCertIssuedDate('2024-03-20T08:00:00.000Z');
    expect(result.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// maskVerificationCode
// ---------------------------------------------------------------------------
describe('CertificatesScreen — maskVerificationCode', () => {
  it('truncates codes longer than 8 characters', () => {
    const result = maskVerificationCode('ABCD1234EFGH');
    expect(result).toBe('ABCD1234...');
  });

  it('returns the full code when exactly 8 characters', () => {
    expect(maskVerificationCode('ABCD1234')).toBe('ABCD1234');
  });

  it('returns the full code when shorter than 8 characters', () => {
    expect(maskVerificationCode('ABC')).toBe('ABC');
  });

  it('appends "..." suffix for long codes', () => {
    const result = maskVerificationCode('LONGCODEHERE1234');
    expect(result.endsWith('...')).toBe(true);
  });

  it('preserves first 8 characters exactly', () => {
    const code = 'XY78ABCD-EXTRA';
    const result = maskVerificationCode(code);
    expect(result.startsWith('XY78ABCD')).toBe(true);
  });

  it('handles empty string without throwing', () => {
    expect(maskVerificationCode('')).toBe('');
  });

  it('handles single character without throwing', () => {
    expect(maskVerificationCode('Z')).toBe('Z');
  });
});
