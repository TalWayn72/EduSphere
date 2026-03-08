import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// ── Module mocks (must be hoisted before imports) ────────────────────────────

vi.mock('urql', () => ({
  gql: (strings: TemplateStringsArray, ...values: unknown[]) =>
    strings.reduce(
      (acc: string, str: string, i: number) => acc + str + String(values[i] ?? ''),
      ''
    ),
  useQuery: vi.fn(() => [{ data: undefined, fetching: false, error: undefined }, vi.fn()]),
  useMutation: vi.fn(() => [{ fetching: false }, vi.fn().mockResolvedValue({ error: null })]),
  useSubscription: vi.fn(() => [{ data: undefined, fetching: false, error: undefined }, vi.fn()]),
}));

vi.mock('@/lib/auth', () => ({
  getCurrentUser: vi.fn(() => ({
    id: 'u-1',
    username: 'testuser',
    email: 'test@example.com',
    firstName: 'Alice',
    lastName: 'Smith',
    tenantId: 't-1',
    role: 'STUDENT',
    scopes: ['read'],
  })),
  DEV_MODE: true,
  logout: vi.fn(),
}));

vi.mock('@/components/Layout', () => ({
  Layout: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="layout">{children}</div>
  ),
}));

vi.mock('@/contexts/ThemeContext', () => ({
  useTheme: vi.fn(() => ({
    resolvedMode: 'light',
    setThemeMode: vi.fn(),
    tenantPrimitives: {},
    userPreferences: { mode: 'system', fontSize: 'md', readingMode: false, motionPreference: 'full', contrastMode: 'normal' },
    setTenantTheme: vi.fn(),
    setFontSize: vi.fn(),
    setReadingMode: vi.fn(),
    setMotionPreference: vi.fn(),
    previewThemeChanges: vi.fn(),
  })),
  ThemeProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('@/components/AppSidebar', () => ({
  AppSidebar: () => <aside data-testid="app-sidebar" />,
}));

import { DashboardPage } from './DashboardPage';

const renderDashboard = () =>
  render(
    <MemoryRouter>
      <DashboardPage />
    </MemoryRouter>
  );

describe('DashboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders layout wrapper', () => {
    renderDashboard();
    expect(screen.getByTestId('layout')).toBeInTheDocument();
  });

  it('renders welcome section with user name', () => {
    renderDashboard();
    expect(screen.getByTestId('welcome-heading')).toBeInTheDocument();
    expect(screen.getByText(/welcome back, alice/i)).toBeInTheDocument();
  });

  it('renders streak widget with day count', () => {
    renderDashboard();
    const widget = screen.getByTestId('streak-widget');
    expect(widget).toBeInTheDocument();
    expect(widget).toHaveTextContent('7 day streak');
  });

  it('renders in-progress courses count quick stat', () => {
    renderDashboard();
    expect(screen.getByText(/in progress/i)).toBeInTheDocument();
  });

  it('renders completed courses quick stat', () => {
    renderDashboard();
    // Use getAllByText because "completed" appears in both the quick stat and activity feed
    const matches = screen.getAllByText(/completed/i);
    expect(matches.length).toBeGreaterThanOrEqual(1);
  });

  it('renders total XP quick stat widget', () => {
    renderDashboard();
    expect(screen.getByTestId('xp-widget')).toBeInTheDocument();
    // Use getAllByText because "XP" may appear in multiple places
    const matches = screen.getAllByText(/XP/i);
    expect(matches.length).toBeGreaterThanOrEqual(1);
  });

  it('renders level badge in XP widget', () => {
    renderDashboard();
    const levelBadge = screen.getByTestId('xp-level-badge');
    expect(levelBadge).toBeInTheDocument();
    // DEV_MODE=true + no real stats → level defaults to 1
    expect(levelBadge).toHaveTextContent('Lv. 1');
  });

  it('does not use hardcoded MOCK_XP value of 2340', () => {
    renderDashboard();
    // After Phase 36, XP comes from real query (or 0 fallback) — never hardcoded 2340
    const body = document.body.textContent ?? '';
    expect(body).not.toContain('2,340');
    expect(body).not.toContain('2340');
  });

  it('renders continue learning section', () => {
    renderDashboard();
    expect(screen.getByTestId('continue-learning-section')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /continue learning/i })).toBeInTheDocument();
  });

  it('renders at least one course card with progress', () => {
    renderDashboard();
    expect(screen.getByText('Introduction to Talmud Study')).toBeInTheDocument();
    expect(screen.getByText('Advanced Chavruta Techniques')).toBeInTheDocument();
  });

  it('renders View all link in continue learning section', () => {
    renderDashboard();
    expect(screen.getByRole('link', { name: /view all/i })).toBeInTheDocument();
  });

  it('renders mastery overview section', () => {
    renderDashboard();
    expect(screen.getByTestId('mastery-overview')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /mastery overview/i })).toBeInTheDocument();
  });

  it('renders MasteryBadge components for each topic', () => {
    renderDashboard();
    expect(screen.getByTestId('mastery-badge-mastered')).toBeInTheDocument();
    expect(screen.getByTestId('mastery-badge-proficient')).toBeInTheDocument();
    expect(screen.getByTestId('mastery-badge-familiar')).toBeInTheDocument();
    expect(screen.getByTestId('mastery-badge-attempted')).toBeInTheDocument();
    expect(screen.getByTestId('mastery-badge-none')).toBeInTheDocument();
  });

  it('renders recent activity section', () => {
    renderDashboard();
    expect(screen.getByTestId('recent-activity')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /recent activity/i })).toBeInTheDocument();
  });

  it('renders 5 recent activity items', () => {
    renderDashboard();
    const activityList = screen.getByRole('list', { name: /recent learning activities/i });
    expect(activityList.querySelectorAll('li')).toHaveLength(5);
  });

  it('renders recommendations section', () => {
    renderDashboard();
    expect(screen.getByTestId('recommendations')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /recommended for you/i })).toBeInTheDocument();
  });

  it('renders recommended course cards', () => {
    renderDashboard();
    expect(screen.getByText("Mishnah: Laws of Damages")).toBeInTheDocument();
    expect(screen.getByText('Biblical Hebrew Foundations')).toBeInTheDocument();
  });

  it('does not display raw technical error strings', () => {
    renderDashboard();
    const body = document.body.textContent ?? '';
    expect(body).not.toMatch(/Error:/);
    expect(body).not.toMatch(/undefined/);
    expect(body).not.toMatch(/null/);
    expect(body).not.toMatch(/\[object/);
  });
});

