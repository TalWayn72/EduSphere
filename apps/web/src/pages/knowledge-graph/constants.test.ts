import { describe, it, expect } from 'vitest';
import {
  SVG_W,
  SVG_H,
  CX,
  CY,
  R,
  NODE_COLOR,
  EDGE_COLOR,
  TYPE_LABEL,
  TYPE_FILTER_STYLE,
  MOCK_LEARNING_PATH,
  computePositions,
} from './constants';
import type { GraphNode } from '@/lib/mock-graph-data';

describe('knowledge-graph/constants', () => {
  it('SVG layout constants are positive numbers', () => {
    expect(SVG_W).toBeGreaterThan(0);
    expect(SVG_H).toBeGreaterThan(0);
    expect(CX).toBeGreaterThan(0);
    expect(CY).toBeGreaterThan(0);
    expect(R).toBeGreaterThan(0);
  });

  it('CX is half of SVG_W', () => {
    expect(CX).toBe(SVG_W / 2);
  });

  it('NODE_COLOR has entries for all types', () => {
    expect(NODE_COLOR['CONCEPT']).toBeTruthy();
    expect(NODE_COLOR['PERSON']).toBeTruthy();
    expect(NODE_COLOR['SOURCE']).toBeTruthy();
    expect(NODE_COLOR['TERM']).toBeTruthy();
  });

  it('EDGE_COLOR has entries for all edge types', () => {
    expect(EDGE_COLOR['CONTRADICTS']).toBeTruthy();
    expect(EDGE_COLOR['PREREQUISITE_OF']).toBeTruthy();
    expect(EDGE_COLOR['RELATED_TO']).toBeTruthy();
    expect(EDGE_COLOR['MENTIONS']).toBeTruthy();
    expect(EDGE_COLOR['CITES']).toBeTruthy();
  });

  it('TYPE_LABEL has entries for all types', () => {
    expect(Object.keys(TYPE_LABEL)).toHaveLength(4);
  });

  it('TYPE_FILTER_STYLE has borderColor and color for each type', () => {
    for (const [key, style] of Object.entries(TYPE_FILTER_STYLE)) {
      expect(style.borderColor).toBe(NODE_COLOR[key]);
      expect(style.color).toBe(NODE_COLOR[key]);
    }
  });

  it('MOCK_LEARNING_PATH has steps and concepts', () => {
    expect(MOCK_LEARNING_PATH.steps).toBeGreaterThan(0);
    expect(MOCK_LEARNING_PATH.concepts.length).toBeGreaterThan(0);
  });

  describe('computePositions', () => {
    it('returns positions for all nodes', () => {
      const nodes: GraphNode[] = [
        { id: 'n1', label: 'Node 1', type: 'CONCEPT' },
        { id: 'n2', label: 'Node 2', type: 'PERSON' },
        { id: 'n3', label: 'Node 3', type: 'SOURCE' },
      ];
      const positions = computePositions(nodes);
      expect(Object.keys(positions)).toHaveLength(3);
      expect(positions['n1']).toHaveProperty('x');
      expect(positions['n1']).toHaveProperty('y');
    });

    it('returns empty object for empty nodes', () => {
      const positions = computePositions([]);
      expect(Object.keys(positions)).toHaveLength(0);
    });

    it('positions are within SVG bounds', () => {
      const nodes: GraphNode[] = [
        { id: 'n1', label: 'A', type: 'CONCEPT' },
        { id: 'n2', label: 'B', type: 'PERSON' },
      ];
      const positions = computePositions(nodes);
      for (const pos of Object.values(positions)) {
        expect(pos.x).toBeGreaterThanOrEqual(CX - R - 1);
        expect(pos.x).toBeLessThanOrEqual(CX + R + 1);
        expect(pos.y).toBeGreaterThanOrEqual(CY - R - 1);
        expect(pos.y).toBeLessThanOrEqual(CY + R + 1);
      }
    });
  });
});
