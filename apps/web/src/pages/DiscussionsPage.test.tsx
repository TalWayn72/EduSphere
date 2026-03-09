import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import * as urql from 'urql';
import { DiscussionsPage } from './DiscussionsPage';

vi.mock('urql', async () => ({ ...await vi.importActual('urql'), useQuery: vi.fn(), useMutation: vi.fn() }));

// Mock Layout to avoid complex context requirements
vi.mock('@/components/Layout', () => ({
  Layout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

const NOOP_QUERY = [{ data: undefined, fetching: false, error: undefined }, vi.fn()] as never;

describe('DiscussionsPage', () => {
  beforeEach(() => {
    vi.mocked(urql.useQuery).mockReturnValue(NOOP_QUERY);
  });

  it('renders Discussions heading', () => {
    render(<MemoryRouter><DiscussionsPage /></MemoryRouter>);
    expect(screen.getByRole('heading', { name: /Discussions/i })).toBeInTheDocument();
  });

  it('shows empty state when no discussions', () => {
    render(<MemoryRouter><DiscussionsPage /></MemoryRouter>);
    expect(screen.getByText(/No discussions yet/i)).toBeInTheDocument();
  });

  it('shows discussions when data is available', () => {
    vi.mocked(urql.useQuery).mockReturnValue([{
      data: { myDiscussions: [{ id: '1', title: 'React Hooks', courseId: 'c1', participantsCount: 5, messagesCount: 12, createdAt: new Date().toISOString() }] },
      fetching: false, error: undefined
    }, vi.fn()] as never);
    render(<MemoryRouter><DiscussionsPage /></MemoryRouter>);
    expect(screen.getByText('React Hooks')).toBeInTheDocument();
  });

  it('shows loading state', () => {
    vi.mocked(urql.useQuery).mockReturnValue([{ data: undefined, fetching: true, error: undefined }, vi.fn()] as never);
    render(<MemoryRouter><DiscussionsPage /></MemoryRouter>);
    expect(screen.getByText(/Loading/i)).toBeInTheDocument();
  });
});
