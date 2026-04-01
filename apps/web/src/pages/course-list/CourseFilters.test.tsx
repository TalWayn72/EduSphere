import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (k: string) => k,
    i18n: { language: 'en', changeLanguage: vi.fn() },
  }),
}));

import { CourseFilters } from './CourseFilters';

const baseProps = {
  search: '',
  onSearchChange: vi.fn(),
  sort: 'newest' as const,
  onSortChange: vi.fn(),
  activeTab: 'all' as const,
  onTabChange: vi.fn(),
  isInstructor: false,
};

describe('CourseFilters', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders search input', () => {
    render(<CourseFilters {...baseProps} />);
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('calls onSearchChange when typing', () => {
    render(<CourseFilters {...baseProps} />);
    fireEvent.change(screen.getByRole('textbox'), {
      target: { value: 'react' },
    });
    expect(baseProps.onSearchChange).toHaveBeenCalledWith('react');
  });

  it('renders tab filters for non-instructor', () => {
    render(<CourseFilters {...baseProps} />);
    expect(screen.getByRole('tab', { name: 'all' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'myCourses' })).toBeInTheDocument();
  });

  it('hides tab filters for instructor', () => {
    render(<CourseFilters {...baseProps} isInstructor={true} />);
    expect(screen.queryByRole('tablist')).not.toBeInTheDocument();
  });

  it('calls onTabChange when tab clicked', () => {
    render(<CourseFilters {...baseProps} />);
    fireEvent.click(screen.getByRole('tab', { name: 'myCourses' }));
    expect(baseProps.onTabChange).toHaveBeenCalledWith('enrolled');
  });

  it('renders sort dropdown with options', () => {
    render(<CourseFilters {...baseProps} />);
    const select = screen.getByRole('combobox');
    expect(select).toBeInTheDocument();
  });

  it('marks active tab as selected', () => {
    render(<CourseFilters {...baseProps} activeTab="enrolled" />);
    expect(screen.getByRole('tab', { name: 'myCourses' })).toHaveAttribute(
      'aria-selected',
      'true'
    );
  });
});
