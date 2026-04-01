/**
 * Tests for EmbeddingReindexDialog component.
 * Validates: render states, button interactions, loading state, accessibility.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

// Mock react-i18next with interpolation support (same as EmbeddingDashboardPage.test.tsx)
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (
      k: string,
      fallbackOrOpts?: string | Record<string, unknown>,
      opts?: Record<string, unknown>
    ) => {
      const fallback = typeof fallbackOrOpts === 'string' ? fallbackOrOpts : k;
      const vars = typeof fallbackOrOpts === 'object' ? fallbackOrOpts : opts;
      if (!vars) return fallback;
      return fallback.replace(/\{\{(\w+)\}\}/g, (_: string, key: string) =>
        vars[key] !== undefined ? String(vars[key]) : `{{${key}}}`
      );
    },
  }),
}));

import { EmbeddingReindexDialog } from './EmbeddingReindexDialog';

describe('EmbeddingReindexDialog', () => {
  const defaultProps = {
    open: true,
    onOpenChange: vi.fn(),
    onConfirm: vi.fn(),
    loading: false,
    totalSources: 50,
    courseCount: 3,
  };

  it('renders the dialog when open=true', () => {
    render(<EmbeddingReindexDialog {...defaultProps} />);
    expect(screen.getByTestId('reindex-confirm-dialog')).toBeInTheDocument();
  });

  it('does not render dialog content when open=false', () => {
    render(<EmbeddingReindexDialog {...defaultProps} open={false} />);
    expect(
      screen.queryByTestId('reindex-confirm-dialog')
    ).not.toBeInTheDocument();
  });

  it('shows the confirmation title', () => {
    render(<EmbeddingReindexDialog {...defaultProps} />);
    expect(screen.getByText('Confirm Reindex')).toBeInTheDocument();
  });

  it('shows description with source and course counts', () => {
    render(<EmbeddingReindexDialog {...defaultProps} />);
    const desc = screen.getByText(/50 sources in 3 courses/);
    expect(desc).toBeInTheDocument();
  });

  it('shows Cancel and Confirm buttons', () => {
    render(<EmbeddingReindexDialog {...defaultProps} />);
    expect(screen.getByTestId('reindex-cancel-btn')).toBeInTheDocument();
    expect(screen.getByTestId('reindex-confirm-btn')).toBeInTheDocument();
  });

  it('calls onOpenChange(false) when Cancel is clicked', () => {
    const onOpenChange = vi.fn();
    render(
      <EmbeddingReindexDialog {...defaultProps} onOpenChange={onOpenChange} />
    );
    fireEvent.click(screen.getByTestId('reindex-cancel-btn'));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('calls onConfirm when Confirm button is clicked', () => {
    const onConfirm = vi.fn();
    render(<EmbeddingReindexDialog {...defaultProps} onConfirm={onConfirm} />);
    fireEvent.click(screen.getByTestId('reindex-confirm-btn'));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('shows loading spinner and "Reindexing..." text when loading', () => {
    render(<EmbeddingReindexDialog {...defaultProps} loading={true} />);
    expect(screen.getByText('Reindexing...')).toBeInTheDocument();
    // Confirm button text changes to loading state
    expect(screen.queryByText('Yes, Reindex')).not.toBeInTheDocument();
  });

  it('shows "Yes, Reindex" text when not loading', () => {
    render(<EmbeddingReindexDialog {...defaultProps} loading={false} />);
    expect(screen.getByText('Yes, Reindex')).toBeInTheDocument();
    expect(screen.queryByText('Reindexing...')).not.toBeInTheDocument();
  });

  it('disables both buttons when loading', () => {
    render(<EmbeddingReindexDialog {...defaultProps} loading={true} />);
    expect(screen.getByTestId('reindex-cancel-btn')).toBeDisabled();
    expect(screen.getByTestId('reindex-confirm-btn')).toBeDisabled();
  });

  it('enables both buttons when not loading', () => {
    render(<EmbeddingReindexDialog {...defaultProps} loading={false} />);
    expect(screen.getByTestId('reindex-cancel-btn')).not.toBeDisabled();
    expect(screen.getByTestId('reindex-confirm-btn')).not.toBeDisabled();
  });

  it('renders with different source/course counts', () => {
    render(
      <EmbeddingReindexDialog
        {...defaultProps}
        totalSources={100}
        courseCount={10}
      />
    );
    expect(screen.getByText(/100 sources in 10 courses/)).toBeInTheDocument();
  });

  it('renders with zero sources gracefully', () => {
    render(
      <EmbeddingReindexDialog
        {...defaultProps}
        totalSources={0}
        courseCount={0}
      />
    );
    expect(screen.getByText(/0 sources in 0 courses/)).toBeInTheDocument();
  });

  it('has proper dialog structure (header, footer)', () => {
    render(<EmbeddingReindexDialog {...defaultProps} />);
    // Dialog should have both title and description
    const title = screen.getByText('Confirm Reindex');
    expect(title.tagName).toBeDefined();
    // Cancel text visible
    expect(screen.getByText('Cancel')).toBeInTheDocument();
  });
});

describe('EmbeddingReindexDialog — Accessibility', () => {
  const defaultProps = {
    open: true,
    onOpenChange: vi.fn(),
    onConfirm: vi.fn(),
    loading: false,
    totalSources: 50,
    courseCount: 3,
  };

  it('dialog description has explicit id for aria-describedby', () => {
    render(<EmbeddingReindexDialog {...defaultProps} />);
    const desc = document.getElementById('reindex-dialog-description');
    expect(desc).toBeInTheDocument();
    expect(desc?.textContent).toContain('50 sources');
  });

  it('confirm button has aria-describedby linking to dialog description', () => {
    render(<EmbeddingReindexDialog {...defaultProps} />);
    const confirmBtn = screen.getByTestId('reindex-confirm-btn');
    expect(confirmBtn).toHaveAttribute(
      'aria-describedby',
      'reindex-dialog-description'
    );
  });

  it('loading spinner has aria-hidden="true"', () => {
    render(<EmbeddingReindexDialog {...defaultProps} loading={true} />);
    const confirmBtn = screen.getByTestId('reindex-confirm-btn');
    const svg = confirmBtn.querySelector('svg');
    expect(svg).toHaveAttribute('aria-hidden', 'true');
  });
});
