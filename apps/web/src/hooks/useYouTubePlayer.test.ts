/**
 * Unit tests for useYouTubePlayer hook.
 *
 * Covers: initial state, seekTo optimistic update, seekPending flag,
 * handleTimeUpdate as authoritative source of truth, seekPending cleared
 * when player confirms arrival, play/pause state, togglePlay.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useYouTubePlayer } from './useYouTubePlayer';
import type { YouTubePlayerRef } from '@/components/youtube/YouTubeEmbedPlayer';

// ── Helpers ──────────────────────────────────────────────────────────────────

function makePlayerRef(): YouTubePlayerRef {
  return {
    play: vi.fn(),
    pause: vi.fn(),
    seekTo: vi.fn(),
    getDuration: vi.fn().mockReturnValue(120),
  };
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('useYouTubePlayer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('initializes with currentTime=0, duration=0, isPlaying=false, seekPending=false', () => {
    const { result } = renderHook(() => useYouTubePlayer());
    expect(result.current.currentTime).toBe(0);
    expect(result.current.duration).toBe(0);
    expect(result.current.isPlaying).toBe(false);
    expect(result.current.seekPending).toBe(false);
  });

  it('seekTo sets optimistic currentTime immediately', () => {
    const { result } = renderHook(() => useYouTubePlayer());
    const player = makePlayerRef();
    // Attach mock player ref
    Object.assign(result.current.playerRef, { current: player });

    act(() => {
      result.current.seekTo(42);
    });

    expect(result.current.currentTime).toBe(42);
  });

  it('seekTo sets seekPending=true', () => {
    const { result } = renderHook(() => useYouTubePlayer());
    const player = makePlayerRef();
    Object.assign(result.current.playerRef, { current: player });

    act(() => {
      result.current.seekTo(42);
    });

    expect(result.current.seekPending).toBe(true);
  });

  it('seekTo calls playerRef.seekTo with the target time', () => {
    const { result } = renderHook(() => useYouTubePlayer());
    const player = makePlayerRef();
    Object.assign(result.current.playerRef, { current: player });

    act(() => {
      result.current.seekTo(30);
    });

    expect(player.seekTo).toHaveBeenCalledWith(30);
  });

  it('handleTimeUpdate clears seekPending when within 1s of seek target', () => {
    const { result } = renderHook(() => useYouTubePlayer());
    const player = makePlayerRef();
    Object.assign(result.current.playerRef, { current: player });

    act(() => {
      result.current.seekTo(42);
    });
    expect(result.current.seekPending).toBe(true);

    // Player confirms arrival within 1s
    act(() => {
      result.current.handleTimeUpdate(42.4);
    });

    expect(result.current.seekPending).toBe(false);
  });

  it('handleTimeUpdate does NOT clear seekPending when far from seek target', () => {
    const { result } = renderHook(() => useYouTubePlayer());
    const player = makePlayerRef();
    Object.assign(result.current.playerRef, { current: player });

    act(() => {
      result.current.seekTo(42);
    });

    // Player at 10s — still loading
    act(() => {
      result.current.handleTimeUpdate(10);
    });

    expect(result.current.seekPending).toBe(true);
  });

  it('handleTimeUpdate always updates currentTime (authoritative source of truth)', () => {
    const { result } = renderHook(() => useYouTubePlayer());
    const player = makePlayerRef();
    Object.assign(result.current.playerRef, { current: player });

    // Optimistic seek to 42
    act(() => {
      result.current.seekTo(42);
    });
    expect(result.current.currentTime).toBe(42);

    // Player reports it's actually at 50 (e.g., seek overshot)
    act(() => {
      result.current.handleTimeUpdate(50);
    });
    expect(result.current.currentTime).toBe(50);
  });

  it('handleTimeUpdate without a prior seek updates currentTime normally', () => {
    const { result } = renderHook(() => useYouTubePlayer());

    act(() => {
      result.current.handleTimeUpdate(15);
    });

    expect(result.current.currentTime).toBe(15);
    expect(result.current.seekPending).toBe(false);
  });

  it('play sets isPlaying=true and calls playerRef.play', () => {
    const { result } = renderHook(() => useYouTubePlayer());
    const player = makePlayerRef();
    Object.assign(result.current.playerRef, { current: player });

    act(() => {
      result.current.play();
    });

    expect(result.current.isPlaying).toBe(true);
    expect(player.play).toHaveBeenCalled();
  });

  it('pause sets isPlaying=false and calls playerRef.pause', () => {
    const { result } = renderHook(() => useYouTubePlayer());
    const player = makePlayerRef();
    Object.assign(result.current.playerRef, { current: player });

    act(() => {
      result.current.play();
      result.current.pause();
    });

    expect(result.current.isPlaying).toBe(false);
    expect(player.pause).toHaveBeenCalled();
  });

  it('togglePlay plays when paused and pauses when playing', () => {
    const { result } = renderHook(() => useYouTubePlayer());
    const player = makePlayerRef();
    Object.assign(result.current.playerRef, { current: player });

    act(() => {
      result.current.togglePlay();
    });
    expect(result.current.isPlaying).toBe(true);

    act(() => {
      result.current.togglePlay();
    });
    expect(result.current.isPlaying).toBe(false);
  });

  it('handleReady reads duration from player', () => {
    const { result } = renderHook(() => useYouTubePlayer());
    const player = makePlayerRef();
    Object.assign(result.current.playerRef, { current: player });

    act(() => {
      result.current.handleReady();
    });

    expect(result.current.duration).toBe(120);
  });

  it('handleStateChange sets isPlaying based on YT.PlayerState', () => {
    const { result } = renderHook(() => useYouTubePlayer());

    // YT.PlayerState.PLAYING = 1
    act(() => {
      result.current.handleStateChange(1);
    });
    expect(result.current.isPlaying).toBe(true);

    // Any other state (paused = 2, ended = 0, etc.)
    act(() => {
      result.current.handleStateChange(2);
    });
    expect(result.current.isPlaying).toBe(false);
  });
});
