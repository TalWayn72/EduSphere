/**
 * OfflineLessonCache — IndexedDB-backed lesson content cache for offline use.
 *
 * Uses idb-keyval (already a dependency via offline-db.ts).
 * DB name: edusphere-offline-v1 (via idb-keyval's default store).
 * Memory safety: singleton IDB instance — no unbounded growth.
 * Max age: 7 days by default; clearOldCache() enforces retention.
 */
import { get, set, del, keys } from 'idb-keyval';

export interface CachedLesson {
  lessonId: string;
  title: string;
  content: string;
  transcript: string;
  downloadedAt: number; // epoch ms
}

const KEY_PREFIX = 'offline_lesson_';
const DEFAULT_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function lessonKey(lessonId: string): string {
  return `${KEY_PREFIX}${lessonId}`;
}

export async function cacheLesson(
  lessonId: string,
  data: Omit<CachedLesson, 'lessonId' | 'downloadedAt'>
): Promise<void> {
  const entry: CachedLesson = {
    ...data,
    lessonId,
    downloadedAt: Date.now(),
  };
  await set(lessonKey(lessonId), entry);
}

export async function getCachedLesson(
  lessonId: string
): Promise<CachedLesson | null> {
  const entry = await get<CachedLesson>(lessonKey(lessonId));
  return entry ?? null;
}

export async function isCached(lessonId: string): Promise<boolean> {
  const entry = await get<CachedLesson>(lessonKey(lessonId));
  return entry !== undefined;
}

export async function clearOldCache(
  maxAgeMs: number = DEFAULT_MAX_AGE_MS
): Promise<number> {
  const allKeys = await keys<string>();
  const lessonKeys = allKeys.filter((k) =>
    String(k).startsWith(KEY_PREFIX)
  );
  const cutoff = Date.now() - maxAgeMs;
  let removed = 0;

  for (const k of lessonKeys) {
    const entry = await get<CachedLesson>(k);
    if (entry && entry.downloadedAt < cutoff) {
      await del(k);
      removed++;
    }
  }

  return removed;
}

export async function removeCachedLesson(lessonId: string): Promise<void> {
  await del(lessonKey(lessonId));
}
