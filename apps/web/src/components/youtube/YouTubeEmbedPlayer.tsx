/**
 * YouTubeEmbedPlayer — IFrame Player API wrapper.
 *
 * Loads the YouTube IFrame API script, creates a YT.Player instance,
 * and exposes player controls via ref (forwardRef + useImperativeHandle).
 * Memory-safe: destroys player and cancels rAF on unmount.
 */
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';

interface YTOnStateChangeEvent {
  data: number;
}

interface YTPlayer {
  playVideo(): void;
  pauseVideo(): void;
  seekTo(seconds: number, allowSeekAhead?: boolean): void;
  getCurrentTime(): number;
  getDuration(): number;
  getPlayerState(): number;
  destroy(): void;
}

interface YTPlayerConstructor {
  new (
    container: HTMLElement,
    options: {
      videoId?: string;
      width?: string | number;
      height?: string | number;
      playerVars?: Record<string, number>;
      events?: {
        onReady?: () => void;
        onStateChange?: (e: YTOnStateChangeEvent) => void;
      };
    }
  ): YTPlayer;
}

declare global {
  interface Window {
    YT: { Player: YTPlayerConstructor };
    onYouTubeIframeAPIReady: (() => void) | undefined;
  }
}

export interface YouTubePlayerRef {
  play: () => void;
  pause: () => void;
  seekTo: (seconds: number) => void;
  getCurrentTime: () => number;
  getDuration: () => number;
  getPlayerState: () => number;
}

interface YouTubeEmbedPlayerProps {
  videoId: string;
  onReady?: () => void;
  onTimeUpdate?: (time: number) => void;
  onStateChange?: (state: number) => void;
  className?: string;
  width?: string | number;
  height?: string | number;
}

const POLL_INTERVAL_MS = 250;

function loadIframeApi(): Promise<void> {
  if (window.YT?.Player) return Promise.resolve();
  return new Promise<void>((resolve) => {
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      prev?.();
      resolve();
    };
    if (!document.querySelector('script[src*="youtube.com/iframe_api"]')) {
      const script = document.createElement('script');
      script.src = 'https://www.youtube.com/iframe_api';
      document.head.appendChild(script);
    }
  });
}

export const YouTubeEmbedPlayer = forwardRef<
  YouTubePlayerRef,
  YouTubeEmbedPlayerProps
>(function YouTubeEmbedPlayer(
  { videoId, onReady, onTimeUpdate, onStateChange, className, width, height },
  ref,
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YTPlayer | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastPollRef = useRef(0);
  const [ready, setReady] = useState(false);

  useImperativeHandle(ref, () => ({
    play: () => playerRef.current?.playVideo(),
    pause: () => playerRef.current?.pauseVideo(),
    seekTo: (s: number) => playerRef.current?.seekTo(s, true),
    getCurrentTime: () => playerRef.current?.getCurrentTime() ?? 0,
    getDuration: () => playerRef.current?.getDuration() ?? 0,
    getPlayerState: () => playerRef.current?.getPlayerState() ?? -1,
  }));

  const onTimeUpdateRef = useRef(onTimeUpdate);
  onTimeUpdateRef.current = onTimeUpdate;
  const onStateChangeRef = useRef(onStateChange);
  onStateChangeRef.current = onStateChange;
  const onReadyRef = useRef(onReady);
  onReadyRef.current = onReady;

  // Time-update polling loop (4Hz)
  const startPolling = useCallback(() => {
    const loop = (ts: number) => {
      rafRef.current = requestAnimationFrame(loop);
      if (ts - lastPollRef.current < POLL_INTERVAL_MS) return;
      lastPollRef.current = ts;
      const t = playerRef.current?.getCurrentTime();
      if (t !== undefined) onTimeUpdateRef.current?.(t);
    };
    rafRef.current = requestAnimationFrame(loop);
  }, []);

  useEffect(() => {
    let destroyed = false;
    void loadIframeApi().then(() => {
      if (destroyed || !containerRef.current) return;
      playerRef.current = new window.YT.Player(containerRef.current, {
        videoId,
        width: width ?? '100%',
        height: height ?? '100%',
        playerVars: { rel: 0, modestbranding: 1 },
        events: {
          onReady: () => {
            if (destroyed) return;
            setReady(true);
            onReadyRef.current?.();
            startPolling();
          },
          onStateChange: (e: YTOnStateChangeEvent) => {
            if (!destroyed) onStateChangeRef.current?.(e.data);
          },
        },
      });
    });
    return () => {
      destroyed = true;
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      playerRef.current?.destroy();
      playerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoId]);

  return (
    <div
      className={className}
      aria-label="YouTube video player"
      data-testid="youtube-embed-player"
      data-ready={ready}
    >
      <div ref={containerRef} />
    </div>
  );
});
