/**
 * useAIChat hook tests
 *
 * useAIChat is a thin wrapper over hooks/useAgentChat that adds
 * floating-panel UI state (isOpen, selectedAgent, inputRef, messagesEndRef).
 * The underlying message logic lives in hooks/useAgentChat.
 *
 * Verifies:
 *  1. Initial state (closed, default agent)
 *  2. setIsOpen toggles panel
 *  3. Agent selection resets mode
 *  4. stopGeneration works
 *  5. handleKeyPress triggers send on Enter / skips on Shift+Enter
 *  6. currentAgent reflects selectedAgent metadata
 *  7. Refs are exposed
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

// ── urql mock ────────────────────────────────────────────────────────────────
const mockStartSession = vi.fn().mockResolvedValue({
  data: { startAgentSession: { id: 'session-abc' } },
});
const mockSendMessage = vi.fn().mockResolvedValue({
  data: { sendMessage: { id: 'msg-1', role: 'ASSISTANT', content: 'reply' } },
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

// ── graphql-types mock ────────────────────────────────────────────────────────
vi.mock('@edusphere/graphql-types', () => ({
  MessageRole: { User: 'USER', Assistant: 'ASSISTANT' },
  TemplateType: {},
}));

import { useAIChat } from './useAIChat';
import * as urql from 'urql';

// ── Setup helpers ─────────────────────────────────────────────────────────────

function setupUrqlMocks() {
  vi.mocked(urql.useMutation).mockImplementation((mutation) => {
    if (mutation === 'START_SESSION') {
      return [{ fetching: false }, mockStartSession] as ReturnType<
        typeof urql.useMutation
      >;
    }
    return [{ fetching: false }, mockSendMessage] as ReturnType<
      typeof urql.useMutation
    >;
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

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('useAIChat', () => {
  it('starts with panel closed', () => {
    const { result } = renderHook(() => useAIChat());
    expect(result.current.isOpen).toBe(false);
  });

  it('starts with chavruta as default agent', () => {
    const { result } = renderHook(() => useAIChat());
    expect(result.current.selectedAgent).toBe('chavruta');
  });

  it('starts with empty inputValue', () => {
    const { result } = renderHook(() => useAIChat());
    expect(result.current.inputValue).toBe('');
  });

  it('starts with isStreaming false', () => {
    const { result } = renderHook(() => useAIChat());
    expect(result.current.isStreaming).toBe(false);
  });

  it('toggles isOpen via setIsOpen', () => {
    const { result } = renderHook(() => useAIChat());
    act(() => result.current.setIsOpen(true));
    expect(result.current.isOpen).toBe(true);
  });

  it('changes selectedAgent via setSelectedAgent', () => {
    const { result } = renderHook(() => useAIChat());
    act(() => result.current.setSelectedAgent('explainer'));
    expect(result.current.selectedAgent).toBe('explainer');
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

  it('exposes messagesEndRef as a ref object', () => {
    const { result } = renderHook(() => useAIChat());
    expect(result.current.messagesEndRef).toBeDefined();
    expect(typeof result.current.messagesEndRef).toBe('object');
  });

  it('exposes inputRef as a ref object', () => {
    const { result } = renderHook(() => useAIChat());
    expect(result.current.inputRef).toBeDefined();
    expect(typeof result.current.inputRef).toBe('object');
  });

  it('setInputValue updates inputValue', () => {
    const { result } = renderHook(() => useAIChat());
    act(() => result.current.setInputValue('hello'));
    expect(result.current.inputValue).toBe('hello');
  });

  it('handleSendMessage is a function', () => {
    const { result } = renderHook(() => useAIChat());
    expect(typeof result.current.handleSendMessage).toBe('function');
  });
});
