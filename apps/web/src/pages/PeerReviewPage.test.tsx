import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import * as urql from 'urql';
import { PeerReviewPage } from './PeerReviewPage';

vi.mock('urql', async () => ({
  ...(await vi.importActual('urql')),
  useQuery: vi.fn(),
  useMutation: vi.fn(),
}));

vi.mock('@/components/Layout', () => ({
  Layout: ({ children }: { children: React.ReactNode }) =>
    React.createElement('div', {}, children),
}));

const NOOP_QUERY = [
  { data: undefined, fetching: false, error: undefined },
  vi.fn(),
] as never;

describe('PeerReviewPage', () => {
  beforeEach(() => {
    vi.mocked(urql.useQuery).mockReturnValue(NOOP_QUERY);
  });

  it('renders Peer Review heading', () => {
    render(
      <MemoryRouter>
        <PeerReviewPage />
      </MemoryRouter>
    );
    expect(screen.getByRole('heading', { name: /Peer Review/i })).toBeInTheDocument();
  });

  it('renders Assignments to Review section', () => {
    render(
      <MemoryRouter>
        <PeerReviewPage />
      </MemoryRouter>
    );
    expect(screen.getByText(/Assignments to Review/i)).toBeInTheDocument();
  });

  it('renders My Submissions section', () => {
    render(
      <MemoryRouter>
        <PeerReviewPage />
      </MemoryRouter>
    );
    expect(screen.getByText(/My Submissions/i)).toBeInTheDocument();
  });

  it('shows empty states when no data', () => {
    render(
      <MemoryRouter>
        <PeerReviewPage />
      </MemoryRouter>
    );
    expect(screen.getByText(/No pending review assignments/i)).toBeInTheDocument();
  });
});
