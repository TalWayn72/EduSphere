import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// ── Mocks ───────────────────────────────────────────────────────────────────

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (k: string) => k,
    i18n: { language: 'en', changeLanguage: vi.fn() },
  }),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useParams: () => ({ courseId: 'c-1' }) };
});

vi.mock('@/hooks/useUnsavedChangesGuard', () => ({
  useUnsavedChangesGuard: () => ({ state: 'idle', proceed: vi.fn(), reset: vi.fn() }),
}));

vi.mock('@/components/UnsavedChangesDialog', () => ({
  UnsavedChangesDialog: () => null,
}));

vi.mock('@/components/Layout', () => ({
  Layout: ({ children }: { children: React.ReactNode }) => <div data-testid="layout">{children}</div>,
}));

vi.mock('@/components/PageShell', () => ({
  PageShell: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/components/PageHeader', () => ({
  PageHeader: ({ title }: { title: string }) => <h1>{title}</h1>,
}));

vi.mock('@/lib/auth', () => ({
  getCurrentUser: () => ({ role: 'INSTRUCTOR' }),
}));

const mockQueries = {
  course: {
    id: 'c-1',
    title: 'Test Course',
    description: 'A course',
    thumbnailUrl: null,
    estimatedHours: 3,
    isPublished: true,
    instructorId: 'u-1',
    modules: [],
  },
  lessons: [{ id: 'l-1', title: 'Lesson 1', type: 'VIDEO', status: 'PUBLISHED' }],
  fetching: false,
  isEnrolled: false,
  optimisticEnrolled: false,
  progress: undefined,
  toast: null,
  forkError: null,
  setForkError: vi.fn(),
  isForkingCourse: false,
  isSavingTitle: false,
  isEnrolling: false,
  handleEnroll: vi.fn(),
  handleForkCourse: vi.fn(),
  handleSaveTitle: vi.fn(),
};

vi.mock('./useCourseDetailQueries', () => ({
  useCourseDetailQueries: () => mockQueries,
}));

vi.mock('./CourseHeaderCard', () => ({
  CourseHeaderCard: () => <div data-testid="course-header-card" />,
}));

vi.mock('./CourseLessonsSection', () => ({
  CourseLessonsSection: () => <div data-testid="course-lessons-section" />,
}));

vi.mock('./CourseSourcesPanel', () => ({
  CourseSourcesPanel: () => <div data-testid="course-sources-panel" />,
}));

vi.mock('../CourseDetailPage.modules', () => ({
  CourseModuleList: () => <div data-testid="course-module-list" />,
}));

import React from 'react';
import { CourseDetailPage } from './CourseDetailPage';

describe('CourseDetailPage', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders inside Layout', () => {
    render(<MemoryRouter><CourseDetailPage /></MemoryRouter>);
    expect(screen.getByTestId('layout')).toBeInTheDocument();
  });

  it('renders course title via PageHeader', () => {
    render(<MemoryRouter><CourseDetailPage /></MemoryRouter>);
    expect(screen.getByText('Test Course')).toBeInTheDocument();
  });

  it('renders CourseHeaderCard sub-component', () => {
    render(<MemoryRouter><CourseDetailPage /></MemoryRouter>);
    expect(screen.getByTestId('course-header-card')).toBeInTheDocument();
  });

  it('renders CourseLessonsSection sub-component', () => {
    render(<MemoryRouter><CourseDetailPage /></MemoryRouter>);
    expect(screen.getByTestId('course-lessons-section')).toBeInTheDocument();
  });

  it('renders CourseSourcesPanel sub-component', () => {
    render(<MemoryRouter><CourseDetailPage /></MemoryRouter>);
    expect(screen.getByTestId('course-sources-panel')).toBeInTheDocument();
  });

  it('renders CourseModuleList sub-component', () => {
    render(<MemoryRouter><CourseDetailPage /></MemoryRouter>);
    expect(screen.getByTestId('course-module-list')).toBeInTheDocument();
  });

  it('shows loading state when fetching', () => {
    mockQueries.fetching = true;
    mockQueries.course = null as never;
    render(<MemoryRouter><CourseDetailPage /></MemoryRouter>);
    expect(screen.getByText('loadingCourse')).toBeInTheDocument();
    mockQueries.fetching = false;
    mockQueries.course = {
      id: 'c-1', title: 'Test Course', description: 'A course',
      thumbnailUrl: null, estimatedHours: 3, isPublished: true,
      instructorId: 'u-1', modules: [],
    };
  });
});
