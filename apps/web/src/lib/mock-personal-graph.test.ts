import { describe, it, expect } from 'vitest';
import {
  mockPersonalNodes,
  mockPersonalEdges,
} from './mock-personal-graph';
import type { PersonalGraphNode, PersonalGraphEdge } from './mock-personal-graph';

describe('mockPersonalNodes', () => {
  it('is a non-empty array', () => {
    expect(Array.isArray(mockPersonalNodes)).toBe(true);
    expect(mockPersonalNodes.length).toBeGreaterThan(0);
  });

  it('each node has all required fields', () => {
    mockPersonalNodes.forEach((node: PersonalGraphNode) => {
      expect(typeof node.id).toBe('string');
      expect(node.id.length).toBeGreaterThan(0);
      expect(typeof node.label).toBe('string');
      expect(node.label.length).toBeGreaterThan(0);
      expect(typeof node.courseId).toBe('string');
      expect(typeof node.courseName).toBe('string');
      expect(typeof node.excerpt).toBe('string');
      expect(typeof node.createdAt).toBe('string');
    });
  });

  it('all node IDs are unique', () => {
    const ids = mockPersonalNodes.map((n) => n.id);
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
  });

  it('createdAt values are valid ISO dates', () => {
    mockPersonalNodes.forEach((node) => {
      const date = new Date(node.createdAt);
      expect(isNaN(date.getTime())).toBe(false);
    });
  });

  it('contentTimestamp is a positive number when present', () => {
    mockPersonalNodes.forEach((node) => {
      if (node.contentTimestamp !== undefined) {
        expect(typeof node.contentTimestamp).toBe('number');
        expect(node.contentTimestamp).toBeGreaterThan(0);
      }
    });
  });

  it('has at least 5 nodes', () => {
    expect(mockPersonalNodes.length).toBeGreaterThanOrEqual(5);
  });
});

describe('mockPersonalEdges', () => {
  it('is a non-empty array', () => {
    expect(Array.isArray(mockPersonalEdges)).toBe(true);
    expect(mockPersonalEdges.length).toBeGreaterThan(0);
  });

  it('each edge has all required fields', () => {
    mockPersonalEdges.forEach((edge: PersonalGraphEdge) => {
      expect(typeof edge.id).toBe('string');
      expect(edge.id.length).toBeGreaterThan(0);
      expect(typeof edge.source).toBe('string');
      expect(typeof edge.target).toBe('string');
      expect(typeof edge.sharedConcept).toBe('string');
      expect(edge.sharedConcept.length).toBeGreaterThan(0);
    });
  });

  it('all edge IDs are unique', () => {
    const ids = mockPersonalEdges.map((e) => e.id);
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
  });

  it('all edge sources and targets reference existing node IDs', () => {
    const nodeIds = new Set(mockPersonalNodes.map((n) => n.id));
    mockPersonalEdges.forEach((edge) => {
      expect(nodeIds.has(edge.source)).toBe(true);
      expect(nodeIds.has(edge.target)).toBe(true);
    });
  });

  it('has at least 5 edges', () => {
    expect(mockPersonalEdges.length).toBeGreaterThanOrEqual(5);
  });
});
