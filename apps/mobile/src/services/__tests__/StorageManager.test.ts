/**
 * StorageManager unit tests.
 * Verifies quota logic, threshold detection, and cleanup methods.
 * Memory safety: no intervals owned by StorageManager itself — those live in the hook.
 */
import { StorageManager, STORAGE_QUOTA_FRACTION, STORAGE_WARN_FRACTION } from '../StorageManager';

// ── Mocks ────────────────────────────────────────────────────────────────────

jest.mock('expo-file-system', () => ({
  documentDirectory: '/app/docs/',
  getTotalDiskCapacityAsync: jest.fn(),
  getFreeDiskStorageAsync: jest.fn(),
  getInfoAsync: jest.fn(),
  readDirectoryAsync: jest.fn(),
  deleteAsync: jest.fn(),
}));

jest.mock('../database', () => ({
  database: {
    init: jest.fn(),
    runAsync: jest.fn(),
  },
}));

import * as FileSystem from 'expo-file-system';
import { database } from '../database';

const mockFS = FileSystem as jest.Mocked<typeof FileSystem>;
const mockDb = database as jest.Mocked<typeof database>;

// ── Helpers ──────────────────────────────────────────────────────────────────

function setupDisk(totalGB: number, freeGB: number, eduUsedMB: number) {
  const GB = 1024 * 1024 * 1024;
  const MB = 1024 * 1024;
  (mockFS.getTotalDiskCapacityAsync as jest.Mock).mockResolvedValue(totalGB * GB);
  (mockFS.getFreeDiskStorageAsync as jest.Mock).mockResolvedValue(freeGB * GB);

  // courses dir = eduUsedMB, no SQLite DBs
  (mockFS.getInfoAsync as jest.Mock).mockImplementation((path: string) => {
    if (path.endsWith('courses/')) return Promise.resolve({ exists: true, isDirectory: true });
    return Promise.resolve({ exists: false }); // .db files not present
  });
  (mockFS.readDirectoryAsync as jest.Mock).mockResolvedValue(['lesson1.mp4']);
  // Each file = eduUsedMB (all in one file for simplicity)
  (mockFS.getInfoAsync as jest.Mock).mockImplementation((path: string) => {
    if (path.endsWith('/')) return Promise.resolve({ exists: true, isDirectory: true });
    if (path.endsWith('.mp4')) return Promise.resolve({ exists: true, isDirectory: false, size: eduUsedMB * MB });
    return Promise.resolve({ exists: false });
  });
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('StorageManager', () => {
  let manager: StorageManager;

  beforeEach(() => {
    jest.clearAllMocks();
    manager = new StorageManager();
  });

  describe('getStats()', () => {
    it('calculates quota as QUOTA_FRACTION of total disk', async () => {
      setupDisk(100, 60, 5); // 100 GB total, 5 MB used
      const stats = await manager.getStats();
      const expectedQuota = Math.floor(100 * 1024 * 1024 * 1024 * STORAGE_QUOTA_FRACTION);
      expect(stats.eduSphereQuotaBytes).toBe(expectedQuota);
    });

    it('sets canGoOffline = true when usage is below limit', async () => {
      setupDisk(100, 60, 100); // 100 MB used of 50 GB quota
      const stats = await manager.getStats();
      expect(stats.canGoOffline).toBe(true);
      expect(stats.isOverLimit).toBe(false);
    });

    it('sets isOverLimit = true when usage exceeds 100% of quota', async () => {
      // Quota = 50 GB. Set used > 50 GB via a very small total disk.
      const MB = 1024 * 1024;
      (mockFS.getTotalDiskCapacityAsync as jest.Mock).mockResolvedValue(10 * MB); // 10 MB disk
      (mockFS.getFreeDiskStorageAsync as jest.Mock).mockResolvedValue(0);
      // Used = 6 MB → quota = 5 MB → usageRatio = 1.2
      jest.spyOn(manager, 'getEduSphereUsedBytes').mockResolvedValue(6 * MB);

      const stats = await manager.getStats();
      expect(stats.isOverLimit).toBe(true);
      expect(stats.canGoOffline).toBe(false);
    });

    it(`sets isApproachingLimit at >= ${STORAGE_WARN_FRACTION * 100}% usage`, async () => {
      const MB = 1024 * 1024;
      (mockFS.getTotalDiskCapacityAsync as jest.Mock).mockResolvedValue(100 * MB);
      (mockFS.getFreeDiskStorageAsync as jest.Mock).mockResolvedValue(50 * MB);
      // quota = 50 MB, used = 41 MB → ratio = 0.82
      jest.spyOn(manager, 'getEduSphereUsedBytes').mockResolvedValue(41 * MB);

      const stats = await manager.getStats();
      expect(stats.isApproachingLimit).toBe(true);
      expect(stats.isOverLimit).toBe(false);
    });

    it('is healthy when well below quota', async () => {
      const MB = 1024 * 1024;
      (mockFS.getTotalDiskCapacityAsync as jest.Mock).mockResolvedValue(100 * MB);
      (mockFS.getFreeDiskStorageAsync as jest.Mock).mockResolvedValue(80 * MB);
      jest.spyOn(manager, 'getEduSphereUsedBytes').mockResolvedValue(10 * MB);

      const stats = await manager.getStats();
      expect(stats.isApproachingLimit).toBe(false);
      expect(stats.isOverLimit).toBe(false);
      expect(stats.canGoOffline).toBe(true);
    });
  });

  describe('isStorageAvailable()', () => {
    it('returns false when adding neededBytes would exceed quota', async () => {
      const MB = 1024 * 1024;
      jest.spyOn(manager, 'getStats').mockResolvedValue({
        totalDiskBytes: 100 * MB,
        freeDiskBytes: 50 * MB,
        eduSphereQuotaBytes: 50 * MB,
        eduSphereUsedBytes: 45 * MB,
        usageRatio: 0.9,
        isApproachingLimit: true,
        isOverLimit: false,
        canGoOffline: true,
      });
      const ok = await manager.isStorageAvailable(10 * MB); // would push to 55 MB > 50 MB quota
      expect(ok).toBe(false);
    });

    it('returns true when there is enough room', async () => {
      const MB = 1024 * 1024;
      jest.spyOn(manager, 'getStats').mockResolvedValue({
        totalDiskBytes: 100 * MB,
        freeDiskBytes: 70 * MB,
        eduSphereQuotaBytes: 50 * MB,
        eduSphereUsedBytes: 5 * MB,
        usageRatio: 0.1,
        isApproachingLimit: false,
        isOverLimit: false,
        canGoOffline: true,
      });
      const ok = await manager.isStorageAvailable(10 * MB);
      expect(ok).toBe(true);
    });
  });

  describe('clearDownloads()', () => {
    it('deletes courses directory and clears DB records', async () => {
      jest.spyOn(manager, 'getEduSphereUsedBytes')
        .mockResolvedValueOnce(50 * 1024 * 1024) // before
        .mockResolvedValueOnce(5 * 1024 * 1024);  // after (only DB files left)

      (mockFS.getInfoAsync as jest.Mock).mockResolvedValue({ exists: true, isDirectory: true });
      (mockFS.readDirectoryAsync as jest.Mock).mockResolvedValue([]);
      (mockFS.deleteAsync as jest.Mock).mockResolvedValue(undefined);

      await manager.clearDownloads();
      expect(mockFS.deleteAsync).toHaveBeenCalledWith(
        expect.stringContaining('courses/'),
        { idempotent: true }
      );
      expect(mockDb.runAsync).toHaveBeenCalledWith('DELETE FROM offline_courses');
    });
  });

  describe('clearQueryCache()', () => {
    it('deletes cached_queries from SQLite', async () => {
      jest.spyOn(manager, 'getEduSphereUsedBytes')
        .mockResolvedValue(0);

      await manager.clearQueryCache();
      expect(mockDb.runAsync).toHaveBeenCalledWith('DELETE FROM cached_queries');
    });
  });
});
