import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';

// Mock Radix Select to avoid portal issues in jsdom
vi.mock('@/components/ui/select', () => ({
  Select: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="select-root">{children}</div>
  ),
  SelectTrigger: ({ children }: { children: React.ReactNode }) => (
    <button data-testid="select-trigger">{children}</button>
  ),
  SelectValue: () => <span data-testid="select-value" />,
  SelectContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="select-content">{children}</div>
  ),
  SelectItem: ({
    children,
    value,
  }: {
    children: React.ReactNode;
    value: string;
  }) => <div data-testid={'select-item-' + value}>{children}</div>,
}));

import { AIChatPanel } from './AIChatPanel';

describe('AIChatPanel', () => {
  beforeEach(() => {
    window.HTMLElement.prototype.scrollIntoView = vi.fn();
    window.HTMLElement.prototype.focus = vi.fn();
  });

  it('renders the toggle button when closed', () => {
    render(<AIChatPanel />);
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThan(0);
  });

  it('panel starts off-screen (translate-x-full)', () => {
    const { container } = render(<AIChatPanel />);
    const panel = container.querySelector('.translate-x-full');
    expect(panel).toBeInTheDocument();
  });

  it('clicking toggle button opens the panel', () => {
    const { container } = render(<AIChatPanel />);
    const toggleBtn = container.querySelector('button.fixed');
    fireEvent.click(toggleBtn!);
    const openPanel = container.querySelector('.translate-x-0');
    expect(openPanel).toBeInTheDocument();
  });

  it('shows AI Learning Assistant heading when open', () => {
    const { container } = render(<AIChatPanel />);
    const toggleBtn = container.querySelector('button.fixed');
    fireEvent.click(toggleBtn!);
    expect(screen.getByText('AI Learning Assistant')).toBeInTheDocument();
  });

  it('shows Select Agent label when open', () => {
    const { container } = render(<AIChatPanel />);
    const toggleBtn = container.querySelector('button.fixed');
    fireEvent.click(toggleBtn!);
    expect(screen.getByText('Select Agent:')).toBeInTheDocument();
  });

  it('shows mock chat history messages when open', () => {
    const { container } = render(<AIChatPanel />);
    const toggleBtn = container.querySelector('button.fixed');
    fireEvent.click(toggleBtn!);
    expect(
      screen.getByText(
        /What.s the relationship between free will and divine providence/i
      )
    ).toBeInTheDocument();
  });

  it('allows typing in the input field when open', () => {
    const { container } = render(<AIChatPanel />);
    const toggleBtn = container.querySelector('button.fixed');
    fireEvent.click(toggleBtn!);
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'Test message' } });
    expect((input as HTMLInputElement).value).toBe('Test message');
  });

  it('applies custom className to the panel', () => {
    const { container } = render(<AIChatPanel className="my-custom-class" />);
    const panel = container.querySelector('.my-custom-class');
    expect(panel).toBeInTheDocument();
  });

  it('enter key does not send when input is empty', () => {
    const { container } = render(<AIChatPanel />);
    const toggleBtn = container.querySelector('button.fixed');
    fireEvent.click(toggleBtn!);
    const input = screen.getByRole('textbox');
    // get count of messages before
    const msgsBefore = screen.getAllByText(/You|Chavruta/i).length;
    fireEvent.keyPress(input, { key: 'Enter', code: 'Enter', charCode: 13 });
    const msgsAfter = screen.getAllByText(/You|Chavruta/i).length;
    expect(msgsAfter).toBe(msgsBefore);
  });
});
