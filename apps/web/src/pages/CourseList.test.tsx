import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { vi, describe, it, expect, beforeEach } from 'vitest';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual =
    await vi.importActual<typeof import('react-router-dom')>(
      'react-router-dom'
    );
  return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock('urql', () => ({
  gql: (strings: TemplateStringsArray, ...values: unknown[]) =>
    strings.reduce(
      (acc: string, str: string, i: number) =>
        acc + str + String(values[i] ?? ''),
      ''
    ),
  useQuery: vi.fn(() => [
    { data: { courses: [] }, fetching: false, error: undefined },
    vi.fn(),
  ]),
  // useMutation must be mocked to avoid the "No client specified" urql Provider error.
  // The execute function resolves with { error: null } so that enrollment handlers
  // can destructure without throwing.
  useMutation: vi.fn(() => [
    { fetching: false },
    vi.fn().mockResolvedValue({ error: null }),
  ]),
  // useSubscription must be mocked for AiCourseCreatorModal (rendered inside CourseList).
  useSubscription: vi.fn(() => [
    { data: undefined, fetching: false, error: undefined },
    vi.fn(),
  ]),
}));

const mockGetCurrentUser = vi.fn();
vi.mock('@/lib/auth', () => ({
  getCurrentUser: () => mockGetCurrentUser(),
}));

vi.mock('@/components/Layout', () => ({
  Layout: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="layout">{children}</div>
  ),
}));

import { CourseList } from './CourseList';
import { useQuery, useMutation } from 'urql';

