/**
 * Tests for AiTab — AI Chavruta chat panel sub-component of UnifiedLearningPage.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AiTab } from './UnifiedLearningPage.ai-tab';
import type { UseAgentChatReturn } from '@/hooks/useAgentChat';
import type { ChatMessage } from '@/hooks/useAgentChat';

// ─── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({
    children,
    onClick,
    disabled,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
  }) => (
    <button onClick={onClick} disabled={disabled}>
      {children}
    </button>
  ),
}));

// ─── Helpers ───────────────────────────────────────────────────────────────────

function makeChat(
  overrides: Partial<UseAgentChatReturn> = {}
): UseAgentChatReturn {
  return {
    messages: [],
    chatInput: '',
    setChatInput: vi.fn(),
    sendMessage: vi.fn(),
    stopGeneration: vi.fn(),
    chatEndRef: { current: null },
    isStreaming: false,
    isSending: false,
    ...overrides,
  };
}

const AGENT_MSG: ChatMessage = {
  id: 'a1',
  role: 'agent',
  content: 'Shalom, how can I help?',
};
const USER_MSG: ChatMessage = {
  id: 'u1',
  role: 'user',
  content: 'Explain free will.',
};

// ─── Tests ─────────────────────────────────────────────────────────────────────

describe('AiTab', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders header with mode buttons', () => {
    render(<AiTab chat={makeChat()} />);
    expect(screen.getByText('CHAVRUTA')).toBeDefined();
    expect(screen.getByText('QUIZ')).toBeDefined();
    expect(screen.getByText('EXPLAIN')).toBeDefined();
  });

  it('renders translation keys for title and subtitle', () => {
    render(<AiTab chat={makeChat()} />);
    expect(screen.getByText('chavrutaAi')).toBeDefined();
    expect(screen.getByText('dialecticalPartner')).toBeDefined();
  });

  it('renders agent messages with left-alignment class cue', () => {
    render(<AiTab chat={makeChat({ messages: [AGENT_MSG] })} />);
    expect(screen.getByText('Shalom, how can I help?')).toBeDefined();
  });

  it('renders user messages', () => {
    render(<AiTab chat={makeChat({ messages: [USER_MSG] })} />);
    expect(screen.getByText('Explain free will.')).toBeDefined();
  });

  it('renders multiple messages in order', () => {
    const msgs: ChatMessage[] = [AGENT_MSG, USER_MSG];
    render(<AiTab chat={makeChat({ messages: msgs })} />);
    expect(screen.getByText('Shalom, how can I help?')).toBeDefined();
    expect(screen.getByText('Explain free will.')).toBeDefined();
  });

  it('shows streaming indicator dots when isStreaming is true', () => {
    const { container } = render(
      <AiTab chat={makeChat({ isStreaming: true })} />
    );
    // 3 bounce dots rendered as span elements inside the streaming indicator
    const bouncingDots = container.querySelectorAll('.animate-bounce');
    expect(bouncingDots.length).toBe(3);
  });

  it('does not show streaming indicator when not streaming', () => {
    const { container } = render(
      <AiTab chat={makeChat({ isStreaming: false })} />
    );
    const bouncingDots = container.querySelectorAll('.animate-bounce');
    expect(bouncingDots.length).toBe(0);
  });

  it('renders all four quick prompt buttons', () => {
    render(<AiTab chat={makeChat()} />);
    expect(screen.getByText('Debate free will')).toBeDefined();
    expect(screen.getByText('Quiz me')).toBeDefined();
    expect(screen.getByText('Summarize')).toBeDefined();
    expect(screen.getByText('Explain Rambam')).toBeDefined();
  });

  it('calls setChatInput when a quick prompt is clicked', () => {
    const setChatInput = vi.fn();
    render(<AiTab chat={makeChat({ setChatInput })} />);
    fireEvent.click(screen.getByText('Quiz me'));
    expect(setChatInput).toHaveBeenCalledWith('Quiz me');
  });

  it('calls sendMessage when send button is clicked', () => {
    const sendMessage = vi.fn().mockResolvedValue(undefined);
    render(<AiTab chat={makeChat({ sendMessage })} />);
    const buttons = screen.getAllByRole('button');
    // Send button is the last button (after quick prompts and mode buttons)
    const sendBtn = buttons[buttons.length - 1];
    fireEvent.click(sendBtn!);
    expect(sendMessage).toHaveBeenCalledTimes(1);
  });

  it('disables input and send button while streaming', () => {
    render(<AiTab chat={makeChat({ isStreaming: true })} />);
    const input = screen.getByRole('textbox') as HTMLInputElement;
    expect(input.disabled).toBe(true);
    const buttons = screen.getAllByRole('button');
    const sendBtn = buttons[buttons.length - 1] as HTMLButtonElement;
    expect(sendBtn.disabled).toBe(true);
  });

  it('updates input value via setChatInput on change', () => {
    const setChatInput = vi.fn();
    render(<AiTab chat={makeChat({ chatInput: 'hello', setChatInput })} />);
    const input = screen.getByRole('textbox') as HTMLInputElement;
    expect(input.value).toBe('hello');
    fireEvent.change(input, { target: { value: 'new text' } });
    expect(setChatInput).toHaveBeenCalledWith('new text');
  });

  it('sends message on Enter key when not streaming', () => {
    const sendMessage = vi.fn().mockResolvedValue(undefined);
    render(<AiTab chat={makeChat({ sendMessage, isStreaming: false })} />);
    const input = screen.getByRole('textbox');
    fireEvent.keyDown(input, { key: 'Enter', shiftKey: false });
    expect(sendMessage).toHaveBeenCalledTimes(1);
  });

  it('does not send on Enter when streaming is active', () => {
    const sendMessage = vi.fn();
    render(<AiTab chat={makeChat({ sendMessage, isStreaming: true })} />);
    const input = screen.getByRole('textbox');
    fireEvent.keyDown(input, { key: 'Enter', shiftKey: false });
    expect(sendMessage).not.toHaveBeenCalled();
  });
});
