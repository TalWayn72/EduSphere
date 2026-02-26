import { useCallback, useEffect, useRef, useState } from 'react';

interface ScrollMemoryData {
  scrollY: number;
  savedAt: number; // Unix ms
}

const SCROLL_KEY_PREFIX = 'edusphere-scroll-';
const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const DEBOUNCE_MS = 500;

function readScrollMemory(contentId: string): ScrollMemoryData | null {
  try {
    const raw = localStorage.getItem(`${SCROLL_KEY_PREFIX}${contentId}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ScrollMemoryData;
    if (Date.now() - parsed.savedAt > MAX_AGE_MS) {
      localStorage.removeItem(`${SCROLL_KEY_PREFIX}${contentId}`);
      return null;
    }
    if (parsed.scrollY <= 50) return null; // Not worth restoring nearly-top position
    return parsed;
  } catch {
    return null;
  }
}

function writeScrollMemory(contentId: string, scrollY: number): void {
  try {
    const data: ScrollMemoryData = { scrollY, savedAt: Date.now() };
    localStorage.setItem(
      `${SCROLL_KEY_PREFIX}${contentId}`,
      JSON.stringify(data)
    );
  } catch {
    // localStorage full or unavailable — silently ignore
  }
}

export function useDocumentScrollMemory(contentId: string) {
  const [savedData] = useState<ScrollMemoryData | null>(() =>
    readScrollMemory(contentId)
  );

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current !== null) {
        clearTimeout(debounceRef.current);
        debounceRef.current = null;
      }
    };
  }, []);

  const saveScrollPosition = useCallback(
    (scrollY: number) => {
      if (debounceRef.current !== null) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        writeScrollMemory(contentId, scrollY);
        debounceRef.current = null;
      }, DEBOUNCE_MS);
    },
    [contentId]
  );

  return {
    isReturning: savedData !== null,
    savedScrollY: savedData?.scrollY ?? 0,
    saveScrollPosition,
  };
}
