import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { InstructorMergeQueuePage } from './InstructorMergeQueuePage';

vi.mock('@/components/Layout', () => ({
  Layout: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="layout">{children}</div>
  ),
}));

vi.mock('@/components/ui/card', () => ({
  Card: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="card">{children}</div>
  ),
  CardContent: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  CardHeader: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  CardTitle: ({ children }: { children: React.ReactNode }) => (
    <h3>{children}</h3>
  ),
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({
    children,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement> & {
    children: React.ReactNode;
  }) => <button {...props}>{children}</button>,
}));

function renderPage() {
  return render(
    <MemoryRouter>
      <InstructorMergeQueuePage />
    </MemoryRouter>
  );
}

describe('InstructorMergeQueuePage', () => {
  it('renders the page title', () => {
    renderPage();
    expect(screen.getByText('Annotation Proposals')).toBeInTheDocument();
  });

  it('shows pending count correctly', () => {
    renderPage();
    expect(screen.getByText(/3 pending/i)).toBeInTheDocument();
  });

  it('renders all 3 mock pending requests', () => {
    renderPage();
    // Card mock strips forwarded props — use proposal-content-* divs (native <div>)
    const queue = screen.getByTestId('merge-queue-list');
    const proposalDivs = queue.querySelectorAll('[data-testid^="proposal-content-"]');
    expect(proposalDivs.length).toBe(3);
  });

  it('shows the proposed annotation content', () => {
    renderPage();
    expect(
      document.body.textContent
    ).toContain('overflow');
  });

  it('approves a request when Approve is clicked', () => {
    renderPage();
    const approveBtn = screen.getByTestId('approve-btn-mr-1');
    fireEvent.click(approveBtn);
    // mr-1 should now appear in the resolved section
    expect(screen.getByTestId('resolved-mr-1')).toBeInTheDocument();
    // approved badge should show
    expect(
      screen.getByTestId('resolved-mr-1').textContent
    ).toContain('approved');
  });

  it('rejects a request when Reject is clicked', () => {
    renderPage();
    const rejectBtn = screen.getByTestId('reject-btn-mr-2');
    fireEvent.click(rejectBtn);
    expect(screen.getByTestId('resolved-mr-2')).toBeInTheDocument();
    expect(
      screen.getByTestId('resolved-mr-2').textContent
    ).toContain('rejected');
  });

  it('decrements pending count after approval', () => {
    renderPage();
    fireEvent.click(screen.getByTestId('approve-btn-mr-1'));
    // Now 2 pending
    expect(screen.getByText(/2 pending/i)).toBeInTheDocument();
  });

  it('shows empty state when all requests are resolved', () => {
    renderPage();
    // Resolve all 3
    fireEvent.click(screen.getByTestId('approve-btn-mr-1'));
    fireEvent.click(screen.getByTestId('approve-btn-mr-2'));
    fireEvent.click(screen.getByTestId('approve-btn-mr-3'));
    expect(screen.getByText('No pending proposals.')).toBeInTheDocument();
  });

  it('does not expose raw errors or stack traces', () => {
    renderPage();
    expect(document.body.textContent).not.toMatch(/TypeError|Error:/);
    expect(document.body.textContent).not.toMatch(/at\s+\w+\s*\(/);
  });

  it('renders inside Layout', () => {
    renderPage();
    expect(screen.getByTestId('layout')).toBeInTheDocument();
  });

  it('shows course name in each request', () => {
    renderPage();
    expect(screen.getAllByText('Jewish Philosophy 101').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Early Modern Philosophy').length).toBeGreaterThan(0);
  });
});
