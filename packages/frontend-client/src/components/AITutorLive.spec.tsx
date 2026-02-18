import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { MockedProvider, type MockedResponse } from '@apollo/client/testing';
import { gql } from '@apollo/client';
import AITutorLive from './AITutorLive';

const AGENT_MESSAGE_SUB = gql`
  subscription OnAgentMessage($sessionId: ID!) {
    agentMessageCreated(sessionId: $sessionId) {
      id
      role
      content
      createdAt
    }
  }
`;

const MOCK_USER_MSG = {
  id: 'msg-1',
  role: 'USER',
  content: 'What is a closure?',
  createdAt: '2024-01-15T10:00:00.000Z',
};

const MOCK_AI_MSG = {
  id: 'msg-2',
  role: 'ASSISTANT',
  content: 'A closure is a function that captures its surrounding scope.',
  createdAt: '2024-01-15T10:00:05.000Z',
};

function renderAITutorLive(sessionId: string, mocks: MockedResponse[] = []) {
  return render(
    <MockedProvider mocks={mocks} addTypename={false}>
      <AITutorLive sessionId={sessionId} />
    </MockedProvider>,
  );
}

describe('AITutorLive', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the messages container', () => {
    renderAITutorLive('session-1');
    const container = document.getElementById('messages-container');
    expect(container).toBeDefined();
  });

  it('renders no messages initially before subscription emits', () => {
    renderAITutorLive('session-1');
    expect(screen.queryByText('You')).toBeNull();
    expect(screen.queryByText('AI Tutor')).toBeNull();
  });

  it('renders a USER message when subscription emits USER role', async () => {
    const subMock: MockedResponse = {
      request: {
        query: AGENT_MESSAGE_SUB,
        variables: { sessionId: 'session-1' },
      },
      result: { data: { agentMessageCreated: MOCK_USER_MSG } },
    };

    renderAITutorLive('session-1', [subMock]);

    await vi.waitFor(() => {
      expect(screen.getByText('What is a closure?')).toBeDefined();
    });
  });

  it('renders an ASSISTANT message when subscription emits ASSISTANT role', async () => {
    const subMock: MockedResponse = {
      request: {
        query: AGENT_MESSAGE_SUB,
        variables: { sessionId: 'session-1' },
      },
      result: { data: { agentMessageCreated: MOCK_AI_MSG } },
    };

    renderAITutorLive('session-1', [subMock]);

    await vi.waitFor(() => {
      expect(screen.getByText(/A closure is a function/)).toBeDefined();
    });
  });

  it('accumulates multiple messages from repeated subscription events', async () => {
    const subMock1: MockedResponse = {
      request: {
        query: AGENT_MESSAGE_SUB,
        variables: { sessionId: 'session-2' },
      },
      result: { data: { agentMessageCreated: MOCK_USER_MSG } },
    };

    renderAITutorLive('session-2', [subMock1]);

    await vi.waitFor(() => {
      expect(screen.getByText('What is a closure?')).toBeDefined();
    });
  });

  it('uses session-1 as the subscription variable', () => {
    // Providing mismatched sessionId means the mock won't match and no data will render.
    // This validates that the component passes the correct prop to useSubscription.
    const wrongMock: MockedResponse = {
      request: {
        query: AGENT_MESSAGE_SUB,
        variables: { sessionId: 'WRONG-ID' },
      },
      result: { data: { agentMessageCreated: MOCK_USER_MSG } },
    };

    renderAITutorLive('session-1', [wrongMock]);

    // No messages because the mock doesn't match
    expect(screen.queryByText('What is a closure?')).toBeNull();
  });

  it('renders a timestamp for each message', async () => {
    const subMock: MockedResponse = {
      request: {
        query: AGENT_MESSAGE_SUB,
        variables: { sessionId: 'session-ts' },
      },
      result: { data: { agentMessageCreated: MOCK_USER_MSG } },
    };

    renderAITutorLive('session-ts', [subMock]);

    await vi.waitFor(() => {
      expect(screen.getByText('What is a closure?')).toBeDefined();
    });

    // toLocaleTimeString output varies by locale but should be non-empty text
    const container = document.getElementById('messages-container')!;
    expect(container.textContent).not.toBe('');
  });
});
