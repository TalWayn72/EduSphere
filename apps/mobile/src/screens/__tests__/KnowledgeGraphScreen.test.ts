import { describe, it, expect } from 'vitest';

// Test graph data transformation logic — mirrors KnowledgeGraphScreen node display
interface RawNode { id: string; label: string; mastery_level: number }
interface DisplayNode { id: string; label: string; masteryPct: number; color: string }

function transformGraphNodes(nodes: RawNode[]): DisplayNode[] {
  return nodes.map((n) => ({
    id: n.id,
    label: n.label,
    masteryPct: Math.round(n.mastery_level * 100),
    color: n.mastery_level >= 0.8 ? '#22C55E' : n.mastery_level >= 0.5 ? '#F59E0B' : '#EF4444',
  }));
}

describe('KnowledgeGraphScreen — data transformation', () => {
  it('transforms mastery level to percentage', () => {
    const nodes = [{ id: 'n1', label: 'Torah', mastery_level: 0.75 }];
    const result = transformGraphNodes(nodes);
    expect(result[0]!.masteryPct).toBe(75);
  });

  it('assigns green color for mastery >= 80%', () => {
    const nodes = [{ id: 'n1', label: 'Talmud', mastery_level: 0.9 }];
    expect(transformGraphNodes(nodes)[0]!.color).toBe('#22C55E');
  });

  it('assigns amber color for mastery 50-79%', () => {
    const nodes = [{ id: 'n1', label: 'Halacha', mastery_level: 0.6 }];
    expect(transformGraphNodes(nodes)[0]!.color).toBe('#F59E0B');
  });

  it('assigns red color for mastery < 50%', () => {
    const nodes = [{ id: 'n1', label: 'Kabbalah', mastery_level: 0.3 }];
    expect(transformGraphNodes(nodes)[0]!.color).toBe('#EF4444');
  });

  it('handles empty node list', () => {
    expect(transformGraphNodes([])).toHaveLength(0);
  });

  it('rounds mastery percentage correctly', () => {
    const nodes = [{ id: 'n1', label: 'Test', mastery_level: 0.756 }];
    expect(transformGraphNodes(nodes)[0]!.masteryPct).toBe(76);
  });
});
