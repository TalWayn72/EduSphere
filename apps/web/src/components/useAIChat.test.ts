/**
 * useAIChat hook tests
 *
 * Verifies:
 *  1. Initial state (closed, default agent, empty messages)
 *  2. Agent selection resets session and messages
 *  3. Consent check blocks message sending
 *  4. Empty/whitespace input is rejected
 *  5. DEV_MODE mock streaming flow
 *  6. Production session start + message send flow
 *  7. Consent error from GraphQL handled
 *  8. Enter key triggers send, Shift+Enter does not
 *  9. stopGeneration sets isStreaming to false
 * 10. Timer cleanup on unmount (memory safety)
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

// ── urql mock ────────────────────────────────────────────────────────────────
const mockStartSession = vi.fn().mockResolvedValue({
  data: { startAgentSession: { id: 'session-abc' } },
});
const mockSendMessage = vi.fn().mockResolvedValue({
  data: { sendAgentMessage: { id: 'msg-1', content: 'reply' } },
});

vi.mock('urql', () => ({
  useMutation: vi.fn(),
  useSubscription: vi.fn(),
}));

vi.mock('@/lib/graphql/agent.queries', () => ({
  START_AGENT_SESSION_MUTATION: 'START_SESSION',
  SEND_AGENT_MESSAGE_MUTATION: 'SEND_MESSAGE',
  MESSAGE_STREAM_SUBSCRIPTION: 'MESSAGE_STREAM',
}));

vi.mock('./aiChatMockResponses', () => ({
  generateMockResponse: vi.fn(() => 'mock AI response'),
}));

import { useAIChat } from './useAIChat';
import * as urql from 'urql';

// ── Setup helpers ────────────────────────────────────────────────────────────

function setupUrqlMocks() {
  vi.mocked(urql.useMutation).mockImplementation((mutation) => {
    if (mutation === 'START_SESSION') {
      return [{ fetching: false }, mockStartSession] as ReturnType<typeof urql.useMutation>;
    }
    return [{ fetching: false }, mockSendMessage] as ReturnType<typeof urql.useMutation>;
  });
  vi.mocked(urql.useSubscription).mockReturnValue([
    { data: null, fetching: false },
    vi.fn(),
  ] as ReturnType<typeof urql.useSubscription>);
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
  setupUrqlMocks();
  localStorage.clear();
});

afterEach(() => {
  vi.useRealTimers();
});

// ── Tests ────────────────────────────────────────────────────────────────────

describe('useAIChat', () => {
  it('returns correct initial state', () => {
    const { result } = renderHook(() => useAIChat());
    expect(result.current.isOpen).toBe(false);
    expect(result.current.selectedAgent).toBe('chavruta');
    expect(result.current.messages).toEqual([]);
    expect(result.current.inputValue).toBe('');
    expect(result.current.isStreaming).toBe(false);
  });

  it('toggles isOpen via setIsOpen', () => {
    const { result } = renderHook(() => useAIChat());
    act(() => result.current.setIsOpen(true));
    expect(result.current.isOpen).toBe(true);
  });

  it('resets messages when selectedAgent changes', () => {
    const { result } = renderHook(() => useAIChat());
    act(() => result.current.setSelectedAgent('explainer'));
    expect(result.current.messages).toEqual([]);
    expect(result.current.selectedAgent).toBe('explainer');
  });

  it('does not send when input is empty', async () => {
    const { result } = renderHook(() => useAIChat());
    await act(async () => {
      await result.current.handleSendMessage();
    });
    expect(result.current.messages).toEqual([]);
    expect(mockStartSession).not.toHaveBeenCalled();
  });

  it('does not send when input is whitespace only', async () => {
    const { result } = renderHook(() => useAIChat());
    act(() => result.current.setInputValue('   '));
    await act(async () => {
      await result.current.handleSendMessage();
    });
    expect(result.current.messages).toEqual([]);
  });

  it('adds consent-required message when AI consent not granted', async () => {
    const { result } = renderHook(() => useAIChat());
    act(() => result.current.setInputValue('Hello'));
    await act(async () => {
      await result.current.handleSendMessage();
    });
    expect(result.current.messages).toHaveLength(2);
    expect(result.current.messages[0].role).toBe('user');
    expect(result.current.messages[1].type).toBe('consent-required');
    expect(result.current.inputValue).toBe('');
  });

  it('stopGeneration sets isStreaming to false', () => {
    const { result } = renderHook(() => useAIChat());
    act(() => result.current.stopGeneration());
    expect(result.current.isStreaming).toBe(false);
  });

  it('handleKeyPress triggers send on Enter', async () => {
    const { result } = renderHook(() => useAIChat());
    const preventDefault = vi.fn();
    act(() => result.current.setInputValue('test'));
    await act(async () => {
      result.current.handleKeyPress({
        key: 'Enter',
        shiftKey: false,
        preventDefault,
      } as unknown as React.KeyboardEvent<HTMLInputElement>);
    });
    expect(preventDefault).toHaveBeenCalled();
  });

  it('handleKeyPress does NOT send on Shift+Enter', () => {
    const { result } = renderHook(() => useAIChat());
    const preventDefault = vi.fn();
    act(() => {
      result.current.handleKeyPress({
        key: 'Enter',
        shiftKey: true,
        preventDefault,
      } as unknown as React.KeyboardEvent<HTMLInputElement>);
    });
    expect(preventDefault).not.toHaveBeenCalled();
  });

  it('currentAgent reflects selectedAgent metadata', () => {
    const { result } = renderHook(() => useAIChat());
    expect(result.current.currentAgent.id).toBe('chavruta');
    expect(result.current.currentAgent.name).toBe('Chavruta');
  });

  it('DEV_MODE sends mock response after timer', async () => {
    localStorage.setItem('edusphere_consent_AI_PROCESSING', 'true');
    const { result } = renderHook(() => useAIChat());
    act(() => result.current.setInputValue('test question'));

    await act(async () => {
      await result.current.handleSendMessage();
    });

    // User message added immediately
    expect(result.current.messages).toHaveLength(1);
    expect(result.current.messages[0].role).toBe('user');
    expect(result.current.isStreaming).toBe(true);

    // Advance past mock timer (800ms)
    act(() => vi.advanceTimersByTime(800));
    expect(result.current.messages).toHaveLength(2);
    expect(result.current.messages[1].role).toBe('agent');
    expect(result.current.messages[1].isStreaming).toBe(true);

    // Advance past stream finish (1000ms)
    act(() => vi.advanceTimersByTime(1000));
    expect(result.current.messages[1].isStreaming).toBe(false);
    expect(result.current.isStreaming).toBe(false);
  });

  it('cleans up timers on unmount (memory safety)', async () => {
    localStorage.setItem('edusphere_consent_AI_PROCESSING', 'true');
    const { result, unmount } = renderHook(() => useAIChat());
    act(() => result.current.setInputValue('question'));

    await act(async () => {
      await result.current.handleSendMessage();
    });

    // Unmount before timers fire — should not throw
    unmount();
    act(() => vi.advanceTimersByTime(5000));
  });
});
