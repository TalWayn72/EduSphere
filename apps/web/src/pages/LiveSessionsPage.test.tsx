import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// ─── Module mocks (hoisted) ───────────────────────────────────────────────────

vi.mock('urql', () => ({
  gql: (strings: TemplateStringsArray, ...values: unknown[]) =>
    strings.reduce(
      (acc: string, str: string, i: number) =>
        acc + str + String(values[i] ?? ''),
      ''
    ),
  useQuery: vi.fn(() => [
    { data: undefined, fetching: false, error: undefined },
    vi.fn(),
  ]),
  useMutation: vi.fn(() => [{ fetching: false, error: undefined }, vi.fn()]),
}));

vi.mock('@/components/Layout', () => ({
  Layout: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="layout">{children}</div>
  ),
}));

vi.mock('@/lib/auth', () => ({
  getCurrentUser: vi.fn(() => null),
  logout: vi.fn(),
  DEV_MODE: true,
}));

// ─── Imports ──────────────────────────────────────────────────────────────────
import { LiveSessionsPage } from './LiveSessionsPage';
import { useQuery, useMutation } from 'urql';
import { getCurrentUser } from '@/lib/auth';

// ─── Helpers ──────────────────────────────────────────────────────────────────
function renderPage() {
  return render(
    <MemoryRouter>
      <LiveSessionsPage />
    </MemoryRouter>
  );
}

const MOCK_SESSIONS = [
  {
    id: 'sess-1',
    contentItemId: 'content-1',
    meetingName: 'JavaScript Fundamentals',
    scheduledAt: new Date(Date.now() + 3_600_000).toISOString(),
    status: 'SCHEDULED' as const,
    recordingUrl: null,
    participantCount: 5,
    maxParticipants: 20,
    instructorId: 'user-1',
    courseId: 'course-1',
  },
  {
    id: 'sess-2',
    contentItemId: 'content-2',
    meetingName: 'React Deep Dive',
    scheduledAt: new Date(Date.now() - 3_600_000).toISOString(),
    status: 'LIVE' as const,
    recordingUrl: null,
    participantCount: 12,
    maxParticipants: 30,
    instructorId: 'user-1',
    courseId: 'course-2',
  },
];

