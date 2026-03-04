/**
 * useUnsavedChangesGuard — unit tests
 * Verifies:
 * 1. beforeunload listener is added/removed correctly
 * 2. useBlocker is called with the isDirty condition
 * 3. Navigation blocking is logged as a console.error (observability)
 * 4. Returns the blocker object for the caller to consume
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return {
    ...actual,
    useBlocker: vi.fn(() => ({ state: 'unblocked' as const, proceed: vi.fn(), reset: vi.fn() })),
  };
});

// ── Imports after mocks ───────────────────────────────────────────────────────

import { useUnsavedChangesGuard } from './useUnsavedChangesGuard';
import * as RRD from 'react-router-dom';

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('useUnsavedChangesGuard', () => {
  let addEventListenerSpy: ReturnType<typeof vi.spyOn>;
  let removeEventListenerSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    addEventListenerSpy = vi.spyOn(window, 'addEventListener');
    removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');
    vi.mocked(RRD.useBlocker).mockReturnValue({
      state: 'unblocked',
      proceed: vi.fn(),
      reset: vi.fn(),
    } as never);
  });

  afterEach(() => {
    addEventListenerSpy.mockRestore();
    removeEventListenerSpy.mockRestore();
  });

  // ── beforeunload listener ──────────────────────────────────────────────────

  it('does NOT register beforeunload when isDirty is false', () => {
    renderHook(() => useUnsavedChangesGuard(false, 'TestComponent'), {
      wrapper: MemoryRouter,
    });
    const calls = addEventListenerSpy.mock.calls.filter(
      ([event]) => event === 'beforeunload',
    );
    expect(calls).toHaveLength(0);
  });

  it('registers beforeunload handler when isDirty is true', () => {
    renderHook(() => useUnsavedChangesGuard(true, 'TestComponent'), {
      wrapper: MemoryRouter,
    });
    const calls = addEventListenerSpy.mock.calls.filter(
      ([event]) => event === 'beforeunload',
    );
    expect(calls).toHaveLength(1);
  });

  it('removes beforeunload listener on unmount', () => {
    const { unmount } = renderHook(
      () => useUnsavedChangesGuard(true, 'TestComponent'),
      { wrapper: MemoryRouter },
    );
    unmount();
    const calls = removeEventListenerSpy.mock.calls.filter(
      ([event]) => event === 'beforeunload',
    );
    expect(calls).toHaveLength(1);
  });

  it('removes beforeunload listener when isDirty transitions false → (cleanup)', () => {
    const { rerender, unmount } = renderHook(
      ({ dirty }: { dirty: boolean }) =>
        useUnsavedChangesGuard(dirty, 'TestComponent'),
      { wrapper: MemoryRouter, initialProps: { dirty: true } },
    );
    // After initial render with dirty=true, handler is registered
    rerender({ dirty: false });
    // After rerender with dirty=false, previous handler should be removed
    const removeCalls = removeEventListenerSpy.mock.calls.filter(
      ([event]) => event === 'beforeunload',
    );
    expect(removeCalls.length).toBeGreaterThanOrEqual(1);
    unmount();
  });

  // ── useBlocker call ───────────────────────────────────────────────────────

  it('calls useBlocker with true when isDirty is true', () => {
    renderHook(() => useUnsavedChangesGuard(true, 'TestComponent'), {
      wrapper: MemoryRouter,
    });
    expect(vi.mocked(RRD.useBlocker)).toHaveBeenCalledWith(true);
  });

  it('calls useBlocker with false when isDirty is false', () => {
    renderHook(() => useUnsavedChangesGuard(false, 'TestComponent'), {
      wrapper: MemoryRouter,
    });
    expect(vi.mocked(RRD.useBlocker)).toHaveBeenCalledWith(false);
  });

  // ── Return value ──────────────────────────────────────────────────────────

  it('returns the blocker object from useBlocker', () => {
    const mockBlocker = { state: 'unblocked' as const, proceed: vi.fn(), reset: vi.fn() };
    vi.mocked(RRD.useBlocker).mockReturnValue(mockBlocker as never);
    const { result } = renderHook(
      () => useUnsavedChangesGuard(false, 'TestComponent'),
      { wrapper: MemoryRouter },
    );
    expect(result.current).toBe(mockBlocker);
  });

  // ── Observability (logging) ───────────────────────────────────────────────

  it('logs console.error with component name when navigation is blocked', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(RRD.useBlocker).mockReturnValue({
      state: 'blocked',
      proceed: vi.fn(),
      reset: vi.fn(),
    } as never);
    renderHook(() => useUnsavedChangesGuard(true, 'LessonPipelinePage'), {
      wrapper: MemoryRouter,
    });
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('[LessonPipelinePage]'),
    );
    errorSpy.mockRestore();
  });

  it('does NOT log when navigation is NOT blocked (unblocked state)', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(RRD.useBlocker).mockReturnValue({
      state: 'unblocked',
      proceed: vi.fn(),
      reset: vi.fn(),
    } as never);
    renderHook(() => useUnsavedChangesGuard(false, 'TestComponent'), {
      wrapper: MemoryRouter,
    });
    expect(errorSpy).not.toHaveBeenCalled();
    errorSpy.mockRestore();
  });
});
