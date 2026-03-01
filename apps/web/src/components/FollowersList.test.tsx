import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('urql', () => ({
  gql: (strings: TemplateStringsArray, ...values: unknown[]) =>
    strings.reduce(
      (acc: string, str: string, i: number) => acc + str + (String(values[i] ?? '')),
      ''
    ),
  useQuery: vi.fn(),
}));

vi.mock('@/lib/graphql/profile.queries', () => ({
  MY_FOLLOWERS_QUERY: 'MY_FOLLOWERS_QUERY',
  MY_FOLLOWING_QUERY: 'MY_FOLLOWING_QUERY',
  FOLLOW_USER_MUTATION: 'FOLLOW_USER_MUTATION',
  UNFOLLOW_USER_MUTATION: 'UNFOLLOW_USER_MUTATION',
}));

vi.mock('@/components/FollowButton', () => ({
  FollowButton: vi.fn(() => null),
}));

// ── Imports after mocks ───────────────────────────────────────────────────────

import { FollowersList } from './FollowersList';
import * as urql from 'urql';

// ── Fixtures ──────────────────────────────────────────────────────────────────

function setupQuery(overrides: Record<string, unknown> = {}) {
  vi.mocked(urql.useQuery).mockReturnValue([
    {
      data: { myFollowers: [], myFollowing: [] },
      fetching: false,
      error: undefined,
      ...overrides,
    },
    vi.fn(),
  ] as never);
}

function renderDialog(
  type: 'followers' | 'following' = 'followers',
  isOpen = true
) {
  return render(
    <FollowersList
      userId="user-1"
      type={type}
      isOpen={isOpen}
      onClose={vi.fn()}
    />
  );
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('FollowersList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupQuery();
  });

  it('shows "Followers" title for type=followers', () => {
    renderDialog('followers');
    expect(screen.getByText('Followers')).toBeInTheDocument();
  });

  it('shows "Following" title for type=following', () => {
    renderDialog('following');
    expect(screen.getByText('Following')).toBeInTheDocument();
  });

  it('shows "No followers yet." when myFollowers is empty', () => {
    setupQuery({ data: { myFollowers: [], myFollowing: [] } });
    renderDialog('followers');
    expect(screen.getByText('No followers yet.')).toBeInTheDocument();
  });

  it('shows "Not following anyone yet." when myFollowing is empty', () => {
    setupQuery({ data: { myFollowers: [], myFollowing: [] } });
    renderDialog('following');
    expect(screen.getByText('Not following anyone yet.')).toBeInTheDocument();
  });

  it('shows loading spinner when fetching', () => {
    setupQuery({ fetching: true });
    renderDialog('followers');
    // Dialog content is rendered in a Radix portal (document.body), not in the container
    expect(document.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('renders follower user IDs when data is loaded', () => {
    setupQuery({
      data: { myFollowers: ['user-aaa', 'user-bbb'], myFollowing: [] },
    });
    renderDialog('followers');
    expect(screen.getByText('user-aaa')).toBeInTheDocument();
    expect(screen.getByText('user-bbb')).toBeInTheDocument();
  });

  it('renders following user IDs when type=following', () => {
    setupQuery({
      data: { myFollowers: [], myFollowing: ['user-ccc', 'user-ddd'] },
    });
    renderDialog('following');
    expect(screen.getByText('user-ccc')).toBeInTheDocument();
    expect(screen.getByText('user-ddd')).toBeInTheDocument();
  });

  it('shows user initials avatar (first 2 chars uppercase)', () => {
    setupQuery({
      data: { myFollowers: ['user-xyz'], myFollowing: [] },
    });
    renderDialog('followers');
    // userId.slice(0, 2).toUpperCase() = 'US'
    expect(screen.getByText('US')).toBeInTheDocument();
  });

  it('does not render when dialog is closed', () => {
    const { container } = renderDialog('followers', false);
    // Dialog not open → no content rendered
    expect(screen.queryByText('Followers')).not.toBeInTheDocument();
    expect(container.textContent).toBe('');
  });
});
