import { useState, useEffect, useRef } from 'react';
import DOMPurify from 'dompurify';

interface InteractiveSvgState {
  sanitizedSvg: string | null;
  loading: boolean;
}

/**
 * Fetches and sanitizes an SVG URL for safe inline rendering.
 * - Uses DOMPurify with SVG profile to strip dangerous content.
 * - AbortController cancels in-flight fetch on src change or unmount.
 * Memory-safe: abortRef cleared on every cleanup.
 */
export function useInteractiveSvg(
  src: string | null,
  enabled: boolean
): InteractiveSvgState {
  const [state, setState] = useState<InteractiveSvgState>({
    sanitizedSvg: null,
    loading: false,
  });
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!enabled || !src) {
      setState({ sanitizedSvg: null, loading: false });
      return;
    }

    // Cancel any previous in-flight request
    if (abortRef.current) {
      abortRef.current.abort();
    }

    const controller = new AbortController();
    abortRef.current = controller;

    setState({ sanitizedSvg: null, loading: true });

    fetch(src, { signal: controller.signal })
      .then((res) => res.text())
      .then((svgText) => {
        const sanitized = DOMPurify.sanitize(svgText, {
          USE_PROFILES: { svg: true },
        });
        setState({ sanitizedSvg: sanitized, loading: false });
      })
      .catch((err: unknown) => {
        if (err instanceof Error && err.name === 'AbortError') return;
        setState({ sanitizedSvg: null, loading: false });
      });

    return () => {
      controller.abort();
      abortRef.current = null;
    };
  }, [src, enabled]);

  return state;
}
