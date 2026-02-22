import { describe, it, expect } from 'vitest';
import {
  SCHEMA_LINT_RULES,
  getRuleSeverity,
  getBlockingRules,
  getWarningRules,
} from './schema-rules.js';

describe('SCHEMA_LINT_RULES', () => {
  it('FIELD_REMOVED is an error (blocks merge)', () => {
    expect(SCHEMA_LINT_RULES.FIELD_REMOVED).toBe('error');
  });

  it('TYPE_REMOVED is an error (blocks merge)', () => {
    expect(SCHEMA_LINT_RULES.TYPE_REMOVED).toBe('error');
  });

  it('FIELD_DEPRECATION_REMOVED is an error (cannot un-deprecate)', () => {
    expect(SCHEMA_LINT_RULES.FIELD_DEPRECATION_REMOVED).toBe('error');
  });

  it('FIELD_ADDED is a warning (safe change)', () => {
    expect(SCHEMA_LINT_RULES.FIELD_ADDED).toBe('warn');
  });

  it('FIELD_DEPRECATION_ADDED is a warning (allows graceful removal)', () => {
    expect(SCHEMA_LINT_RULES.FIELD_DEPRECATION_ADDED).toBe('warn');
  });

  it('all rule values are either error or warn', () => {
    for (const value of Object.values(SCHEMA_LINT_RULES)) {
      expect(['error', 'warn']).toContain(value);
    }
  });
});

describe('getRuleSeverity', () => {
  it('returns error for FIELD_REMOVED', () => {
    expect(getRuleSeverity('FIELD_REMOVED')).toBe('error');
  });

  it('returns warn for FIELD_ADDED', () => {
    expect(getRuleSeverity('FIELD_ADDED')).toBe('warn');
  });
});

describe('getBlockingRules', () => {
  it('returns non-empty array of error rules', () => {
    const blocking = getBlockingRules();
    expect(blocking.length).toBeGreaterThan(0);
    expect(blocking).toContain('FIELD_REMOVED');
    expect(blocking).toContain('TYPE_REMOVED');
  });

  it('does not include warning rules', () => {
    const blocking = getBlockingRules();
    expect(blocking).not.toContain('FIELD_ADDED');
  });
});

describe('getWarningRules', () => {
  it('returns non-empty array of warn rules', () => {
    const warnings = getWarningRules();
    expect(warnings.length).toBeGreaterThan(0);
    expect(warnings).toContain('FIELD_ADDED');
    expect(warnings).toContain('FIELD_DEPRECATION_ADDED');
  });

  it('does not include error rules', () => {
    const warnings = getWarningRules();
    expect(warnings).not.toContain('FIELD_REMOVED');
  });
});
