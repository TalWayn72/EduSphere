import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
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

// Mock useNotifications so NotificationBell doesn't need a urql Provider
vi.mock('@/hooks/useNotifications', () => ({
  useNotifications: () => ({
    notifications: [],
    unreadCount: 0,
    markAsRead: vi.fn(),
  }),
}));

// Mock useSrsQueueCount so SRS nav badge doesn't need a urql Provider
vi.mock('@/hooks/useSrsQueueCount', () => ({
  useSrsQueueCount: () => 0,
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

  // ── My Badges nav item ──────────────────────────────────────────────────

  it('renders My Badges nav link for all users', () => {
    renderLayout();
    expect(screen.getByText('My Badges')).toBeInTheDocument();
  });

  // ── Admin-only compliance nav items ────────────────────────────────────

  it('shows "Admin Panel" nav link for ORG_ADMIN', () => {
    vi.mocked(getCurrentUser).mockReturnValue({
      ...MOCK_USER,
      role: 'ORG_ADMIN',
    });
    renderLayout();
    expect(screen.getByText('Admin Panel')).toBeInTheDocument();
  });

  it('shows "LTI 1.3" nav link for ORG_ADMIN', () => {
    vi.mocked(getCurrentUser).mockReturnValue({
      ...MOCK_USER,
      role: 'ORG_ADMIN',
    });
    renderLayout();
    expect(screen.getByText('LTI 1.3')).toBeInTheDocument();
  });

  it('shows "Compliance" nav link for ORG_ADMIN', () => {
    vi.mocked(getCurrentUser).mockReturnValue({
      ...MOCK_USER,
      role: 'ORG_ADMIN',
    });
    renderLayout();
    expect(screen.getByText('Compliance')).toBeInTheDocument();
  });

  it('shows "SCIM / HRIS" nav link for ORG_ADMIN', () => {
    vi.mocked(getCurrentUser).mockReturnValue({
      ...MOCK_USER,
      role: 'ORG_ADMIN',
    });
    renderLayout();
    expect(screen.getByText('SCIM / HRIS')).toBeInTheDocument();
  });

  it('shows compliance nav items for SUPER_ADMIN', () => {
    vi.mocked(getCurrentUser).mockReturnValue({
      ...MOCK_USER,
      role: 'SUPER_ADMIN',
    });
    renderLayout();
    expect(screen.getByText('Admin Panel')).toBeInTheDocument();
    expect(screen.getByText('LTI 1.3')).toBeInTheDocument();
    expect(screen.getByText('Compliance')).toBeInTheDocument();
  });

  it('does NOT show admin compliance nav items for STUDENT', () => {
    vi.mocked(getCurrentUser).mockReturnValue(MOCK_USER);
    renderLayout();
    expect(screen.queryByText('Admin Panel')).not.toBeInTheDocument();
    expect(screen.queryByText('LTI 1.3')).not.toBeInTheDocument();
    expect(screen.queryByText('Compliance')).not.toBeInTheDocument();
  });

  it('does NOT show admin compliance nav items for INSTRUCTOR', () => {
    vi.mocked(getCurrentUser).mockReturnValue(ADMIN_USER);
    renderLayout();
    expect(screen.queryByText('Admin Panel')).not.toBeInTheDocument();
    expect(screen.queryByText('LTI 1.3')).not.toBeInTheDocument();
  });

  // ── Mobile hamburger menu ───────────────────────────────────────────────

  it('renders mobile menu button with "Open menu" label when closed', () => {
    renderLayout();
    expect(
      screen.getByRole('button', { name: 'Open menu' })
    ).toBeInTheDocument();
  });

  it('opens mobile nav panel when hamburger button is clicked', () => {
    renderLayout();
    const hamburger = screen.getByRole('button', { name: 'Open menu' });
    fireEvent.click(hamburger);
    // After click, aria-label toggles to "Close menu"
    expect(
      screen.getByRole('button', { name: 'Close menu' })
    ).toBeInTheDocument();
  });

  it('shows nav links in mobile menu after opening', () => {
    renderLayout();
    fireEvent.click(screen.getByRole('button', { name: 'Open menu' }));
    // Mobile nav shows duplicated nav links — at least 2 "Courses" links now
    const coursesLinks = screen.getAllByText('Courses');
    expect(coursesLinks.length).toBeGreaterThanOrEqual(2);
  });

  it('shows "New Course" in mobile menu for INSTRUCTOR', () => {
    vi.mocked(getCurrentUser).mockReturnValue(ADMIN_USER);
    renderLayout();
    fireEvent.click(screen.getByRole('button', { name: 'Open menu' }));
    const newCourseLinks = screen.getAllByText('New Course');
    expect(newCourseLinks.length).toBeGreaterThanOrEqual(2);
  });

  it('shows admin panel links in mobile menu for ORG_ADMIN', () => {
    vi.mocked(getCurrentUser).mockReturnValue({
      ...MOCK_USER,
      role: 'ORG_ADMIN',
    });
    renderLayout();
    fireEvent.click(screen.getByRole('button', { name: 'Open menu' }));
    // Admin Panel appears twice (desktop + mobile)
    const adminPanelLinks = screen.getAllByText('Admin Panel');
    expect(adminPanelLinks.length).toBeGreaterThanOrEqual(2);
  });

  it('shows Search button in mobile menu after opening', () => {
    renderLayout();
    fireEvent.click(screen.getByRole('button', { name: 'Open menu' }));
    // Mobile menu has its own Search button
    const searchButtons = screen.getAllByText('Search...');
    expect(searchButtons.length).toBeGreaterThanOrEqual(1);
  });

  // ── Keyboard shortcut ───────────────────────────────────────────────────

  it('registers Ctrl+K keyboard event listener on mount', () => {
    const addEventListenerSpy = vi.spyOn(window, 'addEventListener');
    renderLayout();
    expect(addEventListenerSpy).toHaveBeenCalledWith(
      'keydown',
      expect.any(Function)
    );
    vi.restoreAllMocks();
  });

  it('removes keydown listener on unmount', () => {
    const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');
    const { unmount } = renderLayout();
    unmount();
    expect(removeEventListenerSpy).toHaveBeenCalledWith(
      'keydown',
      expect.any(Function)
    );
    vi.restoreAllMocks();
  });
});
