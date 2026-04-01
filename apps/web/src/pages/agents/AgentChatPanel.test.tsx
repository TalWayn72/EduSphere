import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import React from 'react';

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

describe('AgentChatPanel', () => {
  it('renders without crash', () => {
    const chatEndRef = { current: null };
    const translatedMode = {
      id: 'chavruta',
      label: 'Chavruta',
      icon: <span>icon</span>,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
      description: 'desc',
      prompts: ['p1'] as readonly string[],
      responses: ['r1'] as readonly string[],
    };
    const { container } = render(
      <AgentChatPanel
        activeMode="chavruta"
        translatedMode={translatedMode}
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
});
