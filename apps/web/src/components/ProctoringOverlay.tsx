/**
 * ProctoringOverlay — Phase 33: Remote Proctoring (PRD §7.2 G-4)
 *
 * Renders a webcam preview, session status badge, and flag count overlay.
 * Memory safety:
 *   - visibilitychange listener removed in useEffect cleanup.
 *   - All MediaStream tracks stopped in useEffect cleanup.
 */
import React, { useRef, useEffect, useCallback } from 'react';
import { useProctoringSession } from '@/hooks/useProctoringSession';

interface Props {
  assessmentId: string;
  onFlagCountChange?: (count: number) => void;
}

export function ProctoringOverlay({ assessmentId, onFlagCountChange }: Props) {
  const { sessionId, flagCount, isActive, start, flag, end } =
    useProctoringSession(assessmentId);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<{ getTracks: () => { stop: () => void }[] } | null>(null);

  // Notify parent when flagCount changes
  useEffect(() => {
    onFlagCountChange?.(flagCount);
  }, [flagCount, onFlagCountChange]);

  // Tab-switch detection: flag when tab becomes hidden
  useEffect(() => {
    if (!isActive) return;
    const handleVisibilityChange = () => {
      if (document.hidden) {
        void flag('TAB_SWITCH', 'Tab hidden');
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isActive, flag]);

  // Webcam track cleanup on unmount
  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    };
  }, []);

  const handleStart = useCallback(async () => {
    await start();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch {
      // Webcam not available — proctoring session still active without preview
    }
  }, [start]);

  const handleStop = useCallback(async () => {
    await end();
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, [end]);

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col items-end gap-2">
      {/* Webcam preview — always rendered so ref is stable */}
      <video
        ref={videoRef}
        data-testid="proctoring-webcam-preview"
        autoPlay
        muted
        playsInline
        width={128}
        height={96}
        className={`rounded border border-border bg-black ${isActive ? 'block' : 'hidden'}`}
        aria-label="Webcam preview"
      />

      {isActive && (
        <div
          data-testid="proctoring-active-badge"
          className="flex items-center gap-1.5 rounded-full bg-destructive/90 px-3 py-1 text-xs font-semibold text-destructive-foreground"
        >
          <span className="h-2 w-2 rounded-full bg-white animate-pulse" aria-hidden="true" />
          Proctoring Active
        </div>
      )}

      {flagCount > 0 && (
        <div
          data-testid="proctoring-flag-count"
          className="rounded bg-yellow-500/90 px-2 py-0.5 text-xs font-medium text-black"
        >
          {flagCount} flag(s)
        </div>
      )}

      {!isActive && !sessionId && (
        <button
          data-testid="proctoring-start-btn"
          onClick={() => void handleStart()}
          className="rounded bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90"
        >
          Start Proctoring
        </button>
      )}

      {isActive && (
        <button
          data-testid="proctoring-stop-btn"
          onClick={() => void handleStop()}
          className="rounded bg-muted px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted/80"
        >
          Stop Proctoring
        </button>
      )}
    </div>
  );
}
