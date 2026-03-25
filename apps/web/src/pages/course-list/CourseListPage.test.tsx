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

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => vi.fn() };
});

vi.mock('@/components/Layout', () => ({
  Layout: ({ children }: { children: React.ReactNode }) => <div data-testid="layout">{children}</div>,
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { children: React.ReactNode }) =>
    <button {...props}>{children}</button>,
}));

vi.mock('@/components/AiCourseCreatorModal', () => ({
  AiCourseCreatorModal: () => null,
}));

vi.mock('./OfflineBanner', () => ({
  OfflineBanner: () => <div data-testid="offline-banner" />,
}));

vi.mock('./CourseFilters', () => ({
  CourseFilters: () => <div data-testid="course-filters" />,
}));

vi.mock('./CourseGrid', () => ({
  CourseGrid: () => <div data-testid="course-grid" />,
}));

vi.mock('./useCourseListData', () => ({
  useCourseListData: () => ({
    isInstructor: true,
    fetching: false,
    error: null,
    reexecuteCourses: vi.fn(),
    search: '',
    setSearch: vi.fn(),
    sort: 'newest',
    setSort: vi.fn(),
    activeTab: 'all',
    setActiveTab: vi.fn(),
    toast: null,
    aiModalOpen: false,
    setAiModalOpen: vi.fn(),
    enrolledCourseIds: new Set(),
    filteredCourses: [],
    handleEnroll: vi.fn(),
    togglePublish: vi.fn(),
    isPublished: vi.fn(),
  }),
}));

import { CourseList } from './CourseListPage';

describe('CourseListPage', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders inside Layout', () => {
    render(<MemoryRouter><CourseList /></MemoryRouter>);
    expect(screen.getByTestId('layout')).toBeInTheDocument();
  });

  it('renders course title heading', () => {
    render(<MemoryRouter><CourseList /></MemoryRouter>);
    expect(screen.getByText('title')).toBeInTheDocument();
  });

  it('renders course filters', () => {
    render(<MemoryRouter><CourseList /></MemoryRouter>);
    expect(screen.getByTestId('course-filters')).toBeInTheDocument();
  });

  it('renders course grid', () => {
    render(<MemoryRouter><CourseList /></MemoryRouter>);
    expect(screen.getByTestId('course-grid')).toBeInTheDocument();
  });

  it('shows new course button for instructor', () => {
    render(<MemoryRouter><CourseList /></MemoryRouter>);
    expect(screen.getByText('newCourse')).toBeInTheDocument();
  });

  it('shows AI creator button for instructor', () => {
    render(<MemoryRouter><CourseList /></MemoryRouter>);
    expect(screen.getByText('aiCreator.aiCreateCourse')).toBeInTheDocument();
  });
});
