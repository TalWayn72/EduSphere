import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}));

vi.mock('@/components/ui/select', () => ({
  Select: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectItem: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectValue: () => <span />,
}));

import { DiscoveryFilters } from './DiscoveryFilters';

describe('DiscoveryFilters', () => {
  const props = {
    selectedCategory: 'All',
    onCategoryChange: vi.fn(),
    selectedLevel: 'Any Level',
    onLevelChange: vi.fn(),
    selectedDuration: 'Any Duration',
    onDurationChange: vi.fn(),
    selectedSort: 'popular' as const,
    onSortChange: vi.fn(),
    onResetPagination: vi.fn(),
  };

  beforeEach(() => vi.clearAllMocks());

  it('renders without crash', () => {
    const { container } = render(<DiscoveryFilters {...props} />);
    expect(container).toBeTruthy();
  });

  it('renders filter bar with data-testid', () => {
    render(<DiscoveryFilters {...props} />);
    expect(screen.getByTestId('filter-bar')).toBeInTheDocument();
  });

  it('renders category filter buttons', () => {
    render(<DiscoveryFilters {...props} />);
    expect(screen.getByText('All')).toBeInTheDocument();
    expect(screen.getByText('Programming')).toBeInTheDocument();
  });

  it('calls onCategoryChange when category button clicked', () => {
    render(<DiscoveryFilters {...props} />);
    fireEvent.click(screen.getByText('Design'));
    expect(props.onCategoryChange).toHaveBeenCalledWith('Design');
    expect(props.onResetPagination).toHaveBeenCalled();
  });

  it('renders level filter group', () => {
    render(<DiscoveryFilters {...props} />);
    expect(screen.getByTestId('level-filter-group')).toBeInTheDocument();
    expect(screen.getByText('Beginner')).toBeInTheDocument();
  });
});
