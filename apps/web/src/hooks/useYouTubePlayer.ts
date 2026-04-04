/**
 * useYouTubePlayer — convenient hook wrapping YouTubePlayerRef.
 *
 * Manages currentTime, duration, isPlaying state, and exposes
 * play/pause/seekTo/togglePlay actions.
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
    setCurrentTime(time);
  }, []);

  const togglePlay = useCallback(() => {
    if (isPlaying) pause();
    else play();
  }, [isPlaying, pause, play]);

  const handleTimeUpdate = useCallback((time: number) => {
    setCurrentTime(time);
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
    play,
    pause,
    seekTo,
    togglePlay,
    handleTimeUpdate,
    handleReady,
    handleStateChange,
  };
}
