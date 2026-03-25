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
  Button: ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { children?: React.ReactNode }) =>
    <button {...props}>{children}</button>,
}));

vi.mock('lucide-react', () => ({
  Bot: () => <span>bot</span>,
  Send: () => <span>send</span>,
}));

import { AiChatPanel } from './AiChatPanel';

describe('AiChatPanel', () => {
  it('renders without crash', () => {
    const chatEndRef = { current: null };
    const { container } = render(
      <AiChatPanel
        chatMessages={[]}
        chatInput=""
        isStreaming={false}
        chatEndRef={chatEndRef}
        onChatInputChange={vi.fn()}
        onSendChat={vi.fn()}
      />
    );
    expect(container).toBeTruthy();
  });

  it('renders chat messages', () => {
    const chatEndRef = { current: null };
    const { container } = render(
      <AiChatPanel
        chatMessages={[{ id: 'm1', role: 'user', content: 'Hello AI' }]}
        chatInput=""
        isStreaming={false}
        chatEndRef={chatEndRef}
        onChatInputChange={vi.fn()}
        onSendChat={vi.fn()}
      />
    );
    expect(container.textContent).toContain('Hello AI');
  });
});
