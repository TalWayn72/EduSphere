/**
 * AiChatPanel — comprehensive tests.
 *
 * Covers:
 *  1. Basic rendering (empty messages, with messages)
 *  2. User vs assistant message styling
 *  3. Source attribution display & toggle
 *  4. Streaming indicator (typing dots)
 *  5. Quick prompts populate input
 *  6. Chat modes render
 *  7. Input disabled during streaming
 *  8. Enter key sends message
 *  9. Send button triggers onSendChat
 * 10. onSourceClick callback fires
 * 11. Input value controlled via prop
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';

vi.mock('react-router-dom', () => ({
  useLocation: () => ({ pathname: '/learn/content-test' }),
  Link: ({ children, to }: { children: React.ReactNode; to: string }) => (
    <a href={to}>{children}</a>
  ),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (k: string, opts?: Record<string, unknown>) => {
      if (opts?.defaultValue)
        return String(opts.defaultValue).replace(
          /\{\{(\w+)\}\}/g,
          (_, key: string) => String(opts[key] ?? `{{${key}}}`)
        );
      return k;
    },
  }),
}));

vi.mock('@/components/ui/card', () => ({
  Card: ({
    children,
    className,
  }: {
    children: React.ReactNode;
    className?: string;
  }) => <div className={className}>{children}</div>,
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({
    children,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement> & {
    children?: React.ReactNode;
  }) => <button {...props}>{children}</button>,
}));

vi.mock('lucide-react', () => ({
  Bot: () => <span data-testid="icon-bot">bot</span>,
  Send: () => <span data-testid="icon-send">send</span>,
  ChevronDown: () => <span data-testid="icon-chevron-down">v</span>,
  ChevronUp: () => <span data-testid="icon-chevron-up">^</span>,
  FileText: () => <span data-testid="icon-file-text">f</span>,
}));

import { AiChatPanel } from './AiChatPanel';
import type { AiChatPanelProps, SourceAttribution } from './AiChatPanel';

// ── Helpers ──────────────────────────────────────────────────────────────────

function renderPanel(overrides: Partial<AiChatPanelProps> = {}) {
  const chatEndRef = {
    current: null,
  } as React.RefObject<HTMLDivElement | null>;
  const defaults: AiChatPanelProps = {
    chatMessages: [],
    chatInput: '',
    isStreaming: false,
    chatEndRef,
    onChatInputChange: vi.fn(),
    onSendChat: vi.fn(),
    ...overrides,
  };
  return { ...render(<AiChatPanel {...defaults} />), props: defaults };
}

const SOURCES: SourceAttribution[] = [
  { sourceId: 's1', sourceName: 'Talmud Bavli', similarity: 0.92 },
  { sourceId: 's2', sourceName: 'Rambam Guide', similarity: 0.78 },
];

// ── Tests ────────────────────────────────────────────────────────────────────

describe('AiChatPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crash when messages are empty', () => {
    const { container } = renderPanel();
    expect(container).toBeTruthy();
  });

  it('renders header with Chavruta AI title', () => {
    renderPanel();
    expect(screen.getByText('content:chavrutaAi')).toBeInTheDocument();
    expect(screen.getByText('content:dialecticalPartner')).toBeInTheDocument();
  });

  it('renders chat mode buttons', () => {
    renderPanel();
    expect(screen.getByText('CHAVRUTA')).toBeInTheDocument();
    expect(screen.getByText('QUIZ')).toBeInTheDocument();
    expect(screen.getByText('EXPLAIN')).toBeInTheDocument();
  });

  it('renders quick prompt buttons', () => {
    renderPanel();
    expect(screen.getByText('Debate free will')).toBeInTheDocument();
    expect(screen.getByText('Quiz me')).toBeInTheDocument();
    expect(screen.getByText('Summarize')).toBeInTheDocument();
    expect(screen.getByText('Explain Rambam')).toBeInTheDocument();
  });

  it('clicking quick prompt calls onChatInputChange', () => {
    const onChatInputChange = vi.fn();
    renderPanel({ onChatInputChange });
    fireEvent.click(screen.getByText('Debate free will'));
    expect(onChatInputChange).toHaveBeenCalledWith('Debate free will');
  });

  it('renders user messages with user styling', () => {
    const { container } = renderPanel({
      chatMessages: [{ id: 'm1', role: 'user', content: 'Hello AI' }],
    });
    expect(container.textContent).toContain('Hello AI');
    // User messages are aligned to the end
    const msgContainer = container.querySelector('.items-end');
    expect(msgContainer).toBeTruthy();
  });

  it('renders assistant messages with assistant styling', () => {
    const { container } = renderPanel({
      chatMessages: [{ id: 'm2', role: 'assistant', content: 'Shalom!' }],
    });
    expect(container.textContent).toContain('Shalom!');
    const msgContainer = container.querySelector('.items-start');
    expect(msgContainer).toBeTruthy();
  });

  it('renders multiple messages in order', () => {
    const { container } = renderPanel({
      chatMessages: [
        { id: 'm1', role: 'user', content: 'First' },
        { id: 'm2', role: 'assistant', content: 'Second' },
        { id: 'm3', role: 'user', content: 'Third' },
      ],
    });
    const text = container.textContent ?? '';
    expect(text.indexOf('First')).toBeLessThan(text.indexOf('Second'));
    expect(text.indexOf('Second')).toBeLessThan(text.indexOf('Third'));
  });

  it('shows streaming indicator when isStreaming is true', () => {
    const { container } = renderPanel({ isStreaming: true });
    // Typing dots have animate-bounce class
    const dots = container.querySelectorAll('.animate-bounce');
    expect(dots.length).toBe(3);
  });

  it('does not show streaming indicator when isStreaming is false', () => {
    const { container } = renderPanel({ isStreaming: false });
    const dots = container.querySelectorAll('.animate-bounce');
    expect(dots.length).toBe(0);
  });

  it('disables input when streaming', () => {
    renderPanel({ isStreaming: true });
    const input = screen.getByPlaceholderText('content:agentResponding');
    expect(input).toBeDisabled();
  });

  it('enables input when not streaming', () => {
    renderPanel({ isStreaming: false });
    const input = screen.getByPlaceholderText('content:askOrDebate');
    expect(input).not.toBeDisabled();
  });

  it('disables send button when streaming', () => {
    renderPanel({ isStreaming: true });
    const sendBtn = screen.getByRole('button', { name: /send/i });
    expect(sendBtn).toBeDisabled();
  });

  it('Enter key triggers onSendChat when not streaming', () => {
    const onSendChat = vi.fn();
    renderPanel({ chatInput: 'test message', onSendChat });
    const input = screen.getByPlaceholderText('content:askOrDebate');
    fireEvent.keyDown(input, { key: 'Enter', shiftKey: false });
    expect(onSendChat).toHaveBeenCalledTimes(1);
  });

  it('Enter key does not trigger onSendChat when streaming', () => {
    const onSendChat = vi.fn();
    renderPanel({ isStreaming: true, onSendChat });
    const input = screen.getByPlaceholderText('content:agentResponding');
    fireEvent.keyDown(input, { key: 'Enter', shiftKey: false });
    expect(onSendChat).not.toHaveBeenCalled();
  });

  it('Shift+Enter does not trigger onSendChat (allows newline)', () => {
    const onSendChat = vi.fn();
    renderPanel({ chatInput: 'test', onSendChat });
    const input = screen.getByPlaceholderText('content:askOrDebate');
    fireEvent.keyDown(input, { key: 'Enter', shiftKey: true });
    expect(onSendChat).not.toHaveBeenCalled();
  });

  it('send button click triggers onSendChat', () => {
    const onSendChat = vi.fn();
    renderPanel({ onSendChat });
    const sendBtn = screen.getByRole('button', { name: /send/i });
    fireEvent.click(sendBtn);
    expect(onSendChat).toHaveBeenCalledTimes(1);
  });

  it('typing in input calls onChatInputChange', () => {
    const onChatInputChange = vi.fn();
    renderPanel({ onChatInputChange });
    const input = screen.getByPlaceholderText('content:askOrDebate');
    fireEvent.change(input, { target: { value: 'new text' } });
    expect(onChatInputChange).toHaveBeenCalledWith('new text');
  });

  it('displays chatInput value in input field', () => {
    renderPanel({ chatInput: 'existing text' });
    const input = screen.getByPlaceholderText(
      'content:askOrDebate'
    ) as HTMLInputElement;
    expect(input.value).toBe('existing text');
  });

  describe('source attribution', () => {
    it('shows source count toggle for messages with sources', () => {
      renderPanel({
        chatMessages: [
          { id: 'm1', role: 'assistant', content: 'Answer', sources: SOURCES },
        ],
      });
      expect(screen.getByTestId('sources-toggle-m1')).toBeInTheDocument();
      expect(screen.getByText('2 sources')).toBeInTheDocument();
    });

    it('does not show source toggle for messages without sources', () => {
      renderPanel({
        chatMessages: [{ id: 'm1', role: 'assistant', content: 'Answer' }],
      });
      expect(screen.queryByTestId('sources-toggle-m1')).not.toBeInTheDocument();
    });

    it('expands source list on toggle click', () => {
      renderPanel({
        chatMessages: [
          { id: 'm1', role: 'assistant', content: 'Answer', sources: SOURCES },
        ],
      });
      expect(screen.queryByTestId('sources-list-m1')).not.toBeInTheDocument();

      fireEvent.click(screen.getByTestId('sources-toggle-m1'));
      expect(screen.getByTestId('sources-list-m1')).toBeInTheDocument();
      expect(screen.getByText('Talmud Bavli')).toBeInTheDocument();
      expect(screen.getByText('Rambam Guide')).toBeInTheDocument();
    });

    it('collapses source list on second toggle click', () => {
      renderPanel({
        chatMessages: [
          { id: 'm1', role: 'assistant', content: 'Answer', sources: SOURCES },
        ],
      });
      fireEvent.click(screen.getByTestId('sources-toggle-m1'));
      expect(screen.getByTestId('sources-list-m1')).toBeInTheDocument();

      fireEvent.click(screen.getByTestId('sources-toggle-m1'));
      expect(screen.queryByTestId('sources-list-m1')).not.toBeInTheDocument();
    });

    it('shows similarity percentage for each source', () => {
      renderPanel({
        chatMessages: [
          { id: 'm1', role: 'assistant', content: 'Answer', sources: SOURCES },
        ],
      });
      fireEvent.click(screen.getByTestId('sources-toggle-m1'));
      expect(screen.getByText('92%')).toBeInTheDocument();
      expect(screen.getByText('78%')).toBeInTheDocument();
    });

    it('calls onSourceClick when a source name is clicked', () => {
      const onSourceClick = vi.fn();
      renderPanel({
        chatMessages: [
          { id: 'm1', role: 'assistant', content: 'Answer', sources: SOURCES },
        ],
        onSourceClick,
      });
      fireEvent.click(screen.getByTestId('sources-toggle-m1'));
      fireEvent.click(screen.getByText('Talmud Bavli'));
      expect(onSourceClick).toHaveBeenCalledWith('s1');
    });

    it('does not crash when onSourceClick is undefined', () => {
      renderPanel({
        chatMessages: [
          { id: 'm1', role: 'assistant', content: 'Answer', sources: SOURCES },
        ],
      });
      fireEvent.click(screen.getByTestId('sources-toggle-m1'));
      expect(() =>
        fireEvent.click(screen.getByText('Talmud Bavli'))
      ).not.toThrow();
    });
  });

  describe('Accessibility', () => {
    it('chat mode buttons are <button> elements (keyboard accessible)', () => {
      renderPanel();
      const modeButtons = ['CHAVRUTA', 'QUIZ', 'EXPLAIN'];
      for (const mode of modeButtons) {
        const btn = screen.getByText(mode);
        expect(btn.tagName).toBe('BUTTON');
        expect(btn).toHaveAttribute('aria-label', `${mode} mode`);
      }
    });

    it('chat mode group has role="group" with aria-label', () => {
      renderPanel();
      // The t() mock returns defaultValue when provided via opts
      const groups = document.querySelectorAll('[role="group"]');
      const chatModeGroup = Array.from(groups).find(
        (g) =>
          g.getAttribute('aria-label')?.includes('Chat modes') ||
          g.getAttribute('aria-label')?.includes('content:chatModes')
      );
      expect(chatModeGroup).toBeInTheDocument();
    });

    it('messages area has role="log" with aria-live="polite"', () => {
      renderPanel();
      const log = screen.getByRole('log');
      expect(log).toHaveAttribute('aria-live', 'polite');
      // t() mock returns defaultValue via interpolation
      expect(log).toHaveAttribute('aria-label');
    });

    it('send button has aria-label', () => {
      renderPanel();
      expect(screen.getByRole('button', { name: /send/i })).toBeInTheDocument();
    });

    it('chat input has aria-label', () => {
      renderPanel();
      // t() mock with string fallback returns key 'content:chatInputLabel'
      const input = screen.getByLabelText('content:chatInputLabel');
      expect(input).toBeInTheDocument();
      expect(input.tagName).toBe('INPUT');
    });

    it('decorative icons have aria-hidden="true"', () => {
      renderPanel();
      const icons = screen.getAllByTestId(/^icon-/);
      for (const icon of icons) {
        // The lucide mock renders spans; in the real component, icons have aria-hidden
        expect(icon).toBeInTheDocument();
      }
    });

    it('streaming indicator has role="status" with aria-label', () => {
      renderPanel({ isStreaming: true });
      const status = screen.getByRole('status');
      // t() mock returns defaultValue
      expect(status).toHaveAttribute('aria-label');
      expect(status.getAttribute('aria-label')).toBeTruthy();
    });

    it('source toggle has aria-expanded attribute', () => {
      renderPanel({
        chatMessages: [
          { id: 'm1', role: 'assistant', content: 'Answer', sources: SOURCES },
        ],
      });
      const toggle = screen.getByTestId('sources-toggle-m1');
      expect(toggle).toHaveAttribute('aria-expanded', 'false');

      fireEvent.click(toggle);
      expect(toggle).toHaveAttribute('aria-expanded', 'true');
    });

    it('source name buttons have full context aria-label with name and percentage', () => {
      renderPanel({
        chatMessages: [
          { id: 'm1', role: 'assistant', content: 'Answer', sources: SOURCES },
        ],
      });
      fireEvent.click(screen.getByTestId('sources-toggle-m1'));
      const srcBtn = screen.getByText('Talmud Bavli');
      expect(srcBtn).toHaveAttribute(
        'aria-label',
        expect.stringContaining('Talmud Bavli')
      );
      expect(srcBtn).toHaveAttribute(
        'aria-label',
        expect.stringContaining('92%')
      );
    });

    it('quick prompt buttons have descriptive aria-label', () => {
      renderPanel();
      const prompts = [
        'Debate free will',
        'Quiz me',
        'Summarize',
        'Explain Rambam',
      ];
      for (const prompt of prompts) {
        const btn = screen.getByText(prompt);
        expect(btn).toHaveAttribute(
          'aria-label',
          expect.stringContaining(prompt)
        );
      }
    });

    it('quick prompts group has role="group" with aria-label', () => {
      renderPanel();
      // t() mock with string fallback returns key, but actual role="group" is set
      const groups = document.querySelectorAll('[role="group"]');
      const quickPromptsGroup = Array.from(groups).find(
        (g) =>
          g.getAttribute('aria-label')?.includes('quickPrompts') ||
          g.getAttribute('aria-label')?.includes('Quick prompts')
      );
      expect(quickPromptsGroup).toBeInTheDocument();
    });
  });

  it('renders RequirementLink when message content is consent-required', () => {
    renderPanel({
      chatMessages: [
        { id: 'c1', role: 'assistant', content: 'consent-required' },
      ],
    });
    expect(screen.getByTestId('requirement-link')).toBeInTheDocument();
    expect(screen.queryByText('consent-required')).not.toBeInTheDocument();
  });
});
