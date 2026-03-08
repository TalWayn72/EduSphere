import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAnchorDetection } from './useAnchorDetection';
import type { AnchorPosition } from './useAnchorDetection';

// ── rAF / cAF stubs ──────────────────────────────────────────────────────────
// Use a Map so cancelAnimationFrame can truly remove a pending callback.
let rafCallbacks = new Map<number, (timestamp: number) => void>();
let rafIdCounter = 0;

function stubRaf() {
  vi.spyOn(globalThis, 'requestAnimationFrame').mockImplementation((cb) => {
    const id = ++rafIdCounter;
    rafCallbacks.set(id, cb);
    return id;
  });
  // Actually cancel so that cleanup prevents the old loop from firing.
  vi.spyOn(globalThis, 'cancelAnimationFrame').mockImplementation((id) => {
    rafCallbacks.delete(id);
  });
}

function flushFrames(count: number) {
  for (let i = 0; i < count; i++) {
    const entry = rafCallbacks.entries().next().value as
      | [number, (timestamp: number) => void]
      | undefined;
    if (!entry) break;
    const [id, cb] = entry;
    rafCallbacks.delete(id); // remove before executing (mirrors real rAF)
    cb(globalThis.performance.now());
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeContainer(scrollTop = 0, clientHeight = 600) {
  const div = document.createElement('div');
  Object.defineProperty(div, 'scrollTop', { value: scrollTop, writable: true });
  Object.defineProperty(div, 'clientHeight', {
    value: clientHeight,
    writable: true,
  });
  return div;
}

function makeAnchorEl(offsetTop: number, offsetHeight = 20) {
  const el = document.createElement('span');
  Object.defineProperty(el, 'offsetTop', { value: offsetTop });
  Object.defineProperty(el, 'offsetHeight', { value: offsetHeight });
  return el;
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('useAnchorDetection', () => {
  beforeEach(() => {
    rafCallbacks = new Map();
    rafIdCounter = 0;
    stubRaf();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns null when no anchors provided', () => {
    const containerRef = { current: makeContainer() };
    const { result } = renderHook(() =>
      useAnchorDetection([], containerRef)
    );
    expect(result.current.activeAnchorId).toBeNull();
  });

  it('returns the anchor closest to viewport center', () => {
    // Container: scrollTop=0, clientHeight=600 → viewportCenter=300
    const container = makeContainer(0, 600);
    document.body.appendChild(container);

    // Anchor a1 at offsetTop=100 (center=110) — distance 190 from 300
    const el1 = makeAnchorEl(100, 20);
    el1.setAttribute('data-anchor-id', 'a1');
    container.appendChild(el1);

    // Anchor a2 at offsetTop=280 (center=290) — distance 10 from 300
    const el2 = makeAnchorEl(280, 20);
    el2.setAttribute('data-anchor-id', 'a2');
    container.appendChild(el2);

    const containerRef = { current: container };
    const anchors: AnchorPosition[] = [
      { id: 'a1', documentOrder: 0 },
      { id: 'a2', documentOrder: 1 },
    ];

    const { result } = renderHook(() =>
      useAnchorDetection(anchors, containerRef)
    );

    // Flush 3 frames so the throttle fires once (frameCount%3===0 on 3rd)
    act(() => flushFrames(3));

    expect(result.current.activeAnchorId).toBe('a2');
    document.body.removeChild(container);
  });

  it('tie-breaker: lower documentOrder wins when distances equal', () => {
    // Container viewportCenter = 300
    const container = makeContainer(0, 600);
    document.body.appendChild(container);

    // Both anchors equidistant from center (center=290, distance=10 each)
    const el1 = makeAnchorEl(280, 20);
    el1.setAttribute('data-anchor-id', 'tie-high');
    container.appendChild(el1);

    const el2 = makeAnchorEl(280, 20);
    el2.setAttribute('data-anchor-id', 'tie-low');
    container.appendChild(el2);

    const containerRef = { current: container };
    const anchors: AnchorPosition[] = [
      { id: 'tie-high', documentOrder: 5 },
      { id: 'tie-low', documentOrder: 1 },
    ];

    const { result } = renderHook(() =>
      useAnchorDetection(anchors, containerRef)
    );

    act(() => flushFrames(3));

    expect(result.current.activeAnchorId).toBe('tie-low');
    document.body.removeChild(container);
  });

  it('cancels rAF on unmount (rafRef becomes null)', () => {
    const containerRef = { current: makeContainer() };
    const { unmount } = renderHook(() =>
      useAnchorDetection([{ id: 'a1', documentOrder: 0 }], containerRef)
    );
    unmount();
    expect(globalThis.cancelAnimationFrame).toHaveBeenCalled();
  });

  it('rebuilds DOM map when anchor list changes', () => {
    const container = makeContainer(0, 600);
    document.body.appendChild(container);

    const el1 = makeAnchorEl(100, 20);
    el1.setAttribute('data-anchor-id', 'b1');
    container.appendChild(el1);

    const containerRef = { current: container };
    let anchors: AnchorPosition[] = [{ id: 'b1', documentOrder: 0 }];

    const { rerender, result } = renderHook(
      ({ a }: { a: AnchorPosition[] }) => useAnchorDetection(a, containerRef),
      { initialProps: { a: anchors } }
    );

    act(() => flushFrames(3));
    expect(result.current.activeAnchorId).toBe('b1');

    // Add a new anchor that is closer to center
    const el2 = makeAnchorEl(295, 10);
    el2.setAttribute('data-anchor-id', 'b2');
    container.appendChild(el2);

    anchors = [
      { id: 'b1', documentOrder: 0 },
      { id: 'b2', documentOrder: 1 },
    ];

    act(() => {
      rerender({ a: anchors });
    });
    act(() => flushFrames(3));

    expect(result.current.activeAnchorId).toBe('b2');
    document.body.removeChild(container);
  });
});
