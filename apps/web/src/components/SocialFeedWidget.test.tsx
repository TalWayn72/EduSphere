import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as urql from 'urql';
import { SocialFeedWidget } from './SocialFeedWidget';

vi.mock('urql', () => ({
  gql: (strings: TemplateStringsArray, ...values: unknown[]) =>
    strings.reduce(
      (acc: string, str: string, i: number) =>
        acc + str + String(values[i] ?? ''),
      ''
    ),
  useQuery: vi.fn(),
}));

vi.mock('@/lib/graphql/knowledge-tier3.queries', () => ({
  SOCIAL_FEED_QUERY: 'SOCIAL_FEED_QUERY',
  SKILL_GAP_ANALYSIS_QUERY: 'SKILL_GAP_ANALYSIS_QUERY',
  SKILL_PROFILES_QUERY: 'SKILL_PROFILES_QUERY',
  CREATE_SKILL_PROFILE_MUTATION: 'CREATE_SKILL_PROFILE_MUTATION',
}));

const PAST_TIMESTAMP = new Date(Date.now() - 5 * 60_000).toISOString(); // 5 min ago

const MOCK_FEED = [
  {
    userId: 'u1',
    userDisplayName: 'Alice Smith',
    action: 'completed',
    contentItemId: 'ci1',
    contentTitle: 'Intro to TypeScript',
    timestamp: PAST_TIMESTAMP,
  },
  {
    userId: 'u2',
    userDisplayName: 'Bob Jones',
    action: 'progressed',
    contentItemId: 'ci2',
    contentTitle: 'React Hooks Deep Dive',
    timestamp: PAST_TIMESTAMP,
  },
  {
    userId: 'u3',
    userDisplayName: 'Carol White',
    action: 'started',
    contentItemId: 'ci3',
    contentTitle: 'GraphQL Fundamentals',
    timestamp: PAST_TIMESTAMP,
  },
];

beforeEach(() => {
  vi.clearAllMocks();
});

describe('SocialFeedWidget', () => {
  it('renders "Following Activity" heading', () => {
    vi.mocked(urql.useQuery).mockReturnValue([
      { data: undefined, fetching: false, error: undefined },
      vi.fn(),
    ] as never);
    render(<SocialFeedWidget />);
    expect(screen.getByText('Following Activity')).toBeInTheDocument();
  });

  it('shows loading state when fetching', () => {
    vi.mocked(urql.useQuery).mockReturnValue([
      { data: undefined, fetching: true, error: undefined },
      vi.fn(),
    ] as never);
    render(<SocialFeedWidget />);
    expect(screen.getByText(/loading activity/i)).toBeInTheDocument();
  });

  it('shows empty state when no feed items', () => {
    vi.mocked(urql.useQuery).mockReturnValue([
      { data: { socialFeed: [] }, fetching: false, error: undefined },
      vi.fn(),
    ] as never);
    render(<SocialFeedWidget />);
    expect(screen.getByText(/follow learners to see/i)).toBeInTheDocument();
  });

  it('renders feed item user display names', () => {
    vi.mocked(urql.useQuery).mockReturnValue([
      { data: { socialFeed: MOCK_FEED }, fetching: false, error: undefined },
      vi.fn(),
    ] as never);
    render(<SocialFeedWidget />);
    expect(screen.getByText('Alice Smith')).toBeInTheDocument();
    expect(screen.getByText('Bob Jones')).toBeInTheDocument();
    expect(screen.getByText('Carol White')).toBeInTheDocument();
  });

  it('renders content titles', () => {
    vi.mocked(urql.useQuery).mockReturnValue([
      { data: { socialFeed: MOCK_FEED }, fetching: false, error: undefined },
      vi.fn(),
    ] as never);
    render(<SocialFeedWidget />);
    expect(screen.getByText('Intro to TypeScript')).toBeInTheDocument();
    expect(screen.getByText('React Hooks Deep Dive')).toBeInTheDocument();
    expect(screen.getByText('GraphQL Fundamentals')).toBeInTheDocument();
  });

  it('shows "completed" action label', () => {
    vi.mocked(urql.useQuery).mockReturnValue([
      {
        data: { socialFeed: [MOCK_FEED[0]!] },
        fetching: false,
        error: undefined,
      },
      vi.fn(),
    ] as never);
    render(<SocialFeedWidget />);
    expect(screen.getByText('completed')).toBeInTheDocument();
  });

  it('shows "is making progress on" for progressed action', () => {
    vi.mocked(urql.useQuery).mockReturnValue([
      {
        data: { socialFeed: [MOCK_FEED[1]!] },
        fetching: false,
        error: undefined,
      },
      vi.fn(),
    ] as never);
    render(<SocialFeedWidget />);
    expect(screen.getByText('is making progress on')).toBeInTheDocument();
  });

  it('shows "started" for started action', () => {
    vi.mocked(urql.useQuery).mockReturnValue([
      {
        data: { socialFeed: [MOCK_FEED[2]!] },
        fetching: false,
        error: undefined,
      },
      vi.fn(),
    ] as never);
    render(<SocialFeedWidget />);
    expect(screen.getByText('started')).toBeInTheDocument();
  });

  it('shows user initials avatar (first 2 chars uppercased)', () => {
    vi.mocked(urql.useQuery).mockReturnValue([
      {
        data: { socialFeed: [MOCK_FEED[0]!] },
        fetching: false,
        error: undefined,
      },
      vi.fn(),
    ] as never);
    render(<SocialFeedWidget />);
    expect(screen.getByText('AL')).toBeInTheDocument(); // "Alice Smith" → "AL"
  });

  it('shows relative time for feed items', () => {
    vi.mocked(urql.useQuery).mockReturnValue([
      {
        data: { socialFeed: [MOCK_FEED[0]!] },
        fetching: false,
        error: undefined,
      },
      vi.fn(),
    ] as never);
    render(<SocialFeedWidget />);
    expect(screen.getByText(/m ago/i)).toBeInTheDocument();
  });
});
