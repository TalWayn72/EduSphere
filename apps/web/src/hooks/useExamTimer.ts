import { useEffect, useRef } from 'react';
import { useExamSessionStore } from '@/stores/exam-session.store';

const WARNING_THRESHOLD = 600; // 10 minutes
const CRITICAL_THRESHOLD = 300; // 5 minutes

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export interface ExamTimerResult {
  timeRemaining: number;
  isWarning: boolean;
  isCritical: boolean;
  formattedTime: string;
}

export function useExamTimer(
  initialSeconds: number,
  onExpire: () => void
): ExamTimerResult {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const onExpireRef = useRef(onExpire);
  onExpireRef.current = onExpire;

  const timeRemaining = useExamSessionStore((s) => s.timeRemaining);
  const decrementTime = useExamSessionStore((s) => s.decrementTime);

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      decrementTime();
    }, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [decrementTime]);

  // Handle timer expiry
  useEffect(() => {
    if (timeRemaining <= 0 && initialSeconds > 0) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      onExpireRef.current();
    }
  }, [timeRemaining, initialSeconds]);

  return {
    timeRemaining,
    isWarning:
      timeRemaining <= WARNING_THRESHOLD && timeRemaining > CRITICAL_THRESHOLD,
    isCritical: timeRemaining <= CRITICAL_THRESHOLD,
    formattedTime: formatTime(timeRemaining),
  };
}
