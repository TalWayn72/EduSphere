/**
 * kmeans-math.ts — Pure math helpers for K-means++ topic clustering.
 * No DI, no side effects — all functions are pure and testable in isolation.
 */

export interface ConceptWithEmbedding {
  id: string;
  name: string;
  embedding: number[];
}

export interface KMeansCluster {
  centroid: number[];
  conceptIds: string[];
  label: string;
}

const MAX_ITERATIONS = 100;

export function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    // eslint-disable-next-line security/detect-object-injection -- safe numeric index
    dot += (a[i] ?? 0) * (b[i] ?? 0);
    // eslint-disable-next-line security/detect-object-injection -- safe numeric index
    normA += (a[i] ?? 0) ** 2;
    // eslint-disable-next-line security/detect-object-injection -- safe numeric index
    normB += (b[i] ?? 0) ** 2;
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

export function cosineDistance(a: number[], b: number[]): number {
  return 1 - cosineSimilarity(a, b);
}

export function meanVector(vectors: number[][]): number[] {
  if (vectors.length === 0) return [];
  const dim = vectors[0]?.length ?? 0;
  const sum = new Array<number>(dim).fill(0);
  for (const v of vectors) {
    for (let i = 0; i < dim; i++) {
      // eslint-disable-next-line security/detect-object-injection -- safe numeric index
      sum[i] = (sum[i] ?? 0) + (v[i] ?? 0);
    }
  }
  return sum.map((s) => s / vectors.length);
}

export function initCentroidsKMeansPlusPlus(
  points: number[][],
  k: number
): number[][] {
  if (points.length === 0) return [];
  const centroids: number[][] = [];
  const firstIdx = Math.floor(Math.random() * points.length);
  // eslint-disable-next-line security/detect-object-injection -- safe numeric index
  centroids.push(points[firstIdx] as number[]);

  while (centroids.length < k) {
    const distances = points.map((p) =>
      Math.min(...centroids.map((c) => cosineDistance(p, c) ** 2))
    );
    const total = distances.reduce((a, b) => a + b, 0);
    let rand = Math.random() * total;
    let pushed = false;
    for (let i = 0; i < distances.length; i++) {
      // eslint-disable-next-line security/detect-object-injection -- safe numeric index
      rand -= distances[i] ?? 0;
      if (rand <= 0) {
        // eslint-disable-next-line security/detect-object-injection -- safe numeric index
        centroids.push(points[i] as number[]);
        pushed = true;
        break;
      }
    }
    if (!pushed) {
      centroids.push(points[points.length - 1] as number[]);
    }
  }
  return centroids;
}

export function runKMeans(
  concepts: ConceptWithEmbedding[],
  k: number
): KMeansCluster[] {
  const clampedK = Math.min(k, concepts.length);
  if (clampedK === 0) return [];

  const points = concepts.map((c) => c.embedding);
  let centroids = initCentroidsKMeansPlusPlus(points, clampedK);
  let assignments = new Array<number>(concepts.length).fill(-1);

  for (let iter = 0; iter < MAX_ITERATIONS; iter++) {
    const newAssignments = points.map((p) => {
      let minDist = Infinity;
      let bestCluster = 0;
      for (let ci = 0; ci < centroids.length; ci++) {
        // eslint-disable-next-line security/detect-object-injection -- safe numeric index
        const d = cosineDistance(p, centroids[ci] as number[]);
        if (d < minDist) {
          minDist = d;
          bestCluster = ci;
        }
      }
      return bestCluster;
    });

    // eslint-disable-next-line security/detect-object-injection -- safe numeric index
    const changed = newAssignments.some((a, i) => a !== assignments[i]);
    assignments = newAssignments;
    if (!changed && iter > 0) break;

    for (let ci = 0; ci < clampedK; ci++) {
      const clusterPoints = concepts
        // eslint-disable-next-line security/detect-object-injection -- safe numeric index into assignments array
        .filter((_, i) => assignments[i] === ci)
        .map((c) => c.embedding);
      if (clusterPoints.length > 0) {
        // eslint-disable-next-line security/detect-object-injection -- safe numeric index into centroids array
        centroids[ci] = meanVector(clusterPoints);
      }
    }
  }

  return centroids.map((centroid, ci) => {
    // eslint-disable-next-line security/detect-object-injection -- safe numeric index
    const members = concepts.filter((_, i) => assignments[i] === ci);
    const label = members
      .slice(0, 3)
      .map((c) => c.name)
      .join(', ');
    return {
      centroid,
      conceptIds: members.map((c) => c.id),
      label: label || `Cluster ${ci + 1}`,
    };
  });
}
