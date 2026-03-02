import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
} from '@testing-library/react';

// ── Mocks (hoisted by vitest) ─────────────────────────────────────────────────

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return {
    ...actual,
    useParams: vi.fn(() => ({ courseId: 'course-1' })),
    useNavigate: vi.fn(() => mockNavigate),
  };
});

vi.mock('@/lib/auth', () => ({ getCurrentUser: vi.fn() }));

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

vi.mock('@/components/Layout', () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Layout: ({ children }: any) => children,
}));

vi.mock('./CourseDetailPage.modules', () => ({
  CourseModuleList: vi.fn(() => null),
}));

vi.mock('@/components/SourceManager', () => ({
  SourceManager: vi.fn(() => null),
}));

vi.mock('@/lib/graphql/content.queries', () => ({
  COURSE_DETAIL_QUERY: 'COURSE_DETAIL_QUERY',
  MY_ENROLLMENTS_QUERY: 'MY_ENROLLMENTS_QUERY',
  MY_COURSE_PROGRESS_QUERY: 'MY_COURSE_PROGRESS_QUERY',
  ENROLL_COURSE_MUTATION: 'ENROLL_COURSE_MUTATION',
  UNENROLL_COURSE_MUTATION: 'UNENROLL_COURSE_MUTATION',
}));

// ── Imports after mocks ───────────────────────────────────────────────────────

import { CourseDetailPage } from './CourseDetailPage';
import * as auth from '@/lib/auth';
import * as urql from 'urql';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const MOCK_STUDENT = {
  id: 'user-1',
  role: 'STUDENT',
  username: 'stu1',
  email: 'a@b.com',
  tenantId: 't1',
  firstName: 'Test',
  lastName: 'User',
  scopes: [] as string[],
};

const MOCK_INSTRUCTOR = { ...MOCK_STUDENT, role: 'INSTRUCTOR' };

const MOCK_COURSE = {
  id: 'course-1',
  title: 'Test Course',
  description: 'A test description',
  thumbnailUrl: '📚',
  estimatedHours: 5,
  isPublished: true,
  instructorId: 'user-2',
  modules: [],
};

const NOOP_MUTATION = [{ fetching: false }, vi.fn()] as never;

// Single data object satisfies all three useQuery calls
function makeQueryResult(overrides: Record<string, unknown> = {}) {
  return [
    {
      data: {
        course: MOCK_COURSE,
        myEnrollments: [],
        myCourseProgress: null,
        ...overrides,
      },
      fetching: false,
      error: undefined,
    },
    vi.fn(),
  ] as never;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('CourseDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(auth.getCurrentUser).mockReturnValue(MOCK_STUDENT as never);
    vi.mocked(urql.useQuery).mockReturnValue(makeQueryResult());
    vi.mocked(urql.useMutation).mockReturnValue(NOOP_MUTATION);
  });

  it('shows loading spinner while fetching', () => {
    vi.mocked(urql.useQuery).mockReturnValue([
      { data: undefined, fetching: true, error: undefined },
      vi.fn(),
    ] as never);
    render(<CourseDetailPage />);
    expect(screen.getByText(/loading course/i)).toBeInTheDocument();
  });

  it('renders the course title when data is loaded', () => {
    render(<CourseDetailPage />);
    expect(screen.getByText('Test Course')).toBeInTheDocument();
  });

  it('renders the course description', () => {
    render(<CourseDetailPage />);
    expect(screen.getByText('A test description')).toBeInTheDocument();
  });

  it('shows Enroll button when not enrolled', () => {
    render(<CourseDetailPage />);
    expect(
      screen.getByRole('button', { name: /^enroll$/i })
    ).toBeInTheDocument();
  });

  it('shows Unenroll button when enrolled', () => {
    vi.mocked(urql.useQuery).mockReturnValue(
      makeQueryResult({ myEnrollments: [{ courseId: 'course-1' }] })
    );
    render(<CourseDetailPage />);
    expect(
      screen.getByRole('button', { name: /^unenroll$/i })
    ).toBeInTheDocument();
  });

  it('shows Edit Course button for instructor role', () => {
    vi.mocked(auth.getCurrentUser).mockReturnValue(MOCK_INSTRUCTOR as never);
    render(<CourseDetailPage />);
    expect(
      screen.getByRole('button', { name: /edit course/i })
    ).toBeInTheDocument();
  });

  it('does not show Edit Course button for student role', () => {
    render(<CourseDetailPage />);
    expect(
      screen.queryByRole('button', { name: /edit course/i })
    ).not.toBeInTheDocument();
  });

  it('navigates to /courses when back button is clicked', () => {
    render(<CourseDetailPage />);
    fireEvent.click(screen.getByRole('button', { name: /all courses/i }));
    expect(mockNavigate).toHaveBeenCalledWith('/courses');
  });

  it('navigates to edit page when Edit Course button is clicked', () => {
    vi.mocked(auth.getCurrentUser).mockReturnValue(MOCK_INSTRUCTOR as never);
    render(<CourseDetailPage />);
    fireEvent.click(screen.getByRole('button', { name: /edit course/i }));
    expect(mockNavigate).toHaveBeenCalledWith('/courses/course-1/edit');
  });

  it('reveals sources panel when toggle button is clicked', async () => {
    const { container } = render(<CourseDetailPage />);
    const toggleBtn = container.querySelector(
      '[data-testid="toggle-sources"]'
    ) as HTMLElement;
    expect(toggleBtn).toBeInTheDocument();
    expect(
      container.querySelector('[data-testid="sources-panel"]')
    ).not.toBeInTheDocument();

    await act(async () => {
      fireEvent.click(toggleBtn);
    });

    await waitFor(() => {
      expect(
        container.querySelector('[data-testid="sources-panel"]')
      ).toBeInTheDocument();
    });
  });

  it('shows progress bar when enrolled and progress data exists', () => {
    vi.mocked(urql.useQuery).mockReturnValue(
      makeQueryResult({
        myEnrollments: [{ courseId: 'course-1' }],
        myCourseProgress: {
          totalItems: 10,
          completedItems: 5,
          percentComplete: 50,
        },
      })
    );
    render(<CourseDetailPage />);
    expect(screen.getByText('50%')).toBeInTheDocument();
  });
});
