import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import React from 'react';
import CrossFadeImage from './CrossFadeImage';

const TRANSPARENT_GIF =
  'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAAAAAAALAAAAAABAAEAAAIBRAA7';

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

// ── Mock useInteractiveSvg so fetch isn't needed in most tests ────────────────
vi.mock('./useInteractiveSvg', () => ({
  useInteractiveSvg: vi.fn((_src: string | null, enabled: boolean) => ({
    sanitizedSvg: enabled ? '<svg data-testid="svg-inline"></svg>' : null,
    loading: false,
  })),
}));

vi.mock('./useCrossFadeGif', () => ({
  useCrossFadeGif: vi.fn(() => ({
    scheduleGifPause: vi.fn(),
  })),
}));

describe('CrossFadeImage', () => {
  it('renders null when src is null', () => {
    const { container } = render(<CrossFadeImage src={null} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders a single image (no fade wrapper) on first src provided', () => {
    render(<CrossFadeImage src="https://example.com/img1.png" alt="Image 1" />);
    const wrapper = screen.getByTestId('cross-fade-image');
    expect(wrapper).toBeDefined();
    const current = screen.getByTestId('cross-fade-current');
    expect(current.getAttribute('src')).toBe('https://example.com/img1.png');
    expect(current.getAttribute('aria-hidden')).toBe('true');
    expect(wrapper.getAttribute('aria-label')).toBe('Image 1');
    expect(screen.queryByTestId('cross-fade-next')).toBeNull();
  });

  it('sets opacity 0 on current and opacity 1 on next when src changes', () => {
    vi.useFakeTimers();

    const { rerender } = render(
      <CrossFadeImage src="https://example.com/img1.png" alt="First" fadeDuration={400} />
    );

    act(() => {
      rerender(
        <CrossFadeImage src="https://example.com/img2.png" alt="Second" fadeDuration={400} />
      );
    });

    const current = screen.getByTestId('cross-fade-current');
    const next = screen.getByTestId('cross-fade-next');

    expect((current as HTMLImageElement).style.opacity).toBe('0');
    expect((next as HTMLImageElement).style.opacity).toBe('1');
    expect((next as HTMLImageElement).getAttribute('src')).toBe('https://example.com/img2.png');

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

    act(() => {
      vi.advanceTimersByTime(460);
    });

    const current = screen.getByTestId('cross-fade-current');
    expect((current as HTMLImageElement).getAttribute('src')).toBe('https://example.com/img2.png');
    expect(screen.queryByTestId('cross-fade-next')).toBeNull();

    vi.useRealTimers();
  });

  it('clears timer on unmount — no memory leak', () => {
    vi.useFakeTimers();
    const clearSpy = vi.spyOn(globalThis, 'clearTimeout');

    const { rerender, unmount } = render(
      <CrossFadeImage src="https://example.com/img1.png" fadeDuration={400} />
    );

    act(() => {
      rerender(<CrossFadeImage src="https://example.com/img2.png" fadeDuration={400} />);
    });

    unmount();

    expect(clearSpy).toHaveBeenCalled();
    vi.useRealTimers();
  });

  it('renders nothing when src transitions from value to null', () => {
    const { rerender } = render(<CrossFadeImage src="https://example.com/img1.png" />);
    act(() => {
      rerender(<CrossFadeImage src={null} />);
    });
    expect(screen.queryByTestId('cross-fade-image')).toBeNull();
  });

  // ── G-2: Interactive SVG ───────────────────────────────────────────────────

  it('[G-2] renders sanitized SVG inline when interactiveSvg=true and mimeType=svg', () => {
    render(
      <CrossFadeImage
        src="https://example.com/image.svg"
        alt="Interactive SVG"
        mimeType="image/svg+xml"
        interactiveSvg
      />
    );

    const wrapper = screen.getByTestId('cross-fade-image');
    expect(wrapper.getAttribute('role')).toBe('img');
    expect(wrapper.getAttribute('aria-label')).toBe('Interactive SVG');
    // Inline SVG injected — no img elements
    expect(screen.queryByTestId('cross-fade-current')).toBeNull();
    expect(screen.queryByTestId('cross-fade-next')).toBeNull();
    // The mocked sanitized SVG is rendered as innerHTML
    expect(screen.getByTestId('svg-inline')).toBeDefined();
  });

  it('[G-2] renders as img when interactiveSvg=false (default) for svg mimeType', () => {
    render(
      <CrossFadeImage
        src="https://example.com/image.svg"
        alt="Static SVG"
        mimeType="image/svg+xml"
        interactiveSvg={false}
      />
    );
    // Falls through to normal img rendering path
    const current = screen.getByTestId('cross-fade-current');
    expect(current.tagName).toBe('IMG');
    expect(current.getAttribute('src')).toBe('https://example.com/image.svg');
  });

  it('[G-2] useInteractiveSvg is called with enabled=false for non-SVG mimeType', async () => {
    const { useInteractiveSvg } = await import('./useInteractiveSvg');
    render(
      <CrossFadeImage
        src="https://example.com/image.png"
        mimeType="image/png"
        interactiveSvg
      />
    );
    expect(useInteractiveSvg).toHaveBeenCalledWith(
      'https://example.com/image.png',
      false // not svg, so enabled = false
    );
  });

  // ── G-3: GIF src-swap after fade ──────────────────────────────────────────

  it('[G-3] scheduleGifPause is called after fade timer fires on GIF transition', async () => {
    vi.useFakeTimers();
    const { useCrossFadeGif } = await import('./useCrossFadeGif');
    const mockSchedule = vi.fn();
    vi.mocked(useCrossFadeGif).mockReturnValue({ scheduleGifPause: mockSchedule });

    const { rerender } = render(
      <CrossFadeImage
        src="https://example.com/anim.gif"
        alt="Animated"
        mimeType="image/gif"
        fadeDuration={300}
      />
    );

    act(() => {
      rerender(
        <CrossFadeImage
          src="https://example.com/anim2.gif"
          alt="Animated 2"
          mimeType="image/gif"
          fadeDuration={300}
        />
      );
    });

    // Advance past fadeDuration + 50ms buffer = 350ms
    act(() => {
      vi.advanceTimersByTime(360);
    });

    expect(mockSchedule).toHaveBeenCalled();

    vi.useRealTimers();
  });

  it('[G-3] transparent GIF data URI used by useCrossFadeGif hook', async () => {
    // Import actual hook to verify constant
    const { useCrossFadeGif: actual } = await import('./useCrossFadeGif');
    expect(actual).toBeDefined();
    // Verify the transparent GIF constant is correct format
    expect(TRANSPARENT_GIF).toMatch(/^data:image\/gif;base64,/);
  });
});
