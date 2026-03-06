import { describe, it, expect } from 'vitest';
import { COLORS, SPACING, RADIUS, FONT, SHADOW } from './theme';

describe('theme — COLORS', () => {
  it('primary is indigo #6366F1', () => {
    expect(COLORS.primary).toBe('#6366F1');
  });

  it('bg is slate-50 #F8FAFC', () => {
    expect(COLORS.bg).toBe('#F8FAFC');
  });

  it('all mastery colors are defined', () => {
    expect(COLORS.masteryNone).toBeDefined();
    expect(COLORS.masteryAttempted).toBeDefined();
    expect(COLORS.masteryFamiliar).toBeDefined();
    expect(COLORS.masteryProficient).toBeDefined();
    expect(COLORS.masteryMastered).toBeDefined();
  });

  it('masteryMastered matches primary', () => {
    expect(COLORS.masteryMastered).toBe(COLORS.primary);
  });
});

describe('theme — SPACING', () => {
  it('has all required keys', () => {
    expect(SPACING.xs).toBeDefined();
    expect(SPACING.sm).toBeDefined();
    expect(SPACING.md).toBeDefined();
    expect(SPACING.lg).toBeDefined();
    expect(SPACING.xl).toBeDefined();
    expect(SPACING.xxl).toBeDefined();
    expect(SPACING.xxxl).toBeDefined();
  });

  it('values are numeric', () => {
    expect(typeof SPACING.lg).toBe('number');
    expect(SPACING.lg).toBe(16);
  });
});

describe('theme — RADIUS', () => {
  it('has all required keys', () => {
    expect(RADIUS.sm).toBeDefined();
    expect(RADIUS.md).toBeDefined();
    expect(RADIUS.lg).toBeDefined();
    expect(RADIUS.xl).toBeDefined();
    expect(RADIUS.full).toBeDefined();
  });

  it('full radius is 9999', () => {
    expect(RADIUS.full).toBe(9999);
  });
});

describe('theme — FONT', () => {
  it('has weight constants as string literals', () => {
    expect(FONT.regular).toBe('400');
    expect(FONT.medium).toBe('500');
    expect(FONT.semibold).toBe('600');
    expect(FONT.bold).toBe('700');
  });
});

describe('theme — SHADOW', () => {
  it('sm and md are defined', () => {
    expect(SHADOW.sm).toBeDefined();
    expect(SHADOW.md).toBeDefined();
  });
});
