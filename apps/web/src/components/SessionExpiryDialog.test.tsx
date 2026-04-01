import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children, open }: { children: React.ReactNode; open: boolean }) =>
    open ? <div data-testid="dialog">{children}</div> : null,
  DialogContent: ({
    children,
    ...props
  }: {
    children: React.ReactNode;
    [k: string]: unknown;
  }) => (
    <div data-testid="dialog-content" {...props}>
      {children}
    </div>
  ),
  DialogHeader: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  DialogTitle: ({ children }: { children: React.ReactNode }) => (
    <h2 data-testid="dialog-title">{children}</h2>
  ),
  DialogDescription: ({ children }: { children: React.ReactNode }) => (
    <p data-testid="dialog-desc">{children}</p>
  ),
  DialogFooter: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({
    children,
    onClick,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button onClick={onClick} {...props}>
      {children}
    </button>
  ),
}));

import { SessionExpiryDialog } from './SessionExpiryDialog';

describe('SessionExpiryDialog', () => {
  it('renders when open', () => {
    render(<SessionExpiryDialog open={true} onReLogin={vi.fn()} />);
    expect(screen.getByTestId('dialog')).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    render(<SessionExpiryDialog open={false} onReLogin={vi.fn()} />);
    expect(screen.queryByTestId('dialog')).not.toBeInTheDocument();
  });

  it('shows session expired title', () => {
    render(<SessionExpiryDialog open={true} onReLogin={vi.fn()} />);
    expect(screen.getByTestId('dialog-title')).toHaveTextContent(
      'Session expired'
    );
  });

  it('shows description about inactivity', () => {
    render(<SessionExpiryDialog open={true} onReLogin={vi.fn()} />);
    expect(screen.getByTestId('dialog-desc')).toHaveTextContent(
      /expired due to inactivity/
    );
  });

  it('calls onReLogin when button clicked', () => {
    const onReLogin = vi.fn();
    render(<SessionExpiryDialog open={true} onReLogin={onReLogin} />);
    fireEvent.click(screen.getByText('Log in again'));
    expect(onReLogin).toHaveBeenCalledTimes(1);
  });
});
