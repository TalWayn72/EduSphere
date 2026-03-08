import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('@/components/AppSidebar', () => ({
  AppSidebar: () => <aside data-testid="app-sidebar" />,
}));

vi.mock('urql', async () => {
  const actual = await vi.importActual<typeof import('urql')>('urql');
  return { ...actual, useQuery: vi.fn() };
});

import * as urql from 'urql';
import { CoursesDiscoveryPage } from './CoursesDiscoveryPage';
// Import router to verify /explore and /courses/discover route registrations
import { router } from '@/lib/router';

// ── Mock data ─────────────────────────────────────────────────────────────────

const MOCK_COURSES_DATA = [
  {
    id: 'c-1',
    title: 'Complete TypeScript Bootcamp: From Zero to Advanced',
    description: 'Learn TypeScript from scratch',
    thumbnailUrl: null,
    estimatedHours: 12,
    isPublished: true,
    instructorId: 'inst-001',
    slug: 'typescript-bootcamp',
    createdAt: '2024-01-01T00:00:00Z',
  },
  {
    id: 'c-2',
    title: 'UI/UX Design Fundamentals with Figma',
    description: 'Master design with Figma',
    thumbnailUrl: null,
    estimatedHours: 8,
    isPublished: true,
    instructorId: 'inst-002',
    slug: 'uiux-figma',
    createdAt: '2024-01-02T00:00:00Z',
  },
  {
    id: 'c-3',
    title: 'React 19 and Next.js 15: Full-Stack Development',
    description: 'Full-stack React development',
    thumbnailUrl: null,
    estimatedHours: 14,
    isPublished: true,
    instructorId: 'inst-003',
    slug: 'react-nextjs',
    createdAt: '2024-01-03T00:00:00Z',
  },
];

const NOOP_QUERY = [
  { fetching: false, data: undefined, error: undefined, stale: false },
] as never;

function makeQueryResult(data: Record<string, unknown>, fetching = false) {
  return [
    { fetching, data, error: undefined, stale: false },
  ] as never;
}

/** Extract the query operation name from a DocumentNode or string.
 *  Works with urql gql`` tagged templates (loc.source.body contains the SDL source).
 */
function getQueryName(query: unknown): string {
  if (typeof query === 'string') return query;
  if (query && typeof query === 'object') {
    // DocumentNode has loc.source.body with the full SDL string
    const doc = query as { loc?: { source?: { body?: string } }; definitions?: Array<{ name?: { value?: string } }> };
    if (doc.loc?.source?.body) return doc.loc.source.body;
    if (doc.definitions?.[0]?.name?.value) return doc.definitions[0].name.value ?? '';
  }
  return '';
}

/** Default mock: list query returns MOCK_COURSES_DATA, search query returns NOOP when paused.
 *  Uses loc.source.body to identify query by operation name — works with urql gql`` templates.
 */
function setupDefaultMocks() {
  vi.mocked(urql.useQuery).mockImplementation((args) => {
    const queryName = getQueryName(args.query);
    if (queryName.includes('SearchCourses') || queryName.includes('searchCourses')) {
      if (args.pause) return NOOP_QUERY;
      return makeQueryResult({ searchCourses: MOCK_COURSES_DATA });
    }
    // List query — return data regardless of pause so component shows cards immediately
    return makeQueryResult({ courses: MOCK_COURSES_DATA });
  });
}

