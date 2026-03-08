import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import React from 'react';

// ── Mocks ────────────────────────────────────────────────────────────────────

const MOCK_STATS = {
  currentStreak: 7,
  longestStreak: 14,
  activeChallenges: [
    {
      challengeId: 'c1',
      title: 'Complete 3 Lessons',
      description: 'Finish 3 lessons this week',
      targetValue: 3,
      currentValue: 1,
      xpReward: 50,
      completed: false,
      endDate: '2026-03-15',
    },
    {
      challengeId: 'c2',
      title: 'Earn 100 XP',
      description: 'Reach 100 XP this week',
      targetValue: 100,
      currentValue: 100,
      xpReward: 25,
      completed: true,
      endDate: '2026-03-15',
    },
  ],
  leaderboard: [
    { rank: 1, userId: 'u1', displayName: 'Alice', totalXp: 500, level: 3 },
    { rank: 2, userId: 'u2', displayName: 'Bob', totalXp: 300, level: 2 },
    { rank: 3, userId: 'u3', displayName: 'Charlie', totalXp: 200, level: 1 },
  ],
};

vi.mock('urql', () => ({
  gql: (strings: TemplateStringsArray, ...values: unknown[]) =>
    strings.reduce(
      (acc: string, str: string, i: number) =>
        acc + str + String(values[i] ?? ''),
      ''
    ),
  useQuery: vi.fn(() => [{ data: { myGamificationStats: MOCK_STATS }, fetching: false }]),
}));

vi.mock('@/lib/graphql/gamification.queries', () => ({
  MY_GAMIFICATION_STATS_QUERY: 'MY_GAMIFICATION_STATS_QUERY',
}));

vi.mock('lucide-react', () => ({
  Trophy: () => React.createElement('span', { 'data-testid': 'trophy-icon' }, 'Trophy'),
  Flame: () => React.createElement('span', { 'data-testid': 'flame-icon' }, 'Flame'),
  Target: () => React.createElement('span', { 'data-testid': 'target-icon' }, 'Target'),
}));

vi.mock('@/components/ui/tabs', () => ({
  Tabs: ({ children }: { children: React.ReactNode }) => React.createElement('div', {}, children),
  TabsList: ({ children }: { children: React.ReactNode }) =>
    React.createElement('div', { role: 'tablist' }, children),
  TabsTrigger: ({
    children,
    value,
    onClick,
  }: {
    children: React.ReactNode;
    value: string;
    onClick?: () => void;
  }) => React.createElement('button', { role: 'tab', 'data-value': value, onClick }, children),
  TabsContent: ({
    children,
    value,
  }: {
    children: React.ReactNode;
    value: string;
  }) => React.createElement('div', { 'data-tab': value }, children),
}));

vi.mock('@/components/ui/card', () => ({
  Card: ({ children, className }: { children: React.ReactNode; className?: string }) =>
    React.createElement('div', { 'data-testid': 'card', className }, children),
  CardHeader: ({ children, className }: { children: React.ReactNode; className?: string }) =>
    React.createElement('div', { className }, children),
  CardContent: ({ children, className }: { children: React.ReactNode; className?: string }) =>
    React.createElement('div', { className }, children),
  CardTitle: ({ children, className }: { children: React.ReactNode; className?: string }) =>
    React.createElement('h3', { className }, children),
}));

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children, variant }: { children: React.ReactNode; variant?: string }) =>
    React.createElement('span', { 'data-variant': variant }, children),
}));

vi.mock('@/components/ui/progress', () => ({
  Progress: ({ value, className, 'aria-label': ariaLabel }: { value: number; className?: string; 'aria-label'?: string }) =>
    React.createElement('div', { role: 'progressbar', 'aria-valuenow': value, 'aria-label': ariaLabel, className }),
}));

vi.mock('@/components/ui/skeleton', () => ({
  Skeleton: ({ className }: { className?: string }) =>
    React.createElement('div', { 'data-testid': 'skeleton', className }),
}));

// ── Imports after mocks ───────────────────────────────────────────────────────

import { GamificationPage } from './GamificationPage';

function renderPage() {
  return render(
    <MemoryRouter>
      <GamificationPage />
    </MemoryRouter>
  );
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('GamificationPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders page heading with trophy icon', () => {
    renderPage();
    expect(screen.getByText('Gamification')).toBeDefined();
    expect(screen.getByTestId('trophy-icon')).toBeDefined();
  });

  it('renders streak value on Progress tab', () => {
    renderPage();
    expect(document.body.textContent).toContain('7');
    expect(document.body.textContent).toContain('14');
  });

  it('shows active challenge count on Progress tab', () => {
    renderPage();
    // 1 incomplete challenge
    expect(document.body.textContent).toContain('1');
  });

  it('renders Challenges tab button', () => {
    renderPage();
    const tabs = screen.getAllByRole('tab');
    const challengesTab = tabs.find((t) => t.textContent?.includes('Challenges'));
    expect(challengesTab).toBeDefined();
  });

  it('shows challenge title in challenges section', () => {
    renderPage();
    expect(screen.getByText('Complete 3 Lessons')).toBeDefined();
  });

  it('shows challenge progress text', () => {
    renderPage();
    expect(document.body.textContent).toContain('1 / 3');
  });

  it('shows completed challenge', () => {
    renderPage();
    expect(screen.getByText('Earn 100 XP')).toBeDefined();
  });

  it('renders leaderboard player names', () => {
    renderPage();
    expect(screen.getByText('Alice')).toBeDefined();
    expect(screen.getByText('Bob')).toBeDefined();
    expect(screen.getByText('Charlie')).toBeDefined();
  });

  it('shows medal emojis for top 3 ranks', () => {
    renderPage();
    expect(document.body.textContent).toContain('🥇');
    expect(document.body.textContent).toContain('🥈');
    expect(document.body.textContent).toContain('🥉');
  });

  it('shows XP values', () => {
    renderPage();
    expect(document.body.textContent).toContain('500');
    expect(document.body.textContent).toContain('300');
  });

  it('renders level badges in leaderboard', () => {
    renderPage();
    expect(screen.getByText('Lv. 3')).toBeDefined();
    expect(screen.getByText('Lv. 2')).toBeDefined();
  });

  it('does NOT show raw error messages or stack traces', () => {
    renderPage();
    expect(document.body.textContent).not.toContain('[GraphQL]');
    expect(document.body.textContent).not.toContain('Error:');
    expect(document.body.textContent).not.toContain('stack');
  });

  it('shows current streak label', () => {
    renderPage();
    expect(screen.getByText('Current Streak')).toBeDefined();
  });

  it('shows longest streak text', () => {
    renderPage();
    expect(document.body.textContent).toContain('Longest streak: 14 days');
  });
});
