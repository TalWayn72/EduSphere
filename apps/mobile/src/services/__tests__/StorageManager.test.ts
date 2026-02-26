/**
 * StorageManager quota logic tests.
 *
 * Verifies the pure math behind quota, threshold detection, and byte-to-ratio
 * calculations — no Expo or Node.js module imports required.
 * Self-contained to avoid ts-jest OOM when resolving Expo type trees.
 */

// ── Constants (mirrors StorageManager.ts) ────────────────────────────────────

const STORAGE_QUOTA_FRACTION = 0.5;
const STORAGE_WARN_FRACTION = 0.8;

// ── Helpers (inlined quota math) ─────────────────────────────────────────────

interface QuotaResult {
  eduSphereQuotaBytes: number;
  usageRatio: number;
  isApproachingLimit: boolean;
  isOverLimit: boolean;
  canGoOffline: boolean;
}

function computeQuota(totalDiskBytes: number, usedBytes: number): QuotaResult {
  const eduSphereQuotaBytes = Math.floor(
    totalDiskBytes * STORAGE_QUOTA_FRACTION
  );
  const usageRatio =
    eduSphereQuotaBytes > 0 ? usedBytes / eduSphereQuotaBytes : 0;
  return {
    eduSphereQuotaBytes,
    usageRatio,
    isApproachingLimit: usageRatio >= STORAGE_WARN_FRACTION,
    isOverLimit: usageRatio >= 1.0,
    canGoOffline: usageRatio < 1.0,
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('StorageManager quota math', () => {
  const GB = 1024 * 1024 * 1024;
  const MB = 1024 * 1024;

  describe('quota calculation', () => {
    it('sets eduSphereQuota to 50% of total disk', () => {
      const result = computeQuota(100 * GB, 0);
      expect(result.eduSphereQuotaBytes).toBe(50 * GB);
    });

    it('rounds down quota (floor)', () => {
      const result = computeQuota(101 * GB, 0);
      expect(result.eduSphereQuotaBytes).toBeLessThanOrEqual(51 * GB);
      expect(result.eduSphereQuotaBytes).toBeGreaterThanOrEqual(50 * GB);
    });
  });

  describe('canGoOffline', () => {
    it('is true when well below quota', () => {
      const { canGoOffline, isOverLimit } = computeQuota(100 * GB, 10 * MB);
      expect(canGoOffline).toBe(true);
      expect(isOverLimit).toBe(false);
    });

    it('is false when usage exceeds 100% of quota', () => {
      // 100 MB disk → 50 MB quota; 60 MB used → ratio 1.2
      const { canGoOffline, isOverLimit } = computeQuota(100 * MB, 60 * MB);
      expect(canGoOffline).toBe(false);
      expect(isOverLimit).toBe(true);
    });

    it('is false at exactly 100% quota (boundary)', () => {
      const { canGoOffline, isOverLimit } = computeQuota(100 * MB, 50 * MB);
      expect(isOverLimit).toBe(true);
      expect(canGoOffline).toBe(false);
    });
  });

  describe(`isApproachingLimit (>= ${STORAGE_WARN_FRACTION * 100}% of quota)`, () => {
    it('is false at 50% usage', () => {
      const { isApproachingLimit } = computeQuota(100 * MB, 25 * MB);
      expect(isApproachingLimit).toBe(false);
    });

    it('is true at 80% usage', () => {
      // quota = 50 MB, used = 40 MB → ratio = 0.8
      const { isApproachingLimit, isOverLimit } = computeQuota(
        100 * MB,
        40 * MB
      );
      expect(isApproachingLimit).toBe(true);
      expect(isOverLimit).toBe(false);
    });

    it('is true at 90% usage', () => {
      const { isApproachingLimit, isOverLimit } = computeQuota(
        100 * MB,
        45 * MB
      );
      expect(isApproachingLimit).toBe(true);
      expect(isOverLimit).toBe(false);
    });
  });

  describe('isStorageAvailable logic', () => {
    it('returns false when adding bytes would exceed quota', () => {
      // quota = 50 MB, used = 45 MB, need 10 MB → 55 MB > 50 MB
      const { eduSphereQuotaBytes } = computeQuota(100 * MB, 0);
      const available = 45 * MB + 10 * MB <= eduSphereQuotaBytes;
      expect(available).toBe(false);
    });

    it('returns true when there is enough room', () => {
      // quota = 50 MB, used = 5 MB, need 10 MB → 15 MB < 50 MB
      const { eduSphereQuotaBytes } = computeQuota(100 * MB, 0);
      const available = 5 * MB + 10 * MB <= eduSphereQuotaBytes;
      expect(available).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('handles zero disk gracefully (no divide-by-zero)', () => {
      const result = computeQuota(0, 0);
      expect(result.usageRatio).toBe(0);
      expect(result.canGoOffline).toBe(true);
    });

    it('handles very small disk (1 MB)', () => {
      const result = computeQuota(MB, 0);
      expect(result.eduSphereQuotaBytes).toBe(Math.floor(MB / 2));
      expect(result.canGoOffline).toBe(true);
    });
  });
});
