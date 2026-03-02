import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { AuthUser } from '@/lib/auth';

// ── Mocks ──────────────────────────────────────────────────────────────────

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock('@/lib/auth', () => ({
  getCurrentUser: vi.fn(),
  logout: vi.fn(),
}));

vi.mock('@/components/Layout', () => ({
  Layout: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="layout">{children}</div>
  ),
}));

// Mock urql — ProfilePage uses useQuery for ME_QUERY and COURSES_QUERY.
// useMutation is mocked so that ProfileVisibilityCard (rendered when userId is
// truthy) does not throw "No client specified" when it calls useMutation().
vi.mock('urql', () => ({
  gql: (strings: TemplateStringsArray, ...values: unknown[]) =>
    strings.reduce(
      (acc: string, str: string, i: number) =>
        acc + str + String(values[i] ?? ''),
      ''
    ),
  useQuery: vi.fn(() => [
    { data: undefined, fetching: false, error: undefined },
    vi.fn(),
  ]),
  useMutation: vi.fn(() => [{ fetching: false }, vi.fn()]),
}));

import { getCurrentUser } from '@/lib/auth';
import * as urqlModule from 'urql';
import { ProfilePage } from './ProfilePage';

// ── Fixtures ───────────────────────────────────────────────────────────────

const STUDENT_USER: AuthUser = {
  id: 'user-1',
  username: 'testuser',
  email: 'test@example.com',
  firstName: 'Test',
  lastName: 'User',
  tenantId: 'tenant-abc-123',
  role: 'STUDENT',
  scopes: ['content:read', 'annotation:write'],
};

const INSTRUCTOR_USER: AuthUser = {
  ...STUDENT_USER,
  id: 'user-2',
  username: 'janedoe',
  firstName: 'Jane',
  lastName: 'Doe',
  email: 'jane@example.com',
  role: 'INSTRUCTOR',
  scopes: ['course:write', 'content:write', 'annotation:write'],
};

const renderPage = () =>
  render(
    <MemoryRouter>
      <ProfilePage />
    </MemoryRouter>
  );

// ── Tests ──────────────────────────────────────────────────────────────────

