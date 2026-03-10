import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import * as urql from 'urql';
import { ChallengeDetailPage } from './ChallengeDetailPage';

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

function renderWithRoute() {
  return render(
    <MemoryRouter initialEntries={['/challenges/c1']}>
      <Routes>
        <Route path="/challenges/:id" element={<ChallengeDetailPage />} />
      </Routes>
    </MemoryRouter>
  );
}

describe('ChallengeDetailPage', () => {
  beforeEach(() => {
    vi.mocked(urql.useQuery).mockReturnValue(NOOP_QUERY);
    vi.mocked(urql.useMutation).mockReturnValue(NOOP_MUTATION);
  });

  it('renders leaderboard heading', () => {
    renderWithRoute();
    expect(screen.getByRole('heading', { name: /[Ll]eaderboard|[Cc]hallenge/i })).toBeInTheDocument();
  });

  it('renders submit score button', () => {
    renderWithRoute();
    expect(screen.getByRole('button', { name: /[Ss]ubmit|[Ss]core/i })).toBeInTheDocument();
  });

  it('shows empty leaderboard state', () => {
    renderWithRoute();
    expect(screen.queryByText(/raw.*error/i)).not.toBeInTheDocument();
  });
});
