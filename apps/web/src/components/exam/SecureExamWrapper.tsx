/**
 * SecureExamWrapper — Top-level security wrapper for exam-taking pages.
 *
 * Composes useBrowserLockdown + ExamViolationWarning + ExamLockdownStatus.
 * Records violations to server, auto-voids after maxViolations threshold.
 */
import { useState, useCallback, useRef } from 'react';
import { useBrowserLockdown } from './use-browser-lockdown';
import { ExamViolationWarning } from './ExamViolationWarning';
import { ExamLockdownStatus } from './ExamLockdownStatus';

interface SecureExamWrapperProps {
  sessionId: string;
  enabled: boolean;
  maxViolations?: number;
  children: React.ReactNode;
  onViolationThreshold?: () => void;
}

const DEFAULT_MAX_VIOLATIONS = 3;

export function SecureExamWrapper({
  sessionId,
  enabled,
  maxViolations = DEFAULT_MAX_VIOLATIONS,
  children,
  onViolationThreshold,
}: SecureExamWrapperProps) {
  const [violationCount, setViolationCount] = useState(0);
  const [isVoided, setIsVoided] = useState(false);
  const [warningOpen, setWarningOpen] = useState(false);
  const [lastViolationType, setLastViolationType] = useState('');
  const pendingRef = useRef(false);

  const handleViolation = useCallback(
    (type: string) => {
      if (isVoided || pendingRef.current) return;
      pendingRef.current = true;

      setViolationCount((prev) => {
        const next = prev + 1;
        setLastViolationType(type);
        setWarningOpen(true);

        // Fire-and-forget server recording
        void fetch('/api/exam/browser-event', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId,
            event: { type, timestamp: new Date().toISOString() },
          }),
        }).catch(() => undefined);

        if (next >= maxViolations) {
          setIsVoided(true);
          onViolationThreshold?.();
        }

        pendingRef.current = false;
        return next;
      });
    },
    [sessionId, maxViolations, isVoided, onViolationThreshold]
  );

  useBrowserLockdown({ enabled, onViolation: handleViolation });

  const handleDismiss = useCallback(() => {
    setWarningOpen(false);
  }, []);

  return (
    <div
      className={enabled ? 'select-none' : undefined}
      style={enabled ? { WebkitUserSelect: 'none' } : undefined}
    >
      {enabled && (
        <div className="fixed right-4 top-4 z-50">
          <ExamLockdownStatus
            active={enabled}
            violationCount={violationCount}
          />
        </div>
      )}

      {children}

      <ExamViolationWarning
        open={warningOpen}
        violationType={lastViolationType}
        violationCount={violationCount}
        maxViolations={maxViolations}
        isVoided={isVoided}
        onDismiss={handleDismiss}
      />
    </div>
  );
}