const MOCK_COURSES = [
  {
    id: 'course-1',
    title: 'Introduction to Talmud Study',
    description: 'Fundamentals of Talmudic reasoning',
    slug: 'intro-talmud',
    thumbnailUrl: '📚',
    instructorId: 'inst-1',
    isPublished: true,
    estimatedHours: 8,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'course-2',
    title: 'Advanced Chavruta Techniques',
    description: 'Collaborative Talmud learning with AI',
    slug: 'advanced-chavruta',
    thumbnailUrl: '🤝',
    instructorId: 'inst-1',
    isPublished: true,
    estimatedHours: 6,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'course-3',
    title: 'Knowledge Graph Navigation',
    description: 'Explore interconnected concepts',
    slug: 'knowledge-graph',
    thumbnailUrl: '🕸️',
    instructorId: 'inst-1',
    isPublished: false,
    estimatedHours: 4,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

const STUDENT_USER = {
  id: 'u1',
  role: 'STUDENT',
  firstName: 'Alice',
  lastName: 'B',
  tenantId: 't1',
};
const INSTRUCTOR_USER = {
  id: 'u2',
  role: 'INSTRUCTOR',
  firstName: 'Bob',
  lastName: 'C',
  tenantId: 't1',
};

function renderCourseList(user = STUDENT_USER, locationState: unknown = {}) {
  mockGetCurrentUser.mockReturnValue(user);
  return render(
    <MemoryRouter
      initialEntries={[{ pathname: '/courses', state: locationState }]}
    >
      <Routes>
        <Route path="/courses" element={<CourseList />} />
        <Route path="/learn/:id" element={<div>Content Viewer</div>} />
        <Route path="/courses/new" element={<div>New Course</div>} />
      </Routes>
    </MemoryRouter>
  );
}

describe('CourseList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useQuery).mockReturnValue([
      { data: { courses: MOCK_COURSES }, fetching: false, error: undefined },
      vi.fn(),
    ] as unknown as ReturnType<typeof useQuery>);
    // Re-set useMutation after clearAllMocks so it always returns a valid tuple.
    // The execute function resolves with { error: null } so enrollment handlers
    // can destructure the result without throwing.
    vi.mocked(useMutation).mockReturnValue([
      { fetching: false } as ReturnType<typeof useMutation>[0],
      vi.fn().mockResolvedValue({ error: null }),
    ]);
  });

  it('renders the Courses heading', () => {
    renderCourseList();
    expect(screen.getByText('Courses')).toBeInTheDocument();
  });

  it('renders courses from urql data', () => {
    renderCourseList();
    expect(
      screen.getByText('Introduction to Talmud Study')
    ).toBeInTheDocument();
    expect(
      screen.getByText('Advanced Chavruta Techniques')
    ).toBeInTheDocument();
    expect(screen.getByText('Knowledge Graph Navigation')).toBeInTheDocument();
  });

  it('shows loading spinner when fetching', () => {
    vi.mocked(useQuery).mockReturnValueOnce([
      { data: undefined, fetching: true, error: undefined },
      vi.fn(),
    ] as unknown as ReturnType<typeof useQuery>);
    renderCourseList();
    expect(screen.getByText(/loading courses/i)).toBeInTheDocument();
  });

  it('shows offline banner and mock fallback courses when query fails', () => {
    vi.mocked(useQuery).mockReturnValueOnce([
      { data: undefined, fetching: false, error: new Error('Network error') },
      vi.fn(),
    ] as unknown as ReturnType<typeof useQuery>);
    renderCourseList();
    // Non-blocking warning banner is shown
    expect(
      screen.getByText(/\[Network\] Failed to fetch/i)
    ).toBeInTheDocument();
    expect(screen.getByText(/showing cached data/i)).toBeInTheDocument();
    // Page still renders with mock fallback courses — not a blank error page
    expect(
      screen.getByText('Introduction to Talmud Study')
    ).toBeInTheDocument();
    expect(
      screen.getByText('Advanced Chavruta Techniques')
    ).toBeInTheDocument();
    expect(screen.getByText('Courses')).toBeInTheDocument();
  });

  it('shows Enroll buttons for students', () => {
    renderCourseList(STUDENT_USER);
    const enrollBtns = screen.getAllByRole('button', { name: /^enroll$/i });
    expect(enrollBtns.length).toBe(3);
  });

  it('does not show Enroll buttons for instructors', () => {
    renderCourseList(INSTRUCTOR_USER);
    expect(
      screen.queryByRole('button', { name: /^enroll$/i })
    ).not.toBeInTheDocument();
  });

  it('shows New Course button for instructors', () => {
    renderCourseList(INSTRUCTOR_USER);
    expect(
      screen.getByRole('button', { name: /new course/i })
    ).toBeInTheDocument();
  });

  it('does not show New Course button for students', () => {
    renderCourseList(STUDENT_USER);
    expect(
      screen.queryByRole('button', { name: /new course/i })
    ).not.toBeInTheDocument();
  });

  it('navigates to /courses/new when New Course is clicked', () => {
    renderCourseList(INSTRUCTOR_USER);
    fireEvent.click(screen.getByRole('button', { name: /new course/i }));
    expect(mockNavigate).toHaveBeenCalledWith('/courses/new');
  });

  it('enrolls in a course and shows toast', async () => {
    renderCourseList(STUDENT_USER);
    const enrollBtns = screen.getAllByRole('button', { name: /^enroll$/i });
    fireEvent.click(enrollBtns[0]!);
    await waitFor(() =>
      expect(screen.getByText(/enrolled in/i)).toBeInTheDocument()
    );
  });

  it('unenrolls after enrolling', async () => {
    // Pre-populate enrollment data so the "Enrolled" button is shown for course-1.
    // CourseList derives enrollment state from the query; clicking Enroll does not
    // update local state — it re-fetches via reexecuteEnrollments. For this test we
    // start with an enrolled course so we can immediately test unenrollment.
    vi.mocked(useQuery).mockReturnValue([
      {
        data: {
          courses: MOCK_COURSES,
          myEnrollments: [
            {
              id: 'e1',
              courseId: 'course-1',
              userId: 'u1',
              status: 'ACTIVE',
              enrolledAt: '',
              completedAt: null,
            },
          ],
        },
        fetching: false,
        error: undefined,
      },
      vi.fn(),
    ] as unknown as ReturnType<typeof useQuery>);
    renderCourseList(STUDENT_USER);
    // course-1 should show "Enrolled" button
    const enrolledBtns = screen.getAllByRole('button', { name: /enrolled/i });
    fireEvent.click(enrolledBtns[0]!);
    await waitFor(() =>
      expect(screen.getByText(/unenrolled from/i)).toBeInTheDocument()
    );
  });

  it('shows Unpublish for published courses (instructor)', () => {
    renderCourseList(INSTRUCTOR_USER);
    expect(
      screen.getAllByRole('button', { name: /unpublish/i }).length
    ).toBeGreaterThan(0);
  });

  it('shows Publish for draft courses (instructor)', () => {
    renderCourseList(INSTRUCTOR_USER);
    expect(
      screen.getAllByRole('button', { name: /^publish$/i }).length
    ).toBeGreaterThan(0);
  });

  it('shows Draft badge for unpublished course', () => {
    renderCourseList(INSTRUCTOR_USER);
    expect(screen.getByText('Draft')).toBeInTheDocument();
  });

  it('navigates to /courses/:id when card is clicked', () => {
    renderCourseList(STUDENT_USER);
    fireEvent.click(screen.getByText('Introduction to Talmud Study'));
    expect(mockNavigate).toHaveBeenCalledWith('/courses/course-1');
  });

  it('shows toast message from navigation state', async () => {
    // CourseList shows the navigation state message as a toast notification.
    // The new course itself is loaded via the query (which is mocked to return
    // MOCK_COURSES), so the "My New Course" title won't appear unless refetched.
    renderCourseList(STUDENT_USER, {
      newCourse: {
        title: 'My New Course',
        description: 'Great',
        thumbnail: '📖',
        published: true,
        duration: '3 weeks',
        modules: [],
      },
      message: 'Course published!',
    });
    await waitFor(() =>
      expect(screen.getByText(/course published/i)).toBeInTheDocument()
    );
    // Existing courses from mock query still appear
    expect(
      screen.getByText('Introduction to Talmud Study')
    ).toBeInTheDocument();
  });

  it('works when user is null (unauthenticated)', () => {
    mockGetCurrentUser.mockReturnValue(null);
    renderCourseList(undefined);
    expect(screen.getByText('Courses')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /new course/i })
    ).not.toBeInTheDocument();
  });

  it('renders layout wrapper', () => {
    renderCourseList();
    expect(screen.getByTestId('layout')).toBeInTheDocument();
  });

  it('shows empty state when no courses returned', () => {
    vi.mocked(useQuery).mockReturnValueOnce([
      { data: { courses: [] }, fetching: false, error: undefined },
      vi.fn(),
    ] as unknown as ReturnType<typeof useQuery>);
    renderCourseList();
    expect(screen.getByText('Courses')).toBeInTheDocument();
  });

  // ── Open button (inside card header) ────────────────────────────────────────

  it('clicking the "Open" ghost button navigates to /courses/:id', () => {
    renderCourseList(STUDENT_USER);
    // The "Open" button is opacity-0 by default (group-hover) but always in DOM
    const openButtons = screen.getAllByRole('button', { name: /^open$/i });
    expect(openButtons.length).toBe(MOCK_COURSES.length);
    fireEvent.click(openButtons[0]!);
    expect(mockNavigate).toHaveBeenCalledWith('/courses/course-1');
  });

  it('Open button stopPropagation prevents duplicate navigation calls', () => {
    renderCourseList(STUDENT_USER);
    const openButtons = screen.getAllByRole('button', { name: /^open$/i });
    fireEvent.click(openButtons[1]!);
    // Only one navigation call — stopPropagation prevents the card onClick firing twice
    expect(mockNavigate).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith('/courses/course-2');
  });

  // ── Instructor Edit button ──────────────────────────────────────────────────

  it('instructor sees one Edit button per course', () => {
    renderCourseList(INSTRUCTOR_USER);
    const editBtns = screen.getAllByRole('button', { name: /^edit$/i });
    expect(editBtns.length).toBe(MOCK_COURSES.length);
  });

  it('clicking Edit button navigates to /courses/:id/edit', () => {
    renderCourseList(INSTRUCTOR_USER);
    const editBtns = screen.getAllByRole('button', { name: /^edit$/i });
    fireEvent.click(editBtns[0]!);
    expect(mockNavigate).toHaveBeenCalledWith('/courses/course-1/edit');
  });

  it('non-instructor does not see Edit button', () => {
    renderCourseList(STUDENT_USER);
    expect(
      screen.queryByRole('button', { name: /^edit$/i })
    ).not.toBeInTheDocument();
  });

  // ── Publish / Unpublish toggle (instructor) ──────────────────────────────────

  it('clicking Unpublish toggles course to unpublished state locally', () => {
    renderCourseList(INSTRUCTOR_USER);
    // course-1 and course-2 are published — grab first Unpublish and click it
    const unpublishBtns = screen.getAllByRole('button', {
      name: /unpublish/i,
    });
    fireEvent.click(unpublishBtns[0]!);
    // After toggling, Publish buttons should increase by 1
    const publishBtnsAfter = screen.getAllByRole('button', {
      name: /^publish$/i,
    });
    expect(publishBtnsAfter.length).toBeGreaterThanOrEqual(2);
  });

  it('clicking Publish on a draft course toggles it to published locally', () => {
    renderCourseList(INSTRUCTOR_USER);
    // course-3 is a draft — click its Publish button
    const publishBtns = screen.getAllByRole('button', { name: /^publish$/i });
    fireEvent.click(publishBtns[0]!);
    // All 3 courses now show Unpublish
    const unpublishBtnsAfter = screen.getAllByRole('button', {
      name: /unpublish/i,
    });
    expect(unpublishBtnsAfter.length).toBeGreaterThanOrEqual(3);
  });

  it('Unpublish button click does not navigate away', () => {
    renderCourseList(INSTRUCTOR_USER);
    const unpublishBtns = screen.getAllByRole('button', {
      name: /unpublish/i,
    });
    fireEvent.click(unpublishBtns[0]!);
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  // ── Search ──────────────────────────────────────────────────────────────────

  it('renders search input', () => {
    renderCourseList();
    expect(
      screen.getByRole('textbox', { name: /search courses/i })
    ).toBeInTheDocument();
  });

  it('filters courses by title when searching', () => {
    renderCourseList();
    const input = screen.getByRole('textbox', { name: /search courses/i });
    // 'Knowledge' only appears in course-3 title; absent from all other titles/descriptions
    fireEvent.change(input, { target: { value: 'Knowledge' } });
    expect(screen.getByText('Knowledge Graph Navigation')).toBeInTheDocument();
    expect(
      screen.queryByText('Introduction to Talmud Study')
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText('Advanced Chavruta Techniques')
    ).not.toBeInTheDocument();
  });

  it('filters courses by description when searching', () => {
    renderCourseList();
    const input = screen.getByRole('textbox', { name: /search courses/i });
    // 'AI' only appears in course-2 description ('Collaborative Talmud learning with AI')
    fireEvent.change(input, { target: { value: 'AI' } });
    expect(
      screen.getByText('Advanced Chavruta Techniques')
    ).toBeInTheDocument();
    expect(
      screen.queryByText('Knowledge Graph Navigation')
    ).not.toBeInTheDocument();
  });

  it('shows all courses when search is cleared', () => {
    renderCourseList();
    const input = screen.getByRole('textbox', { name: /search courses/i });
    fireEvent.change(input, { target: { value: 'talmud' } });
    fireEvent.change(input, { target: { value: '' } });
    expect(
      screen.getByText('Introduction to Talmud Study')
    ).toBeInTheDocument();
    expect(
      screen.getByText('Advanced Chavruta Techniques')
    ).toBeInTheDocument();
    expect(screen.getByText('Knowledge Graph Navigation')).toBeInTheDocument();
  });

  // ── Sort ────────────────────────────────────────────────────────────────────

  it('renders sort dropdown', () => {
    renderCourseList();
    expect(
      screen.getByRole('combobox', { name: /sort courses/i })
    ).toBeInTheDocument();
  });

  it('sorts courses A→Z by title when title sort selected', () => {
    renderCourseList();
    const select = screen.getByRole('combobox', { name: /sort courses/i });
    fireEvent.change(select, { target: { value: 'title' } });
    const titles = screen
      .getAllByRole('heading', { level: 3 })
      .map((h) => h.textContent ?? '');
    const sorted = [...titles].sort((a, b) => a.localeCompare(b));
    expect(titles).toEqual(sorted);
  });

  // ── Tab filter (students only) ───────────────────────────────────────────────

  it('renders All and My Courses tabs for students', () => {
    renderCourseList(STUDENT_USER);
    expect(screen.getByRole('tab', { name: /^all$/i })).toBeInTheDocument();
    expect(
      screen.getByRole('tab', { name: /my courses/i })
    ).toBeInTheDocument();
  });

  it('does not render tab filter for instructors', () => {
    renderCourseList(INSTRUCTOR_USER);
    expect(
      screen.queryByRole('tab', { name: /my courses/i })
    ).not.toBeInTheDocument();
  });
});
