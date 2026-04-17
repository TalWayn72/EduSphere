/**
 * useYouTubePlayer — convenient hook wrapping YouTubePlayerRef.
 *
 * Manages currentTime, duration, isPlaying state, and exposes
 * play/pause/seekTo/togglePlay actions.
 *
 * Seek state design:
 * - seekTo() calls playerRef.seekTo() and sets an optimistic currentTime so
 *   the transcript scroller jumps immediately (good UX).
 * - handleTimeUpdate() is always the authoritative source of truth: every tick
 *   from the YouTube iframe overwrites currentTime with the real position.
 * - This means if seekTo() fails silently, the next time-update tick corrects
 *   the displayed position automatically — no permanent desync.
 */
import { useCallback, useRef, useState } from 'react';
import type { YouTubePlayerRef } from '@/components/youtube/YouTubeEmbedPlayer';

// YT.PlayerState constants (avoid depending on global YT at import time)
const YT_PLAYING = 1;

export interface UseYouTubePlayerReturn {
  playerRef: React.RefObject<YouTubePlayerRef | null>;
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  /** Whether a seek is in-flight (optimistic state not yet confirmed by player). */
  seekPending: boolean;
  play: () => void;
  pause: () => void;
  seekTo: (time: number) => void;
  togglePlay: () => void;
  handleTimeUpdate: (time: number) => void;
  handleReady: () => void;
  handleStateChange: (state: number) => void;
}

export function useYouTubePlayer(): UseYouTubePlayerReturn {
  const playerRef = useRef<YouTubePlayerRef | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [seekPending, setSeekPending] = useState(false);

  // Track the optimistic seek target so handleTimeUpdate can clear seekPending
  // once the player confirms arrival within 1 second of the target.
  const seekTargetRef = useRef<number | null>(null);

  const play = useCallback(() => {
    playerRef.current?.play();
    setIsPlaying(true);
  }, []);

  const pause = useCallback(() => {
    playerRef.current?.pause();
    setIsPlaying(false);
  }, []);

  const seekTo = useCallback((time: number) => {
    playerRef.current?.seekTo(time);
    // Optimistic update: move transcript scroller immediately so click feels
    // instant. The YouTube iframe will emit onTimeUpdate events that overwrite
    // this value with the authoritative player position.
    setCurrentTime(time);
    setSeekPending(true);
    seekTargetRef.current = time;
  }, []);

  const togglePlay = useCallback(() => {
    if (isPlaying) pause();
    else play();
  }, [isPlaying, pause, play]);

  // handleTimeUpdate is the authoritative source of truth for currentTime.
  // It clears seekPending once the player confirms it has reached within
  // 1 second of the requested seek target.
  const handleTimeUpdate = useCallback((time: number) => {
    setCurrentTime(time);
    if (seekTargetRef.current !== null) {
      if (Math.abs(time - seekTargetRef.current) < 1) {
        setSeekPending(false);
        seekTargetRef.current = null;
      }
    }
  }, []);

  const handleReady = useCallback(() => {
    const d = playerRef.current?.getDuration() ?? 0;
    setDuration(d);
  }, []);

  const handleStateChange = useCallback((state: number) => {
    setIsPlaying(state === YT_PLAYING);
  }, []);

  return {
    playerRef,
    currentTime,
    duration,
    isPlaying,
    seekPending,
    play,
    pause,
    seekTo,
    togglePlay,
    handleTimeUpdate,
    handleReady,
    handleStateChange,
  };
}
