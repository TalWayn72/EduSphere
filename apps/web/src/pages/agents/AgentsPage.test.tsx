import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import React from 'react';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}));

vi.mock('@/lib/auth', () => ({
  getCurrentUser: () => ({ id: 'u-1', role: 'STUDENT' }),
  DEV_MODE: true,
}));

vi.mock('@/components/Layout', () => ({
  Layout: ({ children }: { children: React.ReactNode }) => <div data-testid="layout">{children}</div>,
}));

vi.mock('./agent-modes-data', () => ({
  AGENT_MODES: [
    { id: 'chavruta', label: 'Chavruta', icon: 'icon', color: 'text-blue', bg: 'bg-blue', description: 'desc', prompts: ['p1'], responses: ['r1'] },
  ],
}));

vi.mock('./useAgentChat', () => ({
  useAgentChat: () => ({
    activeMode: 'chavruta',
    setActiveMode: vi.fn(),
    chatInput: '',
    setChatInput: vi.fn(),
    isTyping: false,
    streamingContent: '',
    messages: [],
    chatEndRef: { current: null },
    hasTemplatesError: false,
    handleSend: vi.fn(),
    handleReset: vi.fn(),
  }),
}));

vi.mock('./AgentModeSelector', () => ({
  AgentModeSelector: () => <div data-testid="mode-selector" />,
}));

vi.mock('./AgentChatPanel', () => ({
  AgentChatPanel: () => <div data-testid="chat-panel" />,
}));

import { AgentsPage } from './AgentsPage';

describe('AgentsPage (subdirectory)', () => {
  it('renders inside Layout', () => {
    render(<MemoryRouter><AgentsPage /></MemoryRouter>);
    expect(screen.getByTestId('layout')).toBeInTheDocument();
  });

  it('renders without crash', () => {
    const { container } = render(<MemoryRouter><AgentsPage /></MemoryRouter>);
    expect(container).toBeTruthy();
  });
});
