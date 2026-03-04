/**
 * Unit tests for CypherLearningPathService and cypher-age-helpers.
 * Focuses on the pure utility functions parseAgtypeScalar and parseAgtypeArray
 * which have no DB dependency and can be exercised without any pool mock.
 */
import { describe, it, expect, vi } from 'vitest';

vi.mock('@edusphere/db', () => ({
  db: {
    $client: {
      connect: vi.fn().mockResolvedValue({
        query: vi.fn().mockResolvedValue({ rows: [] }),
        release: vi.fn(),
      }),
    },
  },
  substituteParams: vi.fn((q: string) => q),
}));

vi.mock('@edusphere/config', () => ({
  graphConfig: { graphName: 'edusphere_graph' },
}));

import { CypherLearningPathService } from './cypher-learning-path.service.js';
import {
  parseAgtypeScalar,
  parseAgtypeArray,
} from './cypher-age-helpers.js';

describe('cypher-age-helpers (pure functions)', () => {
  // ─── parseAgtypeScalar ──────────────────────────────────────────────────────

  describe('parseAgtypeScalar()', () => {
    // ── Test 1 ────────────────────────────────────────────────────────────────
    it('returns null for null input', () => {
      expect(parseAgtypeScalar(null)).toBeNull();
    });

    // ── Test 2 ────────────────────────────────────────────────────────────────
    it('returns null for undefined input', () => {
      expect(parseAgtypeScalar(undefined)).toBeNull();
    });

    // ── Test 3 ────────────────────────────────────────────────────────────────
    it('returns the number unchanged for numeric input', () => {
      expect(parseAgtypeScalar(42)).toBe(42);
    });

    // ── Test 4 ────────────────────────────────────────────────────────────────
    it('converts a numeric string to a number', () => {
      expect(parseAgtypeScalar('42')).toBe(42);
    });

    // ── Test 5 ────────────────────────────────────────────────────────────────
    it('strips ::typename suffix before converting to number', () => {
      expect(parseAgtypeScalar('42::integer')).toBe(42);
    });

    // ── Test 6 ────────────────────────────────────────────────────────────────
    it('returns string as-is when Number conversion yields NaN (after stripping suffix)', () => {
      const result = parseAgtypeScalar('"hello"::text');
      expect(typeof result).toBe('string');
      expect(result).toBe('"hello"');
    });
  });

  // ─── parseAgtypeArray ───────────────────────────────────────────────────────

  describe('parseAgtypeArray()', () => {
    // ── Test 7 ────────────────────────────────────────────────────────────────
    it('returns [] for null input', () => {
      expect(parseAgtypeArray(null)).toEqual([]);
    });

    // ── Test 8 ────────────────────────────────────────────────────────────────
    it('returns [] for an empty JSON array string', () => {
      expect(parseAgtypeArray('[]')).toEqual([]);
    });

    // ── Test 9 ────────────────────────────────────────────────────────────────
    it('parses a valid JSON array of numbers', () => {
      expect(parseAgtypeArray('[1,2,3]')).toEqual([1, 2, 3]);
    });

    // ── Test 10 ───────────────────────────────────────────────────────────────
    it('strips ::typename suffixes inside the array before parsing', () => {
      const raw = '[1::integer,2::integer,3::integer]';
      const result = parseAgtypeArray(raw);
      expect(result).toEqual([1, 2, 3]);
    });

    // ── Test 11 ───────────────────────────────────────────────────────────────
    it('returns [] for malformed JSON and does not throw', () => {
      expect(() => parseAgtypeArray('invalid{json')).not.toThrow();
      expect(parseAgtypeArray('invalid{json')).toEqual([]);
    });
  });
});

describe('CypherLearningPathService', () => {
  // ── Test 12 ───────────────────────────────────────────────────────────────
  it('service instantiates without error', () => {
    expect(() => new CypherLearningPathService()).not.toThrow();
  });
});
