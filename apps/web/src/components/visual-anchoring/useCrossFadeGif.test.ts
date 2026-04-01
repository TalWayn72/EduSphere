import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCrossFadeGif } from './useCrossFadeGif';

describe('useCrossFadeGif', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns scheduleGifPause function', () => {
    const { result } = renderHook(() =>
      useCrossFadeGif('img.gif', 'image/gif')
    );
    expect(typeof result.current.scheduleGifPause).toBe('function');
  });

  it('scheduleGifPause replaces gif src with transparent gif after delay', () => {
    const { result } = renderHook(() =>
      useCrossFadeGif('animation.gif', 'image/gif')
    );

    const imgEl = document.createElement('img');
    imgEl.src = 'animation.gif';

    act(() => {
      result.current.scheduleGifPause(imgEl);
    });

    // Before delay — src unchanged
    expect(imgEl.src).toContain('animation.gif');

    // After delay (350ms)
    act(() => {
      vi.advanceTimersByTime(400);
    });

    expect(imgEl.src).toBe(
      'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAAAAAAALAAAAAABAAEAAAIBRAA7'
    );
  });

  it('does not replace src for non-gif images', () => {
    const { result } = renderHook(() =>
      useCrossFadeGif('photo.png', 'image/png')
    );

    const imgEl = document.createElement('img');
    imgEl.src = 'photo.png';

    act(() => {
      result.current.scheduleGifPause(imgEl);
    });

    act(() => {
      vi.advanceTimersByTime(400);
    });

    // src should remain unchanged for non-gif
    expect(imgEl.src).toContain('photo.png');
  });

  it('does not replace src when outgoingSrc is null', () => {
    const { result } = renderHook(() => useCrossFadeGif(null, 'image/gif'));

    const imgEl = document.createElement('img');
    imgEl.src = 'some.gif';

    act(() => {
      result.current.scheduleGifPause(imgEl);
    });

    act(() => {
      vi.advanceTimersByTime(400);
    });

    expect(imgEl.src).toContain('some.gif');
  });

  it('does nothing when imgEl is null', () => {
    const { result } = renderHook(() =>
      useCrossFadeGif('animation.gif', 'image/gif')
    );

    // Should not throw
    act(() => {
      result.current.scheduleGifPause(null);
    });

    act(() => {
      vi.advanceTimersByTime(400);
    });
  });

  it('clears previous timer when scheduleGifPause is called again', () => {
    const { result } = renderHook(() =>
      useCrossFadeGif('animation.gif', 'image/gif')
    );

    const imgEl1 = document.createElement('img');
    imgEl1.src = 'animation.gif';

    const imgEl2 = document.createElement('img');
    imgEl2.src = 'animation2.gif';

    act(() => {
      result.current.scheduleGifPause(imgEl1);
    });

    // Call again before timer fires — should cancel previous
    act(() => {
      vi.advanceTimersByTime(200);
      result.current.scheduleGifPause(imgEl2);
    });

    act(() => {
      vi.advanceTimersByTime(400);
    });

    // Second image should be updated, first should NOT
    expect(imgEl2.src).toBe(
      'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAAAAAAALAAAAAABAAEAAAIBRAA7'
    );
  });

  it('clears timeout on unmount (memory safety)', () => {
    const clearTimeoutSpy = vi.spyOn(globalThis, 'clearTimeout');
    const { result, unmount } = renderHook(() =>
      useCrossFadeGif('animation.gif', 'image/gif')
    );

    const imgEl = document.createElement('img');
    imgEl.src = 'animation.gif';

    act(() => {
      result.current.scheduleGifPause(imgEl);
    });

    unmount();
    expect(clearTimeoutSpy).toHaveBeenCalled();
  });

  it('detects gif by mime type containing "gif"', () => {
    const { result } = renderHook(() =>
      useCrossFadeGif('file.unknown', 'image/gif')
    );

    const imgEl = document.createElement('img');
    imgEl.src = 'file.unknown';

    act(() => {
      result.current.scheduleGifPause(imgEl);
    });

    act(() => {
      vi.advanceTimersByTime(400);
    });

    expect(imgEl.src).toBe(
      'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAAAAAAALAAAAAABAAEAAAIBRAA7'
    );
  });

  it('detects gif by .gif file extension', () => {
    const { result } = renderHook(() =>
      useCrossFadeGif('file.gif', 'application/octet-stream')
    );

    const imgEl = document.createElement('img');
    imgEl.src = 'file.gif';

    act(() => {
      result.current.scheduleGifPause(imgEl);
    });

    act(() => {
      vi.advanceTimersByTime(400);
    });

    expect(imgEl.src).toBe(
      'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAAAAAAALAAAAAABAAEAAAIBRAA7'
    );
  });
});