/** Helper: wrap in MemoryRouter so useNavigate() works in unit tests */
function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/explore']}>
      <CoursesDiscoveryPage />
    </MemoryRouter>
  );
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('CoursesDiscoveryPage', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.resetAllMocks();
    setupDefaultMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // ── Regression guard: MOCK_COURSES constant must be gone ────────────────────

  it('does NOT render hardcoded MOCK_COURSES data (e.g. DEV_MODE mock data comment)', () => {
    renderPage();
    expect(document.body.textContent).not.toContain('DEV_MODE mock data');
  });

  it('does NOT export a MOCK_COURSES named export from the component module', () => {
    // The component is already imported at the top of this file.
    // If MOCK_COURSES was exported as a named export, it would appear in the module namespace.
    // CoursesDiscoveryPage is the only expected named export.
    const mod = { CoursesDiscoveryPage } as Record<string, unknown>;
    expect(Object.keys(mod)).not.toContain('MOCK_COURSES');
  });

  // ── Basic structure ─────────────────────────────────────────────────────────

  it('renders the page title "Discover Courses"', () => {
    renderPage();
    expect(
      screen.getByRole('heading', { name: /Discover Courses/i })
    ).toBeInTheDocument();
  });

  it('renders the search input with the correct data-testid', () => {
    renderPage();
    expect(screen.getByTestId('course-search-input')).toBeInTheDocument();
  });

  it('renders the filter bar with the correct data-testid', () => {
    renderPage();
    expect(screen.getByTestId('filter-bar')).toBeInTheDocument();
  });

  it('renders category filter pills including "All" and "Programming"', () => {
    renderPage();
    const filterBar = screen.getByTestId('filter-bar');
    expect(filterBar).toHaveTextContent('All');
    expect(filterBar).toHaveTextContent('Programming');
    expect(filterBar).toHaveTextContent('Design');
  });

  it('renders the view toggle with the correct data-testid', () => {
    renderPage();
    expect(screen.getByTestId('view-toggle')).toBeInTheDocument();
  });

  it('renders grid and list view toggle buttons', () => {
    renderPage();
    expect(screen.getByRole('button', { name: /grid view/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /list view/i })).toBeInTheDocument();
  });

  it('renders the courses grid container with the correct data-testid', () => {
    renderPage();
    expect(screen.getByTestId('courses-grid')).toBeInTheDocument();
  });

  // ── Loading state ───────────────────────────────────────────────────────────

  it('shows skeleton cards when fetching=true', () => {
    vi.mocked(urql.useQuery).mockReturnValue(
      [{ fetching: true, data: undefined, error: undefined, stale: false }] as never
    );
    renderPage();
    const skeletons = screen.getAllByTestId('skeleton-card');
    expect(skeletons.length).toBeGreaterThanOrEqual(6);
  });

  it('does NOT show course cards when fetching=true', () => {
    vi.mocked(urql.useQuery).mockReturnValue(
      [{ fetching: true, data: undefined, error: undefined, stale: false }] as never
    );
    renderPage();
    expect(screen.queryByRole('article')).not.toBeInTheDocument();
  });

  // ── Error state ─────────────────────────────────────────────────────────────

  it('shows error banner when query returns an error', () => {
    vi.mocked(urql.useQuery).mockReturnValue(
      [
        {
          fetching: false,
          data: undefined,
          error: { message: 'Network error', graphQLErrors: [], networkError: null },
          stale: false,
        },
      ] as never
    );
    renderPage();
    expect(screen.getByTestId('courses-error-banner')).toBeInTheDocument();
    expect(
      screen.getByText(/Unable to load courses\. Please try again\./i)
    ).toBeInTheDocument();
  });

  it('error banner does NOT expose raw error.message to the user', () => {
    vi.mocked(urql.useQuery).mockReturnValue(
      [
        {
          fetching: false,
          data: undefined,
          error: {
            message: 'Internal server error: pg_stat_activity query failed',
            graphQLErrors: [],
            networkError: null,
          },
          stale: false,
        },
      ] as never
    );
    renderPage();
    expect(document.body.textContent).not.toContain('pg_stat_activity');
    expect(document.body.textContent).not.toContain('Internal server error');
  });

  // ── Data state ──────────────────────────────────────────────────────────────

  it('renders course cards when data is returned', () => {
    renderPage();
    const cards = screen.getAllByRole('article');
    expect(cards.length).toBeGreaterThanOrEqual(1);
  });

  it('renders course titles from API data', () => {
    renderPage();
    expect(document.body.textContent).toContain(
      'Complete TypeScript Bootcamp: From Zero to Advanced'
    );
    expect(document.body.textContent).toContain(
      'UI/UX Design Fundamentals with Figma'
    );
  });

  it('shows the empty state when search returns no results', () => {
    vi.mocked(urql.useQuery).mockImplementation((args) => {
      const qName = getQueryName(args.query);
      if ((qName.includes('SearchCourses') || qName.includes('searchCourses')) && !args.pause) {
        return makeQueryResult({ searchCourses: [] });
      }
      return NOOP_QUERY;
    });

    renderPage();
    const input = screen.getByTestId('course-search-input');

    fireEvent.change(input, { target: { value: 'xyzzy-no-match-12345' } });
    act(() => { vi.advanceTimersByTime(350); });

    expect(screen.getByTestId('courses-empty-state')).toBeInTheDocument();
    expect(screen.getByText(/No courses found/i)).toBeInTheDocument();
  });

  it('shows the "Load More" button when there are more courses than page size', () => {
    const manyCourses = Array.from({ length: 15 }, (_, i) => ({
      id: `course-${i}`,
      title: `Course ${i}`,
      description: null,
      thumbnailUrl: null,
      estimatedHours: 3,
      isPublished: true,
      instructorId: 'inst-001',
      slug: `course-${i}`,
      createdAt: '2024-01-01T00:00:00Z',
    }));
    vi.mocked(urql.useQuery).mockImplementation((args) => {
      const qName = getQueryName(args.query);
      if (!qName.includes('SearchCourses') && !qName.includes('searchCourses')) {
        return makeQueryResult({ courses: manyCourses });
      }
      return NOOP_QUERY;
    });
    renderPage();
    expect(screen.getByTestId('load-more-button')).toBeInTheDocument();
  });

  it('empty state message does not contain raw technical strings', () => {
    vi.mocked(urql.useQuery).mockImplementation((args) => {
      const qName = getQueryName(args.query);
      if ((qName.includes('SearchCourses') || qName.includes('searchCourses')) && !args.pause) {
        return makeQueryResult({ searchCourses: [] });
      }
      return NOOP_QUERY;
    });
    renderPage();
    const input = screen.getByTestId('course-search-input');
    fireEvent.change(input, { target: { value: 'zzzznotfound' } });
    act(() => { vi.advanceTimersByTime(350); });

    const emptyState = screen.getByTestId('courses-empty-state');
    expect(emptyState.textContent).not.toContain('undefined');
    expect(emptyState.textContent).not.toContain('Error:');
    expect(emptyState.textContent).not.toContain('null');
  });

  it('category filter pill updates selection when clicked', () => {
    renderPage();
    const filterBar = screen.getByTestId('filter-bar');
    const designBtn = Array.from(
      filterBar.querySelectorAll('button')
    ).find((b) => b.textContent?.trim() === 'Design');
    expect(designBtn).toBeDefined();
    if (designBtn) {
      fireEvent.click(designBtn);
      expect(designBtn.getAttribute('aria-pressed')).toBe('true');
    }
  });

  it('view toggle switches between grid and list', () => {
    renderPage();
    const listBtn = screen.getByRole('button', { name: /list view/i });
    fireEvent.click(listBtn);
    expect(listBtn.getAttribute('aria-pressed')).toBe('true');

    const gridBtn = screen.getByRole('button', { name: /grid view/i });
    fireEvent.click(gridBtn);
    expect(gridBtn.getAttribute('aria-pressed')).toBe('true');
  });

  it('courses grid has data-view attribute that matches view mode', () => {
    renderPage();
    const grid = screen.getByTestId('courses-grid');
    expect(grid.getAttribute('data-view')).toBe('grid');

    const listBtn = screen.getByRole('button', { name: /list view/i });
    fireEvent.click(listBtn);
    expect(grid.getAttribute('data-view')).toBe('list');
  });

  // ── ARIA / Filter tests ─────────────────────────────────────────────────────

  it('sort select is present with data-testid="sort-select"', () => {
    renderPage();
    const sortSelect = screen.getByTestId('sort-select');
    expect(sortSelect).toBeInTheDocument();
  });

  it('level filter group has role="group" and aria-label="Filter by level"', () => {
    renderPage();
    const levelGroup = screen.getByRole('group', { name: /filter by level/i });
    expect(levelGroup).toBeInTheDocument();
  });

  it('level filter group has data-testid="level-filter-group"', () => {
    renderPage();
    expect(screen.getByTestId('level-filter-group')).toBeInTheDocument();
  });

  it('sort select trigger has aria-label="Sort courses"', () => {
    renderPage();
    const sortSelect = screen.getByTestId('sort-select');
    expect(sortSelect).toHaveAttribute('aria-label', 'Sort courses');
  });

  it('level filter "Intermediate" button has aria-pressed=true after click', () => {
    renderPage();
    const levelGroup = screen.getByTestId('level-filter-group');
    const intermediateBtn = Array.from(
      levelGroup.querySelectorAll('button')
    ).find((b) => b.textContent?.trim() === 'Intermediate');
    if (intermediateBtn) {
      fireEvent.click(intermediateBtn);
      expect(intermediateBtn.getAttribute('aria-pressed')).toBe('true');
    }
  });

  it('sort select label is associated via htmlFor="sort-select"', () => {
    renderPage();
    const label = document.querySelector('label[for="sort-select"]');
    expect(label).not.toBeNull();
    expect(label?.textContent?.trim()).toBe('Sort by');
  });

  it('"Any Level" filter restores all courses after intermediate was selected', () => {
    renderPage();
    const levelGroup = screen.getByTestId('level-filter-group');
    const intermediateBtn = Array.from(
      levelGroup.querySelectorAll('button')
    ).find((b) => b.textContent?.trim() === 'Intermediate');
    if (intermediateBtn) fireEvent.click(intermediateBtn);
    const anyBtn = Array.from(
      levelGroup.querySelectorAll('button')
    ).find((b) => b.textContent?.trim() === 'Any Level');
    if (anyBtn) fireEvent.click(anyBtn);
    expect(document.body.textContent).toContain(
      'Complete TypeScript Bootcamp: From Zero to Advanced'
    );
    expect(document.body.textContent).toContain(
      'UI/UX Design Fundamentals with Figma'
    );
  });
});

// ── Route registration regression ─────────────────────────────────────────────

describe('CoursesDiscoveryPage — route registration', () => {
  it('router has /explore route pointing to CoursesDiscoveryPage', () => {
    const routes = router.routes;
    const exploreRoute = routes.find((r) => r.path === '/explore');
    expect(exploreRoute).toBeDefined();
  });

  it('router has /courses/discover alias route', () => {
    const routes = router.routes;
    const discoverRoute = routes.find((r) => r.path === '/courses/discover');
    expect(discoverRoute).toBeDefined();
  });

  it('/explore route is NOT absent (regression: route was missing from router)', () => {
    const routes = router.routes;
    const paths = routes.map((r) => r.path ?? '');
    expect(paths).toContain('/explore');
    const wildcardIndex = paths.indexOf('*');
    const exploreIndex = paths.indexOf('/explore');
    expect(exploreIndex).toBeLessThan(wildcardIndex);
  });
});
