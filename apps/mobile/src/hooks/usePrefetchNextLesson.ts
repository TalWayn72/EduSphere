/**
 * usePrefetchNextLesson — after a lesson completes, auto-downloads the next
 * lesson in the background when on WiFi and storage is available.
 *
 * Usage: call triggerPrefetch(courseId, nextLessonId) after lesson completion.
 * Memory-safe: no persistent intervals; each prefetch is a one-shot async op.
 */
import { useCallback, useRef } from 'react';
import { downloadService } from '../services/downloads';
import { storageManager } from '../services/StorageManager';

// Assume networkUtils will exist (created by parallel agent)
async function safeIsWifi(): Promise<boolean> {
  try {
    const { isWifiConnected } = await import('../services/networkUtils');
    return isWifiConnected();
  } catch {
    return false;
  }
}

const MIN_FREE_BYTES = 50 * 1024 * 1024; // require at least 50 MB free in quota

interface PrefetchState {
  inProgress: Set<string>;
}

export function usePrefetchNextLesson() {
  const state = useRef<PrefetchState>({ inProgress: new Set() });

  /**
   * Call this when a lesson finishes playing.
   * courseData must include at least: { id, title, description, lessons: [...] }
   * nextLessonIndex is the index of the lesson to prefetch.
   */
  const triggerPrefetch = useCallback(async (
    courseData: {
      id: string;
      title: string;
      description: string;
      lessons: Array<{ id: string; estimatedSizeBytes?: number; videoUrl?: string }>;
    },
    nextLessonIndex: number,
  ): Promise<void> => {
    const key = `${courseData.id}-${nextLessonIndex}`;
    if (state.current.inProgress.has(key)) return; // already prefetching
    if (nextLessonIndex >= courseData.lessons.length) return; // no next lesson

    // Check WiFi
    const onWifi = await safeIsWifi();
    if (!onWifi) return; // prefetch on WiFi only

    // Check storage quota — require space for the lesson plus MIN_FREE_BYTES buffer
    const nextLesson = courseData.lessons[nextLessonIndex];
    const needed = nextLesson.estimatedSizeBytes ?? 0;
    const ok = await storageManager.isStorageAvailable(needed + MIN_FREE_BYTES);
    if (!ok) return; // not enough quota

    // Check if already downloaded
    const existing = await downloadService.getOfflineCourses();
    if (existing.some((c) => c.id === courseData.id)) return;

    state.current.inProgress.add(key);
    try {
      // Download only the single next lesson
      await downloadService.downloadCourse(courseData.id, {
        ...courseData,
        lessons: [nextLesson],
      });
    } catch {
      // Prefetch failure is silent — user still has current content
    } finally {
      state.current.inProgress.delete(key);
    }
  }, []);

  return { triggerPrefetch };
}
