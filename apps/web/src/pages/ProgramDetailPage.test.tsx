import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return {
    ...actual,
    useParams: vi.fn(() => ({ id: 'program-1' })),
    useNavigate: vi.fn(() => mockNavigate),
  };
});

vi.mock('urql', () => ({
  gql: (strings: TemplateStringsArray, ...values: unknown[]) =>
    strings.reduce(
      (acc: string, str: string, i: number) => acc + str + (String(values[i] ?? '')),
      ''
    ),
  useQuery: vi.fn(),
  useMutation: vi.fn(),
}));

vi.mock('@/lib/graphql/programs.queries', () => ({
  PROGRAM_QUERY: 'PROGRAM_QUERY',
  PROGRAM_PROGRESS_QUERY: 'PROGRAM_PROGRESS_QUERY',
  MY_PROGRAM_ENROLLMENTS_QUERY: 'MY_PROGRAM_ENROLLMENTS_QUERY',
  ENROLL_IN_PROGRAM_MUTATION: 'ENROLL_IN_PROGRAM_MUTATION',
}));

// ── Imports after mocks ───────────────────────────────────────────────────────

import { ProgramDetailPage } from './ProgramDetailPage';
import * as urql from 'urql';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const MOCK_PROGRAM = {
  id: 'program-1',
  title: 'Data Science Nanodegree',
  description: 'Learn data science from scratch',
  badgeEmoji: '🎓',
  requiredCourseIds: ['course-aabbccdd', 'course-eeff0011'],
  totalHours: 40,
  published: true,
  enrollmentCount: 150,
};

const NO_ENROLLMENT: never[] = [];
const IN_PROGRESS_ENROLLMENT = [
  {
    id: 'e1',
    programId: 'program-1',
    enrolledAt: '2024-01-01T00:00:00Z',
    completedAt: null,
    certificateId: null,
  },
];
const COMPLETED_ENROLLMENT = [
  {
    id: 'e1',
    programId: 'program-1',
    enrolledAt: '2024-01-01T00:00:00Z',
    completedAt: '2024-06-01T00:00:00Z',
    certificateId: 'cert-abc',
  },
];

function setupQueries(overrides: Record<string, unknown> = {}, fetching = false) {
  vi.mocked(urql.useQuery).mockReturnValue([
    {
      data: {
        program: MOCK_PROGRAM,
        myProgramEnrollments: NO_ENROLLMENT,
        programProgress: null,
        ...overrides,
      },
      fetching,
      error: undefined,
    },
    vi.fn(),
  ] as never);
}

function renderPage() {
  return render(
    <MemoryRouter>
      <ProgramDetailPage />
    </MemoryRouter>
  );
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('ProgramDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(urql.useMutation).mockReturnValue([{}, vi.fn()] as never);
    setupQueries();
  });

  it('shows loading spinner when fetching', () => {
    setupQueries({}, true);
    const { container } = renderPage();
    expect(container.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('shows "Program not found" when program is null', () => {
    setupQueries({ program: null });
    renderPage();
    expect(screen.getByText(/program not found/i)).toBeInTheDocument();
  });

  it('renders the program title', () => {
    renderPage();
    expect(screen.getByText('Data Science Nanodegree')).toBeInTheDocument();
  });

  it('renders the program description', () => {
    renderPage();
    expect(screen.getByText('Learn data science from scratch')).toBeInTheDocument();
  });

  it('renders the badge emoji', () => {
    renderPage();
    expect(screen.getByText('🎓')).toBeInTheDocument();
  });

  it('renders program metadata (hours and enrollment count)', () => {
    renderPage();
    expect(screen.getByText(/40h total/i)).toBeInTheDocument();
    expect(screen.getByText(/150 learners enrolled/i)).toBeInTheDocument();
  });

  it('shows "Enroll in Program" button when not enrolled', () => {
    renderPage();
    expect(
      screen.getByRole('button', { name: /enroll in program/i })
    ).toBeInTheDocument();
  });

  it('shows "Continue Learning" button when enrolled but not completed', () => {
    setupQueries({ myProgramEnrollments: IN_PROGRESS_ENROLLMENT });
    renderPage();
    expect(
      screen.getByRole('button', { name: /continue learning/i })
    ).toBeInTheDocument();
  });

  it('shows "View Nanodegree Certificate" button when completed with certificate', () => {
    setupQueries({ myProgramEnrollments: COMPLETED_ENROLLMENT });
    renderPage();
    expect(
      screen.getByRole('button', { name: /view nanodegree certificate/i })
    ).toBeInTheDocument();
  });

  it('shows "In Progress" badge when enrolled but not completed', () => {
    setupQueries({ myProgramEnrollments: IN_PROGRESS_ENROLLMENT });
    renderPage();
    expect(screen.getByText('In Progress')).toBeInTheDocument();
  });

  it('shows "Completed" badge when program is completed', () => {
    setupQueries({ myProgramEnrollments: COMPLETED_ENROLLMENT });
    renderPage();
    expect(screen.getByText('Completed')).toBeInTheDocument();
  });

  it('renders the required courses section heading', () => {
    renderPage();
    expect(screen.getByText('Required Courses')).toBeInTheDocument();
  });

  it('renders required course entries', () => {
    renderPage();
    // courseId.slice(0,8): 'course-a' and 'course-e'
    expect(screen.getByText(/course 1:/i)).toBeInTheDocument();
    expect(screen.getByText(/course 2:/i)).toBeInTheDocument();
  });

  it('clicking "Back to Programs" navigates to /programs', () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /back to programs/i }));
    expect(mockNavigate).toHaveBeenCalledWith('/programs');
  });

  it('shows empty courses message when no required courses', () => {
    setupQueries({ program: { ...MOCK_PROGRAM, requiredCourseIds: [] } });
    renderPage();
    expect(screen.getByText(/no courses defined yet/i)).toBeInTheDocument();
  });
});
