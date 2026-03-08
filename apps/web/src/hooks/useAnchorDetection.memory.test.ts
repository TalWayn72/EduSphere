import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useAnchorDetection } from './useAnchorDetection';

// ── rAF / cAF stubs ──────────────────────────────────────────────────────────
beforeEach(() => {
  vi.spyOn(globalThis, 'requestAnimationFrame').mockImplementation((cb) => {
    // Schedule but do not auto-run — we only test cleanup
    void cb;
    return 1;
  });
  vi.spyOn(globalThis, 'cancelAnimationFrame').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('useAnchorDetection — memory safety', () => {
  it('cancels rAF on unmount', () => {
    const cancelSpy = vi.spyOn(globalThis, 'cancelAnimationFrame');
    const containerRef = { current: document.createElement('div') };

    const { unmount } = renderHook(() =>
      useAnchorDetection([{ id: 'a1', documentOrder: 0 }], containerRef)
    );

    unmount();

    expect(cancelSpy).toHaveBeenCalled();
  });

  it('does NOT attach a scroll listener (G-11: domMap built on anchor change, not on scroll)', () => {
    const div = document.createElement('div');
    const addSpy = vi.spyOn(div, 'addEventListener');
    const containerRef = { current: div };

    const { unmount } = renderHook(() =>
      useAnchorDetection([{ id: 'a1', documentOrder: 0 }], containerRef)
    );

    unmount();

    // No scroll listener should ever be attached (G-11 performance fix)
    const scrollCalls = addSpy.mock.calls.filter(([type]) => type === 'scroll');
    expect(scrollCalls).toHaveLength(0);
  });

  it('does not crash when anchors array is empty (no rAF started)', () => {
    const cancelSpy = vi.spyOn(globalThis, 'cancelAnimationFrame');
    const containerRef = { current: document.createElement('div') };

    const { unmount } = renderHook(() =>
      useAnchorDetection([], containerRef)
    );

    expect(() => unmount()).not.toThrow();
    // rAF should not have been requested when anchor list is empty
    expect(globalThis.requestAnimationFrame).not.toHaveBeenCalled();
    expect(cancelSpy).not.toHaveBeenCalled();
  });

  it('does not leak rAF handles across re-renders with stable anchor list', () => {
    const rafSpy = vi.spyOn(globalThis, 'requestAnimationFrame');
    const containerRef = { current: document.createElement('div') };
    const anchors = [{ id: 'a1', documentOrder: 0 }];

    const { rerender, unmount } = renderHook(
      ({ a }: { a: typeof anchors }) => useAnchorDetection(a, containerRef),
      { initialProps: { a: anchors } }
    );

    const callsBefore = rafSpy.mock.calls.length;
    // Re-render with same anchors reference (stable key)
    rerender({ a: anchors });
    // No new rAF should be started since effect deps didn't change
    const callsAfter = rafSpy.mock.calls.length;
    expect(callsAfter).toBe(callsBefore);

    unmount();
  });
});
