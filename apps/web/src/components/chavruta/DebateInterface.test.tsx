import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { DebateInterface } from './DebateInterface';
import type { DebateMessage } from '@/hooks/useChavrutaDebate';

// jsdom does not implement scrollIntoView
window.HTMLElement.prototype.scrollIntoView = vi.fn();

const makeMsg = (overrides: Partial<DebateMessage> = {}): DebateMessage => ({
  id: 'msg-1',
  role: 'user',
  content: 'Hello debate world',
  timestamp: new Date('2024-01-01T10:00:00'),
  ...overrides,
});

describe('DebateInterface', () => {
  const defaultProps = {
    topic: 'Does free will exist?',
    messages: [] as DebateMessage[],
    onSubmit: vi.fn().mockResolvedValue(undefined),
    isLoading: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    defaultProps.onSubmit = vi.fn().mockResolvedValue(undefined);
  });

  it('renders the debate topic in the header', () => {
    render(<DebateInterface {...defaultProps} />);
    expect(screen.getByText('Does free will exist?')).toBeInTheDocument();
  });

  it('shows empty state prompt when no messages', () => {
    render(<DebateInterface {...defaultProps} />);
    expect(
      screen.getByText('Present your opening argument to begin the debate.')
    ).toBeInTheDocument();
  });

  it('renders user messages with correct content', () => {
    const messages = [makeMsg({ content: 'My argument is strong' })];
    render(<DebateInterface {...defaultProps} messages={messages} />);
    expect(screen.getByText('My argument is strong')).toBeInTheDocument();
  });

  it('renders AI messages with Chavruta AI label and AI badge', () => {
    const messages = [
      makeMsg({ role: 'ai', content: 'Counter argument here' }),
    ];
    render(<DebateInterface {...defaultProps} messages={messages} />);
    expect(screen.getByText('Chavruta AI')).toBeInTheDocument();
    expect(screen.getByText('Counter argument here')).toBeInTheDocument();
    expect(
      screen.getByLabelText('Generated with AI assistance')
    ).toBeInTheDocument();
  });

  it('shows typing indicator when isLoading is true', () => {
    render(<DebateInterface {...defaultProps} isLoading={true} />);
    expect(screen.getByText('AI is composing a response')).toBeInTheDocument();
  });

  it('submit button is disabled when input is empty', () => {
    render(<DebateInterface {...defaultProps} />);
    const submitBtn = screen.getByRole('button', { name: 'Submit argument' });
    expect(submitBtn).toBeDisabled();
  });

  it('submit button enables when input has text', () => {
    render(<DebateInterface {...defaultProps} />);
    const textarea = screen.getByPlaceholderText(
      'State your argument… (Ctrl+Enter to submit)'
    );
    fireEvent.change(textarea, { target: { value: 'My argument' } });
    const submitBtn = screen.getByRole('button', { name: 'Submit argument' });
    expect(submitBtn).not.toBeDisabled();
  });

  it('calls onSubmit and clears input when send button clicked', async () => {
    render(<DebateInterface {...defaultProps} />);
    const textarea = screen.getByPlaceholderText(
      'State your argument… (Ctrl+Enter to submit)'
    );
    fireEvent.change(textarea, { target: { value: 'My philosophy argument' } });
    fireEvent.click(screen.getByRole('button', { name: 'Submit argument' }));
    await waitFor(() => {
      expect(defaultProps.onSubmit).toHaveBeenCalledWith(
        'My philosophy argument'
      );
    });
  });

  it('Ctrl+Enter submits the argument', async () => {
    render(<DebateInterface {...defaultProps} />);
    const textarea = screen.getByPlaceholderText(
      'State your argument… (Ctrl+Enter to submit)'
    );
    fireEvent.change(textarea, { target: { value: 'Keyboard submit test' } });
    fireEvent.keyDown(textarea, { key: 'Enter', ctrlKey: true });
    await waitFor(() => {
      expect(defaultProps.onSubmit).toHaveBeenCalledWith(
        'Keyboard submit test'
      );
    });
  });

  it('textarea is disabled when isLoading is true', () => {
    render(<DebateInterface {...defaultProps} isLoading={true} />);
    const textarea = screen.getByPlaceholderText(
      'State your argument… (Ctrl+Enter to submit)'
    );
    expect(textarea).toBeDisabled();
  });

  it('displays EU AI Act disclosure text', () => {
    render(<DebateInterface {...defaultProps} />);
    expect(screen.getByText(/EU AI Act Art\. 50/)).toBeInTheDocument();
  });
});
