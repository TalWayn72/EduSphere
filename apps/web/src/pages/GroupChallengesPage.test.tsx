import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import * as urql from 'urql';
import { GroupChallengesPage } from './GroupChallengesPage';

vi.mock('@/components/Layout', () => ({
  Layout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('urql', async () => ({
  ...await vi.importActual('urql'),
  useQuery: vi.fn(),
  useMutation: vi.fn(),
}));

const NOOP_QUERY = [{ data: undefined, fetching: false, error: undefined }, vi.fn()] as never;
const NOOP_MUTATION = [{ fetching: false }, vi.fn().mockResolvedValue({ data: undefined, error: undefined })] as never;

describe('GroupChallengesPage', () => {
  beforeEach(() => {
    vi.mocked(urql.useQuery).mockReturnValue(NOOP_QUERY);
    vi.mocked(urql.useMutation).mockReturnValue(NOOP_MUTATION);
  });

  it('renders Group Challenges heading', () => {
    render(<MemoryRouter><GroupChallengesPage /></MemoryRouter>);
    expect(screen.getByRole('heading', { name: /[Cc]hallenge/i })).toBeInTheDocument();
  });

  it('shows Active Challenges tab', () => {
    render(<MemoryRouter><GroupChallengesPage /></MemoryRouter>);
    const activeItems = screen.getAllByText(/Active/i);
    expect(activeItems.length).toBeGreaterThan(0);
  });

  it('shows empty state when no challenges', () => {
    render(<MemoryRouter><GroupChallengesPage /></MemoryRouter>);
    expect(screen.queryByText(/raw.*error/i)).not.toBeInTheDocument();
  });

  it('renders My Participations tab', () => {
    render(<MemoryRouter><GroupChallengesPage /></MemoryRouter>);
    expect(screen.getByText(/Participat/i)).toBeInTheDocument();
  });

  it('renders feed items when data available', async () => {
    vi.mocked(urql.useQuery).mockReturnValue([{
      data: {
        activeChallenges: {
          edges: [{ node: { id: '1', title: 'React Quiz', description: null, challengeType: 'QUIZ', targetScore: 100, startDate: new Date().toISOString(), endDate: new Date(Date.now() + 86400000).toISOString(), maxParticipants: 50, status: 'ACTIVE', participantCount: 5, createdBy: 'u1' } }],
          totalCount: 1,
        },
        myChallengePariticipations: [],
      },
      fetching: false,
      error: undefined,
    }, vi.fn()] as never);
    render(<MemoryRouter><GroupChallengesPage /></MemoryRouter>);
    expect(await screen.findByText('React Quiz')).toBeInTheDocument();
  });
});
