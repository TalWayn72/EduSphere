import React from 'react';
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

// Mock UserMenu
vi.mock('@/components/UserMenu', () => ({
  UserMenu: ({ user }: { user: AuthUser }) => (
    <div data-testid="user-menu">{user.firstName}</div>
  ),
}));

// Mock NotificationBell
vi.mock('@/components/NotificationBell', () => ({
  NotificationBell: () => <div data-testid="notification-bell" />,
}));

// Mock useNotifications
vi.mock('@/hooks/useNotifications', () => ({
  useNotifications: () => ({
    notifications: [],
    unreadCount: 0,
    markAsRead: vi.fn(),
  }),
}));

// Mock useSrsQueueCount
vi.mock('@/hooks/useSrsQueueCount', () => ({
  useSrsQueueCount: () => 0,
}));

// Mock i18n
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { changeLanguage: vi.fn() },
  }),
}));

// Mock react-router-dom navigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react-router-dom')>()),
  useNavigate: vi.fn(() => mockNavigate),
}));

// Mock AppSidebar (nav items now belong to AppSidebar.test.tsx)
vi.mock('@/components/AppSidebar', () => ({
  AppSidebar: () => <nav data-testid="app-sidebar" aria-label="Main navigation" />,
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

const renderLayout = (children = <div>content</div>) =>
  render(
    <MemoryRouter>
      <Layout>{children}</Layout>
    </MemoryRouter>
  );

describe('Layout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getCurrentUser).mockReturnValue(null);
  });

  it('renders the AppSidebar', () => {
    renderLayout();
    expect(screen.getByTestId('app-sidebar')).toBeInTheDocument();
  });

  it('renders children in main content area', () => {
    renderLayout(<div>My Test Content</div>);
    expect(screen.getByText('My Test Content')).toBeInTheDocument();
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

  it('does not show UserMenu when not logged in', () => {
    vi.mocked(getCurrentUser).mockReturnValue(null);
    renderLayout();
    expect(screen.queryByTestId('user-menu')).not.toBeInTheDocument();
  });

  it('renders keyboard shortcut hint ⌘K in Search button', () => {
    renderLayout();
    expect(screen.getByText('⌘K')).toBeInTheDocument();
  });

  it('registers keydown event listener on mount', () => {
    const addEventListenerSpy = vi.spyOn(window, 'addEventListener');
    renderLayout();
    expect(addEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function));
    vi.restoreAllMocks();
  });

  it('removes keydown listener on unmount', () => {
    const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');
    const { unmount } = renderLayout();
    unmount();
    expect(removeEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function));
    vi.restoreAllMocks();
  });

  it('shows NotificationBell when user is logged in', () => {
    vi.mocked(getCurrentUser).mockReturnValue(MOCK_USER);
    renderLayout();
    expect(screen.getByTestId('notification-bell')).toBeInTheDocument();
  });

  it('hides NotificationBell when not logged in', () => {
    vi.mocked(getCurrentUser).mockReturnValue(null);
    renderLayout();
    expect(screen.queryByTestId('notification-bell')).not.toBeInTheDocument();
  });
});
