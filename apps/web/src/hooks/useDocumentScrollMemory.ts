import { useEffect, useRef, useCallback } from 'react';

const KEY_PREFIX = 'edusphere-scroll-';
const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const DEBOUNCE_MS = 500;
const MIN_SCROLL_Y = 50; // Don't save/restore near the top

interface ScrollRecord {
  scrollY: number;
  savedAt: number;
}

function readRecord(contentId: string): ScrollRecord | null {
  try {
    const raw = localStorage.getItem(KEY_PREFIX + contentId);
    if (!raw) return null;
    const record = JSON.parse(raw) as ScrollRecord;
    if (Date.now() - record.savedAt > MAX_AGE_MS) {
      localStorage.removeItem(KEY_PREFIX + contentId);
      return null;
    }
    return record;
  } catch {
    return null;
  }
}

function writeRecord(contentId: string, scrollY: number): void {
  try {
    const record: ScrollRecord = { scrollY, savedAt: Date.now() };
    localStorage.setItem(KEY_PREFIX + contentId, JSON.stringify(record));
  } catch {
    // localStorage unavailable — silently ignore
  }
}

export interface UseDocumentScrollMemoryReturn {
  isReturning: boolean;
  savedScrollY: number;
  saveScrollPosition: (scrollY: number) => void;
}

export function useDocumentScrollMemory(
  contentId: string
): UseDocumentScrollMemoryReturn {
  const record = readRecord(contentId);
  const isReturning = !!record && record.scrollY > MIN_SCROLL_Y;
  const savedScrollY = record?.scrollY ?? 0;

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const saveScrollPosition = useCallback(
    (scrollY: number) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        if (scrollY > MIN_SCROLL_Y) {
          writeRecord(contentId, scrollY);
        }
      }, DEBOUNCE_MS);
    },
    [contentId]
  );

  return { isReturning, savedScrollY, saveScrollPosition };
}
