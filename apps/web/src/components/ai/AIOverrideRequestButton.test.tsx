import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { AIOverrideRequestButton } from './AIOverrideRequestButton';

// Mock Radix Dialog (portal issues in jsdom)
vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({
    open,
    children,
  }: {
    open: boolean;
    children: React.ReactNode;
  }) => (open ? <div data-testid="dialog-root">{children}</div> : null),
  DialogContent: ({
    children,
    ...props
  }: React.HTMLAttributes<HTMLDivElement>) => (
    <div data-testid="dialog-content" {...props}>
      {children}
    </div>
  ),
  DialogHeader: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  DialogTitle: ({
    children,
    id,
  }: {
    children: React.ReactNode;
    id?: string;
  }) => <h2 id={id}>{children}</h2>,
  DialogDescription: ({
    children,
    id,
  }: {
    children: React.ReactNode;
    id?: string;
  }) => <p id={id}>{children}</p>,
  DialogFooter: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  DialogClose: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

// Mock Textarea
vi.mock('@/components/ui/textarea', () => ({
  Textarea: (props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => (
    <textarea {...props} />
  ),
}));

describe('AIOverrideRequestButton', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the "Request Human Review" button', () => {
    render(<AIOverrideRequestButton assessmentId="assess-1" />);
    const btn = screen.getByRole('button', {
      name: /request human review/i,
    });
    expect(btn).toBeDefined();
  });

  it('dialog is closed initially', () => {
    render(<AIOverrideRequestButton assessmentId="assess-1" />);
    expect(screen.queryByTestId('dialog-root')).toBeNull();
  });

  it('opens dialog when button is clicked', () => {
    render(<AIOverrideRequestButton assessmentId="assess-1" />);
    fireEvent.click(
      screen.getByRole('button', { name: /request human review of this ai assessment/i })
    );
    expect(screen.getByTestId('dialog-root')).toBeDefined();
    expect(screen.getByRole('heading', { name: /request human review/i })).toBeDefined();
  });

  it('dialog states user right to human review', () => {
    render(<AIOverrideRequestButton assessmentId="assess-1" />);
    fireEvent.click(
      screen.getByRole('button', { name: /request human review of this ai assessment/i })
    );
    expect(
      screen.getByText(/right to request a human review/i)
    ).toBeDefined();
  });

  it('closes dialog when Cancel button is clicked', () => {
    render(<AIOverrideRequestButton assessmentId="assess-1" />);
    fireEvent.click(
      screen.getByRole('button', { name: /request human review of this ai assessment/i })
    );
    expect(screen.getByTestId('dialog-root')).toBeDefined();
    // The Cancel button inside the mocked dialog footer uses aria-label="Close dialog"
    fireEvent.click(screen.getByRole('button', { name: /close dialog/i }));
    expect(screen.queryByTestId('dialog-root')).toBeNull();
  });

  it('closes dialog on Escape key press', async () => {
    render(<AIOverrideRequestButton assessmentId="assess-1" />);
    fireEvent.click(
      screen.getByRole('button', { name: /request human review/i })
    );
    expect(screen.getByTestId('dialog-root')).toBeDefined();
    fireEvent.keyDown(window, { key: 'Escape' });
    await waitFor(() => {
      expect(screen.queryByTestId('dialog-root')).toBeNull();
    });
  });

  it('has correct aria-label on trigger button', () => {
    render(<AIOverrideRequestButton assessmentId="assess-1" />);
    const btn = screen.getByRole('button', {
      name: /request human review of this ai assessment/i,
    });
    expect(btn.getAttribute('aria-label')).toBe(
      'Request human review of this AI assessment'
    );
  });

  it('dialog content has role="dialog" and aria-labelledby', () => {
    render(<AIOverrideRequestButton assessmentId="assess-1" />);
    fireEvent.click(
      screen.getByRole('button', { name: /request human review/i })
    );
    const content = screen.getByTestId('dialog-content');
    expect(content.getAttribute('role')).toBe('dialog');
    expect(content.getAttribute('aria-labelledby')).toBe('human-review-title');
  });

  it('calls onSubmit with reason when Submit Request is clicked', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(
      <AIOverrideRequestButton assessmentId="assess-1" onSubmit={onSubmit} />
    );
    fireEvent.click(
      screen.getByRole('button', { name: /request human review/i })
    );
    fireEvent.change(screen.getByRole('textbox'), {
      target: { value: 'My reason' },
    });
    fireEvent.click(screen.getByRole('button', { name: /submit request/i }));
    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith('My reason');
    });
  });

  // Regression guard: EU AI Act compliance code comment must be present
  it('EU AI Act Art. 14 reference is present in component source', async () => {
    const src = await import('./AIOverrideRequestButton?raw');
    expect((src as { default: string }).default).toContain('EU AI Act Art. 14');
  });
});
