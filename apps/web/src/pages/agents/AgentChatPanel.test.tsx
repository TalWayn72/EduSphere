import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';

vi.mock('react-router-dom', () => ({
  useLocation: () => ({ pathname: '/agents/chat' }),
  Link: ({ children, to }: { children: React.ReactNode; to: string }) => (
    <a href={to}>{children}</a>
  ),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}));

vi.mock('@/components/ui/card', () => ({
  Card: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
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
  Send: () => <span>send</span>,
  RotateCcw: () => <span>reset</span>,
}));

vi.mock('./agent-modes-data', () => ({
  AGENT_MODES: [
    {
      id: 'chavruta',
      label: 'Chavruta',
      icon: 'icon',
      color: 'text-blue',
      bg: 'bg-blue',
      description: 'desc',
      prompts: ['p1'],
      responses: ['r1'],
    },
  ],
}));

import { AgentChatPanel } from './AgentChatPanel';

const DEFAULT_TRANSLATED_MODE = {
  id: 'chavruta',
  label: 'Chavruta',
  icon: <span>icon</span>,
  color: 'text-blue-600',
  bg: 'bg-blue-50',
  description: 'desc',
  prompts: ['p1'] as readonly string[],
  responses: ['r1'] as readonly string[],
};

describe('AgentChatPanel', () => {
  it('renders without crash', () => {
    const chatEndRef = { current: null };
    const { container } = render(
      <AgentChatPanel
        activeMode="chavruta"
        translatedMode={DEFAULT_TRANSLATED_MODE}
        messages={[]}
        chatInput=""
        isTyping={false}
        streamingContent=""
        chatEndRef={chatEndRef}
        onInputChange={vi.fn()}
        onSend={vi.fn()}
        onReset={vi.fn()}
      />
    );
    expect(container).toBeTruthy();
  });

  it('renders RequirementLink when message content is consent-required', () => {
    const chatEndRef = { current: null };
    render(
      <AgentChatPanel
        activeMode="chavruta"
        translatedMode={DEFAULT_TRANSLATED_MODE}
        messages={[
          { id: 'c1', role: 'assistant', content: 'consent-required' },
        ]}
        chatInput=""
        isTyping={false}
        streamingContent=""
        chatEndRef={chatEndRef}
        onInputChange={vi.fn()}
        onSend={vi.fn()}
        onReset={vi.fn()}
      />
    );
    expect(screen.getByTestId('requirement-link')).toBeInTheDocument();
    expect(screen.queryByText('consent-required')).not.toBeInTheDocument();
  });
});
