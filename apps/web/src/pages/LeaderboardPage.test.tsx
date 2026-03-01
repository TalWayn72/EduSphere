import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { LeaderboardPage } from './LeaderboardPage';

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('@/lib/auth', () => ({
  getCurrentUser: vi.fn(() => ({ id: 'user-1', firstName: 'Alice' })),
}));

vi.mock('@/components/Layout', () => ({
  Layout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

const mockUseQuery = vi.fn();
vi.mock('urql', () => ({
  gql: (strings: TemplateStringsArray, ...values: unknown[]) =>
    strings.reduce(
      (acc: string, str: string, i: number) => acc + str + (String(values[i] ?? '')),
      ''
    ),
  useQuery: (args: unknown) => mockUseQuery(args),
}));

// ─── Helpers ──────────────────────────────────────────────────────────────────

const MOCK_ENTRIES = [
  { rank: 1, userId: 'u1', displayName: 'Alice Smith', totalPoints: 5000, badgeCount: 10 },
  { rank: 2, userId: 'u2', displayName: 'Bob Jones', totalPoints: 4200, badgeCount: 8 },
  { rank: 3, userId: 'u3', displayName: 'Carol White', totalPoints: 3800, badgeCount: 6 },
  { rank: 4, userId: 'u4', displayName: 'Dave Brown', totalPoints: 3100, badgeCount: 4 },
];

function renderPage() {
  return render(
    <MemoryRouter>
      <LeaderboardPage />
    </MemoryRouter>
  );
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('LeaderboardPage', () => {
  beforeEach(() => {
    // Default: leaderboard query returns data; myRank query returns rank
    mockUseQuery.mockImplementation((args: { query: string }) => {
      if (String(args.query).includes('MyRank')) {
        return [{ data: { myRank: 4 }, fetching: false }];
      }
      return [{ data: { leaderboard: MOCK_ENTRIES }, fetching: false }];
    });
  });

  it('renders heading', () => {
    renderPage();
    expect(screen.getByRole('heading', { name: /leaderboard/i })).toBeInTheDocument();
  });

  it('shows user rank badge', () => {
    renderPage();
    expect(screen.getByText(/your rank: #4/i)).toBeInTheDocument();
  });

  it('renders leaderboard entries', () => {
    renderPage();
    expect(screen.getByText('Alice Smith')).toBeInTheDocument();
    expect(screen.getByText('Bob Jones')).toBeInTheDocument();
    expect(screen.getByText('Carol White')).toBeInTheDocument();
    expect(screen.getByText('Dave Brown')).toBeInTheDocument();
  });

  it('shows medal emojis for top 3', () => {
    renderPage();
    expect(screen.getByText('🥇')).toBeInTheDocument();
    expect(screen.getByText('🥈')).toBeInTheDocument();
    expect(screen.getByText('🥉')).toBeInTheDocument();
  });

  it('shows numeric rank for positions beyond 3', () => {
    renderPage();
    expect(screen.getByText('#4')).toBeInTheDocument();
  });

  it('shows points for each entry', () => {
    renderPage();
    expect(screen.getByText('5,000 pts')).toBeInTheDocument();
    expect(screen.getByText('4,200 pts')).toBeInTheDocument();
  });

  it('shows badge counts', () => {
    renderPage();
    expect(screen.getByText('10 badges')).toBeInTheDocument();
    expect(screen.getByText('8 badges')).toBeInTheDocument();
  });

  it('shows loading skeletons when fetching', () => {
    mockUseQuery.mockReturnValue([{ data: undefined, fetching: true }]);
    renderPage();
    const skeletons = document.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('shows empty state when no entries', () => {
    mockUseQuery.mockReturnValue([{ data: { leaderboard: [], myRank: undefined }, fetching: false }]);
    renderPage();
    expect(screen.getByText(/no leaderboard data yet/i)).toBeInTheDocument();
  });

  it('renders period tabs', () => {
    renderPage();
    expect(screen.getByRole('tab', { name: 'All Time' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'This Month' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'This Week' })).toBeInTheDocument();
  });

  it('switches period tab on click', () => {
    renderPage();
    const monthTab = screen.getByRole('tab', { name: 'This Month' });
    fireEvent.click(monthTab);
    expect(monthTab).toHaveAttribute('aria-selected', 'true');
  });

  it('highlights current user entry', () => {
    renderPage();
    // "Alice" appears in the current user's firstName, and "Alice Smith" is in entry
    const aliceEntry = screen.getByText('Alice Smith').closest('div');
    expect(aliceEntry?.className).toContain('bg-primary/10');
  });
});
