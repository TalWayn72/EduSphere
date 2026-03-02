import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('urql', () => ({
  gql: (strings: TemplateStringsArray, ...values: unknown[]) =>
    strings.reduce(
      (acc: string, str: string, i: number) =>
        acc + str + String(values[i] ?? ''),
      ''
    ),
  useMutation: vi.fn(),
}));

vi.mock('@/lib/graphql/profile.queries', () => ({
  FOLLOW_USER_MUTATION: 'FOLLOW_USER_MUTATION',
  UNFOLLOW_USER_MUTATION: 'UNFOLLOW_USER_MUTATION',
}));

// ── Imports after mocks ───────────────────────────────────────────────────────

import { FollowButton } from './FollowButton';
import * as urql from 'urql';

// ── Fixtures ──────────────────────────────────────────────────────────────────

function setupMutations(
  followFn = vi.fn().mockResolvedValue({ error: undefined }),
  unfollowFn = vi.fn().mockResolvedValue({ error: undefined }),
  fetching = false
) {
  vi.mocked(urql.useMutation).mockImplementation((mutation) => {
    if (mutation === 'FOLLOW_USER_MUTATION') {
      return [{ fetching }, followFn] as never;
    }
    return [{ fetching }, unfollowFn] as never;
  });
  return { followFn, unfollowFn };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('FollowButton', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupMutations();
  });

  it('shows "Follow" button when not following', () => {
    render(
      <FollowButton
        userId="user-1"
        initialIsFollowing={false}
        followersCount={10}
      />
    );
    expect(
      screen.getByRole('button', { name: /follow user/i })
    ).toBeInTheDocument();
    expect(screen.getByText('Follow')).toBeInTheDocument();
  });

  it('shows "Following" button when already following', () => {
    render(
      <FollowButton
        userId="user-1"
        initialIsFollowing={true}
        followersCount={10}
      />
    );
    expect(
      screen.getByRole('button', { name: /unfollow user/i })
    ).toBeInTheDocument();
    expect(screen.getByText('Following')).toBeInTheDocument();
  });

  it('displays the initial followers count', () => {
    render(
      <FollowButton
        userId="user-1"
        initialIsFollowing={false}
        followersCount={42}
      />
    );
    expect(screen.getByText('42')).toBeInTheDocument();
  });

  it('aria-label is "Follow user" when not following', () => {
    render(
      <FollowButton
        userId="user-1"
        initialIsFollowing={false}
        followersCount={10}
      />
    );
    expect(screen.getByRole('button')).toHaveAttribute(
      'aria-label',
      'Follow user'
    );
  });

  it('aria-label is "Unfollow user" when following', () => {
    render(
      <FollowButton
        userId="user-1"
        initialIsFollowing={true}
        followersCount={10}
      />
    );
    expect(screen.getByRole('button')).toHaveAttribute(
      'aria-label',
      'Unfollow user'
    );
  });

  it('calls follow mutation with userId on click when not following', async () => {
    const { followFn } = setupMutations();
    render(
      <FollowButton
        userId="user-42"
        initialIsFollowing={false}
        followersCount={10}
      />
    );
    fireEvent.click(screen.getByRole('button'));
    await waitFor(() => {
      expect(followFn).toHaveBeenCalledWith({ userId: 'user-42' });
    });
  });

  it('calls unfollow mutation with userId on click when following', async () => {
    const { unfollowFn } = setupMutations();
    render(
      <FollowButton
        userId="user-42"
        initialIsFollowing={true}
        followersCount={10}
      />
    );
    fireEvent.click(screen.getByRole('button'));
    await waitFor(() => {
      expect(unfollowFn).toHaveBeenCalledWith({ userId: 'user-42' });
    });
  });

  it('increments followers count after successful follow', async () => {
    setupMutations();
    render(
      <FollowButton
        userId="user-1"
        initialIsFollowing={false}
        followersCount={10}
      />
    );
    expect(screen.getByText('10')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button'));

    await waitFor(() => {
      expect(screen.getByText('11')).toBeInTheDocument();
    });
  });

  it('decrements followers count after successful unfollow', async () => {
    setupMutations();
    render(
      <FollowButton
        userId="user-1"
        initialIsFollowing={true}
        followersCount={10}
      />
    );
    expect(screen.getByText('10')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button'));

    await waitFor(() => {
      expect(screen.getByText('9')).toBeInTheDocument();
    });
  });

  it('does not update count when mutation returns an error', async () => {
    setupMutations(
      vi.fn().mockResolvedValue({ error: new Error('Network error') })
    );
    render(
      <FollowButton
        userId="user-1"
        initialIsFollowing={false}
        followersCount={10}
      />
    );
    fireEvent.click(screen.getByRole('button'));

    await waitFor(() => {
      // Count should still be 10 since error was returned
      expect(screen.getByText('10')).toBeInTheDocument();
    });
  });

  it('button is disabled when loading', () => {
    setupMutations(vi.fn(), vi.fn(), true);
    render(
      <FollowButton
        userId="user-1"
        initialIsFollowing={false}
        followersCount={10}
      />
    );
    expect(screen.getByRole('button')).toBeDisabled();
  });
});