describe('ProfilePage', () => {
  beforeEach(() => {
    vi.mocked(getCurrentUser).mockReturnValue(STUDENT_USER);
    mockNavigate.mockClear();
  });

  it('renders "Profile" page heading', () => {
    renderPage();
    expect(
      screen.getByRole('heading', { name: /^profile$/i })
    ).toBeInTheDocument();
  });

  it('renders user full name (firstName + lastName)', () => {
    renderPage();
    expect(screen.getByText('Test User')).toBeInTheDocument();
  });

  it('renders @username handle', () => {
    renderPage();
    expect(screen.getByText('@testuser')).toBeInTheDocument();
  });

  it('renders user email in account details', () => {
    renderPage();
    expect(screen.getByText('test@example.com')).toBeInTheDocument();
  });

  it('renders role badge with correct label for STUDENT', () => {
    renderPage();
    // Role badge appears both as inline badge and in account details row
    expect(screen.getAllByText('Student').length).toBeGreaterThanOrEqual(1);
  });

  it('renders role badge with correct label for INSTRUCTOR', () => {
    vi.mocked(getCurrentUser).mockReturnValue(INSTRUCTOR_USER);
    renderPage();
    expect(screen.getAllByText('Instructor').length).toBeGreaterThanOrEqual(1);
  });

  it('renders tenant ID in account details', () => {
    renderPage();
    expect(screen.getByText('tenant-abc-123')).toBeInTheDocument();
  });

  it('renders avatar initials (TU for Test User)', () => {
    renderPage();
    expect(screen.getByText('TU')).toBeInTheDocument();
  });

  it('renders initials correctly for instructor (JD for Jane Doe)', () => {
    vi.mocked(getCurrentUser).mockReturnValue(INSTRUCTOR_USER);
    renderPage();
    expect(screen.getByText('JD')).toBeInTheDocument();
  });

  it('renders Permissions section when user has scopes', () => {
    renderPage();
    expect(
      screen.getByText('Permissions', { selector: 'h3' })
    ).toBeInTheDocument();
    expect(screen.getByText('content:read')).toBeInTheDocument();
    expect(screen.getByText('annotation:write')).toBeInTheDocument();
  });

  it('does not render Permissions section when user has no scopes', () => {
    vi.mocked(getCurrentUser).mockReturnValue({ ...STUDENT_USER, scopes: [] });
    renderPage();
    expect(
      screen.queryByText('Permissions', { selector: 'h3' })
    ).not.toBeInTheDocument();
  });

  it('renders Learning Overview section with real stats labels', () => {
    renderPage();
    expect(screen.getByText('Learning Overview')).toBeInTheDocument();
    expect(screen.getByText('Courses Available')).toBeInTheDocument();
    expect(screen.getByText('XP Points')).toBeInTheDocument();
    expect(screen.getByText('Annotations Created')).toBeInTheDocument();
  });

  it('renders Account Details section', () => {
    renderPage();
    expect(screen.getByText('Account Details')).toBeInTheDocument();
    expect(screen.getByText('Username')).toBeInTheDocument();
    expect(screen.getByText('Email')).toBeInTheDocument();
    expect(screen.getByText('Role')).toBeInTheDocument();
    expect(screen.getByText('Tenant ID')).toBeInTheDocument();
  });

  it('redirects to /login when no user is authenticated', () => {
    vi.mocked(getCurrentUser).mockReturnValue(null);
    renderPage();
    // ProfilePage uses <Navigate to="/login" replace /> (declarative redirect),
    // so the profile heading is not rendered rather than calling navigate() imperatively.
    expect(
      screen.queryByRole('heading', { name: /^profile$/i })
    ).not.toBeInTheDocument();
  });

  it('renders Back button for navigation', () => {
    renderPage();
    expect(screen.getByRole('button', { name: /back/i })).toBeInTheDocument();
  });

  it('renders ORG_ADMIN role label correctly', () => {
    vi.mocked(getCurrentUser).mockReturnValue({
      ...STUDENT_USER,
      role: 'ORG_ADMIN',
    });
    renderPage();
    expect(
      screen.getAllByText('Organization Admin').length
    ).toBeGreaterThanOrEqual(1);
  });

  it('renders SUPER_ADMIN role label correctly', () => {
    vi.mocked(getCurrentUser).mockReturnValue({
      ...STUDENT_USER,
      role: 'SUPER_ADMIN',
    });
    renderPage();
    expect(screen.getAllByText('Super Admin').length).toBeGreaterThanOrEqual(1);
  });

  // ── Back button navigation ────────────────────────────────────────────────

  it('clicking the Back button calls navigate(-1)', () => {
    renderPage();
    const backBtn = screen.getByRole('button', { name: /back/i });
    fireEvent.click(backBtn);
    expect(mockNavigate).toHaveBeenCalledWith(-1);
  });

  // ── Courses fetching state (line 107 branch) ──────────────────────────────

  it('shows "..." in Courses Available stat when courses are loading', () => {
    vi.mocked(urqlModule.useQuery)
      .mockReturnValueOnce([
        { data: undefined, fetching: false, error: undefined },
        vi.fn(),
      ] as never)
      .mockReturnValueOnce([
        { data: undefined, fetching: true, error: undefined },
        vi.fn(),
      ] as never);
    renderPage();
    // coursesResult.fetching = true → stats value is '...'
    expect(screen.getByText('...')).toBeInTheDocument();
  });

  // ── Courses available count (line 101 branch) ─────────────────────────────

  it('shows courses count when course data is available', () => {
    vi.mocked(urqlModule.useQuery)
      .mockReturnValueOnce([
        { data: undefined, fetching: false, error: undefined },
        vi.fn(),
      ] as never)
      .mockReturnValueOnce([
        {
          data: { courses: [{ id: 'c1' }, { id: 'c2' }, { id: 'c3' }] },
          fetching: false,
          error: undefined,
        },
        vi.fn(),
      ] as never);
    renderPage();
    // coursesCount = 3 → stats value is '3'
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  // ── Missing tenantId fallback (line 186-190 branch) ──────────────────────

  it('renders fallback span when tenantId is empty', () => {
    vi.mocked(getCurrentUser).mockReturnValue({
      ...STUDENT_USER,
      tenantId: '',
    });
    renderPage();
    // t('profile.fields.tenantIdMissing', ...) returns the key when not in
    // the test translation resources — the important thing is the fallback
    // branch of `{tenantId || (...)}` is exercised
    expect(
      screen.getByText('profile.fields.tenantIdMissing')
    ).toBeInTheDocument();
  });

  // ── getInitials ?? / || fallback branches (lines 69-71) ──────────────────

  it('renders "U" avatar when firstName, lastName, and username are all empty (lines 69-71 ?? / || branches)', () => {
    vi.mocked(getCurrentUser).mockReturnValue({
      ...STUDENT_USER,
      firstName: '',
      lastName: '',
      username: '',
    });
    renderPage();
    // getInitials('','','') → first=''?.[0]??''='', last=''?.[0]??''=''
    // ''||  (''[0]??'U').toUpperCase()  →  'U'
    expect(screen.getByText('U')).toBeInTheDocument();
  });

  // ── ROLE_LABELS / ROLE_COLORS ?? fallback branches (lines 99-100) ─────────

  it('renders raw role string for unknown role (lines 99-100 ?? fallbacks)', () => {
    vi.mocked(getCurrentUser).mockReturnValue({
      ...STUDENT_USER,
      role: 'CUSTOM_ROLE',
    });
    renderPage();
    // ROLE_LABELS['CUSTOM_ROLE'] → undefined → ?? 'CUSTOM_ROLE' (raw role)
    // ROLE_COLORS['CUSTOM_ROLE'] → undefined → ?? 'bg-gray-100 text-gray-700'
    expect(screen.getAllByText('CUSTOM_ROLE').length).toBeGreaterThanOrEqual(1);
  });

  // ── XP Points stat (MY_TOTAL_POINTS_QUERY) ────────────────────────────────

  it('shows XP points when myTotalPoints data is available', () => {
    vi.mocked(urqlModule.useQuery)
      .mockReturnValueOnce([
        { data: undefined, fetching: false, error: undefined },
        vi.fn(),
      ] as never)
      .mockReturnValueOnce([
        { data: undefined, fetching: false, error: undefined },
        vi.fn(),
      ] as never)
      .mockReturnValueOnce([
        { data: { myTotalPoints: 1250 }, fetching: false, error: undefined },
        vi.fn(),
      ] as never);
    renderPage();
    expect(screen.getByText('1,250')).toBeInTheDocument();
  });

  it('shows "..." for XP Points while loading', () => {
    vi.mocked(urqlModule.useQuery)
      .mockReturnValueOnce([
        { data: undefined, fetching: false, error: undefined },
        vi.fn(),
      ] as never)
      .mockReturnValueOnce([
        { data: undefined, fetching: false, error: undefined },
        vi.fn(),
      ] as never)
      .mockReturnValueOnce([
        { data: undefined, fetching: true, error: undefined },
        vi.fn(),
      ] as never);
    renderPage();
    expect(screen.getByText('...')).toBeInTheDocument();
  });

  // ── ProfileVisibilityCard rendered when userId is truthy (line 241) ────────

  it('renders ProfileVisibilityCard when ME_QUERY returns a userId (line 241 && truthy branch)', () => {
    vi.mocked(urqlModule.useQuery)
      .mockReturnValueOnce([
        {
          data: {
            me: {
              id: 'user-123',
              firstName: 'Test',
              lastName: 'User',
              email: 'test@example.com',
              role: 'STUDENT',
              tenantId: 'tenant-abc-123',
              createdAt: '2024-01-01T00:00:00Z',
              updatedAt: '2024-01-01T00:00:00Z',
              preferences: null,
            },
          },
          fetching: false,
          error: undefined,
        },
        vi.fn(),
      ] as never)
      .mockReturnValueOnce([
        { data: undefined, fetching: false, error: undefined },
        vi.fn(),
      ] as never);
    renderPage();
    // ProfileVisibilityCard is rendered → shows "Public Profile" heading
    expect(screen.getByText('Public Profile')).toBeInTheDocument();
  });
});
