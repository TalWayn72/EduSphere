import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  cosineSimilarity,
  cosineDistance,
  meanVector,
  initCentroidsKMeansPlusPlus,
  runKMeans,
} from './kmeans-math';
import type { ConceptWithEmbedding } from './kmeans-math';

describe('cosineSimilarity', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns 1.0 for identical vectors', () => {
    expect(cosineSimilarity([1, 2, 3], [1, 2, 3])).toBeCloseTo(1.0);
  });

  it('returns 0 for orthogonal vectors', () => {
    expect(cosineSimilarity([1, 0], [0, 1])).toBeCloseTo(0);
  });

  it('returns -1 for opposite vectors', () => {
    expect(cosineSimilarity([1, 0], [-1, 0])).toBeCloseTo(-1);
  });

  it('returns 0 when first vector is zero', () => {
    expect(cosineSimilarity([0, 0], [1, 2])).toBe(0);
  });

  it('returns 0 when second vector is zero', () => {
    expect(cosineSimilarity([1, 2], [0, 0])).toBe(0);
  });

  it('handles empty arrays', () => {
    expect(cosineSimilarity([], [])).toBe(0);
  });

  it('is commutative', () => {
    const a = [1, 2, 3];
    const b = [4, 5, 6];
    expect(cosineSimilarity(a, b)).toBeCloseTo(cosineSimilarity(b, a));
  });

  it('handles single-element vectors', () => {
    expect(cosineSimilarity([3], [3])).toBeCloseTo(1.0);
  });
});

describe('cosineDistance', () => {
  it('returns 0 for identical vectors', () => {
    expect(cosineDistance([1, 0], [1, 0])).toBeCloseTo(0);
  });

  it('returns 1 for orthogonal vectors', () => {
    expect(cosineDistance([1, 0], [0, 1])).toBeCloseTo(1);
  });

  it('returns 2 for opposite vectors', () => {
    expect(cosineDistance([1, 0], [-1, 0])).toBeCloseTo(2);
  });
});

describe('meanVector', () => {
  it('returns empty array for empty input', () => {
    expect(meanVector([])).toEqual([]);
  });

  it('returns the same vector for single input', () => {
    expect(meanVector([[1, 2, 3]])).toEqual([1, 2, 3]);
  });

  it('computes element-wise mean', () => {
    const result = meanVector([
      [2, 4],
      [4, 6],
    ]);
    expect(result).toEqual([3, 5]);
  });

  it('handles three vectors', () => {
    const result = meanVector([
      [0, 0],
      [3, 6],
      [6, 3],
    ]);
    expect(result).toEqual([3, 3]);
  });
});

describe('initCentroidsKMeansPlusPlus', () => {
  it('returns empty array for empty input', () => {
    expect(initCentroidsKMeansPlusPlus([], 3)).toEqual([]);
  });

  it('returns k centroids from points', () => {
    const points = [
      [1, 0],
      [0, 1],
      [-1, 0],
      [0, -1],
    ];
    const result = initCentroidsKMeansPlusPlus(points, 2);
    expect(result).toHaveLength(2);
  });

  it('returns all points when k equals point count', () => {
    const points = [
      [1, 0],
      [0, 1],
    ];
    const result = initCentroidsKMeansPlusPlus(points, 2);
    expect(result).toHaveLength(2);
  });

  it('each centroid is from the original points', () => {
    const points = [
      [1, 2],
      [3, 4],
      [5, 6],
      [7, 8],
    ];
    const result = initCentroidsKMeansPlusPlus(points, 3);
    for (const c of result) {
      expect(points).toContainEqual(c);
    }
  });
});

describe('runKMeans', () => {
  it('returns empty array when no concepts', () => {
    expect(runKMeans([], 3)).toEqual([]);
  });

  it('clamps k to number of concepts', () => {
    const concepts: ConceptWithEmbedding[] = [
      { id: '1', name: 'A', embedding: [1, 0] },
    ];
    const result = runKMeans(concepts, 5);
    expect(result).toHaveLength(1);
    expect(result[0]!.conceptIds).toContain('1');
  });

  it('assigns all concepts to clusters', () => {
    const concepts: ConceptWithEmbedding[] = [
      { id: '1', name: 'A', embedding: [1, 0, 0] },
      { id: '2', name: 'B', embedding: [0, 1, 0] },
      { id: '3', name: 'C', embedding: [0, 0, 1] },
      { id: '4', name: 'D', embedding: [1, 0.1, 0] },
    ];
    const result = runKMeans(concepts, 3);
    const allIds = result.flatMap((c) => c.conceptIds);
    expect(allIds.sort()).toEqual(['1', '2', '3', '4']);
  });

  it('generates labels from member names', () => {
    const concepts: ConceptWithEmbedding[] = [
      { id: '1', name: 'Alpha', embedding: [1, 0] },
      { id: '2', name: 'Beta', embedding: [0.99, 0.01] },
    ];
    const result = runKMeans(concepts, 1);
    expect(result[0]!.label).toContain('Alpha');
  });

  it('produces clusters with centroid arrays', () => {
    const concepts: ConceptWithEmbedding[] = [
      { id: '1', name: 'X', embedding: [1, 0] },
      { id: '2', name: 'Y', embedding: [0, 1] },
    ];
    const result = runKMeans(concepts, 2);
    for (const cluster of result) {
      expect(Array.isArray(cluster.centroid)).toBe(true);
      expect(cluster.centroid.length).toBe(2);
    }
  });

  it('handles k=1 single cluster', () => {
    const concepts: ConceptWithEmbedding[] = [
      { id: '1', name: 'A', embedding: [1, 0] },
      { id: '2', name: 'B', embedding: [0, 1] },
    ];
    const result = runKMeans(concepts, 1);
    expect(result).toHaveLength(1);
    expect(result[0]!.conceptIds).toHaveLength(2);
  });
});
