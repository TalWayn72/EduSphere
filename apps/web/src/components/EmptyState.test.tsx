import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { EmptyState } from './EmptyState';

describe('EmptyState', () => {
  it('renders the empty-state container', () => {
    render(<EmptyState />);
    expect(screen.getByTestId('empty-state')).toBeInTheDocument();
  });

  it('displays default title from i18n when no title prop', () => {
    render(<EmptyState />);
    expect(screen.getByText('Nothing here yet')).toBeInTheDocument();
  });

  it('displays default description from i18n when no description prop', () => {
    render(<EmptyState />);
    expect(
      screen.getByText('There are no items to display at the moment.')
    ).toBeInTheDocument();
  });

  it('displays custom title when provided', () => {
    render(<EmptyState title="No courses found" />);
    expect(screen.getByText('No courses found')).toBeInTheDocument();
  });

  it('displays custom description when provided', () => {
    render(<EmptyState description="Try adjusting your filters." />);
    expect(screen.getByText('Try adjusting your filters.')).toBeInTheDocument();
  });

  it('renders an icon when provided', () => {
    render(
      <EmptyState
        icon={<span data-testid="custom-icon">icon</span>}
      />
    );
    expect(screen.getByTestId('custom-icon')).toBeInTheDocument();
  });

  it('does not render icon container when no icon provided', () => {
    const { container } = render(<EmptyState />);
    expect(container.querySelector('[aria-hidden="true"]')).toBeNull();
  });

  it('renders action button when actionLabel and onAction provided', () => {
    const handler = vi.fn();
    render(<EmptyState actionLabel="Create New" onAction={handler} />);
    const btn = screen.getByRole('button', { name: 'Create New' });
    expect(btn).toBeInTheDocument();
    fireEvent.click(btn);
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('does not render action button when only actionLabel is provided', () => {
    render(<EmptyState actionLabel="Create New" />);
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('does not render action button when only onAction is provided', () => {
    render(<EmptyState onAction={vi.fn()} />);
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('applies custom className', () => {
    render(<EmptyState className="my-custom-class" />);
    expect(screen.getByTestId('empty-state')).toHaveClass('my-custom-class');
  });

  it('has no raw i18n keys visible', () => {
    render(<EmptyState />);
    const text = document.body.textContent ?? '';
    expect(text).not.toContain('emptyState.defaultTitle');
    expect(text).not.toContain('emptyState.defaultDescription');
  });
});
