import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import type { AuthUser } from '@/lib/auth';

// Mock auth module
vi.mock('@/lib/auth', () => ({
  getCurrentUser: vi.fn(),
  logout: vi.fn(),
}));

// Mock UserMenu to avoid dropdown complexity in unit tests
vi.mock('@/components/UserMenu', () => ({
  UserMenu: ({ user }: { user: AuthUser }) => (
    <div data-testid="user-menu">{user.firstName}</div>
  ),
}));

import { getCurrentUser } from '@/lib/auth';

const MOCK_USER: AuthUser = {
  id: 'user-1',
  username: 'testuser',
  email: 'test@edusphere.dev',
  firstName: 'Test',
  lastName: 'User',
  tenantId: 'tenant-1',
  role: 'STUDENT',
  scopes: ['read'],
};

const ADMIN_USER: AuthUser = { ...MOCK_USER, role: 'INSTRUCTOR' };

const renderLayout = (children = <div>content</div>) =>
  render(
    <MemoryRouter>
      <Layout>{children}</Layout>
    </MemoryRouter>
  );

describe('Layout', () => {
  beforeEach(() => {
    vi.mocked(getCurrentUser).mockReturnValue(null);
  });

  it('renders EduSphere logo link', () => {
    renderLayout();
    expect(screen.getByText('EduSphere')).toBeInTheDocument();
  });

  it('renders all primary nav items', () => {
    renderLayout();
    expect(screen.getByText('Learn')).toBeInTheDocument();
    expect(screen.getByText('Courses')).toBeInTheDocument();
    expect(screen.getByText('Graph')).toBeInTheDocument();
    expect(screen.getByText('Annotations')).toBeInTheDocument();
    expect(screen.getByText('Agents')).toBeInTheDocument();
    expect(screen.getByText('Chavruta')).toBeInTheDocument();
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
  });

  it('renders Search button', () => {
    renderLayout();
    expect(screen.getByText('Search...')).toBeInTheDocument();
  });

  it('renders Sign in button when no user is logged in', () => {
    vi.mocked(getCurrentUser).mockReturnValue(null);
    renderLayout();
    expect(screen.getByText('Sign in')).toBeInTheDocument();
  });

  it('renders UserMenu when user is logged in', () => {
    vi.mocked(getCurrentUser).mockReturnValue(MOCK_USER);
    renderLayout();
    expect(screen.getByTestId('user-menu')).toBeInTheDocument();
    expect(screen.getByText('Test')).toBeInTheDocument();
  });

  it('does NOT show "New Course" link for STUDENT role', () => {
    vi.mocked(getCurrentUser).mockReturnValue(MOCK_USER);
    renderLayout();
    expect(screen.queryByText('New Course')).not.toBeInTheDocument();
  });

  it('shows "New Course" link for INSTRUCTOR role', () => {
    vi.mocked(getCurrentUser).mockReturnValue(ADMIN_USER);
    renderLayout();
    expect(screen.getByText('New Course')).toBeInTheDocument();
  });

  it('shows "New Course" link for ORG_ADMIN role', () => {
    vi.mocked(getCurrentUser).mockReturnValue({
      ...MOCK_USER,
      role: 'ORG_ADMIN',
    });
    renderLayout();
    expect(screen.getByText('New Course')).toBeInTheDocument();
  });

  it('shows "New Course" link for SUPER_ADMIN role', () => {
    vi.mocked(getCurrentUser).mockReturnValue({
      ...MOCK_USER,
      role: 'SUPER_ADMIN',
    });
    renderLayout();
    expect(screen.getByText('New Course')).toBeInTheDocument();
  });

  it('renders children in main content area', () => {
    renderLayout(<div>My Test Content</div>);
    expect(screen.getByText('My Test Content')).toBeInTheDocument();
  });

  it('renders keyboard shortcut hint ⌘K in Search button', () => {
    renderLayout();
    expect(screen.getByText('⌘K')).toBeInTheDocument();
  });
});
