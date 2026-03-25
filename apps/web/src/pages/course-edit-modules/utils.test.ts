import { describe, it, expect } from 'vitest';
import { typeBadgeVariant, TYPE_EMOJI } from './utils';

describe('typeBadgeVariant', () => {
  it('returns default for VIDEO', () => {
    expect(typeBadgeVariant('VIDEO')).toBe('default');
  });

  it('returns default for AUDIO', () => {
    expect(typeBadgeVariant('AUDIO')).toBe('default');
  });

  it('returns secondary for QUIZ', () => {
    expect(typeBadgeVariant('QUIZ')).toBe('secondary');
  });

  it('returns secondary for ASSIGNMENT', () => {
    expect(typeBadgeVariant('ASSIGNMENT')).toBe('secondary');
  });

  it('returns outline for MARKDOWN', () => {
    expect(typeBadgeVariant('MARKDOWN')).toBe('outline');
  });

  it('returns outline for unknown type', () => {
    expect(typeBadgeVariant('UNKNOWN')).toBe('outline');
  });
});

describe('TYPE_EMOJI', () => {
  it('has emoji for VIDEO', () => {
    expect(TYPE_EMOJI['VIDEO']).toBeDefined();
  });

  it('has emoji for PDF', () => {
    expect(TYPE_EMOJI['PDF']).toBeDefined();
  });

  it('has emoji for MARKDOWN', () => {
    expect(TYPE_EMOJI['MARKDOWN']).toBeDefined();
  });

  it('has emoji for SCORM', () => {
    expect(TYPE_EMOJI['SCORM']).toBeDefined();
  });
});
