import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import React from 'react';

// ── Mocks ─────────────────────────────────────────────────────────────────────

const MOCK_STATS = {
  currentStreak: 5,
  longestStreak: 12,
  activeChallenges: [
    { challengeId: 'c1', title: 'Complete 3 Lessons', completed: false },
    { challengeId: 'c2', title: 'Earn 100 XP', completed: true },
  ],
  leaderboard: [
    { rank: 3, userId: 'u1', displayName: 'Alice', totalXp: 200, level: 2 },
  ],
};

vi.mock('urql', () => ({
  gql: (strings: TemplateStringsArray, ...values: unknown[]) =>
    strings.reduce(
      (acc: string, str: string, i: number) =>
        acc + str + String(values[i] ?? ''),
      ''
    ),
  useQuery: vi.fn(),
}));

vi.mock('@/lib/graphql/gamification.queries', () => ({
  MY_GAMIFICATION_STATS_QUERY: 'MY_GAMIFICATION_STATS_QUERY',
}));

vi.mock('@/components/Layout', () => ({
  Layout: ({ children }: { children: React.ReactNode }) =>
    React.createElement('div', { 'data-testid': 'layout' }, children),
}));

// ── Imports after mocks ───────────────────────────────────────────────────────

import { MyProgressPage } from './MyProgressPage';
import * as urql from 'urql';

function renderPage() {
  return render(
    <MemoryRouter>
      <MyProgressPage />
    </MemoryRouter>
  );
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('MyProgressPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(urql.useQuery).mockReturnValue([
      { data: { myGamificationStats: MOCK_STATS }, fetching: false, error: undefined },
    ] as never);
  });

  it('renders page heading "My Progress"', () => {
    renderPage();
    expect(screen.getByText('My Progress')).toBeDefined();
  });

  it('renders inside Layout wrapper', () => {
    renderPage();
    expect(screen.getByTestId('layout')).toBeDefined();
  });

  it('shows current streak value', () => {
    renderPage();
    expect(document.body.textContent).toContain('5');
    expect(screen.getByText('Current Streak')).toBeDefined();
  });

  it('shows active challenges count (only incomplete)', () => {
    renderPage();
    // 1 incomplete challenge out of 2
    expect(document.body.textContent).toContain('Active Challenges');
    expect(document.body.textContent).toContain('1');
  });

  it('shows leaderboard position', () => {
    renderPage();
    expect(screen.getByText('Leaderboard Position')).toBeDefined();
    expect(document.body.textContent).toContain('#3');
  });

  it('shows empty state when no stats data', () => {
    vi.mocked(urql.useQuery).mockReturnValue([
      { data: { myGamificationStats: null }, fetching: false, error: undefined },
    ] as never);

    renderPage();

    expect(screen.getByText('Start a course to track your progress!')).toBeDefined();
  });

  it('does NOT show raw [GraphQL] error messages', () => {
    renderPage();
    expect(document.body.textContent).not.toContain('[GraphQL]');
    expect(document.body.textContent).not.toContain('Error:');
    expect(document.body.textContent).not.toContain('stack');
  });

  it('shows a user-friendly error message when query fails', () => {
    vi.mocked(urql.useQuery).mockReturnValue([
      {
        data: undefined,
        fetching: false,
        error: { message: 'Network error' },
      },
    ] as never);

    renderPage();

    expect(document.body.textContent).toContain('Unable to load progress data');
    // Raw network error string must NOT be visible to users
    expect(document.body.textContent).not.toContain('Network error');
  });

  it('shows longest streak text', () => {
    renderPage();
    expect(document.body.textContent).toContain('Longest streak: 12 days');
  });
});
