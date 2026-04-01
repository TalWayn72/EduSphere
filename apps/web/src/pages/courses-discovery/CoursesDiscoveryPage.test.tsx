import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import React from 'react';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (k: string) => k,
    i18n: { language: 'en', changeLanguage: vi.fn() },
  }),
}));

vi.mock('@/components/Layout', () => ({
  Layout: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="layout">{children}</div>
  ),
}));

vi.mock('@/components/ui/input', () => ({
  Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => (
    <input {...props} />
  ),
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({
    children,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement> & {
    children?: React.ReactNode;
    variant?: string;
    size?: string;
  }) => <button {...props}>{children}</button>,
}));

vi.mock('@/components/PageShell', () => ({
  PageShell: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="page-shell">{children}</div>
  ),
}));

vi.mock('@/components/CourseCard', () => ({
  CourseCard: () => <div data-testid="course-card" />,
}));

vi.mock('lucide-react', () => ({
  LayoutGrid: () => <span>grid-icon</span>,
  List: () => <span>list-icon</span>,
}));

vi.mock('./useCoursesDiscovery', () => ({
  useCoursesDiscovery: () => ({
    searchValue: '',
    debouncedSearch: '',
    handleSearchChange: vi.fn(),
    selectedCategory: 'All',
    setSelectedCategory: vi.fn(),
    selectedLevel: 'Any Level',
    setSelectedLevel: vi.fn(),
    selectedSort: 'popular',
    setSelectedSort: vi.fn(),
    selectedDuration: 'Any Duration',
    setSelectedDuration: vi.fn(),
    viewMode: 'grid',
    setViewMode: vi.fn(),
    fetching: false,
    error: false,
    allCourses: [],
    filtered: [],
    visible: [],
    enrolledIds: new Set(),
    hasMore: false,
    resetPagination: vi.fn(),
    loadMore: vi.fn(),
  }),
}));

vi.mock('./DiscoveryFilters', () => ({
  DiscoveryFilters: () => <div data-testid="discovery-filters" />,
}));

vi.mock('./EmptyState', () => ({
  EmptyState: () => <div data-testid="empty-state" />,
}));

vi.mock('./ErrorBanner', () => ({
  ErrorBanner: () => <div data-testid="error-banner" />,
}));

vi.mock('./SkeletonCard', () => ({
  SkeletonCard: () => <div data-testid="skeleton-card" />,
}));

import { CoursesDiscoveryPage } from './CoursesDiscoveryPage';

describe('CoursesDiscoveryPage', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders inside Layout', () => {
    render(
      <MemoryRouter>
        <CoursesDiscoveryPage />
      </MemoryRouter>
    );
    expect(screen.getByTestId('layout')).toBeInTheDocument();
  });

  it('renders discovery filters', () => {
    render(
      <MemoryRouter>
        <CoursesDiscoveryPage />
      </MemoryRouter>
    );
    expect(screen.getByTestId('discovery-filters')).toBeInTheDocument();
  });

  it('shows empty state when no courses', () => {
    render(
      <MemoryRouter>
        <CoursesDiscoveryPage />
      </MemoryRouter>
    );
    expect(screen.getByTestId('empty-state')).toBeInTheDocument();
  });
});
