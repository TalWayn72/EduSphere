import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { fireEvent } from '@testing-library/dom';

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
      (acc: string, str: string, i: number) => acc + str + (String(values[i] ?? '')),
      ''
    ),
  useQuery: vi.fn(),
  useMutation: vi.fn(),
}));

// Stub Layout to avoid router context requirements
vi.mock('@/components/Layout', () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Layout: ({ children }: any) => children,
}));

// Stub child tab components
vi.mock('./CourseEditPage.metadata', () => ({
  CourseEditMetadata: vi.fn(() => null),
}));
vi.mock('./CourseEditPage.modules', () => ({
  CourseEditModules: vi.fn(() => null),
}));

vi.mock('@/lib/graphql/content.queries', () => ({
  COURSE_DETAIL_QUERY: 'COURSE_DETAIL_QUERY',
  PUBLISH_COURSE_MUTATION: 'PUBLISH_COURSE_MUTATION',
  UNPUBLISH_COURSE_MUTATION: 'UNPUBLISH_COURSE_MUTATION',
}));

// ── Imports after mocks ───────────────────────────────────────────────────────

import { CourseEditPage } from './CourseEditPage';
import * as auth from '@/lib/auth';
import * as urql from 'urql';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const MOCK_USER = {
  id: 'user-1',
  role: 'INSTRUCTOR',
  username: 'ins1',
  email: 'a@b.com',
  tenantId: 't1',
  firstName: 'Test',
  lastName: 'User',
  scopes: [] as string[],
};

const MOCK_COURSE = {
  id: 'course-1',
  title: 'Test Course',
  description: 'A test course',
  thumbnailUrl: '📚',
  estimatedHours: 5,
  isPublished: false,
  instructorId: 'user-1',
  modules: [],
};

const NOOP_MUTATION = [{ fetching: false }, vi.fn()] as never;

function makeQuery(overrides: Record<string, unknown> = {}) {
  return [
    { data: { course: MOCK_COURSE }, fetching: false, error: undefined, ...overrides },
    vi.fn(),
  ] as never;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('CourseEditPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(auth.getCurrentUser).mockReturnValue(MOCK_USER as never);
    vi.mocked(urql.useMutation).mockReturnValue(NOOP_MUTATION);
    vi.mocked(urql.useQuery).mockReturnValue(makeQuery());
  });

  it('shows loading spinner while fetching', () => {
    vi.mocked(urql.useQuery).mockReturnValue(
      makeQuery({ fetching: true, data: undefined })
    );
    render(<CourseEditPage />);
    expect(screen.getByText(/loading course editor/i)).toBeInTheDocument();
  });

  it('shows error message when query fails', () => {
    vi.mocked(urql.useQuery).mockReturnValue(
      makeQuery({ error: { message: 'Network error' }, data: undefined })
    );
    render(<CourseEditPage />);
    expect(screen.getByText(/network error/i)).toBeInTheDocument();
  });

  it('shows "Course not found" when course is null', () => {
    vi.mocked(urql.useQuery).mockReturnValue(makeQuery({ data: { course: null } }));
    render(<CourseEditPage />);
    expect(screen.getByText(/course not found/i)).toBeInTheDocument();
  });

  it('renders course title when data is loaded', () => {
    render(<CourseEditPage />);
    expect(screen.getByText('Test Course')).toBeInTheDocument();
  });

  it('shows "Draft" badge for unpublished course', () => {
    render(<CourseEditPage />);
    expect(screen.getByText('Draft')).toBeInTheDocument();
  });

  it('shows "Published" badge for published course', () => {
    vi.mocked(urql.useQuery).mockReturnValue(
      makeQuery({ data: { course: { ...MOCK_COURSE, isPublished: true } } })
    );
    render(<CourseEditPage />);
    expect(screen.getByText('Published')).toBeInTheDocument();
  });

  it('renders "Basic Info" and "Modules & Content" tabs', () => {
    render(<CourseEditPage />);
    expect(screen.getByRole('tab', { name: /basic info/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /modules/i })).toBeInTheDocument();
  });

  it('shows "Publish" button for a draft course', () => {
    render(<CourseEditPage />);
    expect(screen.getByRole('button', { name: /^publish$/i })).toBeInTheDocument();
  });

  it('shows "Unpublish" button for a published course', () => {
    vi.mocked(urql.useQuery).mockReturnValue(
      makeQuery({ data: { course: { ...MOCK_COURSE, isPublished: true } } })
    );
    render(<CourseEditPage />);
    expect(screen.getByRole('button', { name: /^unpublish$/i })).toBeInTheDocument();
  });

  it('navigates back to course detail when Back button is clicked', () => {
    render(<CourseEditPage />);
    fireEvent.click(screen.getByRole('button', { name: /back/i }));
    expect(mockNavigate).toHaveBeenCalledWith('/courses/course-1');
  });
});
