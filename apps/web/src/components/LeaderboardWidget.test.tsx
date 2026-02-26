import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { UseQueryResponse } from 'urql';

// ── mock urql ────────────────────────────────────────────────────────────────
vi.mock('urql', () => ({ useQuery: vi.fn() }));
vi.mock('@/lib/graphql/gamification.queries', () => ({
  LEADERBOARD_QUERY: 'LEADERBOARD_QUERY',
  MY_RANK_QUERY: 'MY_RANK_QUERY',
}));
vi.mock('@/lib/auth', () => ({ getCurrentUser: vi.fn() }));

import { LeaderboardWidget } from './LeaderboardWidget';
import * as urql from 'urql';
import * as auth from '@/lib/auth';

const mockUseQuery = vi.mocked(urql.useQuery);
const mockGetCurrentUser = vi.mocked(auth.getCurrentUser);

// ── Helpers ───────────────────────────────────────────────────────────────────

const ENTRIES = [
  { rank: 1, userId: 'u1', displayName: 'Alice Cohen', totalPoints: 1500, badgeCount: 5 },
  { rank: 2, userId: 'u2', displayName: 'Bob Levi',   totalPoints: 1200, badgeCount: 4 },
  { rank: 3, userId: 'u3', displayName: 'Carol Gold',  totalPoints: 900,  badgeCount: 3 },
  { rank: 4, userId: 'u4', displayName: 'Dave Green',  totalPoints: 700,  badgeCount: 2 },
];

function makeLeaderboardResponse(
  overrides: Partial<UseQueryResponse[0]> = {}
): UseQueryResponse {
  return [
    { data: { leaderboard: ENTRIES }, fetching: false, stale: false, ...overrides },
    vi.fn(),
  ] as unknown as UseQueryResponse;
}
function makeRankResponse(
  rank?: number
): UseQueryResponse {
  return [
    { data: rank !== undefined ? { myRank: rank } : undefined, fetching: false, stale: false },
    vi.fn(),
  ] as unknown as UseQueryResponse;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('LeaderboardWidget', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetCurrentUser.mockReturnValue({ id: 'me', firstName: 'Alice', lastName: 'Cohen', username: 'alice', email: 'alice@example.com', tenantId: 'tenant-1', role: 'STUDENT', scopes: [] });
  });

  it('renders "Leaderboard" heading', () => {
    mockUseQuery
      .mockReturnValueOnce(makeLeaderboardResponse())
      .mockReturnValueOnce(makeRankResponse());
    render(<LeaderboardWidget />);
    expect(screen.getByText(/Leaderboard/i)).toBeInTheDocument();
  });

  it('shows loading skeletons when fetching', () => {
    mockUseQuery
      .mockReturnValueOnce(makeLeaderboardResponse({ fetching: true, data: undefined }))
      .mockReturnValueOnce(makeRankResponse());
    const { container } = render(<LeaderboardWidget />);
    const skeletons = container.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('shows "No data yet" when leaderboard is empty', () => {
    mockUseQuery
      .mockReturnValueOnce([
        { data: { leaderboard: [] }, fetching: false, stale: false },
        vi.fn(),
      ] as unknown as UseQueryResponse)
      .mockReturnValueOnce(makeRankResponse());
    render(<LeaderboardWidget />);
    expect(screen.getByText(/No data yet/i)).toBeInTheDocument();
  });

  it('renders all leaderboard entries', () => {
    mockUseQuery
      .mockReturnValueOnce(makeLeaderboardResponse())
      .mockReturnValueOnce(makeRankResponse());
    render(<LeaderboardWidget />);
    expect(screen.getByText('Alice Cohen')).toBeInTheDocument();
    expect(screen.getByText('Bob Levi')).toBeInTheDocument();
    expect(screen.getByText('Carol Gold')).toBeInTheDocument();
    expect(screen.getByText('Dave Green')).toBeInTheDocument();
  });

  it('shows gold medal for rank 1', () => {
    mockUseQuery
      .mockReturnValueOnce(makeLeaderboardResponse())
      .mockReturnValueOnce(makeRankResponse());
    render(<LeaderboardWidget />);
    expect(screen.getByText('🥇')).toBeInTheDocument();
  });

  it('shows silver medal for rank 2', () => {
    mockUseQuery
      .mockReturnValueOnce(makeLeaderboardResponse())
      .mockReturnValueOnce(makeRankResponse());
    render(<LeaderboardWidget />);
    expect(screen.getByText('🥈')).toBeInTheDocument();
  });

  it('shows bronze medal for rank 3', () => {
    mockUseQuery
      .mockReturnValueOnce(makeLeaderboardResponse())
      .mockReturnValueOnce(makeRankResponse());
    render(<LeaderboardWidget />);
    expect(screen.getByText('🥉')).toBeInTheDocument();
  });

  it('shows numeric rank for rank 4+', () => {
    mockUseQuery
      .mockReturnValueOnce(makeLeaderboardResponse())
      .mockReturnValueOnce(makeRankResponse());
    render(<LeaderboardWidget />);
    expect(screen.getByText('#4')).toBeInTheDocument();
  });

  it('highlights the current user row with bg-primary/10', () => {
    // Alice Cohen is the current user (firstName matches)
    mockUseQuery
      .mockReturnValueOnce(makeLeaderboardResponse())
      .mockReturnValueOnce(makeRankResponse());
    const { container } = render(<LeaderboardWidget />);
    const highlighted = container.querySelector('.bg-primary\\/10');
    expect(highlighted).toBeInTheDocument();
    expect(highlighted?.textContent).toContain('Alice Cohen');
  });

  it('does not highlight other users', () => {
    mockUseQuery
      .mockReturnValueOnce(makeLeaderboardResponse())
      .mockReturnValueOnce(makeRankResponse());
    const { container } = render(<LeaderboardWidget />);
    const highlighted = container.querySelectorAll('.bg-primary\\/10');
    // Only Alice matches firstName 'Alice'
    expect(highlighted.length).toBe(1);
  });

  it('shows "Your rank" footer when myRank is defined', () => {
    mockUseQuery
      .mockReturnValueOnce(makeLeaderboardResponse())
      .mockReturnValueOnce(makeRankResponse(7));
    render(<LeaderboardWidget />);
    expect(screen.getByText(/Your rank: #7/i)).toBeInTheDocument();
  });

  it('does not show "Your rank" footer when myRank is undefined', () => {
    mockUseQuery
      .mockReturnValueOnce(makeLeaderboardResponse())
      .mockReturnValueOnce(makeRankResponse());
    render(<LeaderboardWidget />);
    expect(screen.queryByText(/Your rank/i)).not.toBeInTheDocument();
  });

  it('renders badge count and points for each entry', () => {
    mockUseQuery
      .mockReturnValueOnce(makeLeaderboardResponse())
      .mockReturnValueOnce(makeRankResponse());
    render(<LeaderboardWidget />);
    expect(screen.getByText('5 badges')).toBeInTheDocument();
    expect(screen.getByText(/1,500 pts/i)).toBeInTheDocument();
  });

  it('renders fine when getCurrentUser returns null (no current user)', () => {
    mockGetCurrentUser.mockReturnValue(null);
    mockUseQuery.mockReturnValue(makeLeaderboardResponse()[0] as never);
    mockUseQuery
      .mockReturnValueOnce(makeLeaderboardResponse())
      .mockReturnValueOnce(makeRankResponse(3));
    const { container } = render(<LeaderboardWidget />);
    expect(container.querySelectorAll('.bg-primary\\/10').length).toBe(0);
  });
});
