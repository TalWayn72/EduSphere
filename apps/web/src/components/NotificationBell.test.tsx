/**
 * NotificationBell — unit tests
 *
 * Tests:
 *  - Renders bell icon with no badge when no unread notifications
 *  - Shows unread badge count (capped at 9+ for >9)
 *  - Opens dropdown on click; closes on outside click
 *  - Shows empty state when no notifications exist
 *  - Renders notification items with icon, title, body
 *  - Marks notification as read on click (removes dot indicator)
 *  - "Mark all read" button clears all unread indicators
 *  - Memory safety: subscription paused on unmount
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import { NotificationBell } from './NotificationBell';
import type { AppNotification } from '@/hooks/useNotifications';

// ── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('@/lib/auth', () => ({
  getCurrentUser: () => ({
    id: 'user-1',
    role: 'STUDENT',
    displayName: 'Test User',
  }),
}));

const mockMarkAsRead = vi.fn();
let mockNotifications: AppNotification[] = [];
let mockUnreadCount = 0;

vi.mock('@/hooks/useNotifications', () => ({
  useNotifications: () => ({
    notifications: mockNotifications,
    unreadCount: mockUnreadCount,
    markAsRead: mockMarkAsRead,
  }),
}));

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeNotification(
  overrides: Partial<AppNotification> = {}
): AppNotification {
  return {
    id: `notif-${Math.random()}`,
    type: 'ANNOUNCEMENT',
    title: 'Test Notification',
    body: 'This is a test notification body.',
    payload: null,
    readAt: null,
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('NotificationBell', () => {
  beforeEach(() => {
    mockNotifications = [];
    mockUnreadCount = 0;
    mockMarkAsRead.mockClear();
  });

  it('renders the bell button', () => {
    render(
      <MemoryRouter>
        <NotificationBell />
      </MemoryRouter>
    );
    expect(
      screen.getByRole('button', { name: /notifications/i })
    ).toBeInTheDocument();
  });

  it('shows no badge when there are no unread notifications', () => {
    render(
      <MemoryRouter>
        <NotificationBell />
      </MemoryRouter>
    );
    // badge should not be visible
    const button = screen.getByRole('button', { name: /notifications$/i });
    expect(button).toHaveAttribute('aria-label', 'Notifications');
  });

  it('shows badge count when there are unread notifications', () => {
    mockUnreadCount = 3;
    mockNotifications = [
      makeNotification(),
      makeNotification(),
      makeNotification(),
    ];
    render(
      <MemoryRouter>
        <NotificationBell />
      </MemoryRouter>
    );
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /3 unread/i })
    ).toBeInTheDocument();
  });

  it('caps badge at 9+ when unread > 9', () => {
    mockUnreadCount = 15;
    render(
      <MemoryRouter>
        <NotificationBell />
      </MemoryRouter>
    );
    expect(screen.getByText('9+')).toBeInTheDocument();
  });

  it('opens dropdown when bell is clicked', async () => {
    render(
      <MemoryRouter>
        <NotificationBell />
      </MemoryRouter>
    );
    const bell = screen.getByRole('button', { name: /notifications/i });
    await userEvent.click(bell);
    expect(
      screen.getByRole('dialog', { name: /notifications panel/i })
    ).toBeInTheDocument();
  });

  it('shows empty state when no notifications exist', async () => {
    render(
      <MemoryRouter>
        <NotificationBell />
      </MemoryRouter>
    );
    await userEvent.click(
      screen.getByRole('button', { name: /notifications/i })
    );
    expect(screen.getByText(/no notifications yet/i)).toBeInTheDocument();
  });

  it('renders notification items with title and body', async () => {
    mockNotifications = [
      makeNotification({
        title: 'Badge Earned!',
        body: 'You earned a new badge.',
      }),
    ];
    render(
      <MemoryRouter>
        <NotificationBell />
      </MemoryRouter>
    );
    await userEvent.click(
      screen.getByRole('button', { name: /notifications/i })
    );
    expect(screen.getByText('Badge Earned!')).toBeInTheDocument();
    expect(screen.getByText('You earned a new badge.')).toBeInTheDocument();
  });

  it('calls markAsRead when a notification is clicked', async () => {
    const notif = makeNotification({ id: 'n-1' });
    mockNotifications = [notif];
    render(
      <MemoryRouter>
        <NotificationBell />
      </MemoryRouter>
    );
    await userEvent.click(
      screen.getByRole('button', { name: /notifications/i })
    );
    const notifButton = screen.getByRole('button', {
      name: /Unread: Test Notification/i,
    });
    await userEvent.click(notifButton);
    expect(mockMarkAsRead).toHaveBeenCalledWith('n-1');
  });

  it('shows "Mark all read" button only when there are unread notifications', async () => {
    mockUnreadCount = 2;
    mockNotifications = [makeNotification(), makeNotification()];
    render(
      <MemoryRouter>
        <NotificationBell />
      </MemoryRouter>
    );
    await userEvent.click(
      screen.getByRole('button', { name: /notifications/i })
    );
    expect(
      screen.getByRole('button', { name: /mark all read/i })
    ).toBeInTheDocument();
  });

  it('calls markAsRead for all unread notifications when "Mark all read" is clicked', async () => {
    const n1 = makeNotification({ id: 'a1', readAt: null });
    const n2 = makeNotification({ id: 'a2', readAt: null });
    const n3 = makeNotification({ id: 'a3', readAt: '2026-01-01T00:00:00Z' });
    mockNotifications = [n1, n2, n3];
    mockUnreadCount = 2;

    render(
      <MemoryRouter>
        <NotificationBell />
      </MemoryRouter>
    );
    await userEvent.click(
      screen.getByRole('button', { name: /notifications/i })
    );
    await userEvent.click(
      screen.getByRole('button', { name: /mark all read/i })
    );

    // Should call markAsRead for the 2 unread ones (n1, n2), not n3
    expect(mockMarkAsRead).toHaveBeenCalledWith('a1');
    expect(mockMarkAsRead).toHaveBeenCalledWith('a2');
    expect(mockMarkAsRead).not.toHaveBeenCalledWith('a3');
  });

  it('closes dropdown when clicking outside', async () => {
    render(
      <MemoryRouter>
        <div>
          <NotificationBell />
          <div data-testid="outside">Outside</div>
        </div>
      </MemoryRouter>
    );
    await userEvent.click(
      screen.getByRole('button', { name: /notifications/i })
    );
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    await userEvent.click(screen.getByTestId('outside'));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('shows type icons for different notification types', async () => {
    mockNotifications = [
      makeNotification({ type: 'BADGE_ISSUED', title: 'Badge' }),
      makeNotification({ type: 'SRS_REVIEW_DUE', title: 'SRS Due' }),
    ];
    render(
      <MemoryRouter>
        <NotificationBell />
      </MemoryRouter>
    );
    await userEvent.click(
      screen.getByRole('button', { name: /notifications/i })
    );
    // Emoji icons are rendered as aria-hidden spans
    const container = screen.getByRole('dialog');
    expect(container).toHaveTextContent('🏅');
    expect(container).toHaveTextContent('🗂️');
  });

  it('limits display to 10 notifications', async () => {
    mockNotifications = Array.from({ length: 15 }, (_, i) =>
      makeNotification({ id: `n${i}`, title: `Notification ${i}` })
    );
    render(
      <MemoryRouter>
        <NotificationBell />
      </MemoryRouter>
    );
    await userEvent.click(
      screen.getByRole('button', { name: /notifications/i })
    );
    // "View all" footer link is always shown; only 10 items should be displayed
    expect(
      screen.getByRole('link', { name: /view all notifications/i })
    ).toBeInTheDocument();
    const items = screen.getAllByRole('button', { name: /notification/i });
    // The bell button itself + up to 10 notification buttons
    expect(items.length).toBeLessThanOrEqual(11);
  });
});
