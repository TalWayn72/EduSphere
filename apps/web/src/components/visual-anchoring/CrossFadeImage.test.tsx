import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import React from 'react';
import CrossFadeImage from './CrossFadeImage';

// Stub rAF so double-rAF in CrossFadeImage completes synchronously
beforeEach(() => {
  vi.spyOn(globalThis, 'requestAnimationFrame').mockImplementation((cb) => {
    cb(0);
    return 0;
  });
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.clearAllTimers();
});

describe('CrossFadeImage', () => {
  it('renders null when src is null', () => {
    const { container } = render(<CrossFadeImage src={null} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders a single image (no fade wrapper) on first src provided', () => {
    render(<CrossFadeImage src="https://example.com/img1.png" alt="Image 1" />);
    const wrapper = screen.getByTestId('cross-fade-image');
    expect(wrapper).toBeDefined();
    // Current layer should be present with correct src
    const current = screen.getByTestId('cross-fade-current');
    expect(current.getAttribute('src')).toBe('https://example.com/img1.png');
    // Component uses aria-hidden pattern on img elements (alt text on container div via aria-label)
    expect(current.getAttribute('aria-hidden')).toBe('true');
    // Container carries the accessible label
    expect(wrapper.getAttribute('aria-label')).toBe('Image 1');
    // No next layer on first render
    expect(screen.queryByTestId('cross-fade-next')).toBeNull();
  });

  it('sets opacity 0 on current and opacity 1 on next when src changes', () => {
    vi.useFakeTimers();

    const { rerender } = render(
      <CrossFadeImage src="https://example.com/img1.png" alt="First" fadeDuration={400} />
    );

    // Change src — triggers cross-fade
    act(() => {
      rerender(
        <CrossFadeImage src="https://example.com/img2.png" alt="Second" fadeDuration={400} />
      );
    });

    const current = screen.getByTestId('cross-fade-current');
    const next = screen.getByTestId('cross-fade-next');

    // After rAF callbacks fire (mocked to run immediately), showNext=true
    // current fades out → opacity 0, next fades in → opacity 1
    expect((current as HTMLImageElement).style.opacity).toBe('0');
    expect((next as HTMLImageElement).style.opacity).toBe('1');
    expect((next as HTMLImageElement).getAttribute('src')).toBe(
      'https://example.com/img2.png'
    );

    vi.useRealTimers();
  });

  it('clears timer and swaps layers after fade duration elapses', () => {
    vi.useFakeTimers();

    const { rerender } = render(
      <CrossFadeImage src="https://example.com/img1.png" alt="First" fadeDuration={400} />
    );

    act(() => {
      rerender(
        <CrossFadeImage src="https://example.com/img2.png" alt="Second" fadeDuration={400} />
      );
    });

    // Advance past fadeDuration + buffer (450ms)
    act(() => {
      vi.advanceTimersByTime(460);
    });

    // After swap: current shows img2, next layer should be gone
    const current = screen.getByTestId('cross-fade-current');
    expect((current as HTMLImageElement).getAttribute('src')).toBe(
      'https://example.com/img2.png'
    );
    expect(screen.queryByTestId('cross-fade-next')).toBeNull();

    vi.useRealTimers();
  });

  it('clears timer on unmount — no memory leak', () => {
    vi.useFakeTimers();
    const clearSpy = vi.spyOn(globalThis, 'clearTimeout');

    const { rerender, unmount } = render(
      <CrossFadeImage src="https://example.com/img1.png" fadeDuration={400} />
    );

    // Trigger a cross-fade transition
    act(() => {
      rerender(<CrossFadeImage src="https://example.com/img2.png" fadeDuration={400} />);
    });

    // Unmount before timer fires
    unmount();

    expect(clearSpy).toHaveBeenCalled();
    vi.useRealTimers();
  });

  it('renders nothing when src transitions from value to null', () => {
    const { rerender } = render(
      <CrossFadeImage src="https://example.com/img1.png" />
    );
    act(() => {
      rerender(<CrossFadeImage src={null} />);
    });
    expect(screen.queryByTestId('cross-fade-image')).toBeNull();
  });
});
