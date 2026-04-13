/**
 * ReactionBar component tests
 *
 * Covers:
 *  1. Renders 5 emoji buttons
 *  2. Each button is accessible via aria-label
 *  3. Click calls onSend with the correct emoji
 *  4. Cooldown disables all buttons
 *  5. After cooldown, buttons are re-enabled
 */
import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';

// ── Mock Zustand store ─────────────────────────────────────────────────────────

const mockSetReactionCooldown = vi.fn();
let mockReactionCooldown = false;

vi.mock('@/stores/live-session.store', () => ({
  useLiveSessionStore: vi.fn(() => ({
    reactionCooldown: mockReactionCooldown,
    setReactionCooldown: mockSetReactionCooldown,
  })),
}));

import { ReactionBar } from './ReactionBar';

const EMOJIS = ['👏', '❓', '💡', '🔥', '👍'] as const;

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('ReactionBar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockReactionCooldown = false;
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders 5 emoji reaction buttons', () => {
    render(<ReactionBar onSend={vi.fn()} />);
    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(5);
  });

  it.each(EMOJIS)('renders button for emoji %s', (emoji) => {
    render(<ReactionBar onSend={vi.fn()} />);
    expect(
      screen.getByRole('button', { name: `React with ${emoji}` })
    ).toBeInTheDocument();
  });

  it('calls onSend with clicked emoji', async () => {
    const onSend = vi.fn().mockResolvedValue(undefined);
    render(<ReactionBar onSend={onSend} />);

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'React with 👏' }));
    });

    expect(onSend).toHaveBeenCalledWith('👏');
  });

  it('does not call onSend when cooldown is active', async () => {
    mockReactionCooldown = true;
    const onSend = vi.fn().mockResolvedValue(undefined);
    render(<ReactionBar onSend={onSend} />);

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'React with 💡' }));
    });

    expect(onSend).not.toHaveBeenCalled();
  });

  it('buttons are disabled when cooldown is active', () => {
    mockReactionCooldown = true;
    render(<ReactionBar onSend={vi.fn()} />);
    const buttons = screen.getAllByRole('button');
    buttons.forEach((btn) => {
      expect(btn).toBeDisabled();
    });
  });

  it('buttons are enabled when cooldown is false', () => {
    mockReactionCooldown = false;
    render(<ReactionBar onSend={vi.fn()} />);
    const buttons = screen.getAllByRole('button');
    buttons.forEach((btn) => {
      expect(btn).not.toBeDisabled();
    });
  });

  it('sets cooldown to true immediately on click', async () => {
    const onSend = vi.fn().mockResolvedValue(undefined);
    render(<ReactionBar onSend={onSend} />);

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'React with 🔥' }));
    });

    expect(mockSetReactionCooldown).toHaveBeenCalledWith(true);
  });

  it('clears cooldown after 3 seconds', async () => {
    const onSend = vi.fn().mockResolvedValue(undefined);
    render(<ReactionBar onSend={onSend} />);

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'React with 👍' }));
    });

    // Before timeout
    expect(mockSetReactionCooldown).not.toHaveBeenCalledWith(false);

    await act(async () => {
      vi.advanceTimersByTime(3000);
    });

    expect(mockSetReactionCooldown).toHaveBeenCalledWith(false);
  });

  it('toolbar has accessible label', () => {
    render(<ReactionBar onSend={vi.fn()} />);
    expect(
      screen.getByRole('toolbar', { name: 'Send reaction' })
    ).toBeInTheDocument();
  });

  it('applies custom className to container', () => {
    const { container } = render(
      <ReactionBar onSend={vi.fn()} className="my-class" />
    );
    expect(container.querySelector('.my-class')).toBeTruthy();
  });
});
