import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ChavrutaPartnerPage } from './ChavrutaPartnerPage';

// ── urql mock ─────────────────────────────────────────────────────────────────
const NOOP_MUTATION = [
  { fetching: false },
  vi.fn().mockResolvedValue({ data: undefined, error: undefined }),
] as never;

vi.mock('urql', () => ({
  useQuery: vi.fn(),
  useMutation: vi.fn(),
}));

// ── Layout mock ───────────────────────────────────────────────────────────────
vi.mock('@/components/Layout', () => ({
  Layout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

import * as urql from 'urql';

const EMPTY_QUERY_RESULT = [{ data: undefined, fetching: false, error: undefined }] as never;

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(urql.useMutation).mockReturnValue(NOOP_MUTATION);
  vi.mocked(urql.useQuery).mockReturnValue(EMPTY_QUERY_RESULT);
});

function renderPage() {
  return render(
    <MemoryRouter>
      <ChavrutaPartnerPage />
    </MemoryRouter>,
  );
}

describe('ChavrutaPartnerPage', () => {
  it('renders the page heading', () => {
    renderPage();
    expect(screen.getByText('Find a Chavruta Partner')).toBeInTheDocument();
  });

  it('renders the course ID input', () => {
    renderPage();
    expect(screen.getByPlaceholderText('Enter course ID...')).toBeInTheDocument();
  });

  it('renders partner cards when query returns matches', () => {
    vi.mocked(urql.useQuery).mockReturnValue([
      {
        data: {
          chavrutaPartnerMatches: [
            {
              partnerId: 'p-001',
              partnerName: 'Alice Cohen',
              courseId: 'course-1',
              topic: 'Epistemology',
              matchReason: 'Complementary viewpoints on philosophy',
              compatibilityScore: 0.87,
            },
          ],
        },
        fetching: false,
        error: undefined,
      },
    ] as never);

    renderPage();

    expect(screen.getByText('Alice Cohen')).toBeInTheDocument();
    expect(screen.getByText('87% match')).toBeInTheDocument();
    expect(screen.getByText('Epistemology')).toBeInTheDocument();
    expect(screen.getByText('Complementary viewpoints on philosophy')).toBeInTheDocument();
  });

  it('renders Request Session button for each partner', () => {
    vi.mocked(urql.useQuery).mockReturnValue([
      {
        data: {
          chavrutaPartnerMatches: [
            {
              partnerId: 'p-002',
              partnerName: 'Bob Levi',
              courseId: 'course-1',
              topic: 'Ethics',
              matchReason: 'Different perspectives',
              compatibilityScore: 0.75,
            },
          ],
        },
        fetching: false,
        error: undefined,
      },
    ] as never);

    renderPage();

    expect(
      screen.getByRole('button', { name: /Request Chavruta session with Bob Levi/i }),
    ).toBeInTheDocument();
  });

  it('shows loading message while fetching', () => {
    vi.mocked(urql.useQuery).mockReturnValue([
      { data: undefined, fetching: true, error: undefined },
    ] as never);

    renderPage();

    expect(screen.getByText('Searching for partners...')).toBeInTheDocument();
  });

  it('shows error message on query failure', () => {
    vi.mocked(urql.useQuery).mockReturnValue([
      {
        data: undefined,
        fetching: false,
        error: { message: 'Network error' },
      },
    ] as never);

    renderPage();

    expect(
      screen.getByText('Failed to load partners. Please try again.'),
    ).toBeInTheDocument();
    // Confirm raw error message is NOT shown to user
    expect(screen.queryByText('Network error')).not.toBeInTheDocument();
  });

  it('does NOT expose raw error.message to user', () => {
    vi.mocked(urql.useQuery).mockReturnValue([
      {
        data: undefined,
        fetching: false,
        error: { message: '[urql] Network error: connection refused' },
      },
    ] as never);

    renderPage();

    expect(
      screen.queryByText(/\[urql\]/),
    ).not.toBeInTheDocument();
  });
});
