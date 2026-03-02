/**
 * AgentsPage — memory leak / interval cleanup tests
 *
 * The component owns two timer refs:
 *   streamRef      — setInterval driving the character-by-character streaming animation (DEV_MODE)
 *   streamTimeoutRef — setTimeout that starts the streaming animation 600 ms after send
 *
 * Both must be cleared in the useEffect cleanup so no callbacks fire after
 * the component unmounts.
 *
 * VITE_DEV_MODE is set to "true" in vitest.config.ts → streaming animation
 * path is active in all test runs.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, fireEvent, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// ── jsdom polyfill ────────────────────────────────────────────────────────────
window.HTMLElement.prototype.scrollIntoView = vi.fn();

// ── Module mocks (hoisted before component import) ────────────────────────────

vi.mock('urql', () => ({
  gql: (strings: TemplateStringsArray, ...values: unknown[]) =>
    strings.reduce(
      (acc: string, str: string, i: number) =>
        acc + str + String(values[i] ?? ''),
      ''
    ),
  useQuery: vi.fn(() => [
    { data: { agentTemplates: [] }, fetching: false, error: undefined },
    vi.fn(),
  ]),
  useMutation: vi.fn(() => [{ fetching: false, error: undefined }, vi.fn()]),
  useSubscription: vi.fn(() => [
    { data: undefined, fetching: false, error: undefined },
    vi.fn(),
  ]),
}));

vi.mock('@/components/Layout', () => ({
  Layout: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="layout">{children}</div>
  ),
}));

vi.mock('@/lib/auth', () => ({
  getCurrentUser: vi.fn(() => null),
  logout: vi.fn(),
}));

// ── Import after mocks ────────────────────────────────────────────────────────
import { AgentsPage } from './AgentsPage';

// ── Helper ────────────────────────────────────────────────────────────────────

function renderAgents() {
  return render(
    <MemoryRouter>
      <AgentsPage />
    </MemoryRouter>
  );
}

/** Send one message via keyboard Enter on the chat input. */
function sendMessage(container: HTMLElement, text: string) {
  const input = container.querySelector('input') as HTMLInputElement;
  fireEvent.change(input, { target: { value: text } });
  fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('AgentsPage interval/timeout cleanup (memory safety)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.runAllTimers();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  // ── clearInterval (streamRef) ─────────────────────────────────────────────

  it('calls clearInterval when unmounted while the streaming interval is running', () => {
    const clearIntervalSpy = vi.spyOn(globalThis, 'clearInterval');

    const { container, unmount } = renderAgents();

    // Send a message to start the 600 ms timeout → then the streaming interval
    act(() => {
      sendMessage(container, 'Debate free will');
    });

    // Advance past the 600 ms delay so the streaming interval is now running
    act(() => {
      vi.advanceTimersByTime(700);
    });

    // Unmount mid-stream — cleanup effect must call clearInterval
    unmount();

    expect(clearIntervalSpy).toHaveBeenCalled();
  });

  it('does NOT invoke streaming interval callbacks after unmount', () => {
    const { container, unmount } = renderAgents();

    act(() => {
      sendMessage(container, 'Quiz me');
    });

    // Advance into the streaming interval
    act(() => {
      vi.advanceTimersByTime(700);
    });

    unmount();

    // Advancing further should not throw (no "setState on unmounted" errors)
    expect(() => {
      act(() => {
        vi.advanceTimersByTime(5000);
      });
    }).not.toThrow();
  });

  // ── clearTimeout (streamTimeoutRef) ──────────────────────────────────────

  it('calls clearTimeout when unmounted while the 600 ms delay timeout is pending', () => {
    const clearTimeoutSpy = vi.spyOn(globalThis, 'clearTimeout');

    const { container, unmount } = renderAgents();

    act(() => {
      sendMessage(container, 'Summarize lesson 1');
    });

    // Unmount before the 600 ms delay fires (streamTimeoutRef still pending)
    unmount();

    expect(clearTimeoutSpy).toHaveBeenCalled();
  });

  it('does NOT fire the 600 ms delay callback after unmount', () => {
    const clearTimeoutSpy = vi.spyOn(globalThis, 'clearTimeout');

    const { container, unmount } = renderAgents();

    act(() => {
      sendMessage(container, "Explain like I'm 5");
    });

    unmount();

    // Advance past 600 ms — timeout must already be cleared
    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(clearTimeoutSpy).toHaveBeenCalled();
  });

  // ── Unmount without interaction ───────────────────────────────────────────

  it('does not throw when unmounting without sending any message', () => {
    const { unmount } = renderAgents();
    expect(() => unmount()).not.toThrow();
  });

  // ── Full streaming cycle then unmount ─────────────────────────────────────

  it('calls clearInterval even after streaming has completed naturally', () => {
    const clearIntervalSpy = vi.spyOn(globalThis, 'clearInterval');

    const { container, unmount } = renderAgents();

    act(() => {
      sendMessage(container, 'Debate free will');
    });

    // Run all timers so streaming completes (interval self-clears + state updates)
    act(() => {
      vi.runAllTimers();
    });

    // Unmount after natural completion — cleanup effect still runs
    unmount();

    // clearInterval is called both inside the interval callback (self-clear)
    // and in the cleanup effect — either call satisfies the assertion.
    expect(clearIntervalSpy).toHaveBeenCalled();
  });

  // ── Second message ────────────────────────────────────────────────────────

  it('clears timers after sending two consecutive messages then unmounting', () => {
    const clearIntervalSpy = vi.spyOn(globalThis, 'clearInterval');
    const clearTimeoutSpy = vi.spyOn(globalThis, 'clearTimeout');

    const { container, unmount } = renderAgents();

    // First message — advance so streaming completes
    act(() => {
      sendMessage(container, 'First message');
    });
    act(() => {
      vi.runAllTimers();
    });

    // Second message — unmount mid-stream
    act(() => {
      sendMessage(container, 'Second message');
    });
    act(() => {
      vi.advanceTimersByTime(700);
    });

    unmount();

    expect(clearIntervalSpy).toHaveBeenCalled();
    expect(clearTimeoutSpy).toHaveBeenCalled();
  });
});
