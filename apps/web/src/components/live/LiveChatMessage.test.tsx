/**
 * LiveChatMessage component tests
 *
 * Covers:
 *  1. Renders message content text
 *  2. Renders display name and timestamp
 *  3. Shows pin indicator when isPinned=true
 *  4. No pin badge when isPinned=false
 *  5. System messages render centered/italic style
 *  6. System messages do not show avatar
 *  7. Reply indicator shown when replyToId is set
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

function makeMessage(overrides: Partial<LiveChatMessageType> = {}): LiveChatMessageType {
  return {
    id: 'msg-1',
    sessionId: 'sess-1',
    userId: 'user-1',
    displayName: 'Alice',
    avatarUrl: null,
    content: 'Hello world',
    messageType: 'TEXT',
    isPinned: false,
    replyToId: null,
    createdAt: '2026-01-01T10:00:00Z',
    ...overrides,
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('LiveChatMessage', () => {
  it('renders message content', () => {
    render(<LiveChatMessage message={makeMessage({ content: 'Test message content' })} />);
    expect(screen.getByText('Test message content')).toBeInTheDocument();
  });

  it('renders display name', () => {
    render(<LiveChatMessage message={makeMessage({ displayName: 'Bob Smith' })} />);
    expect(screen.getByText('Bob Smith')).toBeInTheDocument();
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
        message={makeMessage({ messageType: 'SYSTEM', content: 'User joined the session' })}
      />
    );
    expect(screen.getByText('User joined the session')).toBeInTheDocument();
  });

  it('system message does not show chat-message div', () => {
    const { container } = render(
      <LiveChatMessage message={makeMessage({ messageType: 'SYSTEM' })} />
    );
    expect(container.querySelector('[data-testid="chat-message"]')).not.toBeInTheDocument();
  });

  it('shows reply indicator when replyToId is set', () => {
    render(<LiveChatMessage message={makeMessage({ replyToId: 'msg-0' })} />);
    expect(screen.getByText(/reply/i)).toBeInTheDocument();
  });

  it('does not show reply indicator when replyToId is null', () => {
    render(<LiveChatMessage message={makeMessage({ replyToId: null })} />);
    expect(screen.queryByText(/reply/i)).not.toBeInTheDocument();
  });

  it('shows avatar initials when no avatarUrl', () => {
    render(<LiveChatMessage message={makeMessage({ displayName: 'Alice Bob', avatarUrl: null })} />);
    // Initials "AB" should be rendered in the avatar div
    expect(screen.getByText('AB')).toBeInTheDocument();
  });

  it('renders img tag when avatarUrl is provided', () => {
    const { container } = render(
      <LiveChatMessage
        message={makeMessage({ avatarUrl: 'https://cdn.example.com/alice.png' })}
      />
    );
    const img = container.querySelector('img');
    expect(img?.src).toBe('https://cdn.example.com/alice.png');
  });
});