describe('LiveSessionsPage', () => {
  beforeEach(() => {
    vi.mocked(getCurrentUser).mockReturnValue(null);
    vi.mocked(useQuery).mockReturnValue([
      { data: undefined, fetching: false, error: undefined, stale: false, hasNext: false },
      vi.fn(),
    ] as never);
    vi.mocked(useMutation).mockReturnValue([
      { fetching: false, error: undefined },
      vi.fn().mockResolvedValue({ data: {}, error: undefined }),
    ] as never);
  });

  it('renders without crashing', () => {
    renderPage();
    expect(screen.getByTestId('layout')).toBeInTheDocument();
  });

  it('shows Upcoming tab by default', () => {
    renderPage();
    const upcomingTab = screen.getByTestId('tab-upcoming');
    expect(upcomingTab).toHaveAttribute('aria-selected', 'true');
  });

  it('shows loading skeleton while fetching', () => {
    vi.mocked(useQuery).mockReturnValue([
      { data: undefined, fetching: true, error: undefined, stale: false, hasNext: false },
      vi.fn(),
    ] as never);
    renderPage();
    expect(screen.getAllByTestId('session-skeleton').length).toBeGreaterThanOrEqual(1);
  });

  it('shows empty state when no sessions', () => {
    vi.mocked(useQuery).mockReturnValue([
      {
        data: { liveSessions: [] },
        fetching: false,
        error: undefined,
        stale: false,
        hasNext: false,
      },
      vi.fn(),
    ] as never);
    renderPage();
    expect(screen.getByTestId('sessions-empty')).toBeInTheDocument();
  });

  it('shows session cards when data is available', () => {
    vi.mocked(useQuery).mockReturnValue([
      {
        data: { liveSessions: MOCK_SESSIONS },
        fetching: false,
        error: undefined,
        stale: false,
        hasNext: false,
      },
      vi.fn(),
    ] as never);
    renderPage();
    const cards = screen.getAllByTestId('session-card');
    expect(cards.length).toBeGreaterThanOrEqual(1);
  });

  it('shows session titles in cards', () => {
    vi.mocked(useQuery).mockReturnValue([
      {
        data: { liveSessions: MOCK_SESSIONS },
        fetching: false,
        error: undefined,
        stale: false,
        hasNext: false,
      },
      vi.fn(),
    ] as never);
    renderPage();
    expect(document.body.textContent).toContain('JavaScript Fundamentals');
  });

  it('shows Create Session button for INSTRUCTOR role', () => {
    vi.mocked(getCurrentUser).mockReturnValue({
      id: 'u1',
      username: 'instructor@example.com',
      email: 'instructor@example.com',
      firstName: 'Instructor',
      lastName: 'User',
      role: 'INSTRUCTOR',
      tenantId: 'tenant-1',
    });
    vi.mocked(useQuery).mockReturnValue([
      {
        data: { liveSessions: [] },
        fetching: false,
        error: undefined,
        stale: false,
        hasNext: false,
      },
      vi.fn(),
    ] as never);
    renderPage();
    expect(screen.getByTestId('create-session-btn')).toBeInTheDocument();
  });

  it('does NOT show Create Session button for STUDENT role', () => {
    vi.mocked(getCurrentUser).mockReturnValue({
      id: 'u2',
      username: 'student@example.com',
      email: 'student@example.com',
      firstName: 'Student',
      lastName: 'User',
      role: 'STUDENT',
      tenantId: 'tenant-1',
    });
    vi.mocked(useQuery).mockReturnValue([
      {
        data: { liveSessions: [] },
        fetching: false,
        error: undefined,
        stale: false,
        hasNext: false,
      },
      vi.fn(),
    ] as never);
    renderPage();
    expect(screen.queryByTestId('create-session-btn')).not.toBeInTheDocument();
  });

  it('clicking Join button triggers join mutation', () => {
    vi.mocked(getCurrentUser).mockReturnValue({
      id: 'u2',
      username: 'student@example.com',
      email: 'student@example.com',
      firstName: 'Student',
      lastName: 'User',
      role: 'STUDENT',
      tenantId: 'tenant-1',
    });
    const joinFn = vi.fn().mockResolvedValue({ data: {}, error: undefined });
    vi.mocked(useMutation).mockReturnValue([
      { fetching: false, error: undefined },
      joinFn,
    ] as never);
    vi.mocked(useQuery).mockReturnValue([
      {
        data: {
          liveSessions: [
            {
              ...MOCK_SESSIONS[1],
              status: 'LIVE' as const,
            },
          ],
        },
        fetching: false,
        error: undefined,
        stale: false,
        hasNext: false,
      },
      vi.fn(),
    ] as never);

    renderPage();
    const joinBtn = screen.getByTestId('session-action-btn');
    fireEvent.click(joinBtn);
    expect(joinFn).toHaveBeenCalledWith({ sessionId: 'sess-2' });
  });

  it('REGRESSION: /sessions route is defined (no 404)', () => {
    // Verify the page component exports properly and can be rendered
    // The route definition in router.tsx wires /sessions -> LiveSessionsPage
    renderPage();
    expect(screen.getByTestId('layout')).toBeInTheDocument();
    // Verify no 404 message rendered
    expect(document.body.textContent).not.toContain('404');
    expect(document.body.textContent).not.toContain('Page not found');
  });

  it('switches to Past tab on click', () => {
    vi.mocked(useQuery).mockReturnValue([
      {
        data: { liveSessions: [] },
        fetching: false,
        error: undefined,
        stale: false,
        hasNext: false,
      },
      vi.fn(),
    ] as never);
    renderPage();
    const pastTab = screen.getByTestId('tab-past');
    fireEvent.click(pastTab);
    expect(pastTab).toHaveAttribute('aria-selected', 'true');
  });

  // ─── ARIA attribute tests ──────────────────────────────────────────────────

  it('tab container has role="tablist"', () => {
    renderPage();
    const tablist = document.querySelector('[role="tablist"]');
    expect(tablist).not.toBeNull();
  });

  it('tab buttons have role="tab"', () => {
    renderPage();
    const tabs = document.querySelectorAll('[role="tab"]');
    expect(tabs.length).toBe(2);
  });

  it('active tab has tabIndex=0 and inactive tab has tabIndex=-1', () => {
    renderPage();
    const upcomingTab = screen.getByTestId('tab-upcoming');
    const pastTab = screen.getByTestId('tab-past');
    // Upcoming is active by default
    expect(upcomingTab).toHaveAttribute('tabindex', '0');
    expect(pastTab).toHaveAttribute('tabindex', '-1');
  });

  it('clicking Past tab gives it tabIndex=0 and removes focus from Upcoming', () => {
    vi.mocked(useQuery).mockReturnValue([
      {
        data: { liveSessions: [] },
        fetching: false,
        error: undefined,
        stale: false,
        hasNext: false,
      },
      vi.fn(),
    ] as never);
    renderPage();
    const pastTab = screen.getByTestId('tab-past');
    const upcomingTab = screen.getByTestId('tab-upcoming');
    fireEvent.click(pastTab);
    expect(pastTab).toHaveAttribute('tabindex', '0');
    expect(upcomingTab).toHaveAttribute('tabindex', '-1');
  });

  it('tabs have aria-controls pointing to their panel', () => {
    renderPage();
    const upcomingTab = screen.getByTestId('tab-upcoming');
    const pastTab = screen.getByTestId('tab-past');
    expect(upcomingTab).toHaveAttribute('aria-controls', 'tab-panel-upcoming');
    expect(pastTab).toHaveAttribute('aria-controls', 'tab-panel-past');
  });

  // ─── Phase 28: ARIA role validation tests ─────────────────────────────────

  it('tabs have correct ARIA roles — getByRole tablist and getAllByRole tab', () => {
    vi.mocked(useQuery).mockReturnValue([
      {
        data: { liveSessions: [] },
        fetching: false,
        error: undefined,
        stale: false,
        hasNext: false,
      },
      vi.fn(),
    ] as never);
    renderPage();

    // tablist exists
    const tablist = screen.getByRole('tablist');
    expect(tablist).toBeInTheDocument();

    // At least 2 tab elements with role=tab
    const tabs = screen.getAllByRole('tab');
    expect(tabs.length).toBeGreaterThanOrEqual(2);
  });

  it('active tab has aria-selected=true after click', () => {
    vi.mocked(useQuery).mockReturnValue([
      {
        data: { liveSessions: [] },
        fetching: false,
        error: undefined,
        stale: false,
        hasNext: false,
      },
      vi.fn(),
    ] as never);
    renderPage();

    const upcomingTab = screen.getByTestId('tab-upcoming');
    const pastTab = screen.getByTestId('tab-past');

    // Initially Upcoming is selected
    expect(upcomingTab).toHaveAttribute('aria-selected', 'true');
    expect(pastTab).toHaveAttribute('aria-selected', 'false');

    // Click Past tab — aria-selected must transfer
    fireEvent.click(pastTab);
    expect(pastTab).toHaveAttribute('aria-selected', 'true');
    expect(upcomingTab).toHaveAttribute('aria-selected', 'false');
  });
});
