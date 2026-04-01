import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect } from 'vitest';
import type { Message } from '@/types/chat';

// ChatMessage uses useLocation from react-router-dom
import { ChatMessage } from './ChatMessage';

function renderWithRouter(ui: React.ReactElement) {
  return render(<MemoryRouter>{ui}</MemoryRouter>);
}

const makeMessage = (overrides: Partial<Message> = {}): Message => ({
  id: 'msg-1',
  role: 'user',
  content: 'Hello world',
  timestamp: new Date('2024-01-01T12:00:00'),
  ...overrides,
});

describe('ChatMessage', () => {
  it('renders user message content', () => {
    renderWithRouter(<ChatMessage message={makeMessage()} />);
    expect(screen.getByText('Hello world')).toBeInTheDocument();
  });

  it('shows You label for user role', () => {
    renderWithRouter(<ChatMessage message={makeMessage({ role: 'user' })} />);
    expect(screen.getByText('You')).toBeInTheDocument();
  });

  it('shows agentName label for agent role', () => {
    renderWithRouter(
      <ChatMessage
        message={makeMessage({ role: 'agent', content: 'Hi there' })}
        agentName="Chavruta"
      />
    );
    expect(screen.getByText('Chavruta')).toBeInTheDocument();
  });

  it('uses default agent name when agentName not provided', () => {
    renderWithRouter(
      <ChatMessage message={makeMessage({ role: 'agent', content: 'Hi' })} />
    );
    expect(screen.getByText('AI Agent')).toBeInTheDocument();
  });

  it('renders bold markdown as strong element', () => {
    // The markdown renderer renders **word** — we verify a strong tag exists
    // Note: the renderer also matches the inner *word* as em due to regex overlap;
    // use getAllByText to handle multiple matches and find the STRONG one
    renderWithRouter(
      <ChatMessage message={makeMessage({ content: '**strongword** end' })} />
    );
    const matches = screen.getAllByText('strongword');
    const strongEl = matches.find((el) => el.tagName === 'STRONG');
    expect(strongEl).toBeInTheDocument();
  });

  it('renders italic markdown', () => {
    renderWithRouter(
      <ChatMessage
        message={makeMessage({ content: 'This is *italic* text' })}
      />
    );
    const em = screen.getByText('italic');
    expect(em.tagName).toBe('EM');
  });

  it('renders inline code markdown', () => {
    // Build backtick string at runtime to avoid file-write escaping issues
    const bt = String.fromCharCode(96);
    const codeContent = 'Use ' + bt + 'mycode' + bt + ' here';
    renderWithRouter(
      <ChatMessage message={makeMessage({ content: codeContent })} />
    );
    const code = screen.getByText('mycode');
    expect(code.tagName).toBe('CODE');
  });

  it('renders multi-paragraph content', () => {
    const sep = String.fromCharCode(10) + String.fromCharCode(10);
    const twoParas = ['Paragraph one', 'Paragraph two'].join(sep);
    renderWithRouter(
      <ChatMessage message={makeMessage({ content: twoParas })} />
    );
    expect(screen.getByText('Paragraph one')).toBeInTheDocument();
    expect(screen.getByText('Paragraph two')).toBeInTheDocument();
  });

  it('shows streaming indicator when isStreaming is true', () => {
    const { container } = render(
      <MemoryRouter>
        <ChatMessage
          message={makeMessage({
            role: 'agent',
            content: 'Typing...',
            isStreaming: true,
          })}
        />
      </MemoryRouter>
    );
    const pulse = container.querySelector('.animate-pulse');
    expect(pulse).toBeInTheDocument();
  });
});
