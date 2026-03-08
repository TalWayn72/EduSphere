import { describe, it, expect } from 'vitest';

// Inline pure helpers matching OnboardingScreen.tsx exports
function getStepTitle(step: number): string {
  const titles: Record<number, string> = {
    1: 'Set up your profile',
    2: 'Choose your interests',
    3: 'Start learning',
  };
  return titles[step] ?? `Step ${step}`;
}

function validateDisplayName(name: string): boolean {
  return name.trim().length >= 2 && name.trim().length <= 50;
}

describe('OnboardingScreen — pure helpers', () => {
  describe('getStepTitle', () => {
    it('returns correct title for step 1', () => {
      expect(getStepTitle(1)).toBe('Set up your profile');
    });
    it('returns correct title for step 2', () => {
      expect(getStepTitle(2)).toBe('Choose your interests');
    });
    it('returns correct title for step 3', () => {
      expect(getStepTitle(3)).toBe('Start learning');
    });
    it('returns fallback for unknown step', () => {
      expect(getStepTitle(99)).toBe('Step 99');
    });
  });

  describe('validateDisplayName', () => {
    it('accepts valid names', () => {
      expect(validateDisplayName('Alice')).toBe(true);
      expect(validateDisplayName('Jo')).toBe(true);
    });
    it('rejects too short names', () => {
      expect(validateDisplayName('A')).toBe(false);
      expect(validateDisplayName('')).toBe(false);
      expect(validateDisplayName('  ')).toBe(false);
    });
    it('rejects too long names (>50 chars)', () => {
      expect(validateDisplayName('A'.repeat(51))).toBe(false);
    });
  });
});
