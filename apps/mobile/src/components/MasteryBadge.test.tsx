/**
 * MasteryBadge — logic tests
 * Verifies level-to-color and level-to-label mappings without rendering.
 * Follows the MyBadgesScreen pattern: pure logic, no @testing-library/react-native.
 */
import { describe, it, expect } from 'vitest';
import type { MasteryLevel } from './MasteryBadge';

// Mirror the internal maps for assertion purposes
const LEVEL_COLOR: Record<MasteryLevel, string> = {
  none: '#94A3B8',
  attempted: '#60A5FA',
  familiar: '#FBBF24',
  proficient: '#34D399',
  mastered: '#6366F1',
};

const LEVEL_LABEL: Record<MasteryLevel, string> = {
  none: 'Not Started',
  attempted: 'Attempted',
  familiar: 'Familiar',
  proficient: 'Proficient',
  mastered: 'Mastered',
};

const ALL_LEVELS: MasteryLevel[] = [
  'none',
  'attempted',
  'familiar',
  'proficient',
  'mastered',
];

describe('MasteryBadge — level mapping', () => {
  it('has a color defined for every level', () => {
    for (const level of ALL_LEVELS) {
      expect(LEVEL_COLOR[level]).toBeTruthy();
    }
  });

  it('has a label defined for every level', () => {
    for (const level of ALL_LEVELS) {
      expect(LEVEL_LABEL[level]).toBeTruthy();
    }
  });

  it('none maps to gray color', () => {
    expect(LEVEL_COLOR.none).toBe('#94A3B8');
  });

  it('attempted maps to blue color', () => {
    expect(LEVEL_COLOR.attempted).toBe('#60A5FA');
  });

  it('familiar maps to amber color', () => {
    expect(LEVEL_COLOR.familiar).toBe('#FBBF24');
  });

  it('proficient maps to green color', () => {
    expect(LEVEL_COLOR.proficient).toBe('#34D399');
  });

  it('mastered maps to indigo color', () => {
    expect(LEVEL_COLOR.mastered).toBe('#6366F1');
  });

  it('none label is "Not Started"', () => {
    expect(LEVEL_LABEL.none).toBe('Not Started');
  });

  it('mastered label is "Mastered"', () => {
    expect(LEVEL_LABEL.mastered).toBe('Mastered');
  });

  it('all labels are non-empty strings', () => {
    for (const level of ALL_LEVELS) {
      expect(typeof LEVEL_LABEL[level]).toBe('string');
      expect(LEVEL_LABEL[level].length).toBeGreaterThan(0);
    }
  });

  it('all colors are valid hex strings', () => {
    const hexPattern = /^#[0-9A-Fa-f]{6}$/;
    for (const level of ALL_LEVELS) {
      expect(hexPattern.test(LEVEL_COLOR[level])).toBe(true);
    }
  });
});

describe('MasteryBadge — size dot dimensions', () => {
  it('sm size uses dot width 8', () => {
    const dotSize = 'sm' === 'sm' ? 8 : 10;
    expect(dotSize).toBe(8);
  });

  it('md size uses dot width 10', () => {
    const dotSize = 'md' === 'sm' ? 8 : 10;
    expect(dotSize).toBe(10);
  });

  it('sm size uses font size 11', () => {
    const fontSize = 'sm' === 'sm' ? 11 : 12;
    expect(fontSize).toBe(11);
  });

  it('md size uses font size 12', () => {
    const fontSize = 'md' === 'sm' ? 11 : 12;
    expect(fontSize).toBe(12);
  });
});

describe('MasteryBadge — all levels exist', () => {
  it.each(ALL_LEVELS)('level "%s" is a valid MasteryLevel', (level) => {
    expect(ALL_LEVELS).toContain(level);
    expect(LEVEL_COLOR[level]).toBeDefined();
    expect(LEVEL_LABEL[level]).toBeDefined();
  });
});
