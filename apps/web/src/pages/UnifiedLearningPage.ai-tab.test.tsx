/**
 * Tests for AiTab — AI chat panel with selectable modes.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AiTab } from './UnifiedLearningPage.ai-tab';
import type { UseAgentChatReturn } from '@/hooks/useAgentChat';
import type { ChatMessage } from '@/hooks/useAgentChat';

// ─── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('react-router-dom', () => ({
  useLocation: () => ({ pathname: '/learn/test-lesson' }),
  Link: ({ children, to }: { children: React.ReactNode; to: string }) => (
    <a href={to}>{children}</a>
  ),
}));

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
    mode: 'CHAVRUTA',
    setMode: vi.fn(),
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

  it('renders CHAVRUTA quick prompt buttons by default', () => {
    render(<AiTab chat={makeChat()} />);
    expect(screen.getByText('Debate free will')).toBeDefined();
    expect(screen.getByText('Challenge this idea')).toBeDefined();
    expect(screen.getByText('Present a counter-argument')).toBeDefined();
    expect(screen.getByText('Prove from sources')).toBeDefined();
  });

  it('calls setChatInput when a quick prompt is clicked', () => {
    const setChatInput = vi.fn();
    render(<AiTab chat={makeChat({ setChatInput })} />);
    fireEvent.click(screen.getByText('Debate free will'));
    expect(setChatInput).toHaveBeenCalledWith('Debate free will');
  });

  it('calls sendMessage when send button is clicked', () => {
    const sendMessage = vi.fn().mockResolvedValue(undefined);
    render(<AiTab chat={makeChat({ sendMessage })} />);
    const buttons = screen.getAllByRole('button');
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

  it('renders RequirementLink when message content is consent-required', () => {
    const consentMsg: ChatMessage = {
      id: 'c1',
      role: 'agent',
      content: 'consent-required',
    };
    render(<AiTab chat={makeChat({ messages: [consentMsg] })} />);
    expect(screen.getByTestId('requirement-link')).toBeInTheDocument();
    expect(screen.queryByText('consent-required')).not.toBeInTheDocument();
  });

  it('CHAVRUTA mode button has active styling by default', () => {
    render(<AiTab chat={makeChat({ mode: 'CHAVRUTA' })} />);
    const btn = screen.getByText('CHAVRUTA').closest('button');
    expect(btn?.className).toContain('bg-primary');
  });

  it('clicking QUIZ mode calls setMode with QUIZ', () => {
    const setMode = vi.fn();
    render(<AiTab chat={makeChat({ setMode })} />);
    fireEvent.click(screen.getByText('QUIZ'));
    expect(setMode).toHaveBeenCalledWith('QUIZ');
  });

  it('clicking EXPLAIN mode calls setMode with EXPLAIN', () => {
    const setMode = vi.fn();
    render(<AiTab chat={makeChat({ setMode })} />);
    fireEvent.click(screen.getByText('EXPLAIN'));
    expect(setMode).toHaveBeenCalledWith('EXPLAIN');
  });

  it('switching to QUIZ mode shows quiz-specific quick prompts', () => {
    render(<AiTab chat={makeChat()} />);
    fireEvent.click(screen.getByText('QUIZ'));
    expect(screen.getByText('Start quiz')).toBeDefined();
    expect(screen.getByText('Next question')).toBeDefined();
    expect(screen.getByText('Give me a hint')).toBeDefined();
    expect(screen.getByText('Explain the answer')).toBeDefined();
  });

  it('switching to EXPLAIN mode shows explain-specific quick prompts', () => {
    render(<AiTab chat={makeChat()} />);
    fireEvent.click(screen.getByText('EXPLAIN'));
    expect(screen.getByText('Explain simply')).toBeDefined();
    expect(screen.getByText('Give an example')).toBeDefined();
    expect(screen.getByText('Why is this important?')).toBeDefined();
    expect(screen.getByText('Connect to real life')).toBeDefined();
  });

  it('quick prompts change when mode changes from CHAVRUTA to QUIZ', () => {
    render(<AiTab chat={makeChat()} />);
    // Initially CHAVRUTA prompts visible
    expect(screen.getByText('Debate free will')).toBeDefined();
    // Switch to QUIZ
    fireEvent.click(screen.getByText('QUIZ'));
    // CHAVRUTA prompt gone, QUIZ prompt present
    expect(screen.queryByText('Debate free will')).toBeNull();
    expect(screen.getByText('Start quiz')).toBeDefined();
  });
});
