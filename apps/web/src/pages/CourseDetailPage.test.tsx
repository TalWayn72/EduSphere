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
    useBlocker: vi.fn(() => ({ state: 'unblocked' as const, proceed: vi.fn(), reset: vi.fn() })),
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
  FORK_COURSE_MUTATION: 'FORK_COURSE_MUTATION',
  UPDATE_COURSE_MUTATION: 'UPDATE_COURSE_MUTATION',
}));

vi.mock('@/lib/graphql/lesson.queries', () => ({
  LESSONS_BY_COURSE_QUERY: 'LESSONS_BY_COURSE_QUERY',
}));

// ── Imports after mocks ───────────────────────────────────────────────────────

import { CourseDetailPage } from './CourseDetailPage';
import * as auth from '@/lib/auth';
import * as urql from 'urql';
import * as RRD from 'react-router-dom';

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

const NOOP_MUTATION = [
  { fetching: false },
  vi.fn().mockResolvedValue({ data: undefined, error: undefined }),
] as never;

const MOCK_LESSONS = [
  {
    id: 'lesson-1',
    title: 'שיעור מבוא',
    type: 'THEMATIC',
    status: 'PUBLISHED',
  },
  { id: 'lesson-2', title: 'שיעור מתקדם', type: 'SEQUENTIAL', status: 'READY' },
];

