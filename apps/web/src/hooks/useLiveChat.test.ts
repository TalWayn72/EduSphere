/**
 * useLiveChat hook tests
 *
 * Covers:
 *  1. Initial fetch returns messages
 *  2. Subscription appends new messages
 *  3. Deduplication — same id not added twice
 *  4. 200-message cap enforced
 *  5. fetching from query forwarded
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('urql', () => ({
  gql: (strings: TemplateStringsArray, ...values: unknown[]) =>
    strings.reduce(
      (acc: string, str: string, i: number) =>
        acc + str + String(values[i] ?? ''),
      ''
    ),
  useQuery: vi.fn(),
  useMutation: vi.fn(),
  useSubscription: vi.fn(),
}));

vi.mock('@/lib/graphql/live-chat.queries', () => ({
  LIVE_CHAT_MESSAGES_QUERY: 'LIVE_CHAT_MESSAGES_QUERY',
  SEND_LIVE_CHAT_MESSAGE_MUTATION: 'SEND',
  PIN_LIVE_CHAT_MESSAGE_MUTATION: 'PIN',
  DELETE_LIVE_CHAT_MESSAGE_MUTATION: 'DELETE',
  LIVE_CHAT_MESSAGE_ADDED_SUB: 'MSG_ADDED_SUB',
}));

import * as urql from 'urql';
import { useLiveChat } from './useLiveChat';
import type { LiveChatMessage } from '@/types/live-session.types';

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeMessage(id: string, content = 'Hello'): LiveChatMessage {
  return {
    id,
    sessionId: 'sess-1',
    userId: 'user-1',
    displayName: 'Test User',
    avatarUrl: null,
    content,
    messageType: 'TEXT',
    isPinned: false,
    replyToId: null,
    createdAt: new Date().toISOString(),
  };
}

function setupMocks({
  initialMessages = [] as LiveChatMessage[],
  queryFetching = false,
  subMessage = null as LiveChatMessage | null,
  deleteMutationFn = vi.fn().mockResolvedValue({ data: { deleteLiveChatMessage: { deleted: true } } }),
} = {}) {
  const executeSend = vi.fn().mockResolvedValue({ data: null });
  const executePin = vi.fn().mockResolvedValue({ data: null });
  const executeDelete = deleteMutationFn;

  vi.mocked(urql.useQuery).mockReturnValue([
    {
      data: {
        liveChatMessages: {
          messages: initialMessages,
          pageInfo: { hasNextPage: false, hasPreviousPage: false, startCursor: null, endCursor: null },
        },
      },
      fetching: queryFetching,
      error: undefined,
      stale: false,
    },
    vi.fn(),
  ] as never);

  vi.mocked(urql.useMutation)
    .mockReturnValue([{} as never, vi.fn() as never])
    .mockReturnValueOnce([{} as never, executeSend as never])
    .mockReturnValueOnce([{} as never, executePin as never])
    .mockReturnValueOnce([{} as never, executeDelete as never]);

  vi.mocked(urql.useSubscription).mockReturnValue([
    { data: { liveChatMessageAdded: subMessage }, fetching: false },
    vi.fn(),
  ] as never);

  return { executeSend, executePin, executeDelete };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('useLiveChat', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns initial messages from query', async () => {
    const msgs = [makeMessage('m1'), makeMessage('m2')];
    setupMocks({ initialMessages: msgs });
    const { result } = renderHook(() => useLiveChat('sess-1'));

    await waitFor(() => {
      expect(result.current.messages).toHaveLength(2);
    });
  });

  it('forwards fetching state from query', () => {
    setupMocks({ queryFetching: true });
    const { result } = renderHook(() => useLiveChat('sess-1'));
    expect(result.current.fetching).toBe(true);
  });

  it('appends new message from subscription', async () => {
    const initial = [makeMessage('m1')];
    const incoming = makeMessage('m2', 'New message');
    setupMocks({ initialMessages: initial, subMessage: incoming });
    const { result } = renderHook(() => useLiveChat('sess-1'));

    await waitFor(() => {
      expect(result.current.messages).toHaveLength(2);
    });

    expect(result.current.messages[1]!.id).toBe('m2');
  });

  it('does not duplicate message with same id from subscription', async () => {
    const initial = [makeMessage('m1')];
    const duplicate = makeMessage('m1', 'Duplicate');
    setupMocks({ initialMessages: initial, subMessage: duplicate });
    const { result } = renderHook(() => useLiveChat('sess-1'));

    await waitFor(() => {
      expect(result.current.messages).toHaveLength(1);
    });
  });

  it('caps messages at 200', async () => {
    // Start with 200 messages
    const initial = Array.from({ length: 200 }, (_, i) => makeMessage(`m${i}`));
    const incoming = makeMessage('m200', 'Over cap');
    setupMocks({ initialMessages: initial, subMessage: incoming });
    const { result } = renderHook(() => useLiveChat('sess-1'));

    await waitFor(() => {
      expect(result.current.messages).toHaveLength(200);
    });

    // Latest message should be included (last 200 after slice)
    expect(result.current.messages[199]!.id).toBe('m200');
  });

  it('handles null subscription data gracefully', async () => {
    const initial = [makeMessage('m1')];
    setupMocks({ initialMessages: initial, subMessage: null });
    const { result } = renderHook(() => useLiveChat('sess-1'));

    await waitFor(() => {
      expect(result.current.messages).toHaveLength(1);
    });
  });

  it('sendMessage calls execute mutation', async () => {
    const { executeSend } = setupMocks();
    const { result } = renderHook(() => useLiveChat('sess-1'));

    await act(async () => {
      await result.current.sendMessage('Hello there');
    });

    expect(executeSend).toHaveBeenCalledWith({
      sessionId: 'sess-1',
      content: 'Hello there',
      replyToId: null,
    });
  });

  it('deleteMessage removes message from local state on success', async () => {
    const initial = [makeMessage('m1'), makeMessage('m2')];
    setupMocks({ initialMessages: initial });
    const { result } = renderHook(() => useLiveChat('sess-1'));

    await waitFor(() => {
      expect(result.current.messages).toHaveLength(2);
    });

    await act(async () => {
      await result.current.deleteMessage('m1');
    });

    await waitFor(() => {
      expect(result.current.messages).toHaveLength(1);
    });

    expect(result.current.messages[0]!.id).toBe('m2');
  });
});
