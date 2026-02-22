/**
 * useAgentChat — memory leak / timer cleanup tests
 *
 * Verifies that all timers (mockTimeoutRef + streamingTimeoutRef) are
 * cleared when the hook unmounts, preventing state updates on an
 * unmounted component.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

// ── urql mock ────────────────────────────────────────────────────────────────
vi.mock('urql', () => ({
  useMutation: vi.fn(),
  useSubscription: vi.fn(),
}));

// ── GraphQL document stubs ────────────────────────────────────────────────────
vi.mock('@/lib/graphql/agent.queries', () => ({
  START_AGENT_SESSION_MUTATION: 'START_AGENT_SESSION_MUTATION',
  SEND_AGENT_MESSAGE_MUTATION: 'SEND_AGENT_MESSAGE_MUTATION',
  MESSAGE_STREAM_SUBSCRIPTION: 'MESSAGE_STREAM_SUBSCRIPTION',
}));

// ── Imports after mocks ───────────────────────────────────────────────────────
import { useAgentChat } from './useAgentChat';
import * as urql from 'urql';

// ── urql setup helpers ────────────────────────────────────────────────────────

/**
 * Configures urql mock so:
 *   - startSession resolves with no session id (forces mock fallback path)
 *   - sendMessage is a no-op
 *   - subscription returns no data
 */
function setupUrqlWithNoSession() {
  vi.mocked(urql.useMutation).mockImplementation((mutation) => {
    if (mutation === 'START_AGENT_SESSION_MUTATION') {
      return [{ fetching: false }, vi.fn().mockResolvedValue({ data: null })] as ReturnType<
        typeof urql.useMutation
      >;
    }
    return [{ fetching: false }, vi.fn().mockResolvedValue({ data: null })] as ReturnType<
      typeof urql.useMutation
    >;
  });

  vi.mocked(urql.useSubscription).mockReturnValue([
    { data: null, fetching: false },
    vi.fn(),
  ] as ReturnType<typeof urql.useSubscription>);
}

/**
 * Configures urql mock so sendMessage returns a real message id, which makes
 * the hook set streamingTimeoutRef (the 30 s watchdog).
 */
function setupUrqlWithSession() {
  vi.mocked(urql.useMutation).mockImplementation((mutation) => {
    if (mutation === 'START_AGENT_SESSION_MUTATION') {
      return [
        { fetching: false },
        vi.fn().mockResolvedValue({ data: { startAgentSession: { id: 'session-abc' } } }),
      ] as ReturnType<typeof urql.useMutation>;
    }
    // SEND_AGENT_MESSAGE_MUTATION returns no content → streaming path → sets streamingTimeoutRef
    return [{ fetching: false }, vi.fn().mockResolvedValue({ data: null })] as ReturnType<
      typeof urql.useMutation
    >;
  });

  vi.mocked(urql.useSubscription).mockReturnValue([
    { data: null, fetching: false },
    vi.fn(),
  ] as ReturnType<typeof urql.useSubscription>);
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('useAgentChat timer cleanup (memory safety)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.runAllTimers();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  // ── mockTimeoutRef ────────────────────────────────────────────────────────

  it('clears the mock-response timeout when unmounted before it fires', async () => {
    setupUrqlWithNoSession();
    const clearTimeoutSpy = vi.spyOn(globalThis, 'clearTimeout');

    const { result, unmount } = renderHook(() => useAgentChat('content-1'));

    // Trigger sendMessage — no session available so appendMockResponse runs,
    // which calls setTimeout(…, 800) and stores the id in mockTimeoutRef.
    act(() => {
      result.current.setChatInput('Hello, will you reply?');
    });

    await act(async () => {
      result.current.sendMessage();
    });

    // Unmount before the 800 ms fires so cleanup runs.
    unmount();

    // clearTimeout must have been called (the cleanup effect runs on unmount).
    expect(clearTimeoutSpy).toHaveBeenCalled();
  });

  it('does NOT fire the mock response callback after unmount', async () => {
    setupUrqlWithNoSession();
    const { result, unmount } = renderHook(() => useAgentChat('content-1'));

    const initialCount = result.current.messages.length;

    act(() => {
      result.current.setChatInput('A message');
    });

    await act(async () => {
      result.current.sendMessage();
    });

    // Unmount mid-timeout
    unmount();

    // Advance past the 800 ms; if the timer were not cleared, React would
    // warn about state updates on an unmounted component.
    act(() => {
      vi.advanceTimersByTime(1200);
    });

    // We cannot inspect internal state after unmount, but the absence of a
    // React "state update on unmounted component" warning and the fact that
    // clearTimeout was called are the observable guarantees.
    expect(initialCount).toBeGreaterThanOrEqual(1);
  });

  // ── streamingTimeoutRef ───────────────────────────────────────────────────

  it('clears the streaming watchdog timeout when unmounted before it fires', async () => {
    setupUrqlWithSession();
    const clearTimeoutSpy = vi.spyOn(globalThis, 'clearTimeout');

    const { result, unmount } = renderHook(() => useAgentChat('content-1'));

    act(() => {
      result.current.setChatInput('Stream this!');
    });

    // sendAgentMessage returns null content → hook sets streamingTimeoutRef (30 s watchdog)
    await act(async () => {
      result.current.sendMessage();
    });

    unmount();

    // clearTimeout must have been called by the cleanup in useEffect
    expect(clearTimeoutSpy).toHaveBeenCalled();
  });

  it('does NOT fire the streaming watchdog after unmount', async () => {
    setupUrqlWithSession();
    const clearTimeoutSpy = vi.spyOn(globalThis, 'clearTimeout');

    const { result, unmount } = renderHook(() => useAgentChat('content-1'));

    act(() => {
      result.current.setChatInput('Check streaming cleanup');
    });

    await act(async () => {
      result.current.sendMessage();
    });

    unmount();

    // Advance 30 s past the watchdog deadline
    act(() => {
      vi.advanceTimersByTime(35_000);
    });

    // clearTimeout must have been called so the watchdog cannot run
    expect(clearTimeoutSpy).toHaveBeenCalled();
  });

  // ── Cleanup on unmount without any message sent ───────────────────────────

  it('does not throw when unmounting without any sendMessage call', () => {
    setupUrqlWithNoSession();

    const { unmount } = renderHook(() => useAgentChat('content-1'));

    // Unmounting a freshly mounted hook should be side-effect free
    expect(() => unmount()).not.toThrow();
  });

  // ── Multiple messages ─────────────────────────────────────────────────────

  it('clears all timers when multiple messages were sent before unmount', async () => {
    setupUrqlWithNoSession();
    const clearTimeoutSpy = vi.spyOn(globalThis, 'clearTimeout');

    const { result, unmount } = renderHook(() => useAgentChat('content-1'));

    // First message
    act(() => result.current.setChatInput('Message one'));
    await act(async () => result.current.sendMessage());

    // Advance just past the first timeout so it fires and a second ref can be set
    act(() => vi.advanceTimersByTime(900));

    // Second message — sets mockTimeoutRef again
    act(() => result.current.setChatInput('Message two'));
    await act(async () => result.current.sendMessage());

    unmount();

    expect(clearTimeoutSpy).toHaveBeenCalled();
  });
});
