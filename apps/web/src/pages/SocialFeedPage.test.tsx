import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import * as urql from 'urql';
import { SocialFeedPage } from './SocialFeedPage';

vi.mock('urql', async () => ({
  ...await vi.importActual('urql'),
  useQuery: vi.fn(),
  useMutation: vi.fn(),
}));

const NOOP_QUERY = [{ data: undefined, fetching: false, error: undefined }, vi.fn()] as never;

describe('SocialFeedPage', () => {
  beforeEach(() => {
    vi.mocked(urql.useQuery).mockReturnValue(NOOP_QUERY);
  });

  it('renders Social Feed heading', () => {
    render(<MemoryRouter><SocialFeedPage /></MemoryRouter>);
    expect(screen.getByRole('heading', { name: /Social Feed/i })).toBeInTheDocument();
  });

  it('shows empty state when no feed items', () => {
    render(<MemoryRouter><SocialFeedPage /></MemoryRouter>);
    expect(screen.getByText(/Follow learners/i)).toBeInTheDocument();
  });

  it('renders feed items when data available', () => {
    vi.mocked(urql.useQuery).mockImplementation((doc) => {
      if (String(doc).includes('SocialFeed')) {
        return [{
          data: {
            socialFeed: [{
              id: '1',
              actorId: 'u1',
              actorDisplayName: 'Alice',
              verb: 'COMPLETED',
              objectType: 'course',
              objectId: 'c1',
              objectTitle: 'React Fundamentals',
              createdAt: new Date().toISOString(),
            }],
          },
          fetching: false,
          error: undefined,
        }, vi.fn()] as never;
      }
      return NOOP_QUERY;
    });
    render(<MemoryRouter><SocialFeedPage /></MemoryRouter>);
    expect(screen.getByText('Alice')).toBeInTheDocument();
  });

  it('shows recommendations section heading', () => {
    render(<MemoryRouter><SocialFeedPage /></MemoryRouter>);
    expect(screen.getByText(/Recommended Content/i)).toBeInTheDocument();
  });

  it('shows Find People CTA', () => {
    render(<MemoryRouter><SocialFeedPage /></MemoryRouter>);
    expect(screen.getByText(/Find People/i)).toBeInTheDocument();
  });
});
