import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children, open }: { children: React.ReactNode; open: boolean; onOpenChange?: (v: boolean) => void }) =>
    open ? <div data-testid="dialog">{children}</div> : null,
  DialogContent: ({ children, ...props }: { children: React.ReactNode; 'data-testid'?: string }) => (
    <div data-testid={props['data-testid'] ?? 'dialog-content'}>{children}</div>
  ),
  DialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children, ...props }: { children: React.ReactNode; 'data-testid'?: string }) => (
    <h2 data-testid={props['data-testid'] ?? 'dialog-title'}>{children}</h2>
  ),
  DialogDescription: ({ children, ...props }: { children: React.ReactNode; 'data-testid'?: string }) => (
    <p data-testid={props['data-testid'] ?? 'dialog-desc'}>{children}</p>
  ),
  DialogFooter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: string }) => (
    <button onClick={onClick} {...props}>{children}</button>
  ),
}));

import { UnsavedChangesDialog } from './UnsavedChangesDialog';

describe('UnsavedChangesDialog', () => {
  it('renders when open', () => {
    render(<UnsavedChangesDialog open={true} onLeave={vi.fn()} onStay={vi.fn()} />);
    expect(screen.getByTestId('unsaved-changes-dialog')).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    render(<UnsavedChangesDialog open={false} onLeave={vi.fn()} onStay={vi.fn()} />);
    expect(screen.queryByTestId('unsaved-changes-dialog')).not.toBeInTheDocument();
  });

  it('shows title from i18n', () => {
    render(<UnsavedChangesDialog open={true} onLeave={vi.fn()} onStay={vi.fn()} />);
    expect(screen.getByTestId('unsaved-changes-title')).toBeInTheDocument();
  });

  it('shows message from i18n', () => {
    render(<UnsavedChangesDialog open={true} onLeave={vi.fn()} onStay={vi.fn()} />);
    expect(screen.getByTestId('unsaved-changes-message')).toBeInTheDocument();
  });

  it('calls onStay when stay button clicked', () => {
    const onStay = vi.fn();
    render(<UnsavedChangesDialog open={true} onLeave={vi.fn()} onStay={onStay} />);
    fireEvent.click(screen.getByTestId('unsaved-stay-btn'));
    expect(onStay).toHaveBeenCalledTimes(1);
  });

  it('calls onLeave when leave button clicked', () => {
    const onLeave = vi.fn();
    render(<UnsavedChangesDialog open={true} onLeave={onLeave} onStay={vi.fn()} />);
    fireEvent.click(screen.getByTestId('unsaved-leave-btn'));
    expect(onLeave).toHaveBeenCalledTimes(1);
  });
});
