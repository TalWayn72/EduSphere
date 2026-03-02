import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return {
    ...actual,
    useNavigate: vi.fn(() => mockNavigate),
    useSearchParams: vi.fn(),
  };
});

vi.mock('@/hooks/useCourseNavigation', () => ({
  useCourseNavigation: vi.fn(),
}));

// ── Imports after mocks ───────────────────────────────────────────────────────

import { ContentViewerBreadcrumb } from './ContentViewerBreadcrumb';
import { useCourseNavigation } from '@/hooks/useCourseNavigation';
import { useSearchParams } from 'react-router-dom';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const BASE_NAV = {
  courseId: 'course-1',
  courseTitle: 'Intro to Talmud',
  moduleName: 'Module One',
  prevItemId: null as string | null,
  nextItemId: null as string | null,
  ready: true,
};

function setupSearchParams(courseId: string | null = 'course-1') {
  vi.mocked(useSearchParams).mockReturnValue([
    new URLSearchParams(courseId ? { courseId } : {}),
    vi.fn(),
  ] as never);
}

function renderBreadcrumb(
  props = { contentId: 'content-1', contentTitle: 'Lesson 1' }
) {
  return render(
    <MemoryRouter>
      <ContentViewerBreadcrumb {...props} />
    </MemoryRouter>
  );
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('ContentViewerBreadcrumb', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupSearchParams('course-1');
    vi.mocked(useCourseNavigation).mockReturnValue(BASE_NAV);
  });

  it('renders nothing when not ready', () => {
    vi.mocked(useCourseNavigation).mockReturnValue({
      ...BASE_NAV,
      ready: false,
    });
    const { container } = renderBreadcrumb();
    expect(container.firstChild).toBeNull();
  });

  it('renders nothing when courseId search param is absent', () => {
    setupSearchParams(null);
    const { container } = renderBreadcrumb();
    expect(container.firstChild).toBeNull();
  });

  it('renders nothing when useCourseNavigation returns no courseId', () => {
    vi.mocked(useCourseNavigation).mockReturnValue({
      ...BASE_NAV,
      courseId: '',
    });
    const { container } = renderBreadcrumb();
    expect(container.firstChild).toBeNull();
  });

  it('renders the breadcrumb nav when all conditions are met', () => {
    renderBreadcrumb();
    expect(
      screen.getByRole('navigation', { name: /breadcrumb/i })
    ).toBeInTheDocument();
  });

  it('renders "Courses" as the first breadcrumb segment', () => {
    renderBreadcrumb();
    expect(screen.getByText('Courses')).toBeInTheDocument();
  });

  it('renders the course title in the breadcrumb', () => {
    renderBreadcrumb();
    expect(screen.getByText('Intro to Talmud')).toBeInTheDocument();
  });

  it('renders the module name in the breadcrumb', () => {
    renderBreadcrumb();
    expect(screen.getByText('Module One')).toBeInTheDocument();
  });

  it('renders the content title in the breadcrumb', () => {
    renderBreadcrumb();
    expect(screen.getByText('Lesson 1')).toBeInTheDocument();
  });

  it('Prev button is disabled when no prevItemId', () => {
    vi.mocked(useCourseNavigation).mockReturnValue({
      ...BASE_NAV,
      prevItemId: null,
    });
    renderBreadcrumb();
    expect(screen.getByRole('button', { name: /prev/i })).toBeDisabled();
  });

  it('Next button is disabled when no nextItemId', () => {
    vi.mocked(useCourseNavigation).mockReturnValue({
      ...BASE_NAV,
      nextItemId: null,
    });
    renderBreadcrumb();
    expect(screen.getByRole('button', { name: /next/i })).toBeDisabled();
  });

  it('Prev button is enabled when prevItemId is provided', () => {
    vi.mocked(useCourseNavigation).mockReturnValue({
      ...BASE_NAV,
      prevItemId: 'content-0',
    });
    renderBreadcrumb();
    expect(screen.getByRole('button', { name: /prev/i })).not.toBeDisabled();
  });

  it('Next button is enabled when nextItemId is provided', () => {
    vi.mocked(useCourseNavigation).mockReturnValue({
      ...BASE_NAV,
      nextItemId: 'content-2',
    });
    renderBreadcrumb();
    expect(screen.getByRole('button', { name: /next/i })).not.toBeDisabled();
  });

  it('clicking "Courses" navigates to /courses', () => {
    renderBreadcrumb();
    fireEvent.click(screen.getByText('Courses'));
    expect(mockNavigate).toHaveBeenCalledWith('/courses');
  });

  it('clicking course title navigates to the course detail page', () => {
    renderBreadcrumb();
    fireEvent.click(screen.getByText('Intro to Talmud'));
    expect(mockNavigate).toHaveBeenCalledWith('/courses/course-1');
  });

  it('passes contentId to useCourseNavigation hook', () => {
    renderBreadcrumb({ contentId: 'item-99', contentTitle: 'Lesson' });
    expect(vi.mocked(useCourseNavigation)).toHaveBeenCalledWith('item-99');
  });
});
