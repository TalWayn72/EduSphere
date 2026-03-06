import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

// ─── Polyfill ─────────────────────────────────────────────────────────────────
window.HTMLElement.prototype.scrollIntoView = vi.fn();

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
import { LiveSessionDetailPage } from './LiveSessionDetailPage';
import { useQuery, useMutation } from 'urql';
import { getCurrentUser } from '@/lib/auth';

// ─── Helpers ──────────────────────────────────────────────────────────────────
function renderPage(sessionId = 'sess-1') {
  return render(
    <MemoryRouter initialEntries={[`/sessions/${sessionId}`]}>
      <Routes>
        <Route path="/sessions/:sessionId" element={<LiveSessionDetailPage />} />
      </Routes>
    </MemoryRouter>
  );
}

const MOCK_LIVE_SESSION = {
  id: 'sess-1',
  contentItemId: 'content-1',
  meetingName: 'Advanced TypeScript Workshop',
  scheduledAt: new Date().toISOString(),
  status: 'LIVE' as const,
  recordingUrl: null,
  participantCount: 8,
  maxParticipants: 20,
  instructorId: 'user-1',
  courseId: 'course-1',
};

const MOCK_ENDED_SESSION = {
  ...MOCK_LIVE_SESSION,
  status: 'ENDED' as const,
  recordingUrl: 'https://example.com/recording.mp4',
};

const MOCK_SCHEDULED_SESSION = {
  ...MOCK_LIVE_SESSION,
  status: 'SCHEDULED' as const,
};

describe('LiveSessionDetailPage', () => {
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

  it('shows loading spinner while fetching', () => {
    vi.mocked(useQuery).mockReturnValue([
      { data: undefined, fetching: true, error: undefined, stale: false, hasNext: false },
      vi.fn(),
    ] as never);
    renderPage();
    expect(screen.getByTestId('session-detail-loading')).toBeInTheDocument();
  });

  it('shows error state when session not found', () => {
    vi.mocked(useQuery).mockReturnValue([
      {
        data: { liveSessionById: null },
        fetching: false,
        error: undefined,
        stale: false,
        hasNext: false,
      },
      vi.fn(),
    ] as never);
    renderPage();
    expect(screen.getByTestId('session-detail-error')).toBeInTheDocument();
  });

  it('renders session title', () => {
    vi.mocked(useQuery).mockReturnValue([
      {
        data: { liveSessionById: MOCK_LIVE_SESSION },
        fetching: false,
        error: undefined,
        stale: false,
        hasNext: false,
      },
      vi.fn(),
    ] as never);
    renderPage();
    expect(screen.getByTestId('session-detail-title')).toHaveTextContent(
      'Advanced TypeScript Workshop'
    );
  });

  it('shows Live Now badge for LIVE status', () => {
    vi.mocked(useQuery).mockReturnValue([
      {
        data: { liveSessionById: MOCK_LIVE_SESSION },
        fetching: false,
        error: undefined,
        stale: false,
        hasNext: false,
      },
      vi.fn(),
    ] as never);
    renderPage();
    expect(screen.getByTestId('detail-status-live')).toBeInTheDocument();
  });

  it('shows Ended state for ENDED status', () => {
    vi.mocked(useQuery).mockReturnValue([
      {
        data: { liveSessionById: MOCK_ENDED_SESSION },
        fetching: false,
        error: undefined,
        stale: false,
        hasNext: false,
      },
      vi.fn(),
    ] as never);
    renderPage();
    expect(screen.getByTestId('detail-status-ended')).toBeInTheDocument();
    expect(screen.getByTestId('session-ended-state')).toBeInTheDocument();
  });

  it('shows recording link for ENDED session with recording', () => {
    vi.mocked(useQuery).mockReturnValue([
      {
        data: { liveSessionById: MOCK_ENDED_SESSION },
        fetching: false,
        error: undefined,
        stale: false,
        hasNext: false,
      },
      vi.fn(),
    ] as never);
    renderPage();
    expect(screen.getByTestId('recording-link')).toBeInTheDocument();
    expect(screen.getByTestId('recording-link')).toHaveAttribute(
      'href',
      'https://example.com/recording.mp4'
    );
  });

  it('shows Join button for non-participant on LIVE session', () => {
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
        data: { liveSessionById: MOCK_LIVE_SESSION },
        fetching: false,
        error: undefined,
        stale: false,
        hasNext: false,
      },
      vi.fn(),
    ] as never);
    renderPage();
    expect(screen.getByTestId('join-btn')).toBeInTheDocument();
  });

  it('shows Leave button after joining', async () => {
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
        data: { liveSessionById: MOCK_LIVE_SESSION },
        fetching: false,
        error: undefined,
        stale: false,
        hasNext: false,
      },
      vi.fn(),
    ] as never);
    const joinFn = vi.fn().mockResolvedValue({ data: {}, error: undefined });
    vi.mocked(useMutation).mockReturnValue([
      { fetching: false, error: undefined },
      joinFn,
    ] as never);
    renderPage();

    await act(async () => {
      fireEvent.click(screen.getByTestId('join-btn'));
    });
    // After join, leave button appears
    expect(screen.getByTestId('leave-btn')).toBeInTheDocument();
  });

  it('shows chat input visible when session is LIVE', () => {
    vi.mocked(useQuery).mockReturnValue([
      {
        data: { liveSessionById: MOCK_LIVE_SESSION },
        fetching: false,
        error: undefined,
        stale: false,
        hasNext: false,
      },
      vi.fn(),
    ] as never);
    renderPage();
    expect(screen.getByTestId('chat-input')).toBeInTheDocument();
    expect(screen.getByTestId('chat-input')).not.toBeDisabled();
  });

  it('shows disabled chat input for ENDED session', () => {
    vi.mocked(useQuery).mockReturnValue([
      {
        data: { liveSessionById: MOCK_ENDED_SESSION },
        fetching: false,
        error: undefined,
        stale: false,
        hasNext: false,
      },
      vi.fn(),
    ] as never);
    renderPage();
    expect(screen.getByTestId('chat-input')).toBeDisabled();
  });

  it('shows End Session button for INSTRUCTOR on LIVE session', () => {
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
        data: { liveSessionById: MOCK_LIVE_SESSION },
        fetching: false,
        error: undefined,
        stale: false,
        hasNext: false,
      },
      vi.fn(),
    ] as never);
    renderPage();
    expect(screen.getByTestId('end-session-btn')).toBeInTheDocument();
  });

  it('shows scheduled badge for SCHEDULED status', () => {
    vi.mocked(useQuery).mockReturnValue([
      {
        data: { liveSessionById: MOCK_SCHEDULED_SESSION },
        fetching: false,
        error: undefined,
        stale: false,
        hasNext: false,
      },
      vi.fn(),
    ] as never);
    renderPage();
    expect(screen.getByTestId('detail-status-scheduled')).toBeInTheDocument();
  });
});
