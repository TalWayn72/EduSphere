import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { NotificationsPage } from './NotificationsPage';
import type { AppNotification } from '@/hooks/useNotifications';

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('@/lib/auth', () => ({
  getCurrentUser: vi.fn(() => ({ id: 'user-1', firstName: 'Test' })),
}));

const mockMarkAsRead = vi.fn();
let mockNotifications: AppNotification[] = [];

vi.mock('@/hooks/useNotifications', () => ({
  useNotifications: () => ({
    notifications: mockNotifications,
    markAsRead: mockMarkAsRead,
  }),
}));

// Layout renders children — stub it to avoid nav complexity
vi.mock('@/components/Layout', () => ({
  Layout: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeNotification(
  overrides: Partial<AppNotification> = {}
): AppNotification {
  return {
    id: 'n1',
    type: 'BADGE_ISSUED',
    title: 'New Badge',
    body: 'You earned a badge!',
    payload: null,
    readAt: null,
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

function renderPage() {
  return render(
    <MemoryRouter>
      <NotificationsPage />
    </MemoryRouter>
  );
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('NotificationsPage', () => {
  beforeEach(() => {
    mockNotifications = [];
    mockMarkAsRead.mockClear();
  });

  it('renders heading', () => {
    renderPage();
    expect(
      screen.getByRole('heading', { name: /notifications/i })
    ).toBeInTheDocument();
  });

  it('shows empty state when no notifications', () => {
    renderPage();
    expect(screen.getByText(/no notifications yet/i)).toBeInTheDocument();
  });

  it('renders a notification item', () => {
    mockNotifications = [
      makeNotification({ title: 'Test badge', body: 'You did it!' }),
    ];
    renderPage();
    expect(screen.getByText('Test badge')).toBeInTheDocument();
    expect(screen.getByText('You did it!')).toBeInTheDocument();
  });

  it('shows unread count badge in header', () => {
    mockNotifications = [
      makeNotification({ id: 'n1' }),
      makeNotification({ id: 'n2' }),
    ];
    renderPage();
    // Unread badge in header
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('shows mark-all-read button when there are unread', () => {
    mockNotifications = [makeNotification()];
    renderPage();
    expect(
      screen.getByRole('button', { name: /mark all read/i })
    ).toBeInTheDocument();
  });

  it('hides mark-all-read when all read', () => {
    mockNotifications = [
      makeNotification({ readAt: new Date().toISOString() }),
    ];
    renderPage();
    expect(
      screen.queryByRole('button', { name: /mark all read/i })
    ).not.toBeInTheDocument();
  });

  it('calls markAsRead for all unread when mark-all-read clicked', () => {
    mockNotifications = [
      makeNotification({ id: 'a' }),
      makeNotification({ id: 'b' }),
    ];
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /mark all read/i }));
    expect(mockMarkAsRead).toHaveBeenCalledWith('a');
    expect(mockMarkAsRead).toHaveBeenCalledWith('b');
  });

  it('calls markAsRead when notification item clicked', () => {
    mockNotifications = [
      makeNotification({ id: 'click-me', title: 'Click me' }),
    ];
    renderPage();
    fireEvent.click(screen.getByText('Click me').closest('[role="button"]')!);
    expect(mockMarkAsRead).toHaveBeenCalledWith('click-me');
  });

  it('renders filter tabs', () => {
    renderPage();
    expect(screen.getByRole('tab', { name: 'All' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /unread/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /badge/i })).toBeInTheDocument();
  });

  it('filters to only unread when Unread tab clicked', () => {
    mockNotifications = [
      makeNotification({ id: 'unread', title: 'Unread One', readAt: null }),
      makeNotification({
        id: 'read',
        title: 'Read One',
        readAt: new Date().toISOString(),
      }),
    ];
    renderPage();
    fireEvent.click(screen.getByRole('tab', { name: /unread/i }));
    expect(screen.getByText('Unread One')).toBeInTheDocument();
    expect(screen.queryByText('Read One')).not.toBeInTheDocument();
  });

  it('filters by type when type tab clicked', () => {
    mockNotifications = [
      makeNotification({ id: 'b', title: 'Badge one', type: 'BADGE_ISSUED' }),
      makeNotification({
        id: 'c',
        title: 'Course one',
        type: 'COURSE_ENROLLED',
      }),
    ];
    renderPage();
    fireEvent.click(screen.getByRole('tab', { name: /badge/i }));
    expect(screen.getByText('Badge one')).toBeInTheDocument();
    expect(screen.queryByText('Course one')).not.toBeInTheDocument();
  });

  it('shows Today / Yesterday / Earlier group headers', () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const earlier = new Date();
    earlier.setDate(earlier.getDate() - 5);

    mockNotifications = [
      makeNotification({
        id: '1',
        title: 'Today item',
        createdAt: new Date().toISOString(),
      }),
      makeNotification({
        id: '2',
        title: 'Yesterday item',
        createdAt: yesterday.toISOString(),
      }),
      makeNotification({
        id: '3',
        title: 'Earlier item',
        createdAt: earlier.toISOString(),
      }),
    ];
    renderPage();
    expect(screen.getByText('Today')).toBeInTheDocument();
    expect(screen.getByText('Yesterday')).toBeInTheDocument();
    expect(screen.getByText('Earlier')).toBeInTheDocument();
  });

  it('shows empty state with filter message when filter yields no results', () => {
    mockNotifications = [makeNotification({ type: 'BADGE_ISSUED' })];
    renderPage();
    fireEvent.click(screen.getByRole('tab', { name: /📢 announce/i }));
    expect(
      screen.getByText(/no notifications match this filter/i)
    ).toBeInTheDocument();
  });
});
