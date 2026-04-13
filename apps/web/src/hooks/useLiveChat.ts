/**
 * useLiveChat — fetches chat messages and subscribes to new arrivals.
 *
 * Auto-appends subscription messages, deduplicates by id, caps at 200.
 * Memory safety: subscription is paused on unmount.
 */
import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useSubscription } from 'urql';
import {
  LIVE_CHAT_MESSAGES_QUERY,
  SEND_LIVE_CHAT_MESSAGE_MUTATION,
  PIN_LIVE_CHAT_MESSAGE_MUTATION,
  DELETE_LIVE_CHAT_MESSAGE_MUTATION,
  LIVE_CHAT_MESSAGE_ADDED_SUB,
} from '@/lib/graphql/live-chat.queries';
import type { LiveChatMessage } from '@/types/live-session.types';

// ── Local interfaces ───────────────────────────────────────────────────────────

interface LiveChatMessagesResult {
  liveChatMessages: {
    messages: LiveChatMessage[];
    pageInfo: { hasNextPage: boolean; hasPreviousPage: boolean; startCursor: string | null; endCursor: string | null };
  } | null;
}

interface LiveChatMessageAddedSubResult {
  liveChatMessageAdded: LiveChatMessage | null;
}

export interface UseLiveChatReturn {
  messages: LiveChatMessage[];
  fetching: boolean;
  sendMessage(content: string, replyToId?: string): Promise<void>;
  pinMessage(messageId: string, pinned: boolean): Promise<void>;
  deleteMessage(messageId: string): Promise<void>;
}

const MAX_MESSAGES = 200;

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useLiveChat(sessionId: string): UseLiveChatReturn {
  const [paused, setPaused] = useState(false);
  const [messages, setMessages] = useState<LiveChatMessage[]>([]);
  const [initialLoaded, setInitialLoaded] = useState(false);

  useEffect(() => {
    setPaused(false);
    return () => { setPaused(true); };
  }, []);

  const [queryResult] = useQuery<LiveChatMessagesResult>({
    query: LIVE_CHAT_MESSAGES_QUERY,
    variables: { sessionId, limit: 50 },
    pause: !sessionId,
  });

  useEffect(() => {
    if (!queryResult.data?.liveChatMessages?.messages || initialLoaded) return;
    setMessages(queryResult.data.liveChatMessages.messages);
    setInitialLoaded(true);
  }, [queryResult.data, initialLoaded]);

  const [subResult] = useSubscription<LiveChatMessageAddedSubResult>({
    query: LIVE_CHAT_MESSAGE_ADDED_SUB,
    variables: { sessionId },
    pause: paused || !sessionId,
  });

  useEffect(() => {
    const incoming = subResult.data?.liveChatMessageAdded;
    if (!incoming) return;
    setMessages((prev) => {
      if (prev.some((m) => m.id === incoming.id)) return prev;
      const appended = [...prev, incoming];
      return appended.length > MAX_MESSAGES ? appended.slice(-MAX_MESSAGES) : appended;
    });
  }, [subResult.data]);

  const [, executeSend] = useMutation(SEND_LIVE_CHAT_MESSAGE_MUTATION);
  const [, executePin] = useMutation(PIN_LIVE_CHAT_MESSAGE_MUTATION);
  const [, executeDelete] = useMutation(DELETE_LIVE_CHAT_MESSAGE_MUTATION);

  const sendMessage = useCallback(async (content: string, replyToId?: string) => {
    await executeSend({ sessionId, content, replyToId: replyToId ?? null });
  }, [sessionId, executeSend]);

  const pinMessage = useCallback(async (messageId: string, pinned: boolean) => {
    await executePin({ sessionId, messageId, pinned });
  }, [sessionId, executePin]);

  const deleteMessage = useCallback(async (messageId: string) => {
    const result = await executeDelete({ sessionId, messageId });
    if (!result.error) {
      setMessages((prev) => prev.filter((m) => m.id !== messageId));
    }
  }, [sessionId, executeDelete]);

  return { messages, fetching: queryResult.fetching, sendMessage, pinMessage, deleteMessage };
}
