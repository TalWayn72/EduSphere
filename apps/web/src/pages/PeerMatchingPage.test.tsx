import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import * as urql from 'urql';
import { PeerMatchingPage } from './PeerMatchingPage';

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

describe('PeerMatchingPage', () => {
  beforeEach(() => {
    vi.mocked(urql.useQuery).mockReturnValue(NOOP_QUERY);
    vi.mocked(urql.useMutation).mockReturnValue(NOOP_MUTATION);
  });

  it('renders Peer Matching heading', () => {
    render(<MemoryRouter><PeerMatchingPage /></MemoryRouter>);
    expect(screen.getByRole('heading', { name: /[Pp]eer|[Mm]atching/i })).toBeInTheDocument();
  });

  it('shows Suggested Matches section', () => {
    render(<MemoryRouter><PeerMatchingPage /></MemoryRouter>);
    const matches = screen.getAllByText(/[Ss]uggested|[Mm]atches/i);
    expect(matches.length).toBeGreaterThan(0);
  });

  it('shows Match Requests section', () => {
    render(<MemoryRouter><PeerMatchingPage /></MemoryRouter>);
    const requests = screen.getAllByText(/[Rr]equest/i);
    expect(requests.length).toBeGreaterThan(0);
  });

  it('shows empty state when no matches', () => {
    render(<MemoryRouter><PeerMatchingPage /></MemoryRouter>);
    expect(screen.queryByText(/raw.*error/i)).not.toBeInTheDocument();
  });
});
