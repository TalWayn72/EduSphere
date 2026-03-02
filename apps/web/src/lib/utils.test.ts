/**
 * Tests for lib/utils.ts
 *
 * Covers: cn() class-name merge utility — single class, multiple classes,
 * Tailwind conflict resolution, conditional classes, undefined/null handling,
 * and empty invocation.
 */
import { describe, it, expect } from 'vitest';
import { cn } from './utils';

describe('cn()', () => {
  it('returns a single class unchanged', () => {
    expect(cn('text-red-500')).toBe('text-red-500');
  });

  it('joins multiple class strings', () => {
    const result = cn('flex', 'items-center', 'gap-4');
    expect(result).toBe('flex items-center gap-4');
  });

  it('resolves Tailwind conflicts — last padding wins (p-2 overrides p-4)', () => {
    // tailwind-merge keeps the last conflicting class
    expect(cn('p-4', 'p-2')).toBe('p-2');
  });

  it('resolves Tailwind conflicts — last text-color wins', () => {
    expect(cn('text-red-500', 'text-blue-700')).toBe('text-blue-700');
  });

  it('excludes falsy conditional classes (false is excluded)', () => {
    const falsy: boolean = false;
    const result = cn('flex', falsy && 'hidden', 'gap-2');
    expect(result).not.toContain('hidden');
    expect(result).toContain('flex');
    expect(result).toContain('gap-2');
  });

  it('handles undefined gracefully without throwing', () => {
    expect(() => cn('flex', undefined, 'gap-2')).not.toThrow();
    expect(cn('flex', undefined, 'gap-2')).toContain('flex');
  });

  it('handles null gracefully without throwing', () => {
    expect(() => cn('flex', null, 'gap-2')).not.toThrow();
    expect(cn('flex', null, 'gap-2')).toContain('flex');
  });

  it('returns an empty string when called with no arguments', () => {
    expect(cn()).toBe('');
  });
});
