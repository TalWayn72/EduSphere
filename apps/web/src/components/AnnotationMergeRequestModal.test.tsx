import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AnnotationMergeRequestModal } from './AnnotationMergeRequestModal';

vi.mock('@/components/ui/button', () => ({
  Button: ({
    children,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement> & {
    children: React.ReactNode;
    variant?: string;
    size?: string;
  }) => <button {...props}>{children}</button>,
}));

vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children, open }: { children: React.ReactNode; open?: boolean }) =>
    open !== false ? <>{children}</> : null,
  DialogContent: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
    <div role="dialog" aria-modal="true" {...props}>{children}</div>
  ),
  DialogHeader: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
    <div {...props}>{children}</div>
  ),
  DialogTitle: ({ children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h2 {...props}>{children}</h2>
  ),
  DialogDescription: ({ children, ...props }: React.HTMLAttributes<HTMLParagraphElement>) => (
    <p {...props}>{children}</p>
  ),
  DialogFooter: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
    <div {...props}>{children}</div>
  ),
}));

const CONTENT = 'Maimonides uses the term "overflow" to bridge Neoplatonism and Aristotle.';

describe('AnnotationMergeRequestModal', () => {
  it('renders the dialog with the annotation content', () => {
    render(
      <AnnotationMergeRequestModal
        annotationContent={CONTENT}
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
      />
    );
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(document.body.textContent).toContain(CONTENT.slice(0, 30));
  });

  it('Submit button is disabled when description is empty', () => {
    render(
      <AnnotationMergeRequestModal
        annotationContent={CONTENT}
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
      />
    );
    const submitBtn = screen.getByTestId('merge-submit-btn');
    expect(submitBtn).toBeDisabled();
  });

  it('Submit button is enabled after typing a description', () => {
    render(
      <AnnotationMergeRequestModal
        annotationContent={CONTENT}
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
      />
    );
    const textarea = screen.getByTestId('merge-description-input');
    fireEvent.change(textarea, { target: { value: 'Important cross-course insight.' } });
    const submitBtn = screen.getByTestId('merge-submit-btn');
    expect(submitBtn).not.toBeDisabled();
  });

  it('calls onSubmit with the trimmed description on form submit', () => {
    const onSubmit = vi.fn();
    render(
      <AnnotationMergeRequestModal
        annotationContent={CONTENT}
        onSubmit={onSubmit}
        onCancel={vi.fn()}
      />
    );
    const textarea = screen.getByTestId('merge-description-input');
    fireEvent.change(textarea, { target: { value: '  Important insight.  ' } });
    const form = document.querySelector('form')!;
    fireEvent.submit(form);
    expect(onSubmit).toHaveBeenCalledWith('Important insight.');
  });

  it('calls onCancel when Cancel is clicked', () => {
    const onCancel = vi.fn();
    render(
      <AnnotationMergeRequestModal
        annotationContent={CONTENT}
        onSubmit={vi.fn()}
        onCancel={onCancel}
      />
    );
    fireEvent.click(screen.getByText('Cancel'));
    expect(onCancel).toHaveBeenCalledOnce();
  });

  it('does not call onSubmit when description is whitespace only', () => {
    const onSubmit = vi.fn();
    render(
      <AnnotationMergeRequestModal
        annotationContent={CONTENT}
        onSubmit={onSubmit}
        onCancel={vi.fn()}
      />
    );
    const textarea = screen.getByTestId('merge-description-input');
    fireEvent.change(textarea, { target: { value: '   ' } });
    const form = document.querySelector('form')!;
    fireEvent.submit(form);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('has aria-modal for accessibility and displays title', () => {
    render(
      <AnnotationMergeRequestModal
        annotationContent={CONTENT}
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
      />
    );
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(screen.getByText('Propose to Official Content')).toBeInTheDocument();
  });

  it('shows character count', () => {
    render(
      <AnnotationMergeRequestModal
        annotationContent={CONTENT}
        onSubmit={vi.fn()}
        onCancel={vi.fn()}
      />
    );
    // Should show 0/500 initially
    expect(screen.getByText('0/500')).toBeInTheDocument();
  });
});
