/**
 * StorageManager — tracks EduSphere's local storage footprint on device.
 *
 * Quota policy:
 *   • Hard quota  = 50 % of total device disk capacity
 *   • Warn zone   = ≥ 80 % of quota consumed  → alert user, soft-block new downloads
 *   • Over-limit  = ≥ 100 % of quota consumed → block offline mode entirely
 *
 * Memory-safe: stateless service singleton, no intervals held here.
 * Intervals are owned by useStorageManager hook (cleared on unmount).
 */
import * as FileSystem from 'expo-file-system';
import { database } from './database';

/** EduSphere may use at most this fraction of total device disk. */
export const STORAGE_QUOTA_FRACTION = 0.5;

/** Warn when EduSphere's usage reaches this fraction of its quota. */
export const STORAGE_WARN_FRACTION = 0.8;

export interface StorageStats {
  totalDiskBytes: number;
  freeDiskBytes: number;
  /** QUOTA_FRACTION × totalDiskBytes */
  eduSphereQuotaBytes: number;
  /** courses dir + SQLite .db files */
  eduSphereUsedBytes: number;
  /** 0–1 relative to quota (can exceed 1.0 if over limit) */
  usageRatio: number;
  isApproachingLimit: boolean;
  isOverLimit: boolean;
  /** false when isOverLimit — offline mode should be disabled */
  canGoOffline: boolean;
}

async function measureDirBytes(path: string): Promise<number> {
  const info = await FileSystem.getInfoAsync(path);
  if (!info.exists) return 0;
  // expo-file-system returns size only for files, not directories
  if (!info.isDirectory) {
    return (info as FileSystem.FileInfo & { size?: number }).size ?? 0;
  }
  const entries = await FileSystem.readDirectoryAsync(path).catch(
    () => [] as string[]
  );
  let total = 0;
  for (const entry of entries) {
    total += await measureDirBytes(`${path}${entry}/`);
  }
  return total;
}

export class StorageManager {
  /** Sum of courses directory + SQLite database files. */
  async getEduSphereUsedBytes(): Promise<number> {
    const docsDir = FileSystem.documentDirectory ?? '';
    const coursesDir = `${docsDir}courses/`;

    const [coursesSize, ...dbSizes] = await Promise.all([
      measureDirBytes(coursesDir),
      ...['edusphere.db', 'edusphere_offline.db'].map(async (name) => {
        const info = await FileSystem.getInfoAsync(`${docsDir}${name}`);
        return info.exists
          ? ((info as FileSystem.FileInfo & { size?: number }).size ?? 0)
          : 0;
      }),
    ]);

    return coursesSize + dbSizes.reduce((a, b) => a + b, 0);
  }

  async getStats(): Promise<StorageStats> {
    const [totalDiskBytes, freeDiskBytes, eduSphereUsedBytes] =
      await Promise.all([
        FileSystem.getTotalDiskCapacityAsync(),
        FileSystem.getFreeDiskStorageAsync(),
        this.getEduSphereUsedBytes(),
      ]);

    const eduSphereQuotaBytes = Math.floor(
      totalDiskBytes * STORAGE_QUOTA_FRACTION
    );
    const usageRatio =
      eduSphereQuotaBytes > 0 ? eduSphereUsedBytes / eduSphereQuotaBytes : 0;

    return {
      totalDiskBytes,
      freeDiskBytes,
      eduSphereQuotaBytes,
      eduSphereUsedBytes,
      usageRatio,
      isApproachingLimit: usageRatio >= STORAGE_WARN_FRACTION,
      isOverLimit: usageRatio >= 1.0,
      canGoOffline: usageRatio < 1.0,
    };
  }

  /**
   * Returns true when there is enough room within quota to store `neededBytes` more.
   * Call this before starting any download.
   */
  async isStorageAvailable(neededBytes: number): Promise<boolean> {
    const stats = await this.getStats();
    return stats.eduSphereUsedBytes + neededBytes <= stats.eduSphereQuotaBytes;
  }

  /** Deletes cached GraphQL queries from SQLite. Returns approximate bytes freed. */
  async clearQueryCache(): Promise<number> {
    const before = await this.getEduSphereUsedBytes();
    await database.init();
    await database.runAsync('DELETE FROM cached_queries');
    const after = await this.getEduSphereUsedBytes();
    return Math.max(0, before - after);
  }

  /** Deletes all downloaded course files and their DB records. Returns bytes freed. */
  async clearDownloads(): Promise<number> {
    const coursesDir = `${FileSystem.documentDirectory ?? ''}courses/`;
    const freed = await measureDirBytes(coursesDir);
    await FileSystem.deleteAsync(coursesDir, { idempotent: true });
    await database.init();
    await database.runAsync('DELETE FROM offline_courses');
    return freed;
  }
}

export const storageManager = new StorageManager();
