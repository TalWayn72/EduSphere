import { describe, it, expect, beforeEach } from 'vitest';
import {
  KMeansAlgorithmService,
  type ConceptWithEmbedding,
} from './kmeans-algorithm.service.js';

describe('KMeansAlgorithmService', () => {
  let service: KMeansAlgorithmService;

  beforeEach(() => {
    service = new KMeansAlgorithmService();
  });

  // ── cosineSimilarity ──────────────────────────────────────────────────
  describe('cosineSimilarity', () => {
    it('returns 1 for identical vectors', () => {
      expect(service.cosineSimilarity([1, 0, 0], [1, 0, 0])).toBeCloseTo(1);
    });

    it('returns 0 for orthogonal vectors', () => {
      expect(service.cosineSimilarity([1, 0], [0, 1])).toBeCloseTo(0);
    });

    it('returns ~-1 for opposite vectors', () => {
      expect(service.cosineSimilarity([1, 0], [-1, 0])).toBeCloseTo(-1);
    });

    it('returns 0 for zero vector', () => {
      expect(service.cosineSimilarity([0, 0], [1, 1])).toBe(0);
    });

    it('returns 0 when both are zero vectors', () => {
      expect(service.cosineSimilarity([0, 0], [0, 0])).toBe(0);
    });

    it('handles negative components', () => {
      const sim = service.cosineSimilarity([1, -1], [1, -1]);
      expect(sim).toBeCloseTo(1);
    });
  });

  // ── cosineDistance ────────────────────────────────────────────────────
  describe('cosineDistance', () => {
    it('returns 0 for identical vectors', () => {
      expect(service.cosineDistance([1, 0], [1, 0])).toBeCloseTo(0);
    });

    it('returns 1 for orthogonal vectors', () => {
      expect(service.cosineDistance([1, 0], [0, 1])).toBeCloseTo(1);
    });

    it('returns ~2 for opposite vectors', () => {
      expect(service.cosineDistance([1, 0], [-1, 0])).toBeCloseTo(2);
    });
  });

  // ── meanVector ────────────────────────────────────────────────────────
  describe('meanVector', () => {
    it('returns empty array for no vectors', () => {
      expect(service.meanVector([])).toEqual([]);
    });

    it('returns same vector for single input', () => {
      expect(service.meanVector([[1, 2, 3]])).toEqual([1, 2, 3]);
    });

    it('computes element-wise mean', () => {
      const result = service.meanVector([
        [2, 4],
        [4, 6],
      ]);
      expect(result).toEqual([3, 5]);
    });

    it('handles zero vectors', () => {
      const result = service.meanVector([
        [0, 0],
        [0, 0],
      ]);
      expect(result).toEqual([0, 0]);
    });
  });

  // ── initCentroidsKMeansPlusPlus ───────────────────────────────────────
  describe('initCentroidsKMeansPlusPlus', () => {
    it('returns empty array for no points', () => {
      expect(service.initCentroidsKMeansPlusPlus([], 3)).toEqual([]);
    });

    it('returns k centroids from the input points', () => {
      const points = [
        [1, 0],
        [0, 1],
        [-1, 0],
        [0, -1],
      ];
      const centroids = service.initCentroidsKMeansPlusPlus(points, 2);
      expect(centroids).toHaveLength(2);
      for (const c of centroids) {
        expect(points).toContainEqual(c);
      }
    });

    it('returns all points when k equals point count', () => {
      const points = [
        [1, 0],
        [0, 1],
      ];
      const centroids = service.initCentroidsKMeansPlusPlus(points, 2);
      expect(centroids).toHaveLength(2);
    });
  });

  // ── runKMeans ─────────────────────────────────────────────────────────
  describe('runKMeans', () => {
    it('returns empty array for k=0', () => {
      expect(service.runKMeans([], 0)).toEqual([]);
    });

    it('returns empty array for empty concepts', () => {
      expect(service.runKMeans([], 3)).toEqual([]);
    });

    it('clusters concepts into k groups', () => {
      const concepts: ConceptWithEmbedding[] = [
        { id: 'a', name: 'Alpha', embedding: [1, 0, 0] },
        { id: 'b', name: 'Beta', embedding: [0.9, 0.1, 0] },
        { id: 'c', name: 'Gamma', embedding: [0, 0, 1] },
        { id: 'd', name: 'Delta', embedding: [0, 0.1, 0.9] },
      ];
      const clusters = service.runKMeans(concepts, 2);
      expect(clusters).toHaveLength(2);

      const allIds = clusters.flatMap((c) => c.conceptIds);
      expect(allIds.sort()).toEqual(['a', 'b', 'c', 'd']);
    });

    it('clamps k to number of concepts', () => {
      const concepts: ConceptWithEmbedding[] = [
        { id: 'a', name: 'A', embedding: [1, 0] },
        { id: 'b', name: 'B', embedding: [0, 1] },
      ];
      const clusters = service.runKMeans(concepts, 10);
      expect(clusters.length).toBeLessThanOrEqual(2);

      const allIds = clusters.flatMap((c) => c.conceptIds);
      expect(allIds).toContain('a');
      expect(allIds).toContain('b');
    });

    it('assigns label from first 3 member names', () => {
      const concepts: ConceptWithEmbedding[] = [
        { id: 'a', name: 'Alpha', embedding: [1, 0] },
        { id: 'b', name: 'Beta', embedding: [0.99, 0.01] },
        { id: 'c', name: 'Gamma', embedding: [0.98, 0.02] },
        { id: 'd', name: 'Delta', embedding: [0.97, 0.03] },
      ];
      const clusters = service.runKMeans(concepts, 1);
      expect(clusters).toHaveLength(1);
      // Label should contain at most 3 names separated by commas
      const parts = clusters[0]!.label.split(', ');
      expect(parts.length).toBeLessThanOrEqual(3);
    });

    it('each cluster has a centroid vector', () => {
      const concepts: ConceptWithEmbedding[] = [
        { id: 'a', name: 'A', embedding: [1, 0, 0] },
        { id: 'b', name: 'B', embedding: [0, 1, 0] },
      ];
      const clusters = service.runKMeans(concepts, 2);
      for (const cluster of clusters) {
        expect(cluster.centroid).toBeDefined();
        expect(cluster.centroid.length).toBe(3);
      }
    });
  });
});
