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
  useQuery: vi.fn(() => [{ data: undefined, fetching: false, error: undefined, stale: false, hasNext: false }, vi.fn()]),
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
  // DEV_MODE = false so queries are NOT paused by DEV_MODE guard
  DEV_MODE: false,
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

import * as urql from 'urql';
import { DashboardPage } from './DashboardPage';

const NOOP_QUERY = [{ fetching: false, data: undefined, error: undefined, stale: false, hasNext: false }, vi.fn()] as never;

const renderDashboard = () =>
  render(
    <MemoryRouter>
      <DashboardPage />
    </MemoryRouter>
  );

describe('DashboardPage — new dashboard queries (real data)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(urql.useQuery).mockReturnValue(NOOP_QUERY);
  });

  it('shows mock in-progress courses as fallback when queries return no data', () => {
    renderDashboard();
    // MOCK_IN_PROGRESS fallback should render
    expect(screen.getByText('Introduction to Talmud Study')).toBeInTheDocument();
    expect(screen.getByText('Advanced Chavruta Techniques')).toBeInTheDocument();
    expect(screen.getByText('Knowledge Graph Navigation')).toBeInTheDocument();
  });

  it('renders real in-progress course when myInProgressCourses query succeeds', () => {
    vi.mocked(urql.useQuery).mockImplementation((opts) => {
      const doc = String((opts as { query: unknown }).query);
      if (doc.includes('myInProgressCourses')) {
        return [{
          fetching: false,
          data: {
            myInProgressCourses: [{
              id: 'real-1',
              courseId: 'c-real',
              title: 'Real Course From Server',
              progress: 50,
              lastAccessedAt: '1 hour ago',
              instructorName: 'Prof. Test',
            }],
          },
          error: undefined,
          stale: false,
          hasNext: false,
        }, vi.fn()] as never;
      }
      return NOOP_QUERY;
    });

    renderDashboard();
    expect(document.body.textContent).toContain('Real Course From Server');
    // Mock fallback courses should NOT appear when real data is present
    expect(screen.queryByText('Introduction to Talmud Study')).not.toBeInTheDocument();
  });

  it('renders real recommended courses when myRecommendedCourses query succeeds', () => {
    vi.mocked(urql.useQuery).mockImplementation((opts) => {
      const doc = String((opts as { query: unknown }).query);
      if (doc.includes('myRecommendedCourses')) {
        return [{
          fetching: false,
          data: {
            myRecommendedCourses: [{
              courseId: 'r-1',
              title: 'Real Recommended Course',
              instructorName: 'Dr. Recommendation',
              reason: 'Based on your learning path',
            }],
          },
          error: undefined,
          stale: false,
          hasNext: false,
        }, vi.fn()] as never;
      }
      return NOOP_QUERY;
    });

    renderDashboard();
    expect(document.body.textContent).toContain('Real Recommended Course');
    // Mock recommended courses should NOT appear
    expect(screen.queryByText('Mishnah: Laws of Damages')).not.toBeInTheDocument();
  });

  it('renders real activity feed when myActivityFeed query succeeds', () => {
    vi.mocked(urql.useQuery).mockImplementation((opts) => {
      const doc = String((opts as { query: unknown }).query);
      if (doc.includes('myActivityFeed')) {
        return [{
          fetching: false,
          data: {
            myActivityFeed: [{
              id: 'af-1',
              eventType: 'study',
              description: 'Real activity event from server',
              occurredAt: '10 minutes ago',
            }],
          },
          error: undefined,
          stale: false,
          hasNext: false,
        }, vi.fn()] as never;
      }
      return NOOP_QUERY;
    });

    renderDashboard();
    expect(document.body.textContent).toContain('Real activity event from server');
    // Mock activity should NOT appear
    expect(screen.queryByText(/Tractate Bava Metzia/)).not.toBeInTheDocument();
  });

  it('renders real streak count when myStats query succeeds', () => {
    vi.mocked(urql.useQuery).mockImplementation((opts) => {
      const doc = String((opts as { query: unknown }).query);
      if (doc.includes('MyStatsWithStreak')) {
        return [{
          fetching: false,
          data: {
            myStats: {
              coursesEnrolled: 5,
              conceptsMastered: 12,
              totalLearningMinutes: 300,
              currentStreak: 42,
              longestStreak: 60,
            },
          },
          error: undefined,
          stale: false,
          hasNext: false,
        }, vi.fn()] as never;
      }
      return NOOP_QUERY;
    });

    renderDashboard();
    // Streak widget should show real streak value (42), not mock (7)
    const widget = screen.getByTestId('streak-widget');
    expect(widget).toHaveTextContent('42');
  });

  it('renders real mastery topics when myTopMasteryTopics query succeeds', () => {
    vi.mocked(urql.useQuery).mockImplementation((opts) => {
      const doc = String((opts as { query: unknown }).query);
      if (doc.includes('myTopMasteryTopics')) {
        return [{
          fetching: false,
          data: {
            myTopMasteryTopics: [
              { topicName: 'Real Topic Alpha', level: 'mastered' },
              { topicName: 'Real Topic Beta', level: 'familiar' },
            ],
          },
          error: undefined,
          stale: false,
          hasNext: false,
        }, vi.fn()] as never;
      }
      return NOOP_QUERY;
    });

    renderDashboard();
    expect(document.body.textContent).toContain('Real Topic Alpha');
    expect(document.body.textContent).toContain('Real Topic Beta');
    // Mock mastery topics should NOT appear
    expect(screen.queryByText('Talmudic Reasoning')).not.toBeInTheDocument();
  });

  it('falls back to mock data when queries error — no blank UI', () => {
    vi.mocked(urql.useQuery).mockReturnValue([{
      fetching: false,
      data: undefined,
      error: new Error('Network error'),
      stale: false,
      hasNext: false,
    }, vi.fn()] as never);

    renderDashboard();
    // All mock fallbacks should still render
    expect(screen.getByText('Introduction to Talmud Study')).toBeInTheDocument();
    expect(screen.getByText('Mishnah: Laws of Damages')).toBeInTheDocument();
    expect(screen.getByTestId('streak-widget')).toHaveTextContent('7');
    expect(screen.getByTestId('mastery-overview')).toBeInTheDocument();
  });

  it('does not expose raw GraphQL error messages to user', () => {
    vi.mocked(urql.useQuery).mockReturnValue([{
      fetching: false,
      data: undefined,
      error: { message: 'Cannot query field "myInProgressCourses" on type "Query"' } as Error,
      stale: false,
      hasNext: false,
    }, vi.fn()] as never);

    renderDashboard();
    const body = document.body.textContent ?? '';
    expect(body).not.toContain('Cannot query field');
    expect(body).not.toContain('on type "Query"');
    // Mock data still renders cleanly
    expect(screen.getByTestId('layout')).toBeInTheDocument();
  });

  it('renders mock streak (7) when stats query returns no data', () => {
    renderDashboard();
    const widget = screen.getByTestId('streak-widget');
    expect(widget).toHaveTextContent('7');
  });
});
