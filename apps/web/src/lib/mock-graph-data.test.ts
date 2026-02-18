import { describe, it, expect } from 'vitest';
import { mockGraphData } from './mock-graph-data';

describe('mockGraphData', () => {
  it('has nodes and edges arrays', () => {
    expect(Array.isArray(mockGraphData.nodes)).toBe(true);
    expect(Array.isArray(mockGraphData.edges)).toBe(true);
  });

  it('has at least 10 nodes', () => {
    expect(mockGraphData.nodes.length).toBeGreaterThanOrEqual(10);
  });

  it('has at least 5 edges', () => {
    expect(mockGraphData.edges.length).toBeGreaterThanOrEqual(5);
  });

  it('each node has id, label, and valid type', () => {
    const validTypes = ['CONCEPT', 'PERSON', 'TERM', 'SOURCE'];
    mockGraphData.nodes.forEach((node) => {
      expect(typeof node.id).toBe('string');
      expect(node.id.length).toBeGreaterThan(0);
      expect(typeof node.label).toBe('string');
      expect(validTypes).toContain(node.type);
    });
  });

  it('all node IDs are unique', () => {
    const ids = mockGraphData.nodes.map((n) => n.id);
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
  });

  it('each edge has id, source, target, and valid type', () => {
    const validEdgeTypes = [
      'PREREQUISITE_OF',
      'CONTRADICTS',
      'RELATED_TO',
      'MENTIONS',
      'CITES',
    ];
    mockGraphData.edges.forEach((edge) => {
      expect(typeof edge.id).toBe('string');
      expect(typeof edge.source).toBe('string');
      expect(typeof edge.target).toBe('string');
      expect(validEdgeTypes).toContain(edge.type);
    });
  });

  it('all edge IDs are unique', () => {
    const ids = mockGraphData.edges.map((e) => e.id);
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
  });

  it('all edge sources and targets reference existing node IDs', () => {
    const nodeIds = new Set(mockGraphData.nodes.map((n) => n.id));
    mockGraphData.edges.forEach((edge) => {
      expect(nodeIds.has(edge.source)).toBe(true);
      expect(nodeIds.has(edge.target)).toBe(true);
    });
  });
});
