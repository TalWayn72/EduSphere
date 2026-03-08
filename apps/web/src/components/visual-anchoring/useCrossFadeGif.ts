import { useRef, useEffect } from 'react';

const TRANSPARENT_GIF =
  'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAAAAAAALAAAAAABAAEAAAIBRAA7';

const GIF_DELAY_MS = 350; // 300ms transition + 50ms buffer

function isGif(src: string, mimeType: string): boolean {
  return mimeType.includes('gif') || src.endsWith('.gif');
}

/**
 * After a cross-fade transition completes, pause the OUTGOING GIF
 * by replacing its src with a transparent 1×1 GIF data URI.
 * Memory-safe: setTimeout handle cleared on unmount.
 */
export function useCrossFadeGif(outgoingSrc: string | null, outgoingMime: string) {
  const gifTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const outgoingImgRef = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    return () => {
      if (gifTimerRef.current) {
        clearTimeout(gifTimerRef.current);
        gifTimerRef.current = null;
      }
    };
  }, []);

  function scheduleGifPause(imgEl: HTMLImageElement | null) {
    if (!imgEl || !outgoingSrc || !isGif(outgoingSrc, outgoingMime)) return;

    outgoingImgRef.current = imgEl;

    if (gifTimerRef.current) {
      clearTimeout(gifTimerRef.current);
    }

    gifTimerRef.current = setTimeout(() => {
      if (outgoingImgRef.current) {
        outgoingImgRef.current.src = TRANSPARENT_GIF;
      }
      gifTimerRef.current = null;
    }, GIF_DELAY_MS);
  }

  return { scheduleGifPause };
}
