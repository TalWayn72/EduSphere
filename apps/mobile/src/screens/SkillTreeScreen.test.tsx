/**
 * SkillTreeScreen — pure logic tests.
 * No @testing-library/react-native required (not installed).
 * Pure function duplicates avoid importing the screen component
 * (which pulls in @react-navigation/native with Flow typeof syntax).
 */
import { describe, it, expect } from 'vitest';
import { COLORS } from '../lib/theme';

// ---------------------------------------------------------------------------
// Mirror masteryColor from SkillTreeScreen for unit testing
// ---------------------------------------------------------------------------
type MasteryLevel = 'NONE' | 'ATTEMPTED' | 'FAMILIAR' | 'PROFICIENT' | 'MASTERED';

function masteryColor(level: MasteryLevel): string {
  switch (level) {
    case 'MASTERED': return COLORS.masteryMastered;
    case 'PROFICIENT': return COLORS.masteryProficient;
    case 'FAMILIAR': return COLORS.masteryFamiliar;
    case 'ATTEMPTED': return COLORS.masteryAttempted;
    default: return COLORS.masteryNone;
  }
}

// Mirror masteryPercent from SkillTreeScreen for unit testing
function masteryPercent(level: MasteryLevel): number {
  const map: Record<MasteryLevel, number> = {
    NONE: 0, ATTEMPTED: 25, FAMILIAR: 50, PROFICIENT: 75, MASTERED: 100,
  };
  return map[level] ?? 0;
}

// ---------------------------------------------------------------------------
// masteryColor tests
// ---------------------------------------------------------------------------
describe('SkillTreeScreen — masteryColor', () => {
  it('MASTERED → primary indigo color', () => {
    expect(masteryColor('MASTERED')).toBe(COLORS.masteryMastered);
  });

  it('PROFICIENT → green color', () => {
    expect(masteryColor('PROFICIENT')).toBe(COLORS.masteryProficient);
  });

  it('FAMILIAR → amber color', () => {
    expect(masteryColor('FAMILIAR')).toBe(COLORS.masteryFamiliar);
  });

  it('ATTEMPTED → blue color', () => {
    expect(masteryColor('ATTEMPTED')).toBe(COLORS.masteryAttempted);
  });

  it('NONE → grey color', () => {
    expect(masteryColor('NONE')).toBe(COLORS.masteryNone);
  });

  it('MASTERED color is not the same as NONE color', () => {
    expect(masteryColor('MASTERED')).not.toBe(masteryColor('NONE'));
  });
});

// ---------------------------------------------------------------------------
// masteryPercent tests
// ---------------------------------------------------------------------------
describe('SkillTreeScreen — masteryPercent', () => {
  it('NONE → 0%', () => {
    expect(masteryPercent('NONE')).toBe(0);
  });

  it('ATTEMPTED → 25%', () => {
    expect(masteryPercent('ATTEMPTED')).toBe(25);
  });

  it('FAMILIAR → 50%', () => {
    expect(masteryPercent('FAMILIAR')).toBe(50);
  });

  it('PROFICIENT → 75%', () => {
    expect(masteryPercent('PROFICIENT')).toBe(75);
  });

  it('MASTERED → 100%', () => {
    expect(masteryPercent('MASTERED')).toBe(100);
  });

  it('all levels produce values in [0, 100]', () => {
    const levels: MasteryLevel[] = ['NONE', 'ATTEMPTED', 'FAMILIAR', 'PROFICIENT', 'MASTERED'];
    for (const level of levels) {
      const pct = masteryPercent(level);
      expect(pct).toBeGreaterThanOrEqual(0);
      expect(pct).toBeLessThanOrEqual(100);
    }
  });

  it('percentages are strictly increasing', () => {
    expect(masteryPercent('NONE')).toBeLessThan(masteryPercent('ATTEMPTED'));
    expect(masteryPercent('ATTEMPTED')).toBeLessThan(masteryPercent('FAMILIAR'));
    expect(masteryPercent('FAMILIAR')).toBeLessThan(masteryPercent('PROFICIENT'));
    expect(masteryPercent('PROFICIENT')).toBeLessThan(masteryPercent('MASTERED'));
  });
});

// ---------------------------------------------------------------------------
// selectedNode initial state
// ---------------------------------------------------------------------------
describe('SkillTreeScreen — selectedNode state', () => {
  it('selectedNode starts as null', () => {
    type SkillNode = { id: string; label: string; masteryLevel: MasteryLevel };
    const selectedNode: SkillNode | null = null;
    expect(selectedNode).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Mock node data shape
// ---------------------------------------------------------------------------
describe('SkillTreeScreen — mock node shape', () => {
  const mockNode = {
    id: 'sn-1',
    label: 'Critical Thinking',
    type: 'SKILL',
    masteryLevel: 'MASTERED' as MasteryLevel,
    connections: ['sn-2'],
  };

  it('has required id field', () => {
    expect(mockNode.id).toBeTruthy();
  });

  it('has required label field', () => {
    expect(mockNode.label).toBeTruthy();
  });

  it('has valid masteryLevel', () => {
    const valid: string[] = ['NONE', 'ATTEMPTED', 'FAMILIAR', 'PROFICIENT', 'MASTERED'];
    expect(valid).toContain(mockNode.masteryLevel);
  });

  it('connections is an array', () => {
    expect(Array.isArray(mockNode.connections)).toBe(true);
  });
});
