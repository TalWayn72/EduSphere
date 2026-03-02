import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Layout } from './Layout';

/* ── urql (required by hooks imported indirectly) ── */
vi.mock('urql', () => ({
  gql: (strings: TemplateStringsArray, ...values: unknown[]) =>
    strings.reduce((acc, str, i) => acc + str + (String(values[i] ?? '')), ''),
  useQuery: vi.fn(() => [{ data: undefined, fetching: false }]),
  useMutation: vi.fn(() => [{ fetching: false }, vi.fn()]),
}));

/* ── react-router-dom: keep MemoryRouter real, stub navigate ── */
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react-router-dom')>()),
  useNavigate: vi.fn(() => mockNavigate),
}));

/* ── i18n ── */
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { changeLanguage: vi.fn() },
  }),
}));

/* ── Auth ── */
const mockGetCurrentUser = vi.fn();
vi.mock('@/lib/auth', () => ({ getCurrentUser: () => mockGetCurrentUser() }));

/* ── Child components that have their own heavy deps ── */
vi.mock('@/components/UserMenu', () => ({
  UserMenu: ({ user }: { user: { name?: string } }) => (
    <div data-testid="user-menu">{user?.name ?? 'user-menu'}</div>
  ),
}));
vi.mock('@/components/NotificationBell', () => ({
  NotificationBell: () => <div data-testid="notification-bell" />,
}));

/* ── SRS queue count hook ── */
const mockUseSrsQueueCount = vi.fn(() => 0);
vi.mock('@/hooks/useSrsQueueCount', () => ({
  useSrsQueueCount: () => mockUseSrsQueueCount(),
}));

/* ── shadcn Button ── */
vi.mock('@/components/ui/button', () => ({
  Button: ({
    children,
    onClick,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement> & { asChild?: boolean }) => (
    <button onClick={onClick} {...props}>
      {children}
    </button>
  ),
}));

const studentUser = { id: 'u1', name: 'Alice', role: 'STUDENT' };
const instructorUser = { id: 'u2', name: 'Bob', role: 'INSTRUCTOR' };
const orgAdminUser = { id: 'u3', name: 'Carol', role: 'ORG_ADMIN' };

function renderLayout(user: typeof studentUser | null = studentUser) {
  mockGetCurrentUser.mockReturnValue(user);
  return render(
    <MemoryRouter>
      <Layout>
        <div data-testid="page-content">Content</div>
      </Layout>
    </MemoryRouter>
  );
}

describe('Layout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseSrsQueueCount.mockReturnValue(0);
    mockGetCurrentUser.mockReturnValue(studentUser);
  });

  it('renders the EduSphere logo link', () => {
    renderLayout();
    expect(screen.getByText('EduSphere')).toBeInTheDocument();
  });

  it('renders children in main area', () => {
    renderLayout();
    expect(screen.getByTestId('page-content')).toBeInTheDocument();
  });

  it('shows standard nav items for all users', () => {
    renderLayout();
    // navItems labels come from t('courses') etc. — since t returns the key, we check keys
    expect(screen.getByText('courses')).toBeInTheDocument();
    expect(screen.getByText('agents')).toBeInTheDocument();
  });

  it('shows SRS review link when user is logged in', () => {
    renderLayout(studentUser);
    expect(screen.getByText('srs')).toBeInTheDocument();
  });

  it('shows leaderboard link when user is logged in', () => {
    renderLayout(studentUser);
    expect(screen.getByText('leaderboard')).toBeInTheDocument();
  });

  it('hides SRS and leaderboard links when not logged in', () => {
    renderLayout(null);
    expect(screen.queryByText('srs')).not.toBeInTheDocument();
    expect(screen.queryByText('leaderboard')).not.toBeInTheDocument();
  });

  it('shows SRS badge when srsCount > 0', () => {
    mockUseSrsQueueCount.mockReturnValue(5);
    renderLayout(studentUser);
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('shows 99+ badge when srsCount > 99', () => {
    mockUseSrsQueueCount.mockReturnValue(150);
    renderLayout(studentUser);
    expect(screen.getByText('99+')).toBeInTheDocument();
  });

  it('shows admin nav items for INSTRUCTOR role', () => {
    renderLayout(instructorUser);
    expect(screen.getByText('newCourse')).toBeInTheDocument();
  });

  it('hides admin nav items for STUDENT role', () => {
    renderLayout(studentUser);
    expect(screen.queryByText('newCourse')).not.toBeInTheDocument();
  });

  it('shows compliance nav items for ORG_ADMIN', () => {
    renderLayout(orgAdminUser);
    expect(screen.getByText('adminPanel')).toBeInTheDocument();
    expect(screen.getByText('lti')).toBeInTheDocument();
    expect(screen.getByText('compliance')).toBeInTheDocument();
    expect(screen.getByText('scimHris')).toBeInTheDocument();
  });

  it('hides compliance items for INSTRUCTOR', () => {
    renderLayout(instructorUser);
    expect(screen.queryByText('adminPanel')).not.toBeInTheDocument();
  });

  it('shows UserMenu when user is logged in', () => {
    renderLayout(studentUser);
    expect(screen.getByTestId('user-menu')).toBeInTheDocument();
  });

  it('shows Sign in button when not logged in', () => {
    renderLayout(null);
    expect(screen.getByText('Sign in')).toBeInTheDocument();
    expect(screen.queryByTestId('user-menu')).not.toBeInTheDocument();
  });

  it('shows NotificationBell when user is logged in', () => {
    renderLayout(studentUser);
    expect(screen.getByTestId('notification-bell')).toBeInTheDocument();
  });

  it('hides NotificationBell when not logged in', () => {
    renderLayout(null);
    expect(screen.queryByTestId('notification-bell')).not.toBeInTheDocument();
  });

  it('search button navigates to /search', () => {
    renderLayout();
    const searchBtn = screen.getAllByRole('button').find(
      (btn) => btn.textContent?.includes('search')
    );
    expect(searchBtn).toBeTruthy();
    fireEvent.click(searchBtn!);
    expect(mockNavigate).toHaveBeenCalledWith('/search');
  });

  it('Ctrl+K keyboard shortcut navigates to /search', () => {
    renderLayout();
    fireEvent.keyDown(window, { key: 'k', ctrlKey: true });
    expect(mockNavigate).toHaveBeenCalledWith('/search');
  });

  it('Cmd+K keyboard shortcut navigates to /search', () => {
    renderLayout();
    fireEvent.keyDown(window, { key: 'k', metaKey: true });
    expect(mockNavigate).toHaveBeenCalledWith('/search');
  });

  it('hamburger button toggles mobile menu', () => {
    renderLayout();
    const hamburger = screen.getByLabelText('Open menu');
    fireEvent.click(hamburger);
    expect(screen.getByLabelText('Close menu')).toBeInTheDocument();
    // mobile nav courses link appears
    const mobileLinks = screen.getAllByText('courses');
    expect(mobileLinks.length).toBeGreaterThan(0);
  });

  it('Sign in button navigates to /login', () => {
    renderLayout(null);
    fireEvent.click(screen.getByText('Sign in'));
    expect(mockNavigate).toHaveBeenCalledWith('/login');
  });
});
