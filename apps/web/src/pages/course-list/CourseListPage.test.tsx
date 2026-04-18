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
  Layout: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="layout">{children}</div>
  ),
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({
    children,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement> & {
    children: React.ReactNode;
  }) => <button {...props}>{children}</button>,
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

const mockUseCourseListData = vi.fn();

vi.mock('./useCourseListData', () => ({
  useCourseListData: () => mockUseCourseListData(),
}));

function makeDefaultHookReturn(overrides: Record<string, unknown> = {}) {
  return {
    isInstructor: true,
    fetching: false,
    error: null,
    isNetworkError: false,
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
    ...overrides,
  };
}

import { CourseList } from './CourseListPage';

describe('CourseListPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseCourseListData.mockReturnValue(makeDefaultHookReturn());
  });

  it('renders inside Layout', () => {
    render(
      <MemoryRouter>
        <CourseList />
      </MemoryRouter>
    );
    expect(screen.getByTestId('layout')).toBeInTheDocument();
  });

  it('renders course title heading', () => {
    render(
      <MemoryRouter>
        <CourseList />
      </MemoryRouter>
    );
    expect(screen.getByText('title')).toBeInTheDocument();
  });

  it('renders course filters', () => {
    render(
      <MemoryRouter>
        <CourseList />
      </MemoryRouter>
    );
    expect(screen.getByTestId('course-filters')).toBeInTheDocument();
  });

  it('renders course grid', () => {
    render(
      <MemoryRouter>
        <CourseList />
      </MemoryRouter>
    );
    expect(screen.getByTestId('course-grid')).toBeInTheDocument();
  });

  it('shows new course button for instructor', () => {
    render(
      <MemoryRouter>
        <CourseList />
      </MemoryRouter>
    );
    expect(screen.getByText('newCourse')).toBeInTheDocument();
  });

  it('shows AI creator button for instructor', () => {
    render(
      <MemoryRouter>
        <CourseList />
      </MemoryRouter>
    );
    expect(screen.getByText('aiCreator.aiCreateCourse')).toBeInTheDocument();
  });

  // ── OfflineBanner visibility rules ───────────────────────────────────────

  it('does NOT show OfflineBanner for a GraphQL error (server responded)', () => {
    // isNetworkError=false means the server responded with GraphQL errors —
    // not a network failure. The banner must stay hidden.
    mockUseCourseListData.mockReturnValue(
      makeDefaultHookReturn({ isNetworkError: false, fetching: false })
    );
    render(
      <MemoryRouter>
        <CourseList />
      </MemoryRouter>
    );
    expect(screen.queryByTestId('offline-banner')).not.toBeInTheDocument();
  });

  it('does NOT show OfflineBanner while a retry is in-flight (fetching=true)', () => {
    // Even when a network error has been set, if fetching=true the user already
    // triggered a retry — the banner should be suppressed to avoid flicker.
    mockUseCourseListData.mockReturnValue(
      makeDefaultHookReturn({ isNetworkError: true, fetching: true })
    );
    render(
      <MemoryRouter>
        <CourseList />
      </MemoryRouter>
    );
    expect(screen.queryByTestId('offline-banner')).not.toBeInTheDocument();
  });

  it('DOES show OfflineBanner for a genuine network error when not fetching', () => {
    mockUseCourseListData.mockReturnValue(
      makeDefaultHookReturn({ isNetworkError: true, fetching: false })
    );
    render(
      <MemoryRouter>
        <CourseList />
      </MemoryRouter>
    );
    expect(screen.getByTestId('offline-banner')).toBeInTheDocument();
  });
});
