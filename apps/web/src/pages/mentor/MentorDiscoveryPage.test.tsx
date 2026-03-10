import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { MentorDiscoveryPage } from './MentorDiscoveryPage';

// ── urql mock ─────────────────────────────────────────────────────────────────
const NOOP_MUTATION = [
  { fetching: false },
  vi.fn().mockResolvedValue({ data: undefined, error: undefined }),
] as never;

vi.mock('urql', () => ({
  useQuery: vi.fn(),
  useMutation: vi.fn(),
}));

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

function renderWithCourse(courseId = 'course-abc') {
  return render(
    <MemoryRouter initialEntries={[`/mentor/discover/${courseId}`]}>
      <Routes>
        <Route path="/mentor/discover/:courseId?" element={<MentorDiscoveryPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

function renderWithoutCourse() {
  return render(
    <MemoryRouter initialEntries={['/mentor/discover']}>
      <Routes>
        <Route path="/mentor/discover/:courseId?" element={<MentorDiscoveryPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('MentorDiscoveryPage', () => {
  it('renders the page heading', () => {
    renderWithCourse();
    expect(screen.getByText('Find a Mentor')).toBeInTheDocument();
  });

  it('renders a list of mentor cards when data is present', () => {
    vi.mocked(urql.useQuery).mockReturnValue([
      {
        data: {
          mentorsByPathTopology: [
            {
              mentorId: '00000000-0000-0000-0000-000000000001',
              pathOverlapScore: 0.92,
              sharedConcepts: ['Graph Theory', 'Algorithms', 'Data Structures'],
            },
          ],
        },
        fetching: false,
        error: undefined,
      },
    ] as never);

    renderWithCourse();

    expect(screen.getByText('Mentor 00000000')).toBeInTheDocument();
    expect(screen.getByText('92% path overlap')).toBeInTheDocument();
    expect(screen.getByText('Graph Theory')).toBeInTheDocument();
    expect(screen.getByText('Algorithms')).toBeInTheDocument();
  });

  it('shows empty state when no mentors found', () => {
    vi.mocked(urql.useQuery).mockReturnValue([
      {
        data: { mentorsByPathTopology: [] },
        fetching: false,
        error: undefined,
      },
    ] as never);

    renderWithCourse();

    expect(
      screen.getByText('No mentors found yet. Be the first to complete this path!'),
    ).toBeInTheDocument();
  });

  it('shows loading message while fetching', () => {
    vi.mocked(urql.useQuery).mockReturnValue([
      { data: undefined, fetching: true, error: undefined },
    ] as never);

    renderWithCourse();

    expect(screen.getByText('Finding mentors...')).toBeInTheDocument();
  });

  it('shows error message on query failure', () => {
    vi.mocked(urql.useQuery).mockReturnValue([
      { data: undefined, fetching: false, error: { message: 'Server error' } },
    ] as never);

    renderWithCourse();

    expect(screen.getByText('Failed to load mentors.')).toBeInTheDocument();
    // Raw error message must NOT be visible
    expect(screen.queryByText('Server error')).not.toBeInTheDocument();
  });

  it('shows guidance message when no courseId provided', () => {
    renderWithoutCourse();
    expect(
      screen.getByText(/No course selected/),
    ).toBeInTheDocument();
  });

  it('renders Request Mentoring button for each mentor', () => {
    vi.mocked(urql.useQuery).mockReturnValue([
      {
        data: {
          mentorsByPathTopology: [
            {
              mentorId: 'abcdef01-0000-0000-0000-000000000001',
              pathOverlapScore: 0.8,
              sharedConcepts: [],
            },
          ],
        },
        fetching: false,
        error: undefined,
      },
    ] as never);

    renderWithCourse();

    expect(
      screen.getByRole('button', { name: /Request mentoring from abcdef01/i }),
    ).toBeInTheDocument();
  });
});
