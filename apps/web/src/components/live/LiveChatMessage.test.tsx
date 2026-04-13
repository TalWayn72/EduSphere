/**
 * LiveChatMessage component tests
 *
 * Covers:
 *  1. Renders message content text
 *  2. Renders userId in header
 *  3. Shows pin indicator when isPinned=true
 *  4. No pin badge when isPinned=false
 *  5. System messages render centered/italic style
 *  6. System messages do not show avatar
 *  7. Reply indicator shown when replyTo is set
 */
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { LiveChatMessage } from './LiveChatMessage';
import type { LiveChatMessage as LiveChatMessageType } from '@/types/live-session.types';

// ── Mock lucide-react Pin icon ─────────────────────────────────────────────────

vi.mock('lucide-react', () => ({
  Pin: () => <svg data-testid="pin-icon" aria-hidden="true" />,
}));

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeMessage(
  overrides: Partial<LiveChatMessageType> = {}
): LiveChatMessageType {
  return {
    id: 'msg-1',
    sessionId: 'sess-1',
    userId: 'alice',
    content: 'Hello world',
    messageType: 'TEXT',
    isPinned: false,
    replyTo: null,
    createdAt: '2026-01-01T10:00:00Z',
    ...overrides,
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('LiveChatMessage', () => {
  it('renders message content', () => {
    render(
      <LiveChatMessage
        message={makeMessage({ content: 'Test message content' })}
      />
    );
    expect(screen.getByText('Test message content')).toBeInTheDocument();
  });

  it('renders userId in header', () => {
    render(<LiveChatMessage message={makeMessage({ userId: 'bob-smith' })} />);
    expect(screen.getByText('bob-smith')).toBeInTheDocument();
  });

  it('does not show pin icon when isPinned is false', () => {
    render(<LiveChatMessage message={makeMessage({ isPinned: false })} />);
    expect(screen.queryByTestId('pin-icon')).not.toBeInTheDocument();
  });

  it('shows pin icon when isPinned is true', () => {
    render(<LiveChatMessage message={makeMessage({ isPinned: true })} />);
    expect(screen.getByTestId('pin-icon')).toBeInTheDocument();
  });

  it('shows sr-only "Pinned" text when isPinned is true', () => {
    render(<LiveChatMessage message={makeMessage({ isPinned: true })} />);
    expect(screen.getByText('Pinned')).toBeInTheDocument();
  });

  it('has data-pinned attribute set to true when pinned', () => {
    const { container } = render(
      <LiveChatMessage message={makeMessage({ isPinned: true })} />
    );
    const msgEl = container.querySelector('[data-testid="chat-message"]');
    expect(msgEl?.getAttribute('data-pinned')).toBe('true');
  });

  it('system message renders content text', () => {
    render(
      <LiveChatMessage
        message={makeMessage({
          messageType: 'SYSTEM',
          content: 'User joined the session',
        })}
      />
    );
    expect(screen.getByText('User joined the session')).toBeInTheDocument();
  });

  it('system message does not show chat-message div', () => {
    const { container } = render(
      <LiveChatMessage message={makeMessage({ messageType: 'SYSTEM' })} />
    );
    expect(
      container.querySelector('[data-testid="chat-message"]')
    ).not.toBeInTheDocument();
  });

  it('shows reply indicator when replyTo is set', () => {
    render(
      <LiveChatMessage
        message={makeMessage({
          replyTo: { id: 'msg-0', content: 'Original message' },
        })}
      />
    );
    expect(screen.getByText(/reply/i)).toBeInTheDocument();
  });

  it('does not show reply indicator when replyTo is null', () => {
    render(<LiveChatMessage message={makeMessage({ replyTo: null })} />);
    expect(screen.queryByText(/reply/i)).not.toBeInTheDocument();
  });

  it('renders avatar initials from userId', () => {
    render(<LiveChatMessage message={makeMessage({ userId: 'alice' })} />);
    // initials('alice') = 'A'
    expect(screen.getByText('A')).toBeInTheDocument();
  });
});
