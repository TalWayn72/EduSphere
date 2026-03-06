import React from 'react';
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

vi.mock('@/hooks/useLiveSessionActions', () => ({
  useLiveSessionActions: vi.fn(() => ({
    startSession: vi.fn().mockResolvedValue(undefined),
    endSession: vi.fn().mockResolvedValue(undefined),
    joinSession: vi.fn().mockResolvedValue(null),
    cancelSession: vi.fn().mockResolvedValue(undefined),
    startFetching: false,
    endFetching: false,
    joinFetching: false,
    cancelFetching: false,
  })),
}));

// ─── Imports ──────────────────────────────────────────────────────────────────
import { LiveSessionsPage } from './LiveSessionsPage';
import { useQuery, useMutation } from 'urql';
import { getCurrentUser } from '@/lib/auth';
import { useLiveSessionActions } from '@/hooks/useLiveSessionActions';

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
    vi.mocked(useLiveSessionActions).mockReturnValue({
      startSession: vi.fn().mockResolvedValue(undefined),
      endSession: vi.fn().mockResolvedValue(undefined),
      joinSession: vi.fn().mockResolvedValue(null),
      cancelSession: vi.fn().mockResolvedValue(undefined),
      startFetching: false,
      endFetching: false,
      joinFetching: false,
      cancelFetching: false,
    });
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

  it('clicking Join button triggers join action for STUDENT', () => {
    vi.mocked(getCurrentUser).mockReturnValue({
      id: 'u2',
      username: 'student@example.com',
      email: 'student@example.com',
      firstName: 'Student',
      lastName: 'User',
      role: 'STUDENT',
      tenantId: 'tenant-1',
    });
    const joinFn = vi.fn().mockResolvedValue(null);
    vi.mocked(useLiveSessionActions).mockReturnValue({
      startSession: vi.fn(),
      endSession: vi.fn(),
      joinSession: joinFn,
      cancelSession: vi.fn(),
      startFetching: false,
      endFetching: false,
      joinFetching: false,
      cancelFetching: false,
    });
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
    const joinBtn = screen.getByTestId('join-session-btn');
    fireEvent.click(joinBtn);
    expect(joinFn).toHaveBeenCalledWith('sess-2');
  });

  it('REGRESSION: /sessions route is defined (no 404)', () => {
    renderPage();
    expect(screen.getByTestId('layout')).toBeInTheDocument();
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

  it('sessions grid has aria-live="polite" for screen reader announcements', () => {
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
    const sessionsGrid = screen.getByTestId('sessions-grid');
    expect(sessionsGrid).toHaveAttribute('aria-live', 'polite');
  });

  it('tablist has aria-label describing its purpose', () => {
    renderPage();
    const tablist = screen.getByRole('tablist');
    expect(tablist).toHaveAttribute('aria-label', 'Session filter tabs');
  });

  // ─── Phase 28: Start/End/Cancel mutation wiring tests ─────────────────────

  it('INSTRUCTOR sees Start and Cancel buttons on SCHEDULED session', () => {
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
        data: { liveSessions: [MOCK_SESSIONS[0]] },
        fetching: false,
        error: undefined,
        stale: false,
        hasNext: false,
      },
      vi.fn(),
    ] as never);
    renderPage();
    expect(screen.getByTestId('start-session-btn')).toBeInTheDocument();
    expect(screen.getByTestId('cancel-session-btn')).toBeInTheDocument();
  });

  it('INSTRUCTOR sees End and Manage buttons on LIVE session', () => {
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
        data: { liveSessions: [{ ...MOCK_SESSIONS[1], status: 'LIVE' as const }] },
        fetching: false,
        error: undefined,
        stale: false,
        hasNext: false,
      },
      vi.fn(),
    ] as never);
    renderPage();
    expect(screen.getByTestId('end-session-btn')).toBeInTheDocument();
    expect(screen.getByTestId('manage-session-btn')).toBeInTheDocument();
  });

  it('STUDENT does NOT see Start/End/Cancel buttons', () => {
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
        data: { liveSessions: [MOCK_SESSIONS[0]] },
        fetching: false,
        error: undefined,
        stale: false,
        hasNext: false,
      },
      vi.fn(),
    ] as never);
    renderPage();
    expect(screen.queryByTestId('start-session-btn')).not.toBeInTheDocument();
    expect(screen.queryByTestId('end-session-btn')).not.toBeInTheDocument();
    expect(screen.queryByTestId('cancel-session-btn')).not.toBeInTheDocument();
  });

  it('STUDENT does NOT see Join button for SCHEDULED session', () => {
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
        data: { liveSessions: [MOCK_SESSIONS[0]] },
        fetching: false,
        error: undefined,
        stale: false,
        hasNext: false,
      },
      vi.fn(),
    ] as never);
    renderPage();
    expect(screen.queryByTestId('join-session-btn')).not.toBeInTheDocument();
  });

  it('clicking Start button calls startSession with correct sessionId', () => {
    vi.mocked(getCurrentUser).mockReturnValue({
      id: 'u1',
      username: 'instructor@example.com',
      email: 'instructor@example.com',
      firstName: 'Instructor',
      lastName: 'User',
      role: 'INSTRUCTOR',
      tenantId: 'tenant-1',
    });
    const startFn = vi.fn().mockResolvedValue(undefined);
    vi.mocked(useLiveSessionActions).mockReturnValue({
      startSession: startFn,
      endSession: vi.fn(),
      joinSession: vi.fn().mockResolvedValue(null),
      cancelSession: vi.fn(),
      startFetching: false,
      endFetching: false,
      joinFetching: false,
      cancelFetching: false,
    });
    vi.mocked(useQuery).mockReturnValue([
      {
        data: { liveSessions: [MOCK_SESSIONS[0]] },
        fetching: false,
        error: undefined,
        stale: false,
        hasNext: false,
      },
      vi.fn(),
    ] as never);
    renderPage();
    fireEvent.click(screen.getByTestId('start-session-btn'));
    expect(startFn).toHaveBeenCalledWith('sess-1');
  });

  it('clicking Cancel button calls cancelSession with correct sessionId', () => {
    vi.mocked(getCurrentUser).mockReturnValue({
      id: 'u1',
      username: 'instructor@example.com',
      email: 'instructor@example.com',
      firstName: 'Instructor',
      lastName: 'User',
      role: 'INSTRUCTOR',
      tenantId: 'tenant-1',
    });
    const cancelFn = vi.fn().mockResolvedValue(undefined);
    vi.mocked(useLiveSessionActions).mockReturnValue({
      startSession: vi.fn(),
      endSession: vi.fn(),
      joinSession: vi.fn().mockResolvedValue(null),
      cancelSession: cancelFn,
      startFetching: false,
      endFetching: false,
      joinFetching: false,
      cancelFetching: false,
    });
    vi.mocked(useQuery).mockReturnValue([
      {
        data: { liveSessions: [MOCK_SESSIONS[0]] },
        fetching: false,
        error: undefined,
        stale: false,
        hasNext: false,
      },
      vi.fn(),
    ] as never);
    renderPage();
    fireEvent.click(screen.getByTestId('cancel-session-btn'));
    expect(cancelFn).toHaveBeenCalledWith('sess-1');
  });

  it('clicking End button calls endSession with correct sessionId', () => {
    vi.mocked(getCurrentUser).mockReturnValue({
      id: 'u1',
      username: 'instructor@example.com',
      email: 'instructor@example.com',
      firstName: 'Instructor',
      lastName: 'User',
      role: 'INSTRUCTOR',
      tenantId: 'tenant-1',
    });
    const endFn = vi.fn().mockResolvedValue(undefined);
    vi.mocked(useLiveSessionActions).mockReturnValue({
      startSession: vi.fn(),
      endSession: endFn,
      joinSession: vi.fn().mockResolvedValue(null),
      cancelSession: vi.fn(),
      startFetching: false,
      endFetching: false,
      joinFetching: false,
      cancelFetching: false,
    });
    vi.mocked(useQuery).mockReturnValue([
      {
        data: { liveSessions: [{ ...MOCK_SESSIONS[1], status: 'LIVE' as const }] },
        fetching: false,
        error: undefined,
        stale: false,
        hasNext: false,
      },
      vi.fn(),
    ] as never);
    renderPage();
    fireEvent.click(screen.getByTestId('end-session-btn'));
    expect(endFn).toHaveBeenCalledWith('sess-2');
  });

  it('Start button is disabled when startFetching is true', () => {
    vi.mocked(getCurrentUser).mockReturnValue({
      id: 'u1',
      username: 'instructor@example.com',
      email: 'instructor@example.com',
      firstName: 'Instructor',
      lastName: 'User',
      role: 'INSTRUCTOR',
      tenantId: 'tenant-1',
    });
    vi.mocked(useLiveSessionActions).mockReturnValue({
      startSession: vi.fn(),
      endSession: vi.fn(),
      joinSession: vi.fn().mockResolvedValue(null),
      cancelSession: vi.fn(),
      startFetching: true,
      endFetching: false,
      joinFetching: false,
      cancelFetching: false,
    });
    vi.mocked(useQuery).mockReturnValue([
      {
        data: { liveSessions: [MOCK_SESSIONS[0]] },
        fetching: false,
        error: undefined,
        stale: false,
        hasNext: false,
      },
      vi.fn(),
    ] as never);
    renderPage();
    expect(screen.getByTestId('start-session-btn')).toBeDisabled();
  });

  it('Cancel button is disabled when cancelFetching is true', () => {
    vi.mocked(getCurrentUser).mockReturnValue({
      id: 'u1',
      username: 'instructor@example.com',
      email: 'instructor@example.com',
      firstName: 'Instructor',
      lastName: 'User',
      role: 'INSTRUCTOR',
      tenantId: 'tenant-1',
    });
    vi.mocked(useLiveSessionActions).mockReturnValue({
      startSession: vi.fn(),
      endSession: vi.fn(),
      joinSession: vi.fn().mockResolvedValue(null),
      cancelSession: vi.fn(),
      startFetching: false,
      endFetching: false,
      joinFetching: false,
      cancelFetching: true,
    });
    vi.mocked(useQuery).mockReturnValue([
      {
        data: { liveSessions: [MOCK_SESSIONS[0]] },
        fetching: false,
        error: undefined,
        stale: false,
        hasNext: false,
      },
      vi.fn(),
    ] as never);
    renderPage();
    expect(screen.getByTestId('cancel-session-btn')).toBeDisabled();
  });

  it('Join button is disabled when joinFetching is true', () => {
    vi.mocked(getCurrentUser).mockReturnValue({
      id: 'u2',
      username: 'student@example.com',
      email: 'student@example.com',
      firstName: 'Student',
      lastName: 'User',
      role: 'STUDENT',
      tenantId: 'tenant-1',
    });
    vi.mocked(useLiveSessionActions).mockReturnValue({
      startSession: vi.fn(),
      endSession: vi.fn(),
      joinSession: vi.fn().mockResolvedValue(null),
      cancelSession: vi.fn(),
      startFetching: false,
      endFetching: false,
      joinFetching: true,
      cancelFetching: false,
    });
    vi.mocked(useQuery).mockReturnValue([
      {
        data: { liveSessions: [{ ...MOCK_SESSIONS[1], status: 'LIVE' as const }] },
        fetching: false,
        error: undefined,
        stale: false,
        hasNext: false,
      },
      vi.fn(),
    ] as never);
    renderPage();
    expect(screen.getByTestId('join-session-btn')).toBeDisabled();
  });

  it('REGRESSION: join-session-btn testid exists — session-action-btn is removed', () => {
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
        data: { liveSessions: [{ ...MOCK_SESSIONS[1], status: 'LIVE' as const }] },
        fetching: false,
        error: undefined,
        stale: false,
        hasNext: false,
      },
      vi.fn(),
    ] as never);
    renderPage();
    expect(screen.getByTestId('join-session-btn')).toBeInTheDocument();
    expect(screen.queryByTestId('session-action-btn')).not.toBeInTheDocument();
  });
});
