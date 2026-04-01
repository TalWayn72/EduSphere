import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children, open }: { children: React.ReactNode; open: boolean }) =>
    open ? <div data-testid="dialog">{children}</div> : null,
  DialogContent: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  DialogHeader: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  DialogTitle: ({ children }: { children: React.ReactNode }) => (
    <h2>{children}</h2>
  ),
  DialogDescription: ({ children }: { children: React.ReactNode }) => (
    <p>{children}</p>
  ),
  DialogFooter: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));
vi.mock('@/components/ui/button', () => ({
  Button: ({
    children,
    onClick,
    disabled,
    type,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: string }) => (
    <button onClick={onClick} disabled={disabled} type={type} {...props}>
      {children}
    </button>
  ),
}));
vi.mock('@/components/ui/input', () => ({
  Input: React.forwardRef(function Input(
    props: React.InputHTMLAttributes<HTMLInputElement>,
    ref: React.Ref<HTMLInputElement>
  ) {
    return <input ref={ref} {...props} />;
  }),
}));
vi.mock('@/components/ui/label', () => ({
  Label: ({
    children,
    ...props
  }: {
    children: React.ReactNode;
    htmlFor?: string;
  }) => <label {...props}>{children}</label>,
}));

import { GdprAnonymizeDialog } from './GdprAnonymizeDialog';

describe('GdprAnonymizeDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders when open', () => {
    render(
      <GdprAnonymizeDialog open={true} onClose={vi.fn()} onConfirm={vi.fn()} />
    );
    expect(screen.getByTestId('dialog')).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    render(
      <GdprAnonymizeDialog open={false} onClose={vi.fn()} onConfirm={vi.fn()} />
    );
    expect(screen.queryByTestId('dialog')).not.toBeInTheDocument();
  });

  it('shows dialog title', () => {
    render(
      <GdprAnonymizeDialog open={true} onClose={vi.fn()} onConfirm={vi.fn()} />
    );
    expect(
      screen.getByRole('heading', { name: /permanently anonymize/i })
    ).toBeInTheDocument();
  });

  it('confirm button disabled by default', () => {
    render(
      <GdprAnonymizeDialog open={true} onClose={vi.fn()} onConfirm={vi.fn()} />
    );
    expect(screen.getByTestId('gdpr-confirm-btn')).toBeDisabled();
  });

  it('confirm button enabled after typing ANONYMIZE', () => {
    render(
      <GdprAnonymizeDialog open={true} onClose={vi.fn()} onConfirm={vi.fn()} />
    );
    fireEvent.change(screen.getByTestId('gdpr-confirm-input'), {
      target: { value: 'ANONYMIZE' },
    });
    expect(screen.getByTestId('gdpr-confirm-btn')).not.toBeDisabled();
  });

  it('shows userName in description when provided', () => {
    render(
      <GdprAnonymizeDialog
        open={true}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
        userName="John"
      />
    );
    expect(screen.getByText(/for John/)).toBeInTheDocument();
  });

  it('shows processing state', () => {
    render(
      <GdprAnonymizeDialog
        open={true}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
        processing
      />
    );
    expect(screen.getByText('Anonymizing...')).toBeInTheDocument();
  });
});
