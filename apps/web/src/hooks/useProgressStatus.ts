import { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';

interface UseProgressStatusOptions {
  /** Array of i18n keys like ['progress.aiGen.analyzing', ...] */
  messages: readonly string[];
  /** Cycling interval in ms (default: 2500) */
  interval?: number;
  /** Whether cycling is active */
  active: boolean;
  /** i18n namespace (default: 'common') */
  namespace?: string;
  /** If provided, jump to this index immediately (phase-driven mode) */
  phaseIndex?: number;
}

interface UseProgressStatusResult {
  currentMessage: string;
  currentIndex: number;
}

/**
 * Cycles through i18n translation keys at a configurable interval.
 * Memory safe: every setInterval has a matching clearInterval in cleanup.
 */
export function useProgressStatus({
  messages,
  interval = 2500,
  active,
  namespace = 'common',
  phaseIndex,
}: UseProgressStatusOptions): UseProgressStatusResult {
  const { t } = useTranslation(namespace);
  const [index, setIndex] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mountedRef = useRef(true);

  const clearTimer = useCallback(() => {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  // Jump to phaseIndex when it changes
  useEffect(() => {
    if (phaseIndex !== undefined && phaseIndex >= 0 && phaseIndex < messages.length) {
      setIndex(phaseIndex);
    }
  }, [phaseIndex, messages.length]);

  // Start / stop cycling
  useEffect(() => {
    if (!active || messages.length === 0) {
      clearTimer();
      setIndex(0);
      return;
    }
    if (phaseIndex !== undefined) { clearTimer(); return; }

    intervalRef.current = setInterval(() => {
      if (mountedRef.current) {
        setIndex((prev) => (prev + 1) % messages.length);
      }
    }, interval);
    return clearTimer;
  }, [active, messages.length, interval, phaseIndex, clearTimer]);

  // Cleanup on unmount
  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; clearTimer(); };
  }, [clearTimer]);

  const safeIndex = messages.length > 0 ? index % messages.length : 0;
  const currentKey = messages[safeIndex] ?? '';
  return { currentMessage: currentKey ? t(currentKey) : '', currentIndex: safeIndex };
}
