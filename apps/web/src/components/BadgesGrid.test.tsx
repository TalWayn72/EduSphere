import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { UseQueryResponse } from 'urql';

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('urql', () => ({ useQuery: vi.fn() }));
vi.mock('@/lib/graphql/gamification.queries', () => ({
  MY_BADGES_QUERY: 'MY_BADGES_QUERY',
}));

import { BadgesGrid } from './BadgesGrid';
import * as urql from 'urql';

const mockUseQuery = vi.mocked(urql.useQuery);

// ── Fixtures ──────────────────────────────────────────────────────────────────

const MOCK_BADGES = [
  {
    id: 'ub1',
    earnedAt: '2024-03-01T10:00:00Z',
    badge: {
      id: 'b1',
      name: 'First Login',
      description: 'Logged in for the first time',
      iconEmoji: '🎉',
      category: 'onboarding',
      pointsReward: 10,
    },
  },
  {
    id: 'ub2',
    earnedAt: '2024-03-05T12:00:00Z',
    badge: {
      id: 'b2',
      name: 'Course Completer',
      description: 'Completed your first course',
      iconEmoji: '📚',
      category: 'learning',
      pointsReward: 50,
    },
  },
];

function makeQueryResponse(
  overrides: Partial<UseQueryResponse[0]> = {}
): UseQueryResponse {
  return [
    {
      data: { myBadges: MOCK_BADGES },
      fetching: false,
      stale: false,
      ...overrides,
    },
    vi.fn(),
  ] as unknown as UseQueryResponse;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('BadgesGrid', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseQuery.mockReturnValue(makeQueryResponse());
  });

  it('renders badge names when data is loaded', () => {
    render(<BadgesGrid />);
    expect(screen.getByText('First Login')).toBeInTheDocument();
    expect(screen.getByText('Course Completer')).toBeInTheDocument();
  });

  it('renders badge emoji icons', () => {
    render(<BadgesGrid />);
    expect(
      screen.getByRole('img', { name: 'First Login' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('img', { name: 'Course Completer' })
    ).toBeInTheDocument();
  });

  it('renders badge descriptions', () => {
    render(<BadgesGrid />);
    expect(
      screen.getByText('Logged in for the first time')
    ).toBeInTheDocument();
    expect(screen.getByText('Completed your first course')).toBeInTheDocument();
  });

  it('renders points reward for each badge', () => {
    render(<BadgesGrid />);
    expect(screen.getByText('+10 pts')).toBeInTheDocument();
    expect(screen.getByText('+50 pts')).toBeInTheDocument();
  });

  it('shows loading skeletons when fetching', () => {
    mockUseQuery.mockReturnValue(
      makeQueryResponse({ fetching: true, data: undefined })
    );
    const { container } = render(<BadgesGrid />);
    const skeletons = container.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('shows empty state when no badges earned', () => {
    mockUseQuery.mockReturnValue(makeQueryResponse({ data: { myBadges: [] } }));
    render(<BadgesGrid />);
    expect(screen.getByText(/no badges earned yet/i)).toBeInTheDocument();
  });

  it('uses prop badges instead of queried data when provided', () => {
    const propBadge = [
      {
        id: 'ub-prop',
        earnedAt: '2024-04-01T00:00:00Z',
        badge: {
          id: 'b-prop',
          name: 'Prop Badge',
          description: 'Passed as prop',
          iconEmoji: '🏅',
          category: 'test',
          pointsReward: 100,
        },
      },
    ];
    render(<BadgesGrid badges={propBadge} />);
    expect(screen.getByText('Prop Badge')).toBeInTheDocument();
    expect(screen.queryByText('First Login')).not.toBeInTheDocument();
  });

  it('does not show loading state when badges prop is provided', () => {
    mockUseQuery.mockReturnValue(
      makeQueryResponse({ fetching: true, data: undefined })
    );
    const { container } = render(<BadgesGrid badges={[]} />);
    // fetching=true but badges prop provided → no skeletons
    expect(container.querySelectorAll('.animate-pulse').length).toBe(0);
  });

  it('renders earned date for each badge', () => {
    render(<BadgesGrid />);
    // Dates should be formatted — look for the month abbreviation
    const timeElements = document.querySelectorAll('time');
    expect(timeElements.length).toBe(2);
  });

  it('does not show raw i18n keys in the output', () => {
    render(<BadgesGrid />);
    const html = document.body.innerHTML;
    expect(html).not.toMatch(/\bt\(\s*['"][^'"]+['"]\s*\)/);
  });

  it('renders correct number of badge cards in the grid', () => {
    render(<BadgesGrid />);
    const names = screen.getAllByRole('img');
    expect(names).toHaveLength(2);
  });

  it('shows empty state message with emoji when no badges from query', () => {
    mockUseQuery.mockReturnValue(makeQueryResponse({ data: { myBadges: [] } }));
    render(<BadgesGrid />);
    expect(screen.getByText(/keep learning/i)).toBeInTheDocument();
  });
});