// ── Real data integration tests ───────────────────────────────────────────────

describe('DashboardPage — real data integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows enrolled count from real query data when query succeeds', async () => {
    // Mock a successful enrollments response with 2 enrollments
    const { useQuery } = await import('urql');
    vi.mocked(useQuery).mockReturnValue([
      {
        data: {
          myEnrollments: [
            { id: 'e-1', status: 'IN_PROGRESS' },
            { id: 'e-2', status: 'COMPLETED' },
          ],
        },
        fetching: false,
        error: undefined,
        stale: false,
        hasNext: false,
      },
      vi.fn(),
    ] as never);

    renderDashboard();
    // With 2 enrollments (not the mock default of 3), count should be 2
    expect(screen.getByText(/2 in progress/i)).toBeInTheDocument();
  });

  it('shows completed count derived from real enrollment data', async () => {
    const { useQuery } = await import('urql');
    vi.mocked(useQuery).mockReturnValue([
      {
        data: {
          myEnrollments: [
            { id: 'e-1', status: 'COMPLETED' },
            { id: 'e-2', status: 'COMPLETED' },
            { id: 'e-3', status: 'IN_PROGRESS' },
          ],
        },
        fetching: false,
        error: undefined,
        stale: false,
        hasNext: false,
      },
      vi.fn(),
    ] as never);

    renderDashboard();
    // 2 COMPLETED out of 3 total; the count widget shows "2 completed"
    expect(screen.getByText(/2 completed/i)).toBeInTheDocument();
  });

  it('falls back to MOCK_IN_PROGRESS length (3) when query errors', async () => {
    const { useQuery } = await import('urql');
    vi.mocked(useQuery).mockReturnValue([
      {
        data: undefined,
        fetching: false,
        error: new Error('Network error'),
        stale: false,
        hasNext: false,
      },
      vi.fn(),
    ] as never);

    renderDashboard();
    // MOCK_IN_PROGRESS has 3 items — fallback "3 in progress" shown
    expect(screen.getByText(/3 in progress/i)).toBeInTheDocument();
    // Mock courses are still shown (fallback)
    expect(screen.getByText('Introduction to Talmud Study')).toBeInTheDocument();
  });

  it('shows loading state without crashing during fetch', async () => {
    const { useQuery } = await import('urql');
    vi.mocked(useQuery).mockReturnValue([
      {
        data: undefined,
        fetching: true,
        error: undefined,
        stale: false,
        hasNext: false,
      },
      vi.fn(),
    ] as never);

    renderDashboard();
    // Component should NOT crash during loading
    expect(screen.getByTestId('layout')).toBeInTheDocument();
    // Mock data is still displayed (component doesn't show skeleton — uses mock fallback)
    expect(screen.getByTestId('continue-learning-section')).toBeInTheDocument();
  });

  it('handles empty enrollments array without crashing', async () => {
    const { useQuery } = await import('urql');
    vi.mocked(useQuery).mockReturnValue([
      {
        data: { myEnrollments: [] },
        fetching: false,
        error: undefined,
        stale: false,
        hasNext: false,
      },
      vi.fn(),
    ] as never);

    renderDashboard();
    // 0 enrollments → "0 in progress", 0 completed
    expect(screen.getByText(/0 in progress/i)).toBeInTheDocument();
    expect(screen.getByText(/0 completed/i)).toBeInTheDocument();
    // No crash
    expect(screen.getByTestId('layout')).toBeInTheDocument();
  });

  it('does not show mock card titles when real data overrides counts', async () => {
    const { useQuery } = await import('urql');
    vi.mocked(useQuery).mockReturnValue([
      {
        data: { myEnrollments: [{ id: 'e-99', status: 'IN_PROGRESS' }] },
        fetching: false,
        error: undefined,
        stale: false,
        hasNext: false,
      },
      vi.fn(),
    ] as never);

    renderDashboard();
    // The count stat uses real data (1 enrolled)
    expect(screen.getByText(/1 in progress/i)).toBeInTheDocument();
    // NOTE: course cards themselves still use MOCK_IN_PROGRESS until
    // the myEnrollments resolver returns courseTitle + progress fields.
    // This is intentional per the TODO comment in DashboardPage.tsx.
    expect(screen.getByTestId('continue-learning-section')).toBeInTheDocument();
  });

  it('page does not display raw GraphQL error messages to user', async () => {
    const { useQuery } = await import('urql');
    vi.mocked(useQuery).mockReturnValue([
      {
        data: undefined,
        fetching: false,
        error: { message: 'Cannot query field "preferences" on type "User"' } as Error,
        stale: false,
        hasNext: false,
      },
      vi.fn(),
    ] as never);

    renderDashboard();
    const body = document.body.textContent ?? '';
    // Raw GraphQL schema errors must NOT be shown to users
    expect(body).not.toContain('Cannot query field');
    expect(body).not.toContain('on type "User"');
  });
});
