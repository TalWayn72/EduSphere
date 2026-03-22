import { describe, it, expect } from 'vitest';
import { toUserRole, safeIsoDate } from './graph-types.js';

describe('toUserRole()', () => {
  it('returns SUPER_ADMIN for "SUPER_ADMIN"', () => {
    expect(toUserRole('SUPER_ADMIN')).toBe('SUPER_ADMIN');
  });

  it('returns ORG_ADMIN for "ORG_ADMIN"', () => {
    expect(toUserRole('ORG_ADMIN')).toBe('ORG_ADMIN');
  });

  it('returns INSTRUCTOR for "INSTRUCTOR"', () => {
    expect(toUserRole('INSTRUCTOR')).toBe('INSTRUCTOR');
  });

  it('returns STUDENT for "STUDENT"', () => {
    expect(toUserRole('STUDENT')).toBe('STUDENT');
  });

  it('returns RESEARCHER for "RESEARCHER"', () => {
    expect(toUserRole('RESEARCHER')).toBe('RESEARCHER');
  });

  it('falls back to STUDENT for unknown role', () => {
    expect(toUserRole('JANITOR')).toBe('STUDENT');
  });

  it('falls back to STUDENT for null', () => {
    expect(toUserRole(null)).toBe('STUDENT');
  });

  it('falls back to STUDENT for undefined', () => {
    expect(toUserRole(undefined)).toBe('STUDENT');
  });

  it('falls back to STUDENT for empty string', () => {
    expect(toUserRole('')).toBe('STUDENT');
  });

  it('is case-sensitive — lowercase "student" falls back to STUDENT', () => {
    expect(toUserRole('student')).toBe('STUDENT');
  });
});

// ── BUG-104: safeIsoDate — guards against "Invalid time value" from AGE ──────
describe('safeIsoDate()', () => {
  it('converts epoch millis (number) to ISO string', () => {
    const result = safeIsoDate(1711100000000);
    expect(result).toBe(new Date(1711100000000).toISOString());
  });

  it('converts valid ISO string to ISO string', () => {
    const iso = '2026-03-22T10:00:00.000Z';
    expect(safeIsoDate(iso)).toBe(iso);
  });

  it('converts numeric string to ISO date', () => {
    const result = safeIsoDate('1711100000000');
    expect(result).toBe(new Date(1711100000000).toISOString());
  });

  // BUG-104 reproducer: the literal string "timestamp()" from JSON.stringify bug
  it('returns fallback for literal "timestamp()" string (BUG-104 root cause)', () => {
    const result = safeIsoDate('timestamp()');
    // Must not throw — returns a valid ISO string (current time fallback)
    expect(() => new Date(result)).not.toThrow();
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('returns fallback for null', () => {
    const result = safeIsoDate(null);
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('returns fallback for undefined', () => {
    const result = safeIsoDate(undefined);
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('returns fallback for empty string', () => {
    const result = safeIsoDate('');
    // new Date('') is Invalid Date
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('returns fallback for random garbage string', () => {
    const result = safeIsoDate('not-a-date');
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  // BUG-104: regression guard — explicit edge cases from bug report
  it('converts date-only string "2024-01-01" to valid ISO string', () => {
    const result = safeIsoDate('2024-01-01');
    expect(result).toBe(new Date('2024-01-01').toISOString());
  });

  it('converts epoch millis 1704067200000 (2024-01-01T00:00:00Z) correctly', () => {
    const result = safeIsoDate(1704067200000);
    expect(result).toBe('2024-01-01T00:00:00.000Z');
  });
});
