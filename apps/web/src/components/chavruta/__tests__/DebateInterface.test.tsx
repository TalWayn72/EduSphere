/**
 * DebateInterface unit tests
 *
 * Verifies rendering, alignment, form submission, loading state,
 * and the EU AI Act Art.50 AI disclosure badge on AI messages.
 */
import { describe, it, expect, vi, beforeAll } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DebateInterface } from '../DebateInterface';
import type { DebateMessage } from '@/hooks/useChavrutaDebate';

// scrollIntoView is not implemented in jsdom
beforeAll(() => {
  window.HTMLElement.prototype.scrollIntoView = vi.fn();
});

// ── Fixtures ──────────────────────────────────────────────────────────────────

const TOPIC = 'Does free will exist in a deterministic universe?';

const makeMessages = (): DebateMessage[] => [
  {
    id: '1',
    role: 'user',
    content: 'Free will is an illusion.',
    timestamp: new Date('2026-02-22T10:00:00Z'),
  },
  {
    id: '2',
    role: 'ai',
    content: 'Interesting! But consider Rambam…',
    timestamp: new Date('2026-02-22T10:00:05Z'),
  },
];

const noop = vi.fn().mockResolvedValue(undefined);

// ── Helper ────────────────────────────────────────────────────────────────────

function renderInterface(
  overrides: Partial<{
    messages: DebateMessage[];
    isLoading: boolean;
    onSubmit: () => Promise<void>;
  }> = {}
) {
  return render(
    <DebateInterface
      topic={TOPIC}
      messages={overrides.messages ?? makeMessages()}
      onSubmit={overrides.onSubmit ?? noop}
      isLoading={overrides.isLoading ?? false}
    />
  );
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('DebateInterface', () => {
  it('renders the debate topic in the header', () => {
    renderInterface();
    expect(screen.getByText(TOPIC)).toBeInTheDocument();
  });

  it('renders user message text', () => {
    renderInterface();
    expect(screen.getByText('Free will is an illusion.')).toBeInTheDocument();
  });

  it('renders AI message text', () => {
    renderInterface();
    expect(
      screen.getByText('Interesting! But consider Rambam…')
    ).toBeInTheDocument();
  });

  it('user messages are right-aligned (justify-end wrapper)', () => {
    renderInterface();
    // The outermost bubble wrapper for user messages has `justify-end`
    const userText = screen.getByText('Free will is an illusion.');
    const wrapper = userText.closest('.justify-end');
    expect(wrapper).toBeInTheDocument();
  });

  it('AI messages are left-aligned (justify-start wrapper)', () => {
    renderInterface();
    const aiText = screen.getByText('Interesting! But consider Rambam…');
    const wrapper = aiText.closest('.justify-start');
    expect(wrapper).toBeInTheDocument();
  });

  it('AI messages display the AI disclosure badge', () => {
    renderInterface();
    // The badge is aria-labelled for accessibility
    expect(
      screen.getByLabelText('Generated with AI assistance')
    ).toBeInTheDocument();
  });

  it('calls onSubmit when the form is submitted via the Send button', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    renderInterface({ messages: [], onSubmit });

    const textarea = screen.getByPlaceholderText(/State your argument/i);
    fireEvent.change(textarea, { target: { value: 'My argument here' } });
    fireEvent.click(screen.getByRole('button', { name: /Submit argument/i }));

    expect(onSubmit).toHaveBeenCalledWith('My argument here');
  });

  it('calls onSubmit with Ctrl+Enter keyboard shortcut', () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    renderInterface({ messages: [], onSubmit });

    const textarea = screen.getByPlaceholderText(/State your argument/i);
    fireEvent.change(textarea, { target: { value: 'Ctrl Enter test' } });
    fireEvent.keyDown(textarea, { key: 'Enter', ctrlKey: true });

    expect(onSubmit).toHaveBeenCalledWith('Ctrl Enter test');
  });

  it('shows typing indicator (animate-bounce dots) while isLoading is true', () => {
    renderInterface({ isLoading: true });
    const dots = document.querySelectorAll('.animate-bounce');
    expect(dots.length).toBe(3);
  });

  it('disables Send button while isLoading is true', () => {
    renderInterface({ isLoading: true });
    const sendBtn = screen.getByRole('button', { name: /Submit argument/i });
    expect(sendBtn).toBeDisabled();
  });

  it('disables textarea while isLoading is true', () => {
    renderInterface({ isLoading: true });
    const textarea = screen.getByPlaceholderText(/State your argument/i);
    expect(textarea).toBeDisabled();
  });

  it('shows empty-state prompt when there are no messages', () => {
    renderInterface({ messages: [] });
    expect(
      screen.getByText(/Present your opening argument/i)
    ).toBeInTheDocument();
  });
});
