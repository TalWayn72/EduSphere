/**
 * useBrowserLockdown — Hook implementing 7 browser security layers for exam integrity.
 *
 * 1. Fullscreen enforcement
 * 2. Tab switch detection (visibilitychange + blur)
 * 3. Clipboard blocking (copy/paste/cut)
 * 4. Right-click blocking
 * 5. DevTools detection (window size delta)
 * 6. Screenshot blocking (user-select: none)
 * 7. Keyboard shortcut blocking (Ctrl+C/V/A, PrintScreen)
 *
 * Memory safety: ALL listeners cleaned up in useEffect return.
 */
import { useEffect, useRef, useCallback, useState } from 'react';

interface LockdownOptions {
  enabled: boolean;
  onViolation: (type: string) => void;
}

const DEVTOOLS_THRESHOLD = 160;

export function useBrowserLockdown({ enabled, onViolation }: LockdownOptions) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const devToolsCheckRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const reportViolation = useCallback(
    (type: string) => { if (enabled) onViolation(type); },
    [enabled, onViolation],
  );

  useEffect(() => {
    if (!enabled) return;

    // Layer 1: Fullscreen
    const requestFS = () => {
      document.documentElement.requestFullscreen?.().catch(() => undefined);
    };
    requestFS();

    const onFSChange = () => {
      const isFull = !!document.fullscreenElement;
      setIsFullscreen(isFull);
      if (!isFull) reportViolation('FULLSCREEN_EXIT');
    };

    // Layer 2: Tab switch
    const onVisChange = () => {
      if (document.hidden) reportViolation('TAB_SWITCH');
    };
    const onBlur = () => reportViolation('TAB_SWITCH');

    // Layer 3: Clipboard
    const onClipboard = (e: ClipboardEvent) => {
      e.preventDefault();
      reportViolation('CLIPBOARD_ATTEMPT');
    };

    // Layer 4: Right-click
    const onContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      reportViolation('RIGHT_CLICK');
    };

    // Layer 5: DevTools check
    devToolsCheckRef.current = setInterval(() => {
      const widthDelta = window.outerWidth - window.innerWidth;
      const heightDelta = window.outerHeight - window.innerHeight;
      if (widthDelta > DEVTOOLS_THRESHOLD || heightDelta > DEVTOOLS_THRESHOLD) {
        reportViolation('DEVTOOLS_DETECTED');
      }
    }, 2000);

    // Layer 6: screenshot blocking via CSS is in SecureExamWrapper

    // Layer 7: Keyboard shortcuts
    const onKeyDown = (e: KeyboardEvent) => {
      const blocked = (
        (e.ctrlKey && ['c', 'v', 'a', 'p', 's'].includes(e.key.toLowerCase()))
        || e.key === 'PrintScreen'
        || (e.altKey && e.key === 'Tab')
        || e.key === 'F12'
        || (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'i')
      );
      if (blocked) {
        e.preventDefault();
        e.stopPropagation();
        reportViolation('KEYBOARD_SHORTCUT');
      }
    };

    document.addEventListener('fullscreenchange', onFSChange);
    document.addEventListener('visibilitychange', onVisChange);
    window.addEventListener('blur', onBlur);
    document.addEventListener('copy', onClipboard);
    document.addEventListener('paste', onClipboard);
    document.addEventListener('cut', onClipboard);
    document.addEventListener('contextmenu', onContextMenu);
    document.addEventListener('keydown', onKeyDown, true);

    return () => {
      document.removeEventListener('fullscreenchange', onFSChange);
      document.removeEventListener('visibilitychange', onVisChange);
      window.removeEventListener('blur', onBlur);
      document.removeEventListener('copy', onClipboard);
      document.removeEventListener('paste', onClipboard);
      document.removeEventListener('cut', onClipboard);
      document.removeEventListener('contextmenu', onContextMenu);
      document.removeEventListener('keydown', onKeyDown, true);
      if (devToolsCheckRef.current) {
        clearInterval(devToolsCheckRef.current);
        devToolsCheckRef.current = null;
      }
      if (document.fullscreenElement) {
        document.exitFullscreen?.().catch(() => undefined);
      }
    };
  }, [enabled, reportViolation]);

  return { isFullscreen };
}
