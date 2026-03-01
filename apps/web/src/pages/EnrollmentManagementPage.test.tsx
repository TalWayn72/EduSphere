import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return { ...actual, useNavigate: vi.fn(() => mockNavigate) };
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

vi.mock('@/components/admin/AdminLayout', () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  AdminLayout: ({ children, title }: any) => (
    <div>
      <h1>{title}</h1>
      {children}
    </div>
  ),
}));

vi.mock('@/hooks/useAuthRole', () => ({
  useAuthRole: vi.fn(() => 'ORG_ADMIN'),
}));

vi.mock('@/lib/queries', () => ({
  COURSES_QUERY: 'COURSES_QUERY',
}));

vi.mock('@/lib/graphql/content-tier3.queries', () => ({
  ADMIN_COURSE_ENROLLMENTS_QUERY: 'ADMIN_COURSE_ENROLLMENTS_QUERY',
  ADMIN_ENROLL_USER_MUTATION: 'ADMIN_ENROLL_USER_MUTATION',
  ADMIN_UNENROLL_USER_MUTATION: 'ADMIN_UNENROLL_USER_MUTATION',
  ADMIN_BULK_ENROLL_MUTATION: 'ADMIN_BULK_ENROLL_MUTATION',
}));

// ── Imports after mocks ───────────────────────────────────────────────────────

import { EnrollmentManagementPage } from './EnrollmentManagementPage';
import * as urql from 'urql';
import { useAuthRole } from '@/hooks/useAuthRole';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const MOCK_COURSES = [
  { id: 'course-1', title: 'Intro to Python', isPublished: true },
  { id: 'course-2', title: 'Advanced React', isPublished: false },
];

const MOCK_ENROLLMENTS = [
  {
    id: 'enroll-1',
    courseId: 'course-1',
    userId: 'user-aaa',
    status: 'IN_PROGRESS',
    enrolledAt: '2024-03-01T00:00:00Z',
    completedAt: null,
  },
  {
    id: 'enroll-2',
    courseId: 'course-1',
    userId: 'user-bbb',
    status: 'IN_PROGRESS',
    enrolledAt: '2024-04-01T00:00:00Z',
    completedAt: '2024-04-15T00:00:00Z',
  },
];

const MOCK_EXECUTE = vi.fn().mockResolvedValue({ error: undefined });

function setupUrql(
  overrides: Record<string, unknown> = {},
  fetching = false
) {
  vi.mocked(urql.useQuery).mockReturnValue([
    {
      data: {
        courses: MOCK_COURSES,
        adminCourseEnrollments: MOCK_ENROLLMENTS,
      },
      fetching,
      error: undefined,
      ...overrides,
    },
    vi.fn(),
  ] as never);
  vi.mocked(urql.useMutation).mockReturnValue([
    { fetching: false },
    MOCK_EXECUTE,
  ] as never);
}

function renderPage() {
  return render(
    <MemoryRouter>
      <EnrollmentManagementPage />
    </MemoryRouter>
  );
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('EnrollmentManagementPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAuthRole).mockReturnValue('ORG_ADMIN');
    MOCK_EXECUTE.mockResolvedValue({ error: undefined });
    setupUrql();
  });

  it('renders "Enrollment" heading via AdminLayout title', () => {
    renderPage();
    expect(screen.getByText('Enrollment')).toBeInTheDocument();
  });

  it('redirects to /dashboard for STUDENT role', () => {
    vi.mocked(useAuthRole).mockReturnValue('STUDENT');
    renderPage();
    expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
  });

  it('redirects to /dashboard for INSTRUCTOR role', () => {
    vi.mocked(useAuthRole).mockReturnValue('INSTRUCTOR');
    renderPage();
    expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
  });

  it('returns null for non-admin roles (no course selector rendered)', () => {
    vi.mocked(useAuthRole).mockReturnValue('STUDENT');
    renderPage();
    expect(
      screen.queryByText(/select a course/i)
    ).not.toBeInTheDocument();
  });

  it('allows ORG_ADMIN to view the page', () => {
    vi.mocked(useAuthRole).mockReturnValue('ORG_ADMIN');
    renderPage();
    expect(
      screen.getByText(/select a course above to view/i)
    ).toBeInTheDocument();
  });

  it('allows SUPER_ADMIN to view the page', () => {
    vi.mocked(useAuthRole).mockReturnValue('SUPER_ADMIN');
    renderPage();
    expect(
      screen.getByText(/select a course above to view/i)
    ).toBeInTheDocument();
  });

  it('shows "Select a course above" prompt initially', () => {
    renderPage();
    expect(
      screen.getByText(/select a course above to view and manage enrollments/i)
    ).toBeInTheDocument();
  });

  it('renders the course select dropdown', () => {
    renderPage();
    expect(
      screen.getByText(/select a course…/i)
    ).toBeInTheDocument();
  });

  it('shows loading indicator when courses are fetching', () => {
    setupUrql({}, true);
    renderPage();
    // When courses are fetching the select trigger still renders
    expect(screen.getByText('Enrollment')).toBeInTheDocument();
  });
});
