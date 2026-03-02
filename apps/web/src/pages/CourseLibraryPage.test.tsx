import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('@tanstack/react-query', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-query')>();
  return { ...actual, useQuery: vi.fn(), useMutation: vi.fn() };
});

vi.mock('graphql-request', () => ({
  request: vi.fn(),
  gql: (strings: TemplateStringsArray, ...values: unknown[]) =>
    strings.reduce(
      (acc: string, str: string, i: number) =>
        acc + str + String(values[i] ?? ''),
      ''
    ),
}));

vi.mock('@/lib/graphql/library.queries', () => ({
  LIBRARY_COURSES_QUERY: 'LIBRARY_COURSES_QUERY',
  ACTIVATE_LIBRARY_COURSE_MUTATION: 'ACTIVATE_LIBRARY_COURSE_MUTATION',
}));

// ── Imports after mocks ───────────────────────────────────────────────────────

import { CourseLibraryPage } from './CourseLibraryPage';
import * as tanstack from '@tanstack/react-query';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const MOCK_COURSES = [
  {
    id: 'lib-1',
    title: 'GDPR Essentials',
    description: 'Learn the fundamentals of GDPR compliance.',
    topic: 'GDPR',
    licenseType: 'FREE',
    priceCents: 0,
    durationMinutes: 45,
    isActivated: false,
  },
  {
    id: 'lib-2',
    title: 'SOC 2 Audit Prep',
    description: 'Prepare for SOC 2 Type II audit readiness.',
    topic: 'SOC2',
    licenseType: 'PAID',
    priceCents: 9900,
    durationMinutes: 90,
    isActivated: true,
  },
];

const MOCK_ACTIVATE = vi.fn().mockResolvedValue({});

function setupQueries(
  courses: typeof MOCK_COURSES | null = null,
  isLoading = false,
  error: Error | null = null
) {
  vi.mocked(tanstack.useQuery).mockReturnValue({
    data: courses ? { libraryCourses: courses } : undefined,
    isLoading,
    error,
  } as never);
  vi.mocked(tanstack.useMutation).mockReturnValue({
    mutate: MOCK_ACTIVATE,
    isPending: false,
  } as never);
}

function wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  // @ts-expect-error — React 19 ReactNode includes bigint
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

function renderPage() {
  return render(<CourseLibraryPage />, { wrapper });
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('CourseLibraryPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupQueries();
  });

  it('renders the "Compliance Course Library" heading', () => {
    renderPage();
    expect(screen.getByText('Compliance Course Library')).toBeInTheDocument();
  });

  it('shows loading spinner when isLoading is true', () => {
    setupQueries(null, true);
    const { container } = renderPage();
    expect(container.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('shows error message when query fails', () => {
    setupQueries(null, false, new Error('Network error'));
    renderPage();
    expect(
      screen.getByText(/failed to load compliance course library/i)
    ).toBeInTheDocument();
  });

  it('shows "No courses available" when list is empty', () => {
    setupQueries([]);
    renderPage();
    expect(
      screen.getByText(/no courses available for this category/i)
    ).toBeInTheDocument();
  });

  it('renders course title cards', () => {
    setupQueries(MOCK_COURSES);
    renderPage();
    expect(screen.getByText('GDPR Essentials')).toBeInTheDocument();
    expect(screen.getByText('SOC 2 Audit Prep')).toBeInTheDocument();
  });

  it('renders topic badge on each course', () => {
    setupQueries(MOCK_COURSES);
    renderPage();
    // GDPR appears as both a tab trigger and a course badge — at least 2 matches
    expect(screen.getAllByText('GDPR').length).toBeGreaterThanOrEqual(2);
    // SOC2 badge (tab label is "SOC 2" with space, badge is "SOC2" — distinct)
    expect(screen.getByText('SOC2')).toBeInTheDocument();
  });

  it('shows FREE badge for free courses', () => {
    setupQueries(MOCK_COURSES);
    renderPage();
    expect(screen.getByText('FREE')).toBeInTheDocument();
  });

  it('renders duration in minutes', () => {
    setupQueries(MOCK_COURSES);
    renderPage();
    expect(screen.getByText('45 min')).toBeInTheDocument();
    expect(screen.getByText('90 min')).toBeInTheDocument();
  });

  it('shows Activate button for non-activated courses', () => {
    setupQueries(MOCK_COURSES);
    renderPage();
    expect(
      screen.getByRole('button', { name: /^activate$/i })
    ).toBeInTheDocument();
  });

  it('shows "Activated" badge for already-activated courses', () => {
    setupQueries(MOCK_COURSES);
    renderPage();
    expect(screen.getByText('Activated')).toBeInTheDocument();
  });

  it('opens confirmation dialog when Activate is clicked', () => {
    setupQueries(MOCK_COURSES);
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /^activate$/i }));
    expect(screen.getByText('Activate Course')).toBeInTheDocument();
  });

  it('shows course title in confirmation dialog', () => {
    setupQueries(MOCK_COURSES);
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /^activate$/i }));
    // Course title appears in both the card and the dialog description — accept multiple
    expect(
      screen.getAllByText('GDPR Essentials').length
    ).toBeGreaterThanOrEqual(2);
  });

  it('renders "Confirm Activate" button in dialog', () => {
    setupQueries(MOCK_COURSES);
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /^activate$/i }));
    expect(
      screen.getByRole('button', { name: /confirm activate/i })
    ).toBeInTheDocument();
  });

  it('renders "Cancel" button in dialog', () => {
    setupQueries(MOCK_COURSES);
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /^activate$/i }));
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
  });

  it('closes dialog when Cancel is clicked', () => {
    setupQueries(MOCK_COURSES);
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /^activate$/i }));
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
    expect(screen.queryByText('Activate Course')).not.toBeInTheDocument();
  });

  it('renders topic filter tabs', () => {
    renderPage();
    expect(screen.getByRole('tab', { name: /all/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /gdpr/i })).toBeInTheDocument();
  });

  it('renders page description', () => {
    renderPage();
    expect(
      screen.getByText(/activate pre-built compliance courses/i)
    ).toBeInTheDocument();
  });
});
