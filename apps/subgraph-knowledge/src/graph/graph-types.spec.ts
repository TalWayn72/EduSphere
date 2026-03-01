import { describe, it, expect } from 'vitest';
import { toUserRole } from './graph-types.js';

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
