import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return { ...actual, useNavigate: vi.fn(() => mockNavigate) };
});

vi.mock('urql', () => ({
  gql: (strings: TemplateStringsArray, ...values: unknown[]) =>
    strings.reduce(
      (acc: string, str: string, i: number) =>
        acc + str + String(values[i] ?? ''),
      ''
    ),
  useQuery: vi.fn(),
  useMutation: vi.fn(),
}));

vi.mock('@/lib/graphql/programs.queries', () => ({
  PROGRAMS_QUERY: 'PROGRAMS_QUERY',
  MY_PROGRAM_ENROLLMENTS_QUERY: 'MY_PROGRAM_ENROLLMENTS_QUERY',
  ENROLL_IN_PROGRAM_MUTATION: 'ENROLL_IN_PROGRAM_MUTATION',
}));

// ── Imports after mocks ───────────────────────────────────────────────────────

import { ProgramsPage } from './ProgramsPage';
import * as urql from 'urql';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const MOCK_PROGRAMS = [
  {
    id: 'prog-1',
    title: 'Talmud Scholar',
    description: 'Master Talmudic reasoning',
    badgeEmoji: '📖',
    requiredCourseIds: ['c1', 'c2', 'c3'],
    totalHours: 30,
    published: true,
    enrollmentCount: 42,
  },
  {
    id: 'prog-2',
    title: 'Hebrew Bible Expert',
    description: 'Study the Hebrew Bible in depth',
    badgeEmoji: '✡️',
    requiredCourseIds: ['c4', 'c5'],
    totalHours: 20,
    published: true,
    enrollmentCount: 18,
  },
];

const NOOP_EXECUTE = vi.fn();
const NOOP_MUTATION = [{ fetching: false }, NOOP_EXECUTE] as never;

// Both useQuery calls (PROGRAMS_QUERY and MY_PROGRAM_ENROLLMENTS_QUERY) get the same
// return value; the component accesses .data?.programs and .data?.myProgramEnrollments
// independently, so one unified data object satisfies both.
function setupQueries(
  overrides: Record<string, unknown> = {},
  fetching = false,
  error?: { message: string }
) {
  vi.mocked(urql.useQuery).mockReturnValue([
    {
      data: { programs: MOCK_PROGRAMS, myProgramEnrollments: [], ...overrides },
      fetching,
      error,
    },
    vi.fn(),
  ] as never);
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('ProgramsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    NOOP_EXECUTE.mockResolvedValue({ data: null, error: undefined });
    vi.mocked(urql.useMutation).mockReturnValue(NOOP_MUTATION);
    setupQueries();
  });

  it('shows "Nanodegree Programs" heading', () => {
    render(<ProgramsPage />);
    expect(
      screen.getByRole('heading', { name: /nanodegree programs/i })
    ).toBeInTheDocument();
  });

  it('shows loading spinner while fetching programs', () => {
    setupQueries({}, true);
    const { container } = render(<ProgramsPage />);
    expect(container.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('shows error message when programs query fails', () => {
    vi.mocked(urql.useQuery).mockReturnValue([
      { data: undefined, fetching: false, error: { message: 'GraphQL error' } },
      vi.fn(),
    ] as never);
    render(<ProgramsPage />);
    expect(screen.getByText(/failed to load programs/i)).toBeInTheDocument();
    expect(screen.getByText(/graphql error/i)).toBeInTheDocument();
  });

  it('shows "No programs available yet" when program list is empty', () => {
    setupQueries({ programs: [] });
    render(<ProgramsPage />);
    expect(screen.getByText(/no programs available yet/i)).toBeInTheDocument();
  });

  it('renders program titles and descriptions', () => {
    render(<ProgramsPage />);
    expect(screen.getByText('Talmud Scholar')).toBeInTheDocument();
    expect(screen.getByText('Master Talmudic reasoning')).toBeInTheDocument();
    expect(screen.getByText('Hebrew Bible Expert')).toBeInTheDocument();
  });

  it('renders program emoji icons', () => {
    render(<ProgramsPage />);
    expect(screen.getByText('📖')).toBeInTheDocument();
    expect(screen.getByText('✡️')).toBeInTheDocument();
  });

  it('renders course count and total hours', () => {
    render(<ProgramsPage />);
    expect(screen.getByText('3 courses')).toBeInTheDocument();
    expect(screen.getByText('30h total')).toBeInTheDocument();
  });

  it('shows "Enroll" button for non-enrolled programs', () => {
    render(<ProgramsPage />);
    const enrollButtons = screen.getAllByRole('button', { name: /^enroll$/i });
    expect(enrollButtons.length).toBeGreaterThan(0);
  });

  it('shows "Enrolled" badge for enrolled programs', () => {
    setupQueries({
      myProgramEnrollments: [
        {
          id: 'enr-1',
          programId: 'prog-1',
          completedAt: null,
          certificateId: null,
        },
      ],
    });
    render(<ProgramsPage />);
    expect(screen.getByText('Enrolled')).toBeInTheDocument();
  });

  it('shows "Continue" button for in-progress enrolled programs', () => {
    setupQueries({
      myProgramEnrollments: [
        {
          id: 'enr-1',
          programId: 'prog-1',
          completedAt: null,
          certificateId: null,
        },
      ],
    });
    render(<ProgramsPage />);
    expect(
      screen.getByRole('button', { name: /continue/i })
    ).toBeInTheDocument();
  });

  it('shows "View Certificate" button for completed programs', () => {
    setupQueries({
      myProgramEnrollments: [
        {
          id: 'enr-1',
          programId: 'prog-1',
          completedAt: '2024-05-01T00:00:00Z',
          certificateId: 'cert-1',
        },
      ],
    });
    render(<ProgramsPage />);
    expect(
      screen.getByRole('button', { name: /view certificate/i })
    ).toBeInTheDocument();
  });

  it('navigates to program detail when Details button is clicked', () => {
    render(<ProgramsPage />);
    const detailButtons = screen.getAllByRole('button', { name: /details/i });
    fireEvent.click(detailButtons[0] as HTMLElement);
    expect(mockNavigate).toHaveBeenCalledWith('/programs/prog-1');
  });
});
