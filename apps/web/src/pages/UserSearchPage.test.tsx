import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import * as urql from 'urql';
import { UserSearchPage } from './UserSearchPage';

vi.mock('urql', async () => ({
  ...(await vi.importActual('urql')),
  useQuery: vi.fn(),
  useMutation: vi.fn(),
}));

vi.mock('@/components/FollowButton', () => ({
  FollowButton: vi.fn(() => null),
}));

vi.mock('@/components/Layout', () => ({
  Layout: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

vi.mock('@/lib/graphql/social.queries', () => ({
  SEARCH_USERS_QUERY: 'SEARCH_USERS_QUERY',
}));

const NOOP_QUERY = [
  { data: undefined, fetching: false, error: undefined },
  vi.fn(),
] as never;
const NOOP_MUTATION = [
  {
    fetching: false,
  },
  vi.fn().mockResolvedValue({ data: undefined, error: undefined }),
] as never;

function renderPage() {
  return render(
    <MemoryRouter>
      <UserSearchPage />
    </MemoryRouter>
  );
}

describe('UserSearchPage', () => {
  beforeEach(() => {
    vi.mocked(urql.useQuery).mockReturnValue(NOOP_QUERY);
    vi.mocked(urql.useMutation).mockReturnValue(NOOP_MUTATION);
  });

  it('renders search input', () => {
    renderPage();
    expect(screen.getByPlaceholderText(/Search people/i)).toBeInTheDocument();
  });

  it('shows min-length hint when input is short', () => {
    renderPage();
    expect(screen.getByText(/at least 3 characters/i)).toBeInTheDocument();
  });

  it('hides min-length hint once 3+ characters entered', () => {
    renderPage();
    const input = screen.getByPlaceholderText(/Search people/i);
    fireEvent.change(input, { target: { value: 'Ali' } });
    expect(screen.queryByText(/at least 3 characters/i)).not.toBeInTheDocument();
  });

  it('renders search results when data available', () => {
    vi.mocked(urql.useQuery).mockReturnValue([
      {
        data: {
          searchUsers: [
            {
              userId: 'u1',
              displayName: 'Alice Smith',
              bio: null,
              followersCount: 10,
              followingCount: 5,
              isFollowedByMe: false,
            },
          ],
        },
        fetching: false,
        error: undefined,
      },
      vi.fn(),
    ] as never);
    renderPage();
    const input = screen.getByPlaceholderText(/Search people/i);
    fireEvent.change(input, { target: { value: 'Ali' } });
    expect(screen.getByText('Alice Smith')).toBeInTheDocument();
  });

  it('shows "No users found" when results are empty for query >= 3 chars', () => {
    vi.mocked(urql.useQuery).mockReturnValue([
      {
        data: { searchUsers: [] },
        fetching: false,
        error: undefined,
      },
      vi.fn(),
    ] as never);
    renderPage();
    const input = screen.getByPlaceholderText(/Search people/i);
    fireEvent.change(input, { target: { value: 'zzz' } });
    expect(screen.getByText(/No users found/i)).toBeInTheDocument();
  });

  it('renders page heading', () => {
    renderPage();
    expect(screen.getByText('Find People')).toBeInTheDocument();
  });
});
