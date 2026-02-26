/**
 * AIChatScreen tests
 */
import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// --- Apollo mock -----------------------------------------------------------
const mockUseMutation = vi.fn();
vi.mock('@apollo/client', () => ({
  useMutation: (...args: unknown[]) => mockUseMutation(...args),
  gql: (s: TemplateStringsArray) => s.join(''),
}));

// --- Navigation mock -------------------------------------------------------
vi.mock('../navigation', () => ({ default: {} }));

import AIChatScreen from './AIChatScreen';

const MOCK_ROUTE = {
  params: { sessionId: 'session-abc' },
  key: 'AIChat',
  name: 'AIChat' as const,
};
const MOCK_NAV = {} as any;

const AI_RESPONSE = {
  id: 'msg-ai-1',
  role: 'ASSISTANT',
  content: 'Hello! How can I help you?',
  createdAt: new Date().toISOString(),
};

let mockMutateFn: ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.clearAllMocks();
  mockMutateFn = vi
    .fn()
    .mockResolvedValue({ data: { sendMessage: AI_RESPONSE } });
  mockUseMutation.mockReturnValue([mockMutateFn, { loading: false }]);
});

describe('AIChatScreen', () => {
  it('renders empty chat state', () => {
    const { getByTestId } = render(
      <AIChatScreen route={MOCK_ROUTE as any} navigation={MOCK_NAV} />
    );
    expect(getByTestId('chat-message-list')).toBeTruthy();
  });

  it('renders message bubbles after receiving response', async () => {
    const { getByTestId, findByText } = render(
      <AIChatScreen route={MOCK_ROUTE as any} navigation={MOCK_NAV} />
    );

    const input = getByTestId('chat-input');
    fireEvent.changeText(input, 'What is GraphQL?');
    const sendBtn = getByTestId('send-button');

    await act(async () => {
      fireEvent.press(sendBtn);
    });

    expect(await findByText('What is GraphQL?')).toBeTruthy();
    expect(await findByText('Hello! How can I help you?')).toBeTruthy();
  });

  it('send button triggers mutation', async () => {
    const { getByTestId } = render(
      <AIChatScreen route={MOCK_ROUTE as any} navigation={MOCK_NAV} />
    );

    fireEvent.changeText(getByTestId('chat-input'), 'Test message');

    await act(async () => {
      fireEvent.press(getByTestId('send-button'));
    });

    expect(mockMutateFn).toHaveBeenCalledWith({
      variables: { sessionId: 'session-abc', content: 'Test message' },
    });
  });

  it('typing indicator shows during loading', async () => {
    // Mutation that doesn't resolve immediately
    let resolveMutation: (v: unknown) => void;
    const pendingPromise = new Promise((resolve) => {
      resolveMutation = resolve;
    });
    mockMutateFn = vi.fn().mockReturnValue(pendingPromise);
    mockUseMutation.mockReturnValue([mockMutateFn, { loading: false }]);

    const { getByTestId, findByTestId } = render(
      <AIChatScreen route={MOCK_ROUTE as any} navigation={MOCK_NAV} />
    );

    fireEvent.changeText(getByTestId('chat-input'), 'Hello');

    await act(async () => {
      fireEvent.press(getByTestId('send-button'));
    });

    const indicator = await findByTestId('typing-indicator');
    expect(indicator).toBeTruthy();

    // Clean up — resolve the pending mutation
    await act(async () => {
      resolveMutation!({ data: { sendMessage: AI_RESPONSE } });
    });
  });
});
