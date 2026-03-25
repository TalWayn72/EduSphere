/**
 * ReducedMotionProvider tests
 *
 * Verifies:
 *  1. Returns false by default (no reduced motion preference)
 *  2. Returns true when matchMedia reports reduced motion
 *  3. Updates when media query changes
 *  4. Cleans up event listener on unmount
 *  5. useReducedMotion returns boolean from context
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import React from 'react';
import { ReducedMotionProvider, useReducedMotion } from './ReducedMotionProvider';

let changeHandler: ((e: { matches: boolean }) => void) | null = null;

function setupMatchMedia(matches: boolean) {
  const addEventListener = vi.fn((_event: string, handler: (e: { matches: boolean }) => void) => {
    changeHandler = handler;
  });
  const removeEventListener = vi.fn();

  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockReturnValue({
      matches,
      addEventListener,
      removeEventListener,
    }),
  });

  return { addEventListener, removeEventListener };
}

function wrapper({ children }: { children: React.ReactNode }) {
  return React.createElement(ReducedMotionProvider, null, children);
}

describe('ReducedMotionProvider', () => {
  beforeEach(() => {
    changeHandler = null;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns false when no reduced motion preference', () => {
    setupMatchMedia(false);
    const { result } = renderHook(() => useReducedMotion(), { wrapper });
    expect(result.current).toBe(false);
  });

  it('returns true when system prefers reduced motion', () => {
    setupMatchMedia(true);
    const { result } = renderHook(() => useReducedMotion(), { wrapper });
    expect(result.current).toBe(true);
  });

  it('updates when media query changes', () => {
    setupMatchMedia(false);
    const { result } = renderHook(() => useReducedMotion(), { wrapper });
    expect(result.current).toBe(false);

    act(() => {
      changeHandler?.({ matches: true });
    });

    expect(result.current).toBe(true);
  });

  it('cleans up event listener on unmount', () => {
    const { removeEventListener } = setupMatchMedia(false);
    const { unmount } = renderHook(() => useReducedMotion(), { wrapper });

    unmount();

    expect(removeEventListener).toHaveBeenCalledWith('change', expect.any(Function));
  });

  it('returns false when used outside provider (default context)', () => {
    setupMatchMedia(false);
    const { result } = renderHook(() => useReducedMotion());
    expect(result.current).toBe(false);
  });
});
