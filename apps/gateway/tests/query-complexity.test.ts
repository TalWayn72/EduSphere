/**
 * Unit tests for G-10: query depth and complexity validators.
 */
import { describe, it, expect } from 'vitest';
import {
  estimateComplexity,
  MAX_DEPTH,
  MAX_COMPLEXITY,
} from '../src/middleware/query-complexity.js';

// Minimal AST-like node builder
type Node = { selectionSet?: { selections: Node[] }; name?: { value: string } };

const field = (name: string, children: Node[] = []): Node => ({
  name: { value: name },
  selectionSet: children.length > 0 ? { selections: children } : undefined,
});

describe('MAX_DEPTH / MAX_COMPLEXITY constants', () => {
  it('MAX_DEPTH is 10 or less', () => {
    expect(MAX_DEPTH).toBeLessThanOrEqual(10);
  });

  it('MAX_COMPLEXITY is 1000 or less', () => {
    expect(MAX_COMPLEXITY).toBeLessThanOrEqual(1000);
  });
});

describe('estimateComplexity', () => {
  it('scalar leaf with no children has base cost of 1', () => {
    expect(estimateComplexity(field('name'))).toBe(1);
  });

  it('single nested field increases complexity beyond 1', () => {
    const q = field('user', [field('name')]);
    expect(estimateComplexity(q, 0, 'user')).toBeGreaterThan(1);
  });

  it('list field costs more than single-object field with same children', () => {
    // Pass field name explicitly so list-multiplier is applied
    const single = field('post', [field('title')]);
    const list = field('posts', [field('title')]);
    const singleCost = estimateComplexity(single, 0, 'post');
    const listCost = estimateComplexity(list, 0, 'posts');
    expect(listCost).toBeGreaterThan(singleCost);
  });

  it('deeply nested list explodes complexity well above 100', () => {
    const deep = field('posts', [
      field('comments', [field('author', [field('posts', [field('title')])])]),
    ]);
    expect(estimateComplexity(deep, 0, 'posts')).toBeGreaterThan(100);
  });

  it('depth guard at 20 prevents infinite recursion', () => {
    let node: Node = field('leaf');
    for (let i = 0; i < 25; i++) {
      node = field(`level${i}`, [node]);
    }
    const result = estimateComplexity(node);
    expect(Number.isFinite(result)).toBe(true);
  });
});
