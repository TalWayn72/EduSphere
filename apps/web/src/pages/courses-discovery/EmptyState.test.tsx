import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string, opts?: Record<string, string>) => opts?.query ? `${k}: ${opts.query}` : k }),
}));

import { EmptyState } from './EmptyState';

describe('EmptyState', () => {
  it('renders noCoursesFound text', () => {
    render(<EmptyState query="" />);
    expect(screen.getByText('noCoursesFound')).toBeInTheDocument();
  });

  it('shows query in message when provided', () => {
    render(<EmptyState query="react" />);
    expect(screen.getByText('noResultsForQuery: react')).toBeInTheDocument();
  });

  it('does not show query message when query empty', () => {
    render(<EmptyState query="" />);
    expect(screen.queryByText(/noResultsForQuery/)).not.toBeInTheDocument();
  });

  it('has correct test id', () => {
    render(<EmptyState query="" />);
    expect(screen.getByTestId('courses-empty-state')).toBeInTheDocument();
  });
});
