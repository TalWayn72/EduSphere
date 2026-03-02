import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import * as urql from 'urql';
import { PollWidget } from './PollWidget';

vi.mock('urql', () => ({
  gql: (strings: TemplateStringsArray, ...values: unknown[]) =>
    strings.reduce(
      (acc: string, str: string, i: number) =>
        acc + str + String(values[i] ?? ''),
      ''
    ),
  useQuery: vi.fn(),
  useMutation: vi.fn(),
  useSubscription: vi.fn(),
}));

vi.mock('@/lib/graphql/live-session.queries', () => ({
  SESSION_POLLS_QUERY: 'SESSION_POLLS_QUERY',
  CREATE_POLL_MUTATION: 'CREATE_POLL_MUTATION',
  ACTIVATE_POLL_MUTATION: 'ACTIVATE_POLL_MUTATION',
  CLOSE_POLL_MUTATION: 'CLOSE_POLL_MUTATION',
  VOTE_POLL_MUTATION: 'VOTE_POLL_MUTATION',
  POLL_UPDATED_SUBSCRIPTION: 'POLL_UPDATED_SUBSCRIPTION',
  POLL_RESULTS_QUERY: 'POLL_RESULTS_QUERY',
}));

const mockCreatePoll = vi.fn();
const mockActivatePoll = vi.fn();
const mockClosePoll = vi.fn();
const mockVotePoll = vi.fn();

const MOCK_INACTIVE_POLL = {
  id: 'p1',
  sessionId: 's1',
  question: 'What is your favourite color?',
  options: ['Red', 'Blue'],
  isActive: false,
};

const MOCK_ACTIVE_POLL = {
  id: 'p2',
  sessionId: 's1',
  question: 'Best framework?',
  options: ['React', 'Vue', 'Angular'],
  isActive: true,
};

function setupMocks(polls: (typeof MOCK_INACTIVE_POLL)[] = []) {
  vi.mocked(urql.useQuery).mockReturnValue([
    {
      data: { sessionPolls: polls },
      fetching: false,
      error: undefined,
    },
    vi.fn(),
  ] as never);
  vi.mocked(urql.useMutation)
    .mockReturnValue([{} as never, vi.fn() as never])
    .mockReturnValueOnce([{} as never, mockCreatePoll as never])
    .mockReturnValueOnce([{} as never, mockActivatePoll as never])
    .mockReturnValueOnce([{} as never, mockClosePoll as never])
    .mockReturnValueOnce([{} as never, mockVotePoll as never]);
  vi.mocked(urql.useSubscription).mockReturnValue([
    { data: undefined },
  ] as never);
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('PollWidget', () => {
  it('renders "Live Polls" heading', () => {
    setupMocks();
    render(<PollWidget sessionId="s1" isModerator={false} />);
    expect(screen.getByText('Live Polls')).toBeInTheDocument();
  });

  it('shows "No active polls" for learner when there are no polls', () => {
    setupMocks([]);
    render(<PollWidget sessionId="s1" isModerator={false} />);
    expect(screen.getByText(/no active polls/i)).toBeInTheDocument();
  });

  it('does not show "No active polls" for moderator', () => {
    setupMocks([]);
    render(<PollWidget sessionId="s1" isModerator={true} />);
    expect(screen.queryByText(/no active polls/i)).not.toBeInTheDocument();
  });

  it('moderator sees "Create Poll" section', () => {
    setupMocks();
    render(<PollWidget sessionId="s1" isModerator={true} />);
    expect(screen.getByText('Create Poll')).toBeInTheDocument();
  });

  it('learner does not see "Create Poll" section', () => {
    setupMocks();
    render(<PollWidget sessionId="s1" isModerator={false} />);
    expect(screen.queryByText('Create Poll')).not.toBeInTheDocument();
  });

  it('moderator sees poll question text', () => {
    setupMocks([MOCK_INACTIVE_POLL]);
    render(<PollWidget sessionId="s1" isModerator={true} />);
    expect(
      screen.getByText('What is your favourite color?')
    ).toBeInTheDocument();
  });

  it('moderator sees "Activate" button for inactive poll', () => {
    setupMocks([MOCK_INACTIVE_POLL]);
    render(<PollWidget sessionId="s1" isModerator={true} />);
    expect(
      screen.getByRole('button', { name: /activate/i })
    ).toBeInTheDocument();
  });

  it('moderator sees "Close Poll" button for active poll', () => {
    setupMocks([MOCK_ACTIVE_POLL]);
    vi.mocked(urql.useSubscription).mockReturnValue([
      { data: undefined },
    ] as never);
    render(<PollWidget sessionId="s1" isModerator={true} />);
    expect(
      screen.getByRole('button', { name: /close poll/i })
    ).toBeInTheDocument();
  });

  it('learner sees vote buttons for active poll options', () => {
    setupMocks([MOCK_ACTIVE_POLL]);
    render(<PollWidget sessionId="s1" isModerator={false} />);
    expect(screen.getByRole('button', { name: 'React' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Vue' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Angular' })).toBeInTheDocument();
  });

  it('moderator "Create" button is present', () => {
    setupMocks();
    render(<PollWidget sessionId="s1" isModerator={true} />);
    expect(
      screen.getByRole('button', { name: /^create$/i })
    ).toBeInTheDocument();
  });

  it('moderator can add extra poll option with "+ Option" button', () => {
    setupMocks();
    render(<PollWidget sessionId="s1" isModerator={true} />);
    const addOption = screen.getByRole('button', { name: /\+ option/i });
    fireEvent.click(addOption);
    expect(screen.getByPlaceholderText('Option 3')).toBeInTheDocument();
  });
});
