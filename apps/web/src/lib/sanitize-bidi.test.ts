/**
 * sanitize-bidi utility tests
 *
 * Verifies:
 *  1. Strips LRE (U+202A)
 *  2. Strips RLE (U+202B)
 *  3. Strips PDF (U+202C)
 *  4. Strips LRO (U+202D)
 *  5. Strips RLO (U+202E)
 *  6. Strips LRI (U+2066)
 *  7. Strips RLI (U+2067)
 *  8. Strips FSI (U+2068)
 *  9. Strips PDI (U+2069)
 * 10. Preserves normal text
 * 11. Handles empty string
 * 12. Strips multiple BiDi controls in same string
 */
import { describe, it, expect } from 'vitest';
import { stripBiDiControls } from './sanitize-bidi';

describe('stripBiDiControls', () => {
  it('strips LRE (U+202A)', () => {
    expect(stripBiDiControls('hello\u202Aworld')).toBe('helloworld');
  });

  it('strips RLE (U+202B)', () => {
    expect(stripBiDiControls('test\u202Bvalue')).toBe('testvalue');
  });

  it('strips PDF (U+202C)', () => {
    expect(stripBiDiControls('abc\u202Cdef')).toBe('abcdef');
  });

  it('strips LRO (U+202D)', () => {
    expect(stripBiDiControls('foo\u202Dbar')).toBe('foobar');
  });

  it('strips RLO (U+202E)', () => {
    expect(stripBiDiControls('a\u202Eb')).toBe('ab');
  });

  it('strips LRI (U+2066)', () => {
    expect(stripBiDiControls('x\u2066y')).toBe('xy');
  });

  it('strips RLI (U+2067)', () => {
    expect(stripBiDiControls('m\u2067n')).toBe('mn');
  });

  it('strips FSI (U+2068)', () => {
    expect(stripBiDiControls('p\u2068q')).toBe('pq');
  });

  it('strips PDI (U+2069)', () => {
    expect(stripBiDiControls('r\u2069s')).toBe('rs');
  });

  it('preserves normal text without BiDi controls', () => {
    expect(stripBiDiControls('Hello World 123')).toBe('Hello World 123');
  });

  it('handles empty string', () => {
    expect(stripBiDiControls('')).toBe('');
  });

  it('strips multiple BiDi controls in same string', () => {
    expect(stripBiDiControls('\u202Ahello\u202B \u2066world\u2069')).toBe(
      'hello world'
    );
  });

  it('preserves Hebrew text while stripping controls', () => {
    expect(stripBiDiControls('\u202Bשלום\u202C')).toBe('שלום');
  });
});
