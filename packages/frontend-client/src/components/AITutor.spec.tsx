import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MockedProvider, type MockedResponse } from '@apollo/client/testing';
import { gql } from '@apollo/client';
import AITutor from './AITutor';

const CREATE_SESSION = gql`
  mutation CreateSession($userId: ID!) {
    createAgentSession(
      input: {
        userId: $userId
        agentType: "TUTOR"
        context: "{}"
        tenantId: "00000000-0000-0000-0000-000000000001"
      }
    ) {
      id
      agentType
      status
    }
  }
`;

const SEND_MESSAGE = gql`
  mutation SendMessage($sessionId: ID!, $content: String!) {
    createAgentMessage(
      input: {
        sessionId: $sessionId
        role: "USER"
        content: $content
        tenantId: "00000000-0000-0000-0000-000000000001"
      }
    ) {
      id
      role
      content
      createdAt
    }
  }
`;

const GET_MESSAGES = gql`
  query GetMessages($sessionId: ID!) {
    agentMessages(sessionId: $sessionId) {
      id
      role
      content
      createdAt
    }
  }
`;

const MOCK_SESSION = {
  id: 'session-1',
  agentType: 'TUTOR',
  status: 'ACTIVE',
};

const MOCK_MESSAGES = [
  {
    id: 'msg-1',
    role: 'USER',
    content: 'Hello, tutor!',
    createdAt: '2024-01-15T10:00:00.000Z',
  },
  {
    id: 'msg-2',
    role: 'ASSISTANT',
    content: 'Hello! How can I help you?',
    createdAt: '2024-01-15T10:00:05.000Z',
  },
];

function renderAITutor(mocks: MockedResponse[] = []) {
  return render(
    <MockedProvider mocks={mocks} addTypename={false}>
      <AITutor />
    </MockedProvider>,
  );
}

describe('AITutor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the AI Tutor heading', () => {
    renderAITutor();
    expect(screen.getByRole('heading', { level: 2 })).toBeDefined();
  });

  it('shows "Start New Session" button when no session is active', () => {
    renderAITutor();
    expect(screen.getByRole('button', { name: /Start New Session/i })).toBeDefined();
  });

  it('shows prompt text before session starts', () => {
    renderAITutor();
    expect(screen.getByText(/Start a conversation with your AI tutor/i)).toBeDefined();
  });

  it('calls createAgentSession mutation when "Start New Session" is clicked', async () => {
    const sessionMock: MockedResponse = {
      request: {
        query: CREATE_SESSION,
        variables: { userId: 'current-user-id' },
      },
      result: { data: { createAgentSession: MOCK_SESSION } },
    };

    renderAITutor([sessionMock]);

    const button = screen.getByRole('button', { name: /Start New Session/i });
    fireEvent.click(button);

    // After the mutation resolves, the chat UI should appear
    await vi.waitFor(() => {
      expect(screen.queryByRole('button', { name: /Start New Session/i })).toBeNull();
    });
  });

  it('renders the message input and Send button after session starts', async () => {
    const sessionMock: MockedResponse = {
      request: {
        query: CREATE_SESSION,
        variables: { userId: 'current-user-id' },
      },
      result: { data: { createAgentSession: MOCK_SESSION } },
    };

    const messagesMock: MockedResponse = {
      request: {
        query: GET_MESSAGES,
        variables: { sessionId: 'session-1' },
      },
      result: { data: { agentMessages: [] } },
    };

    renderAITutor([sessionMock, messagesMock]);

    fireEvent.click(screen.getByRole('button', { name: /Start New Session/i }));

    await vi.waitFor(() => {
      expect(screen.getByPlaceholderText(/Ask a question/i)).toBeDefined();
    });

    expect(screen.getByRole('button', { name: /Send/i })).toBeDefined();
  });

  it('clears the message input after sending', async () => {
    const sessionMock: MockedResponse = {
      request: {
        query: CREATE_SESSION,
        variables: { userId: 'current-user-id' },
      },
      result: { data: { createAgentSession: MOCK_SESSION } },
    };

    const messagesMock: MockedResponse = {
      request: {
        query: GET_MESSAGES,
        variables: { sessionId: 'session-1' },
      },
      result: { data: { agentMessages: [] } },
    };

    const sendMock: MockedResponse = {
      request: {
        query: SEND_MESSAGE,
        variables: { sessionId: 'session-1', content: 'What is recursion?' },
      },
      result: { data: { createAgentMessage: MOCK_MESSAGES[0] } },
    };

    renderAITutor([sessionMock, messagesMock, sendMock]);

    fireEvent.click(screen.getByRole('button', { name: /Start New Session/i }));

    await vi.waitFor(() => {
      expect(screen.getByPlaceholderText(/Ask a question/i)).toBeDefined();
    });

    const input = screen.getByPlaceholderText(/Ask a question/i) as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'What is recursion?' } });
    expect(input.value).toBe('What is recursion?');

    const form = input.closest('form')!;
    fireEvent.submit(form);

    await vi.waitFor(() => {
      expect(input.value).toBe('');
    });
  });

  it('does not send if message is empty', async () => {
    const sessionMock: MockedResponse = {
      request: {
        query: CREATE_SESSION,
        variables: { userId: 'current-user-id' },
      },
      result: { data: { createAgentSession: MOCK_SESSION } },
    };

    const messagesMock: MockedResponse = {
      request: {
        query: GET_MESSAGES,
        variables: { sessionId: 'session-1' },
      },
      result: { data: { agentMessages: [] } },
    };

    // No send mock — if sendMessage were called it would fail
    renderAITutor([sessionMock, messagesMock]);

    fireEvent.click(screen.getByRole('button', { name: /Start New Session/i }));

    await vi.waitFor(() => {
      expect(screen.getByPlaceholderText(/Ask a question/i)).toBeDefined();
    });

    const form = screen.getByPlaceholderText(/Ask a question/i).closest('form')!;
    fireEvent.submit(form);
    // No error thrown = test passes
  });

  it('renders previous messages when agentMessages returns data', async () => {
    const sessionMock: MockedResponse = {
      request: {
        query: CREATE_SESSION,
        variables: { userId: 'current-user-id' },
      },
      result: { data: { createAgentSession: MOCK_SESSION } },
    };

    const messagesMock: MockedResponse = {
      request: {
        query: GET_MESSAGES,
        variables: { sessionId: 'session-1' },
      },
      result: { data: { agentMessages: MOCK_MESSAGES } },
    };

    renderAITutor([sessionMock, messagesMock]);

    fireEvent.click(screen.getByRole('button', { name: /Start New Session/i }));

    await vi.waitFor(() => {
      expect(screen.getByText('Hello, tutor!')).toBeDefined();
    });

    expect(screen.getByText('Hello! How can I help you?')).toBeDefined();
  });
});
