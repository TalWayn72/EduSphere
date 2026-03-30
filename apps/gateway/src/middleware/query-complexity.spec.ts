import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  estimateComplexity,
  depthLimitRule,
  complexityLimitRule,
  MAX_DEPTH,
  MAX_COMPLEXITY,
} from './query-complexity';

type SelectableNode = {
  selectionSet?: { selections: readonly SelectableNode[] };
  name?: { value?: string };
};

// Helper to build a tree of given depth
function buildTree(depth: number, fieldName = 'field'): SelectableNode {
  if (depth <= 0) return { name: { value: fieldName } };
  return {
    name: { value: fieldName },
    selectionSet: { selections: [buildTree(depth - 1, fieldName)] },
  };
}

describe('query-complexity', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('estimateComplexity', () => {
    it('returns 1 for a leaf node (no selectionSet)', () => {
      expect(estimateComplexity({ name: { value: 'id' } })).toBe(1);
    });

    it('returns 10 for a leaf node with plural name (list heuristic)', () => {
      expect(estimateComplexity({ name: { value: 'users' } }, 0, 'users')).toBe(10);
    });

    it('does not apply list multiplier for single-char plural "s"', () => {
      // fieldName 's' has length 1, so no list multiplier
      expect(estimateComplexity({ name: { value: 's' } }, 0, 's')).toBe(1);
    });

    it('calculates correct complexity for simple two-level tree', () => {
      const node: SelectableNode = {
        name: { value: 'query' },
        selectionSet: {
          selections: [
            { name: { value: 'id' } },
            { name: { value: 'name' } },
          ],
        },
      };
      // 1 (self) + 1 (id) + 1 (name) = 3
      expect(estimateComplexity(node)).toBe(3);
    });

    it('applies 10x multiplier for list fields', () => {
      const node: SelectableNode = {
        name: { value: 'query' },
        selectionSet: {
          selections: [
            {
              name: { value: 'users' },
              selectionSet: {
                selections: [
                  { name: { value: 'id' } },
                  { name: { value: 'email' } },
                ],
              },
            },
          ],
        },
      };
      // Root: 1 + users subtree
      // users (list): 1 + (id:1 + email:1) * 10 = 1 + 20 = 21
      // Total: 1 + 21 = 22
      expect(estimateComplexity(node)).toBe(22);
    });

    it('caps recursion at depth 20', () => {
      const deep = buildTree(25, 'field');
      const result = estimateComplexity(deep);
      expect(result).toBeGreaterThan(0);
      expect(result).toBeLessThan(1000);
    });

    it('handles empty selectionSet', () => {
      const node: SelectableNode = {
        name: { value: 'query' },
        selectionSet: { selections: [] },
      };
      // 1 (self) + 0 children = 1
      expect(estimateComplexity(node)).toBe(1);
    });

    it('handles missing name gracefully', () => {
      const node: SelectableNode = {
        selectionSet: {
          selections: [{ name: { value: 'id' } }],
        },
      };
      expect(estimateComplexity(node)).toBe(2);
    });
  });

  describe('depthLimitRule', () => {
    it('does not report error for shallow query', () => {
      const reportError = vi.fn();
      const context = { reportError } as any;
      const visitor = depthLimitRule(5)(context);
      const shallowDoc = {
        definitions: [
          {
            kind: 'OperationDefinition',
            selectionSet: {
              selections: [{ name: { value: 'id' } }],
            },
          },
        ],
      };
      visitor.Document?.(shallowDoc as any, '' as any, undefined, [] as any, [] as any);
      expect(reportError).not.toHaveBeenCalled();
    });

    it('reports error for query exceeding max depth', () => {
      const reportError = vi.fn();
      const context = { reportError } as any;
      const visitor = depthLimitRule(2)(context);
      const deepDoc = {
        definitions: [
          {
            kind: 'OperationDefinition',
            ...buildTree(5),
          },
        ],
      };
      visitor.Document?.(deepDoc as any, '' as any, undefined, [] as any, [] as any);
      expect(reportError).toHaveBeenCalledTimes(1);
      expect(reportError.mock.calls[0][0].message).toContain('exceeds maximum allowed depth');
    });

    it('skips non-OperationDefinition nodes', () => {
      const reportError = vi.fn();
      const context = { reportError } as any;
      const visitor = depthLimitRule(1)(context);
      const doc = {
        definitions: [
          { kind: 'FragmentDefinition', ...buildTree(10) },
        ],
      };
      visitor.Document?.(doc as any, '' as any, undefined, [] as any, [] as any);
      expect(reportError).not.toHaveBeenCalled();
    });

    it('uses default MAX_DEPTH when no argument given', () => {
      expect(MAX_DEPTH).toBe(10);
      const context = { reportError: vi.fn() } as any;
      const visitor = depthLimitRule()(context);
      expect(visitor).toBeDefined();
    });
  });

  describe('complexityLimitRule', () => {
    it('does not report error for simple query', () => {
      const reportError = vi.fn();
      const context = { reportError } as any;
      const visitor = complexityLimitRule(100)(context);
      const simpleDoc = {
        definitions: [
          {
            kind: 'OperationDefinition',
            selectionSet: {
              selections: [{ name: { value: 'id' } }],
            },
          },
        ],
      };
      visitor.Document?.(simpleDoc as any, '' as any, undefined, [] as any, [] as any);
      expect(reportError).not.toHaveBeenCalled();
    });

    it('reports error for overly complex query', () => {
      const reportError = vi.fn();
      const context = { reportError } as any;
      const visitor = complexityLimitRule(5)(context);
      const complexDoc = {
        definitions: [
          {
            kind: 'OperationDefinition',
            selectionSet: {
              selections: Array.from({ length: 10 }, (_, i) => ({
                name: { value: `field${i}` },
              })),
            },
          },
        ],
      };
      visitor.Document?.(complexDoc as any, '' as any, undefined, [] as any, [] as any);
      expect(reportError).toHaveBeenCalledTimes(1);
      expect(reportError.mock.calls[0][0].message).toContain('exceeds maximum allowed complexity');
    });

    it('uses default MAX_COMPLEXITY when no argument given', () => {
      expect(MAX_COMPLEXITY).toBe(1000);
    });
  });
});