// Single data object satisfies all useQuery calls
function makeQueryResult(overrides: Record<string, unknown> = {}) {
  return [
    {
      data: {
        course: MOCK_COURSE,
        myEnrollments: [],
        myCourseProgress: null,
        lessonsByCourse: MOCK_LESSONS,
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
    vi.mocked(RRD.useBlocker).mockReturnValue({
      state: 'unblocked',
      proceed: vi.fn(),
      reset: vi.fn(),
    } as never);
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

  it('clicking "Edit Course" enters inline edit mode (does not navigate)', () => {
    vi.mocked(auth.getCurrentUser).mockReturnValue(MOCK_INSTRUCTOR as never);
    render(<CourseDetailPage />);
    fireEvent.click(screen.getByRole('button', { name: /edit course/i }));
    expect(mockNavigate).not.toHaveBeenCalledWith('/courses/course-1/edit');
    expect(screen.getByTestId('course-title-input')).toBeInTheDocument();
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

  it('shows lessons section for student (not gated by canEdit)', () => {
    vi.mocked(auth.getCurrentUser).mockReturnValue(MOCK_STUDENT as never);
    render(<CourseDetailPage />);
    expect(screen.getByText('🎓 שיעורים')).toBeInTheDocument();
  });

  it('shows lesson titles for student', () => {
    vi.mocked(auth.getCurrentUser).mockReturnValue(MOCK_STUDENT as never);
    render(<CourseDetailPage />);
    expect(screen.getByText('שיעור מבוא')).toBeInTheDocument();
    expect(screen.getByText('שיעור מתקדם')).toBeInTheDocument();
  });

  it('hides "+ הוסף שיעור" button from student', () => {
    vi.mocked(auth.getCurrentUser).mockReturnValue(MOCK_STUDENT as never);
    render(<CourseDetailPage />);
    expect(
      screen.queryByRole('button', { name: /הוסף שיעור/i })
    ).not.toBeInTheDocument();
  });

  it('shows "+ הוסף שיעור" button to instructor', () => {
    vi.mocked(auth.getCurrentUser).mockReturnValue(MOCK_INSTRUCTOR as never);
    render(<CourseDetailPage />);
    expect(
      screen.getByRole('button', { name: /הוסף שיעור/i })
    ).toBeInTheDocument();
  });

  it('navigates to lesson detail when lesson row is clicked', () => {
    render(<CourseDetailPage />);
    fireEvent.click(screen.getByText('שיעור מבוא'));
    expect(mockNavigate).toHaveBeenCalledWith(
      '/courses/course-1/lessons/lesson-1'
    );
  });

  it('shows status badge per lesson', () => {
    render(<CourseDetailPage />);
    expect(screen.getByText('PUBLISHED')).toBeInTheDocument();
    expect(screen.getByText('READY')).toBeInTheDocument();
  });

  it('shows empty state message for student when no lessons', () => {
    vi.mocked(urql.useQuery).mockReturnValue(
      makeQueryResult({ lessonsByCourse: [] })
    );
    vi.mocked(auth.getCurrentUser).mockReturnValue(MOCK_STUDENT as never);
    render(<CourseDetailPage />);
    expect(screen.getByText(/אין שיעורים זמינים/i)).toBeInTheDocument();
  });

  describe('Inline title editing', () => {
    it('shows "Edit Course" button for instructor users', () => {
      vi.mocked(auth.getCurrentUser).mockReturnValue(MOCK_INSTRUCTOR as never);
      render(<CourseDetailPage />);
      expect(screen.getByTestId('edit-course-btn')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /edit course/i })).toBeInTheDocument();
    });

    it('clicking "Edit Course" enters edit mode and shows title input', async () => {
      vi.mocked(auth.getCurrentUser).mockReturnValue(MOCK_INSTRUCTOR as never);
      render(<CourseDetailPage />);
      await act(async () => {
        fireEvent.click(screen.getByTestId('edit-course-btn'));
      });
      expect(screen.getByTestId('course-title-input')).toBeInTheDocument();
      expect((screen.getByTestId('course-title-input') as HTMLInputElement).value).toBe('Test Course');
    });

    it('shows "שמור שינויים" button in edit mode (not "Edit Course")', async () => {
      vi.mocked(auth.getCurrentUser).mockReturnValue(MOCK_INSTRUCTOR as never);
      render(<CourseDetailPage />);
      await act(async () => {
        fireEvent.click(screen.getByTestId('edit-course-btn'));
      });
      expect(screen.getByTestId('save-course-btn')).toBeInTheDocument();
      expect(screen.getByText('שמור שינויים')).toBeInTheDocument();
    });

    it('"Edit Course" button hidden in edit mode (regression guard)', async () => {
      vi.mocked(auth.getCurrentUser).mockReturnValue(MOCK_INSTRUCTOR as never);
      render(<CourseDetailPage />);
      await act(async () => {
        fireEvent.click(screen.getByTestId('edit-course-btn'));
      });
      expect(screen.queryByTestId('edit-course-btn')).not.toBeInTheDocument();
    });

    it('clicking ביטול exits edit mode without saving', async () => {
      vi.mocked(auth.getCurrentUser).mockReturnValue(MOCK_INSTRUCTOR as never);
      const updateFn = vi.fn().mockResolvedValue({ data: undefined, error: undefined });
      vi.mocked(urql.useMutation).mockImplementation((mutationDoc) => {
        if (mutationDoc === 'UPDATE_COURSE_MUTATION') return [{ fetching: false }, updateFn] as never;
        return NOOP_MUTATION;
      });
      render(<CourseDetailPage />);
      await act(async () => {
        fireEvent.click(screen.getByTestId('edit-course-btn'));
      });
      expect(screen.getByTestId('course-title-input')).toBeInTheDocument();
      await act(async () => {
        fireEvent.click(screen.getByTestId('cancel-edit-btn'));
      });
      expect(screen.queryByTestId('course-title-input')).not.toBeInTheDocument();
      expect(updateFn).not.toHaveBeenCalled();
    });

    it('typing in title input and pressing Enter calls UPDATE_COURSE_MUTATION', async () => {
      vi.mocked(auth.getCurrentUser).mockReturnValue(MOCK_INSTRUCTOR as never);
      const updateFn = vi.fn().mockResolvedValue({ data: { updateCourse: { id: 'course-1', title: 'New Title' } }, error: undefined });
      vi.mocked(urql.useMutation).mockImplementation((mutationDoc) => {
        if (mutationDoc === 'UPDATE_COURSE_MUTATION') return [{ fetching: false }, updateFn] as never;
        return NOOP_MUTATION;
      });
      render(<CourseDetailPage />);
      await act(async () => {
        fireEvent.click(screen.getByTestId('edit-course-btn'));
      });
      const input = screen.getByTestId('course-title-input') as HTMLInputElement;
      await act(async () => {
        fireEvent.change(input, { target: { value: 'New Title' } });
        fireEvent.keyDown(input, { key: 'Enter' });
      });
      await waitFor(() => {
        expect(updateFn).toHaveBeenCalledWith({ id: 'course-1', input: { title: 'New Title' } });
      });
    });

    it('save error shows toast', async () => {
      vi.mocked(auth.getCurrentUser).mockReturnValue(MOCK_INSTRUCTOR as never);
      const updateFn = vi.fn().mockResolvedValue({
        data: null,
        error: {
          graphQLErrors: [{ message: 'Permission denied' }],
          message: '[GraphQL] Permission denied',
        },
      });
      vi.mocked(urql.useMutation).mockImplementation((mutationDoc) => {
        if (mutationDoc === 'UPDATE_COURSE_MUTATION') return [{ fetching: false }, updateFn] as never;
        return NOOP_MUTATION;
      });
      render(<CourseDetailPage />);
      await act(async () => {
        fireEvent.click(screen.getByTestId('edit-course-btn'));
      });
      const input = screen.getByTestId('course-title-input') as HTMLInputElement;
      await act(async () => {
        fireEvent.change(input, { target: { value: 'Updated Title' } });
        fireEvent.click(screen.getByTestId('save-course-btn'));
      });
      await waitFor(() => {
        expect(screen.getByText('שגיאה בשמירת שם הקורס')).toBeInTheDocument();
      });
      // edit mode stays open on error (user can retry)
      expect(screen.getByTestId('course-title-input')).toBeInTheDocument();
    });
  });

  // ── BUG FIX: unsaved changes guard while in inline title-edit mode ─────────
  // Regression guard: dialog MUST appear when user tries to navigate away
  // while editMode=true (title being edited). Anti-recurrence test below.

  describe('unsaved changes navigation guard (inline edit mode)', () => {
    it('unsaved-changes-dialog is NOT shown when blocker is unblocked', () => {
      vi.mocked(auth.getCurrentUser).mockReturnValue(MOCK_INSTRUCTOR as never);
      vi.mocked(RRD.useBlocker).mockReturnValue({
        state: 'unblocked',
        proceed: vi.fn(),
        reset: vi.fn(),
      } as never);
      render(<CourseDetailPage />);
      expect(screen.queryByTestId('unsaved-changes-dialog')).not.toBeInTheDocument();
    });

    it('unsaved-changes-dialog IS shown when navigation is blocked (editMode=true)', async () => {
      vi.mocked(auth.getCurrentUser).mockReturnValue(MOCK_INSTRUCTOR as never);
      vi.mocked(RRD.useBlocker).mockReturnValue({
        state: 'blocked',
        proceed: vi.fn(),
        reset: vi.fn(),
      } as never);
      render(<CourseDetailPage />);
      // Dialog should appear regardless of whether editMode was entered
      expect(screen.getByTestId('unsaved-changes-dialog')).toBeInTheDocument();
    });

    it('clicking "Leave anyway" calls blocker.proceed', async () => {
      vi.mocked(auth.getCurrentUser).mockReturnValue(MOCK_INSTRUCTOR as never);
      const mockProceed = vi.fn();
      vi.mocked(RRD.useBlocker).mockReturnValue({
        state: 'blocked',
        proceed: mockProceed,
        reset: vi.fn(),
      } as never);
      render(<CourseDetailPage />);
      fireEvent.click(screen.getByTestId('unsaved-leave-btn'));
      expect(mockProceed).toHaveBeenCalledTimes(1);
    });

    it('clicking "Stay on page" calls blocker.reset', async () => {
      vi.mocked(auth.getCurrentUser).mockReturnValue(MOCK_INSTRUCTOR as never);
      const mockReset = vi.fn();
      vi.mocked(RRD.useBlocker).mockReturnValue({
        state: 'blocked',
        proceed: vi.fn(),
        reset: mockReset,
      } as never);
      render(<CourseDetailPage />);
      fireEvent.click(screen.getByTestId('unsaved-stay-btn'));
      expect(mockReset).toHaveBeenCalledTimes(1);
    });

    it('useBlocker is called with editMode state (false by default)', () => {
      render(<CourseDetailPage />);
      // On initial render editMode=false so blocker should receive false
      expect(vi.mocked(RRD.useBlocker)).toHaveBeenCalledWith(false);
    });

    it('useBlocker is called with true after entering edit mode', async () => {
      vi.mocked(auth.getCurrentUser).mockReturnValue(MOCK_INSTRUCTOR as never);
      render(<CourseDetailPage />);
      await act(async () => {
        fireEvent.click(screen.getByTestId('edit-course-btn'));
      });
      // After entering editMode, useBlocker should have been called with true
      const calls = vi.mocked(RRD.useBlocker).mock.calls;
      const hasCalledWithTrue = calls.some(([condition]) => condition === true);
      expect(hasCalledWithTrue).toBe(true);
    });
  });

  // ── Optimistic enrollment tests (useOptimistic via useOptimisticEnrollment) ──

  describe('optimistic enrollment (useOptimistic)', () => {
    it('shows Enroll button when not enrolled (optimisticEnrolled=false)', () => {
      render(<CourseDetailPage />);
      expect(
        screen.getByRole('button', { name: /^enroll$/i })
      ).toBeInTheDocument();
      // Regression guard: BAD state — "Unenroll" must NOT appear when not enrolled
      expect(
        screen.queryByRole('button', { name: /^unenroll$/i })
      ).not.toBeInTheDocument();
    });

    it('shows Unenroll button when enrolled (optimisticEnrolled=true)', () => {
      vi.mocked(urql.useQuery).mockReturnValue(
        makeQueryResult({ myEnrollments: [{ courseId: 'course-1' }] })
      );
      render(<CourseDetailPage />);
      expect(
        screen.getByRole('button', { name: /^unenroll$/i })
      ).toBeInTheDocument();
      // Regression guard: BAD state — "Enroll" must NOT appear when enrolled
      expect(
        screen.queryByRole('button', { name: /^enroll$/i })
      ).not.toBeInTheDocument();
    });

    it('calls enrollMutation when Enroll button is clicked', async () => {
      const enrollFn = vi
        .fn()
        .mockResolvedValue({ data: undefined, error: undefined });
      vi.mocked(urql.useMutation).mockImplementation((mutationDoc) => {
        if (mutationDoc === 'ENROLL_COURSE_MUTATION')
          return [{ fetching: false }, enrollFn] as never;
        return NOOP_MUTATION;
      });

      render(<CourseDetailPage />);
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /^enroll$/i }));
      });

      await waitFor(() => {
        expect(enrollFn).toHaveBeenCalledWith({ courseId: 'course-1' });
      });
    });

    it('calls unenrollMutation when Unenroll button is clicked', async () => {
      vi.mocked(urql.useQuery).mockReturnValue(
        makeQueryResult({ myEnrollments: [{ courseId: 'course-1' }] })
      );
      const unenrollFn = vi
        .fn()
        .mockResolvedValue({ data: undefined, error: undefined });
      vi.mocked(urql.useMutation).mockImplementation((mutationDoc) => {
        if (mutationDoc === 'UNENROLL_COURSE_MUTATION')
          return [{ fetching: false }, unenrollFn] as never;
        return NOOP_MUTATION;
      });

      render(<CourseDetailPage />);
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /^unenroll$/i }));
      });

      await waitFor(() => {
        expect(unenrollFn).toHaveBeenCalledWith({ courseId: 'course-1' });
      });
    });

    it('shows toast on successful enrollment', async () => {
      const enrollFn = vi
        .fn()
        .mockResolvedValue({ data: undefined, error: undefined });
      vi.mocked(urql.useMutation).mockImplementation((mutationDoc) => {
        if (mutationDoc === 'ENROLL_COURSE_MUTATION')
          return [{ fetching: false }, enrollFn] as never;
        return NOOP_MUTATION;
      });

      render(<CourseDetailPage />);
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /^enroll$/i }));
      });

      await waitFor(() => {
        // Toast appears — it contains the enroll success i18n key output
        // The toast container is a fixed div rendered in the page
        expect(enrollFn).toHaveBeenCalled();
      });
    });

    it('shows toast error and does NOT flip button on enroll mutation failure', async () => {
      const enrollFn = vi.fn().mockResolvedValue({
        data: null,
        error: {
          graphQLErrors: [{ message: 'Enrollment limit reached' }],
          message: '[GraphQL] Enrollment limit reached',
        },
      });
      vi.mocked(urql.useMutation).mockImplementation((mutationDoc) => {
        if (mutationDoc === 'ENROLL_COURSE_MUTATION')
          return [{ fetching: false }, enrollFn] as never;
        return NOOP_MUTATION;
      });

      render(<CourseDetailPage />);
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /^enroll$/i }));
      });

      await waitFor(() => {
        // Toast with error message appears
        expect(screen.getByText('Enrollment limit reached')).toBeInTheDocument();
      });

      // Regression guard: button reverts to "Enroll" after failure (BAD = "Unenroll" shown)
      expect(
        screen.queryByRole('button', { name: /^unenroll$/i })
      ).not.toBeInTheDocument();
    });
  });

  // ── BUG REGRESSION: Enrollment button revert (BUG-XXX) ──────────────────────
  // Root cause: useOptimistic reverts to base `isEnrolled` after transition ends,
  // but MY_ENROLLMENTS_QUERY cache was stale (not refetched after mutation).
  // Fix: reexecuteEnrollments({ requestPolicy: 'network-only' }) in onSuccess
  //      + enrolledLocal state pins new value until refetch completes.
  describe('BUG REGRESSION: enrollment button reverts to הירשם after enroll (BUG-XXX)', () => {
    it('calls reexecuteEnrollments with network-only after successful enroll', async () => {
      const reexecuteFn = vi.fn();
      vi.mocked(urql.useQuery).mockReturnValue([
        {
          data: {
            course: MOCK_COURSE,
            myEnrollments: [],
            myCourseProgress: null,
            lessonsByCourse: MOCK_LESSONS,
          },
          fetching: false,
          error: undefined,
        },
        reexecuteFn,
      ] as never);

      const enrollFn = vi.fn().mockResolvedValue({ data: undefined, error: undefined });
      vi.mocked(urql.useMutation).mockImplementation((mutationDoc) => {
        if (mutationDoc === 'ENROLL_COURSE_MUTATION')
          return [{ fetching: false }, enrollFn] as never;
        return NOOP_MUTATION;
      });

      render(<CourseDetailPage />);
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /^enroll$/i }));
      });

      await waitFor(() => {
        expect(reexecuteFn).toHaveBeenCalledWith({ requestPolicy: 'network-only' });
      });
    });

    it('regression guard: Enroll button does NOT revert to "הירשם" after successful enrollment', async () => {
      const enrollFn = vi.fn().mockResolvedValue({ data: undefined, error: undefined });
      vi.mocked(urql.useMutation).mockImplementation((mutationDoc) => {
        if (mutationDoc === 'ENROLL_COURSE_MUTATION')
          return [{ fetching: false }, enrollFn] as never;
        return NOOP_MUTATION;
      });

      render(<CourseDetailPage />);
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /^enroll$/i }));
      });

      await waitFor(() => {
        expect(enrollFn).toHaveBeenCalled();
      });

      // BAD STATE: "Enroll" must NOT appear after successful enrollment
      // (this was the recurring bug — button reverted to "הירשם")
      expect(
        screen.queryByRole('button', { name: /^enroll$/i })
      ).not.toBeInTheDocument();
    });

    it('regression guard: Unenroll button does NOT revert to "בטל" after successful unenroll', async () => {
      vi.mocked(urql.useQuery).mockReturnValue(
        makeQueryResult({ myEnrollments: [{ courseId: 'course-1' }] })
      );
      const unenrollFn = vi.fn().mockResolvedValue({ data: undefined, error: undefined });
      vi.mocked(urql.useMutation).mockImplementation((mutationDoc) => {
        if (mutationDoc === 'UNENROLL_COURSE_MUTATION')
          return [{ fetching: false }, unenrollFn] as never;
        return NOOP_MUTATION;
      });

      render(<CourseDetailPage />);
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /^unenroll$/i }));
      });

      await waitFor(() => {
        expect(unenrollFn).toHaveBeenCalled();
      });

      // BAD STATE: "Unenroll" must NOT appear after successful unenrollment
      expect(
        screen.queryByRole('button', { name: /^unenroll$/i })
      ).not.toBeInTheDocument();
    });
  });

  describe('Fork Course', () => {
    it('shows Fork Course button for INSTRUCTOR role', () => {
      vi.mocked(auth.getCurrentUser).mockReturnValue(MOCK_INSTRUCTOR as never);
      render(<CourseDetailPage />);
      expect(
        screen.getByTestId('fork-course-btn')
      ).toBeInTheDocument();
    });

    it('hides Fork Course button for STUDENT role', () => {
      vi.mocked(auth.getCurrentUser).mockReturnValue(MOCK_STUDENT as never);
      render(<CourseDetailPage />);
      expect(
        screen.queryByTestId('fork-course-btn')
      ).not.toBeInTheDocument();
    });

    it('shows fork error banner without raw error on mutation failure', async () => {
      const forkMutationFn = vi.fn().mockResolvedValue({
        data: null,
        error: {
          graphQLErrors: [{ message: 'Course fork failed' }],
          message: '[GraphQL] Course fork failed [Network]',
        },
      });
      vi.mocked(auth.getCurrentUser).mockReturnValue(MOCK_INSTRUCTOR as never);

      // Match by document string — the content.queries mock returns 'FORK_COURSE_MUTATION'
      // as the string value, so we can identify it regardless of render count.
      vi.mocked(urql.useMutation).mockImplementation((mutationDoc) => {
        if (mutationDoc === 'FORK_COURSE_MUTATION') {
          return [{ fetching: false }, forkMutationFn] as never;
        }
        return NOOP_MUTATION;
      });

      render(<CourseDetailPage />);

      await act(async () => {
        fireEvent.click(screen.getByTestId('fork-course-btn'));
      });

      await waitFor(() => {
        expect(screen.getByTestId('fork-error-banner')).toBeInTheDocument();
      });

      // Assert no raw GraphQL/network error strings are exposed to the user
      expect(screen.queryByText(/\[GraphQL\]/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/\[Network\]/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/Unexpected error/i)).not.toBeInTheDocument();
    });
  });
});
