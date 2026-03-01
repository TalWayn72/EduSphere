import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return { ...actual, useParams: vi.fn(() => ({ userId: 'user-42' })) };
});

vi.mock('urql', () => ({
  gql: (strings: TemplateStringsArray, ...values: unknown[]) =>
    strings.reduce(
      (acc: string, str: string, i: number) => acc + str + (String(values[i] ?? '')),
      ''
    ),
  useQuery: vi.fn(),
}));

vi.mock('@/components/FollowButton', () => ({ FollowButton: vi.fn(() => null) }));
vi.mock('@/components/FollowersList', () => ({ FollowersList: vi.fn(() => null) }));

vi.mock('@/lib/graphql/profile.queries', () => ({
  PUBLIC_PROFILE_QUERY: 'PUBLIC_PROFILE_QUERY',
}));

// ── Imports after mocks ───────────────────────────────────────────────────────

import { PublicProfilePage } from './PublicProfilePage';
import * as urql from 'urql';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const MOCK_PROFILE = {
  userId: 'user-42',
  displayName: 'Alice Smith',
  bio: 'Lifelong learner',
  avatarUrl: null,
  joinedAt: '2023-01-15T00:00:00Z',
  currentStreak: 7,
  longestStreak: 30,
  completedCoursesCount: 5,
  completedCourses: [
    { id: 'c1', title: 'Intro to Talmud', completedAt: '2024-03-01T00:00:00Z' },
    { id: 'c2', title: 'Advanced Topics', completedAt: '2024-05-01T00:00:00Z' },
  ],
  badgesCount: 3,
  conceptsMastered: 42,
  totalLearningMinutes: 1200,
  followersCount: 10,
  followingCount: 8,
  isFollowedByMe: false,
};

function makeQuery(overrides: Record<string, unknown> = {}) {
  return [
    { data: { publicProfile: MOCK_PROFILE }, fetching: false, error: undefined, ...overrides },
    vi.fn(),
  ] as never;
}

function renderPage() {
  return render(
    <MemoryRouter>
      <PublicProfilePage />
    </MemoryRouter>
  );
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('PublicProfilePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(urql.useQuery).mockReturnValue(makeQuery());
  });

  it('shows "Profile Not Available" when no profile data', () => {
    vi.mocked(urql.useQuery).mockReturnValue(
      makeQuery({ data: { publicProfile: null } })
    );
    renderPage();
    expect(screen.getByText('Profile Not Available')).toBeInTheDocument();
    expect(screen.getByText(/this profile is private/i)).toBeInTheDocument();
  });

  it('shows "Browse Courses" link in the unavailable state', () => {
    vi.mocked(urql.useQuery).mockReturnValue(
      makeQuery({ data: { publicProfile: null } })
    );
    renderPage();
    expect(screen.getByRole('link', { name: /browse courses/i })).toBeInTheDocument();
  });

  it('shows "Profile Not Available" on query error', () => {
    vi.mocked(urql.useQuery).mockReturnValue(
      makeQuery({ error: { message: 'Forbidden' }, data: undefined })
    );
    renderPage();
    expect(screen.getByText('Profile Not Available')).toBeInTheDocument();
  });

  it('renders the display name when profile data is loaded', () => {
    renderPage();
    expect(screen.getByText('Alice Smith')).toBeInTheDocument();
  });

  it('renders the bio', () => {
    renderPage();
    expect(screen.getByText('Lifelong learner')).toBeInTheDocument();
  });

  it('renders follower and following counts', () => {
    renderPage();
    expect(screen.getByText(/followers/i)).toBeInTheDocument();
    expect(screen.getByText(/following/i)).toBeInTheDocument();
  });

  it('renders the current streak stat', () => {
    renderPage();
    expect(screen.getByText('7d')).toBeInTheDocument();
    expect(screen.getByText('Current Streak')).toBeInTheDocument();
  });

  it('renders completed courses count stat', () => {
    renderPage();
    expect(screen.getByText('Courses Completed')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('renders badges earned stat', () => {
    renderPage();
    expect(screen.getByText('Badges Earned')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('renders completed course titles', () => {
    renderPage();
    expect(screen.getByText('Intro to Talmud')).toBeInTheDocument();
    expect(screen.getByText('Advanced Topics')).toBeInTheDocument();
  });

  it('does not show completed courses section when list is empty', () => {
    vi.mocked(urql.useQuery).mockReturnValue(
      makeQuery({ data: { publicProfile: { ...MOCK_PROFILE, completedCourses: [] } } })
    );
    renderPage();
    expect(screen.queryByText('Completed Courses')).not.toBeInTheDocument();
  });

  it('renders initials avatar when no avatarUrl', () => {
    renderPage();
    // getInitials('Alice Smith') = 'AS'
    expect(screen.getByText('AS')).toBeInTheDocument();
  });

  it('renders Share button', () => {
    renderPage();
    expect(screen.getByRole('button', { name: /share/i })).toBeInTheDocument();
  });
});
