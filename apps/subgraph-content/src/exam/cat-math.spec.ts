import { describe, it, expect } from 'vitest';
import {
  fisherInformation3PL,
  standardNormalCDF,
  passingProbability,
} from './cat-math';

describe('cat-math', () => {
  describe('fisherInformation3PL', () => {
    it('returns positive value for typical item parameters', () => {
      const info = fisherInformation3PL(0, 1.2, 0, 0.2);
      expect(info).toBeGreaterThan(0);
    });

    it('peaks near item difficulty (b parameter)', () => {
      const b = 1.0;
      const infoAtB = fisherInformation3PL(b, 1.5, b, 0.1);
      const infoFarBelow = fisherInformation3PL(b - 3, 1.5, b, 0.1);
      const infoFarAbove = fisherInformation3PL(b + 3, 1.5, b, 0.1);
      expect(infoAtB).toBeGreaterThan(infoFarBelow);
      expect(infoAtB).toBeGreaterThan(infoFarAbove);
    });

    it('increases with higher discrimination (a)', () => {
      const lowA = fisherInformation3PL(0, 0.5, 0, 0.2);
      const highA = fisherInformation3PL(0, 2.0, 0, 0.2);
      expect(highA).toBeGreaterThan(lowA);
    });

    it('returns 0 for degenerate parameters', () => {
      expect(fisherInformation3PL(0, 1, 0, 1)).toBe(0);
    });
  });

  describe('standardNormalCDF', () => {
    it('returns ~0.5 for z=0', () => {
      expect(standardNormalCDF(0)).toBeCloseTo(0.5, 5);
    });

    it('returns ~0.975 for z=1.96', () => {
      expect(standardNormalCDF(1.96)).toBeCloseTo(0.975, 2);
    });

    it('returns ~0.025 for z=-1.96', () => {
      expect(standardNormalCDF(-1.96)).toBeCloseTo(0.025, 2);
    });

    it('returns ~0.8413 for z=1', () => {
      expect(standardNormalCDF(1)).toBeCloseTo(0.8413, 3);
    });

    it('returns 0 for very negative z', () => {
      expect(standardNormalCDF(-10)).toBe(0);
    });

    it('returns 1 for very positive z', () => {
      expect(standardNormalCDF(10)).toBe(1);
    });

    it('is monotonically increasing', () => {
      const vals = [-3, -2, -1, 0, 1, 2, 3].map(standardNormalCDF);
      for (let i = 1; i < vals.length; i++) {
        expect(vals[i]).toBeGreaterThan(vals[i - 1]!);
      }
    });
  });

  describe('passingProbability', () => {
    it('returns ~1.0 when theta >> thetaCut', () => {
      expect(passingProbability(3, 0, 0.5)).toBeCloseTo(1.0, 2);
    });

    it('returns ~0.0 when theta << thetaCut', () => {
      expect(passingProbability(-3, 0, 0.5)).toBeCloseTo(0.0, 2);
    });

    it('returns ~0.5 when theta equals thetaCut', () => {
      expect(passingProbability(1, 1, 0.5)).toBeCloseTo(0.5, 2);
    });

    it('returns 1 when se=0 and theta >= thetaCut', () => {
      expect(passingProbability(1, 0, 0)).toBe(1);
    });

    it('returns 0 when se=0 and theta < thetaCut', () => {
      expect(passingProbability(-1, 0, 0)).toBe(0);
    });
  });
});
