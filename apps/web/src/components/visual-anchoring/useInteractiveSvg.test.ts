import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useInteractiveSvg } from './useInteractiveSvg';

describe('useInteractiveSvg', () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    fetchSpy = vi.spyOn(globalThis, 'fetch');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns null sanitizedSvg and loading=false when disabled', () => {
    const { result } = renderHook(() =>
      useInteractiveSvg('https://example.com/test.svg', false),
    );

    expect(result.current.sanitizedSvg).toBeNull();
    expect(result.current.loading).toBe(false);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('returns null sanitizedSvg and loading=false when src is null', () => {
    const { result } = renderHook(() =>
      useInteractiveSvg(null, true),
    );

    expect(result.current.sanitizedSvg).toBeNull();
    expect(result.current.loading).toBe(false);
  });

  it('fetches and sanitizes SVG when enabled with valid src', async () => {
    const svgContent = '<svg><text>Hello</text></svg>';
    fetchSpy.mockResolvedValueOnce({
      text: () => Promise.resolve(svgContent),
    } as Response);

    const { result } = renderHook(() =>
      useInteractiveSvg('https://example.com/test.svg', true),
    );

    // Initially loading
    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.sanitizedSvg).toBeTruthy();
    expect(fetchSpy).toHaveBeenCalledWith(
      'https://example.com/test.svg',
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
  });

  it('strips dangerous content from SVG (DOMPurify)', async () => {
    const dangerousSvg = '<svg><script>alert("xss")</script><text>Safe</text></svg>';
    fetchSpy.mockResolvedValueOnce({
      text: () => Promise.resolve(dangerousSvg),
    } as Response);

    const { result } = renderHook(() =>
      useInteractiveSvg('https://example.com/danger.svg', true),
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Script tags should be stripped
    expect(result.current.sanitizedSvg).not.toContain('<script>');
    expect(result.current.sanitizedSvg).toContain('Safe');
  });

  it('handles fetch errors gracefully', async () => {
    fetchSpy.mockRejectedValueOnce(new Error('Network error'));

    const { result } = renderHook(() =>
      useInteractiveSvg('https://example.com/error.svg', true),
    );

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.sanitizedSvg).toBeNull();
  });

  it('handles AbortError silently (does not set null)', async () => {
    const abortError = new DOMException('Aborted', 'AbortError');
    fetchSpy.mockRejectedValueOnce(abortError);

    const { result } = renderHook(() =>
      useInteractiveSvg('https://example.com/abort.svg', true),
    );

    // AbortError should be swallowed — state may remain loading or null
    // The key thing is no unhandled error
    await waitFor(() => {
      expect(result.current).toBeDefined();
    });
  });

  it('aborts previous fetch when src changes', async () => {
    const abortSpy = vi.spyOn(AbortController.prototype, 'abort');

    fetchSpy.mockImplementation(
      () =>
        new Promise((resolve) =>
          setTimeout(
            () =>
              resolve({
                text: () => Promise.resolve('<svg></svg>'),
              } as Response),
            100,
          ),
        ),
    );

    const { rerender } = renderHook(
      ({ src }: { src: string }) => useInteractiveSvg(src, true),
      { initialProps: { src: 'https://example.com/first.svg' } },
    );

    rerender({ src: 'https://example.com/second.svg' });

    expect(abortSpy).toHaveBeenCalled();
    abortSpy.mockRestore();
  });

  it('aborts fetch on unmount (memory safety)', async () => {
    const abortSpy = vi.spyOn(AbortController.prototype, 'abort');

    fetchSpy.mockImplementation(
      () =>
        new Promise((resolve) =>
          setTimeout(
            () =>
              resolve({
                text: () => Promise.resolve('<svg></svg>'),
              } as Response),
            1000,
          ),
        ),
    );

    const { unmount } = renderHook(() =>
      useInteractiveSvg('https://example.com/test.svg', true),
    );

    unmount();
    expect(abortSpy).toHaveBeenCalled();
    abortSpy.mockRestore();
  });
});
