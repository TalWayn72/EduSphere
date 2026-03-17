import { useEffect, useRef, useState, useCallback } from 'react';
import { toast } from 'sonner';
import {
  getTokenExpiry,
  refreshToken,
  isAuthenticated,
  login,
  DEV_MODE,
} from '@/lib/auth';

/** How many seconds before expiry to show the warning toast. */
const WARN_BEFORE_EXPIRY_S = 120;
/** How often (ms) to poll for token expiry changes after a refresh. */
const POLL_INTERVAL_MS = 30_000;

export interface TokenExpiryState {
  /** True when the token has expired and the user must re-authenticate. */
  expired: boolean;
  /** Dismiss the expired modal and redirect to login. */
  handleReLogin: () => void;
}

/**
 * Watches the Keycloak JWT expiry time and:
 * 1. Shows a sonner warning toast ~2 min before expiry with an "Extend" action.
 * 2. Sets `expired = true` when the token actually expires, so the caller can
 *    render a re-auth dialog.
 *
 * Memory-safe: all timers are cleaned up on unmount.
 */
export function useTokenExpiryWatcher(): TokenExpiryState {
  const [expired, setExpired] = useState(false);
  const warnTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const expireTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearTimers = useCallback(() => {
    if (warnTimerRef.current !== null) {
      clearTimeout(warnTimerRef.current);
      warnTimerRef.current = null;
    }
    if (expireTimerRef.current !== null) {
      clearTimeout(expireTimerRef.current);
      expireTimerRef.current = null;
    }
    if (pollTimerRef.current !== null) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  }, []);

  const scheduleTimers = useCallback(() => {
    clearTimers();

    if (DEV_MODE || !isAuthenticated()) return;

    const exp = getTokenExpiry();
    if (exp === null) return;

    const nowS = Math.floor(Date.now() / 1000);
    const warnInMs = Math.max(0, (exp - WARN_BEFORE_EXPIRY_S - nowS) * 1000);
    const expireInMs = Math.max(0, (exp - nowS) * 1000);

    // If already past expiry, mark expired immediately
    if (expireInMs <= 0) {
      setExpired(true);
      return;
    }

    // Schedule warning toast
    warnTimerRef.current = setTimeout(() => {
      toast.warning('Your session will expire in 2 minutes.', {
        duration: Infinity,
        action: {
          label: 'Extend session',
          onClick: () => {
            refreshToken(WARN_BEFORE_EXPIRY_S + 30)
              .then(() => {
                toast.success('Session extended.');
                // Re-schedule timers based on the new expiry
                scheduleTimers();
              })
              .catch(() => {
                setExpired(true);
              });
          },
        },
      });
    }, warnInMs);

    // Schedule hard expiry
    expireTimerRef.current = setTimeout(() => {
      setExpired(true);
    }, expireInMs);
  }, [clearTimers]);

  const handleReLogin = useCallback(() => {
    setExpired(false);
    login();
  }, []);

  useEffect(() => {
    scheduleTimers();

    // Poll periodically: the background setupTokenRefresh() in auth.ts may
    // silently extend the token, so re-read the expiry and reschedule.
    pollTimerRef.current = setInterval(() => {
      if (!isAuthenticated()) return;
      scheduleTimers();
    }, POLL_INTERVAL_MS);

    return clearTimers;
  }, [scheduleTimers, clearTimers]);

  return { expired, handleReLogin };
}
