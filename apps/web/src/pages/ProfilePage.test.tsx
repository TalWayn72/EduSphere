import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
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

// Mock urql — ProfilePage now uses useQuery for ME_QUERY and COURSES_QUERY
vi.mock('urql', async (importOriginal) => {
  const actual = await importOriginal<typeof import('urql')>();
  return {
    ...actual,
    useQuery: vi.fn(() => [{ data: undefined, fetching: false, error: undefined }, vi.fn()]),
  };
});

import { getCurrentUser } from '@/lib/auth';
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
    expect(screen.getByRole('heading', { name: /^profile$/i })).toBeInTheDocument();
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
    expect(screen.getByText('Permissions', { selector: 'h3' })).toBeInTheDocument();
    expect(screen.getByText('content:read')).toBeInTheDocument();
    expect(screen.getByText('annotation:write')).toBeInTheDocument();
  });

  it('does not render Permissions section when user has no scopes', () => {
    vi.mocked(getCurrentUser).mockReturnValue({ ...STUDENT_USER, scopes: [] });
    renderPage();
    expect(screen.queryByText('Permissions', { selector: 'h3' })).not.toBeInTheDocument();
  });

  it('renders Learning Overview section with real stats labels', () => {
    renderPage();
    expect(screen.getByText('Learning Overview')).toBeInTheDocument();
    expect(screen.getByText('Courses Available')).toBeInTheDocument();
    expect(screen.getByText('Concepts Mastered')).toBeInTheDocument();
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
    expect(mockNavigate).toHaveBeenCalledWith('/login');
  });

  it('renders Back button for navigation', () => {
    renderPage();
    expect(screen.getByRole('button', { name: /back/i })).toBeInTheDocument();
  });

  it('renders ORG_ADMIN role label correctly', () => {
    vi.mocked(getCurrentUser).mockReturnValue({ ...STUDENT_USER, role: 'ORG_ADMIN' });
    renderPage();
    expect(screen.getAllByText('Organization Admin').length).toBeGreaterThanOrEqual(1);
  });

  it('renders SUPER_ADMIN role label correctly', () => {
    vi.mocked(getCurrentUser).mockReturnValue({ ...STUDENT_USER, role: 'SUPER_ADMIN' });
    renderPage();
    expect(screen.getAllByText('Super Admin').length).toBeGreaterThanOrEqual(1);
  });
});
