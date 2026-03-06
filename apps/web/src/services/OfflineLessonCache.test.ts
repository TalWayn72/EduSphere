/**
 * OfflineLessonCache — unit tests.
 * Uses mocked idb-keyval to avoid real IndexedDB in jsdom.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock idb-keyval before importing the module under test
const store: Map<string, unknown> = new Map();

vi.mock('idb-keyval', () => ({
  get: vi.fn(async (key: string) => store.get(key)),
  set: vi.fn(async (key: string, value: unknown) => { store.set(key, value); }),
  del: vi.fn(async (key: string) => { store.delete(key); }),
  keys: vi.fn(async () => Array.from(store.keys())),
}));

import {
  cacheLesson,
  getCachedLesson,
  isCached,
  clearOldCache,
  removeCachedLesson,
} from './OfflineLessonCache';

describe('OfflineLessonCache', () => {
  beforeEach(() => {
    store.clear();
    vi.clearAllMocks();
  });

  describe('cacheLesson', () => {
    it('stores lesson data in IDB', async () => {
      await cacheLesson('lesson-1', {
        title: 'Intro to Graphs',
        content: '# Graphs\nThis is the content.',
        transcript: 'Welcome to graphs...',
      });

      expect(store.size).toBe(1);
      const entry = store.get('offline_lesson_lesson-1') as { lessonId: string };
      expect(entry.lessonId).toBe('lesson-1');
    });

    it('adds downloadedAt timestamp', async () => {
      const before = Date.now();
      await cacheLesson('lesson-2', { title: 'T', content: 'C', transcript: '' });
      const after = Date.now();

      const entry = store.get('offline_lesson_lesson-2') as { downloadedAt: number };
      expect(entry.downloadedAt).toBeGreaterThanOrEqual(before);
      expect(entry.downloadedAt).toBeLessThanOrEqual(after);
    });
  });

  describe('getCachedLesson', () => {
    it('returns stored lesson data', async () => {
      await cacheLesson('lesson-3', {
        title: 'Graph Theory',
        content: 'Content here',
        transcript: 'Transcript here',
      });

      const result = await getCachedLesson('lesson-3');
      expect(result).not.toBeNull();
      expect(result!.lessonId).toBe('lesson-3');
      expect(result!.title).toBe('Graph Theory');
      expect(result!.content).toBe('Content here');
    });

    it('returns null for unknown lessonId', async () => {
      const result = await getCachedLesson('nonexistent-lesson');
      expect(result).toBeNull();
    });
  });

  describe('isCached', () => {
    it('returns false for unknown lessonId', async () => {
      const result = await isCached('unknown-lesson');
      expect(result).toBe(false);
    });

    it('returns true after caching a lesson', async () => {
      await cacheLesson('lesson-4', { title: 'T', content: 'C', transcript: '' });
      const result = await isCached('lesson-4');
      expect(result).toBe(true);
    });
  });

  describe('clearOldCache', () => {
    it('removes entries older than maxAge', async () => {
      const oldTime = Date.now() - 8 * 24 * 60 * 60 * 1000; // 8 days ago
      store.set('offline_lesson_old', {
        lessonId: 'old',
        title: 'Old',
        content: '',
        transcript: '',
        downloadedAt: oldTime,
      });
      store.set('offline_lesson_new', {
        lessonId: 'new',
        title: 'New',
        content: '',
        transcript: '',
        downloadedAt: Date.now(),
      });

      const removed = await clearOldCache(); // default 7 days
      expect(removed).toBe(1);
      expect(store.has('offline_lesson_old')).toBe(false);
      expect(store.has('offline_lesson_new')).toBe(true);
    });

    it('does not remove entries within maxAge', async () => {
      await cacheLesson('fresh', { title: 'Fresh', content: 'C', transcript: '' });
      const removed = await clearOldCache(7 * 24 * 60 * 60 * 1000);
      expect(removed).toBe(0);
      expect(await isCached('fresh')).toBe(true);
    });

    it('returns count of removed entries', async () => {
      const oldTime = Date.now() - 10 * 24 * 60 * 60 * 1000;
      store.set('offline_lesson_x', { lessonId: 'x', downloadedAt: oldTime });
      store.set('offline_lesson_y', { lessonId: 'y', downloadedAt: oldTime });

      const removed = await clearOldCache();
      expect(removed).toBe(2);
    });
  });

  describe('removeCachedLesson', () => {
    it('removes a specific lesson', async () => {
      await cacheLesson('lesson-del', { title: 'T', content: 'C', transcript: '' });
      expect(await isCached('lesson-del')).toBe(true);

      await removeCachedLesson('lesson-del');
      expect(await isCached('lesson-del')).toBe(false);
    });
  });
});
