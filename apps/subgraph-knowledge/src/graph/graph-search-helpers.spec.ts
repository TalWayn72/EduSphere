import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  computeTextSimilarity,
  scoreConceptsByText,
} from './graph-search-helpers';
import type { GraphConceptNode } from './graph-types';

describe('computeTextSimilarity', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 1.0 for exact match', () => {
    expect(computeTextSimilarity('algebra', 'algebra')).toBe(1.0);
  });

  it('returns 1.0 for case-insensitive exact match', () => {
    expect(computeTextSimilarity('Algebra', 'algebra')).toBe(1.0);
  });

  it('returns 0.85 for substring match', () => {
    expect(computeTextSimilarity('linear algebra basics', 'algebra')).toBe(
      0.85
    );
  });

  it('returns 0.5 for no word match', () => {
    expect(computeTextSimilarity('biology', 'algebra')).toBe(0.5);
  });

  it('returns 0.85 for empty query (empty string is substring of any string)', () => {
    // '' is a substring of any string, so haystack.includes('') → true → 0.85
    expect(computeTextSimilarity('something', '')).toBe(0.85);
  });

  it('scores partial word matches proportionally', () => {
    // "linear algebra" has 2 words, "algebra" matches 1 → 0.5 + 0.35*(1/1) = 0.85
    // But substring match fires first
    const score = computeTextSimilarity(
      'study of calculus and geometry',
      'calculus geometry'
    );
    // "calculus geometry" is NOT a substring of the text, so word matching:
    // 2 query words, both match → 0.5 + 0.35*(2/2) = 0.85
    expect(score).toBeCloseTo(0.85);
  });

  it('handles single word partial match', () => {
    // query "calculus physics" → 2 words, "calculus" matches, "physics" doesn't
    const score = computeTextSimilarity(
      'study of calculus',
      'calculus physics'
    );
    // 0.5 + 0.35 * (1/2) = 0.675
    expect(score).toBeCloseTo(0.675);
  });

  it('is case-insensitive for word matching', () => {
    const score = computeTextSimilarity(
      'ALGEBRA and GEOMETRY',
      'algebra geometry'
    );
    expect(score).toBeGreaterThan(0.5);
  });
});

describe('scoreConceptsByText', () => {
  const makeConcept = (
    id: string,
    name: string,
    definition?: string
  ): GraphConceptNode =>
    ({
      id,
      name,
      definition: definition ?? null,
    }) as unknown as GraphConceptNode;

  it('returns empty array for no matches', () => {
    const concepts = [makeConcept('1', 'Physics', 'Study of matter')];
    const result = scoreConceptsByText(concepts, 'algebra', 10);
    expect(result).toEqual([]);
  });

  it('matches concepts by name', () => {
    const concepts = [
      makeConcept('1', 'Linear Algebra', 'Math topic'),
      makeConcept('2', 'Biology', 'Life science'),
    ];
    const result = scoreConceptsByText(concepts, 'algebra', 10);
    expect(result).toHaveLength(1);
    expect(result[0]!.entityId).toBe('1');
  });

  it('matches concepts by definition', () => {
    const concepts = [makeConcept('1', 'Topic A', 'Introduction to algebra')];
    const result = scoreConceptsByText(concepts, 'algebra', 10);
    expect(result).toHaveLength(1);
  });

  it('respects limit parameter', () => {
    const concepts = [
      makeConcept('1', 'Algebra 1', 'Basics'),
      makeConcept('2', 'Algebra 2', 'Advanced'),
      makeConcept('3', 'Algebra 3', 'Expert'),
    ];
    const result = scoreConceptsByText(concepts, 'algebra', 2);
    expect(result).toHaveLength(2);
  });

  it('returns SemanticResult objects with correct shape', () => {
    const concepts = [makeConcept('c1', 'Algebra', 'Math fundamentals')];
    const result = scoreConceptsByText(concepts, 'algebra', 10);
    expect(result[0]).toEqual({
      id: 'c1',
      text: 'Math fundamentals',
      similarity: expect.any(Number),
      entityType: 'concept',
      entityId: 'c1',
      startTime: null,
    });
  });

  it('uses name as text when definition is null', () => {
    const concepts = [makeConcept('c1', 'Algebra', undefined)];
    const result = scoreConceptsByText(concepts, 'algebra', 10);
    expect(result[0]!.text).toBe('Algebra');
  });

  it('similarity score is between 0.5 and 1.0', () => {
    const concepts = [makeConcept('1', 'Algebra topic', 'A definition')];
    const result = scoreConceptsByText(concepts, 'algebra', 10);
    expect(result[0]!.similarity).toBeGreaterThanOrEqual(0.5);
    expect(result[0]!.similarity).toBeLessThanOrEqual(1.0);
  });

  it('handles empty concepts array', () => {
    expect(scoreConceptsByText([], 'test', 10)).toEqual([]);
  });
});
