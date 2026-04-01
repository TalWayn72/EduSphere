/**
 * useSettingsHighlight — reads ?highlight=<id> from URL and drives
 * scroll-to + pulse animation on the targeted settings element.
 *
 * Memory safe: timeout cleared on unmount.
 */
import { useState, useCallback, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';

const HIGHLIGHT_DURATION_MS = 4_000;
const SCROLL_DELAY_MS = 300;

export interface UseSettingsHighlightReturn {
  highlightId: string | null;
  targetRef: (node: HTMLElement | null) => void;
  isHighlighted: boolean;
  highlightClass: string;
}

export function useSettingsHighlight(): UseSettingsHighlightReturn {
  const [searchParams, setSearchParams] = useSearchParams();
  const [isHighlighted, setIsHighlighted] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const scrollTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined
  );

  const highlightId = searchParams.get('highlight');

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (scrollTimerRef.current) clearTimeout(scrollTimerRef.current);
    };
  }, []);

  const targetRef = useCallback(
    (node: HTMLElement | null) => {
      if (!node || !highlightId) return;

      scrollTimerRef.current = setTimeout(() => {
        node.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setIsHighlighted(true);

        timerRef.current = setTimeout(() => {
          setIsHighlighted(false);
          setSearchParams(
            (prev) => {
              const next = new URLSearchParams(prev);
              next.delete('highlight');
              return next;
            },
            { replace: true }
          );
        }, HIGHLIGHT_DURATION_MS);
      }, SCROLL_DELAY_MS);
    },
    [highlightId, setSearchParams]
  );

  const highlightClass = isHighlighted ? 'animate-settings-highlight' : '';

  return { highlightId, targetRef, isHighlighted, highlightClass };
}
