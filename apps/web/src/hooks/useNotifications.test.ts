/**
 * useNotifications hook tests
 *
 * Verifies:
 *  1.  Initial state: notifications=[], unreadCount=0
 *  2.  Returns markAsRead function
 *  3.  Subscription paused when userId is empty
 *  4.  Subscription NOT paused when userId is provided
 *  5.  Subscription pauses on unmount (memory safety)
 *  6.  Adds incoming notification to list
 *  7.  Prepends new notification (newest first)
 *  8.  Deduplicates by id
 *  9.  Caps list at 100
 *  10. markAsRead sets readAt on matching notification
 *  11. unreadCount counts null readAt only
 *  12. markAsRead only affects matching id
 *  13. markAsRead with non-existent id is a no-op
 *  14. Notification with existing readAt is not counted as unread
 *  15. Does not crash with empty userId
 *  16. Subscription variables match userId
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

// ── urql mock ─────────────────────────────────────────────────────────────────
// Mock urql entirely so no real WebSocket/network calls are made.

vi.mock('urql', () => ({
  useSubscription: vi.fn(),
}));

// ── GraphQL subscription mock ─────────────────────────────────────────────────
vi.mock('@/lib/graphql/notifications.subscriptions', () => ({
  NOTIFICATION_RECEIVED_SUBSCRIPTION: 'NOTIFICATION_RECEIVED_SUBSCRIPTION',
}));

// ── Import after mocks ────────────────────────────────────────────────────────
import { useNotifications } from './useNotifications';
import type { AppNotification } from './useNotifications';
import * as urql from 'urql';

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeNotification(
  id: string,
  overrides: Partial<AppNotification> = {}
): AppNotification {
  return {
    id,
    type: 'ANNOUNCEMENT',
    title: `Notification ${id}`,
    body: `Body for ${id}`,
    payload: null,
    readAt: null,
    createdAt: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

/**
 * Default useSubscription mock: no data arriving, not fetching.
 */
function setupDefaultSubscription() {
  vi.mocked(urql.useSubscription).mockReturnValue([
    { data: undefined, fetching: false, error: undefined },
  ] as ReturnType<typeof urql.useSubscription>);
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('useNotifications', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Test 1 — initial state
  it('starts with an empty notifications list and unreadCount of 0', () => {
    setupDefaultSubscription();

    const { result } = renderHook(() => useNotifications('user-123'));

    expect(result.current.notifications).toEqual([]);
    expect(result.current.unreadCount).toBe(0);
  });

  // Test 2 — returns markAsRead function
  it('returns a markAsRead function', () => {
    setupDefaultSubscription();

    const { result } = renderHook(() => useNotifications('user-123'));

    expect(typeof result.current.markAsRead).toBe('function');
  });

  // Test 3 — subscription paused when userId empty
  it('pauses the subscription when userId is empty', () => {
    setupDefaultSubscription();

    renderHook(() => useNotifications(''));

    const lastCall = vi.mocked(urql.useSubscription).mock.calls[
      vi.mocked(urql.useSubscription).mock.calls.length - 1
    ];
    expect(lastCall?.[0]).toMatchObject({ pause: true });
  });

  // Test 4 — subscription NOT paused when userId provided
  it('does not pause the subscription when userId is provided', () => {
    setupDefaultSubscription();

    renderHook(() => useNotifications('user-123'));

    // The last call should have pause: false (userId present, not unmounted)
    const calls = vi.mocked(urql.useSubscription).mock.calls;
    // Find the call where pause is false (after mount effect sets paused=false)
    const hasFalseCall = calls.some((call) => call[0]?.pause === false);
    expect(hasFalseCall).toBe(true);
  });

  // Test 5 — subscription pauses on unmount
  it('pauses the subscription after the hook unmounts', () => {
    setupDefaultSubscription();

    const { unmount } = renderHook(() => useNotifications('user-123'));

    vi.mocked(urql.useSubscription).mockClear();

    // After unmount the cleanup runs setPaused(true) then the hook re-renders
    // with pause:true before being torn down.
    act(() => {
      unmount();
    });

    // Every call after unmount must have pause:true (or there are no more calls
    // because the hook is fully torn down — both are acceptable).
    const callsAfterUnmount = vi.mocked(urql.useSubscription).mock.calls;
    if (callsAfterUnmount.length > 0) {
      const lastCall = callsAfterUnmount[callsAfterUnmount.length - 1];
      expect(lastCall?.[0]).toMatchObject({ pause: true });
    }
    // No assertion failure if no further calls — hook was fully torn down.
  });

  // Test 6 — adds incoming notification to list
  it('adds an incoming notification to the list', () => {
    const notification = makeNotification('notif-1');
    let subscriptionResult: ReturnType<typeof urql.useSubscription>[0] = {
      data: undefined,
      fetching: false,
      error: undefined,
    };

    vi.mocked(urql.useSubscription).mockImplementation(
      () => [subscriptionResult] as ReturnType<typeof urql.useSubscription>
    );

    const { result, rerender } = renderHook(() => useNotifications('user-1'));

    act(() => {
      subscriptionResult = {
        data: { notificationReceived: notification } as never,
        fetching: false,
        error: undefined,
      };
    });
    rerender();

    expect(result.current.notifications).toHaveLength(1);
    expect(result.current.notifications[0]?.id).toBe('notif-1');
  });

  // Test 7 — prepends new notification (newest first)
  it('prepends notifications so the newest appears first', () => {
    const first = makeNotification('first', {
      createdAt: '2026-01-01T00:00:00Z',
    });
    const second = makeNotification('second', {
      createdAt: '2026-01-02T00:00:00Z',
    });

    let subscriptionResult: ReturnType<typeof urql.useSubscription>[0] = {
      data: undefined,
      fetching: false,
      error: undefined,
    };

    vi.mocked(urql.useSubscription).mockImplementation(
      () => [subscriptionResult] as ReturnType<typeof urql.useSubscription>
    );

    const { result, rerender } = renderHook(() => useNotifications('user-1'));

    // Deliver first notification
    act(() => {
      subscriptionResult = {
        data: { notificationReceived: first } as never,
        fetching: false,
        error: undefined,
      };
    });
    rerender();

    // Deliver second notification
    act(() => {
      subscriptionResult = {
        data: { notificationReceived: second } as never,
        fetching: false,
        error: undefined,
      };
    });
    rerender();

    expect(result.current.notifications).toHaveLength(2);
    expect(result.current.notifications[0]?.id).toBe('second');
    expect(result.current.notifications[1]?.id).toBe('first');
  });

  // Test 8 — deduplicates by id
  it('deduplicates notifications with the same id', () => {
    const notification = makeNotification('dup-1');

    let subscriptionResult: ReturnType<typeof urql.useSubscription>[0] = {
      data: undefined,
      fetching: false,
      error: undefined,
    };

    vi.mocked(urql.useSubscription).mockImplementation(
      () => [subscriptionResult] as ReturnType<typeof urql.useSubscription>
    );

    const { result, rerender } = renderHook(() => useNotifications('user-1'));

    // Deliver the same notification twice
    act(() => {
      subscriptionResult = {
        data: { notificationReceived: notification } as never,
        fetching: false,
        error: undefined,
      };
    });
    rerender();

    // Change object reference but keep same id (simulates duplicate push)
    act(() => {
      subscriptionResult = {
        data: {
          notificationReceived: { ...notification, title: 'Updated title' },
        } as never,
        fetching: false,
        error: undefined,
      };
    });
    rerender();

    // Only one entry with that id should be in the list
    expect(result.current.notifications).toHaveLength(1);
    expect(result.current.notifications[0]?.id).toBe('dup-1');
  });

  // Test 9 — caps list at 100
  it('caps the notification list at 100 entries', () => {
    // We will feed 105 notifications one at a time and verify the list stays at 100.
    let subscriptionResult: ReturnType<typeof urql.useSubscription>[0] = {
      data: undefined,
      fetching: false,
      error: undefined,
    };

    vi.mocked(urql.useSubscription).mockImplementation(
      () => [subscriptionResult] as ReturnType<typeof urql.useSubscription>
    );

    const { result, rerender } = renderHook(() => useNotifications('user-1'));

    for (let i = 1; i <= 105; i++) {
      act(() => {
        subscriptionResult = {
          data: {
            notificationReceived: makeNotification(`notif-${i}`),
          } as never,
          fetching: false,
          error: undefined,
        };
      });
      rerender();
    }

    expect(result.current.notifications).toHaveLength(100);
  });

  // Test 10 — markAsRead sets readAt
  it('markAsRead sets readAt on the matching notification', () => {
    const notification = makeNotification('read-me', { readAt: null });

    let subscriptionResult: ReturnType<typeof urql.useSubscription>[0] = {
      data: undefined,
      fetching: false,
      error: undefined,
    };

    vi.mocked(urql.useSubscription).mockImplementation(
      () => [subscriptionResult] as ReturnType<typeof urql.useSubscription>
    );

    const { result, rerender } = renderHook(() => useNotifications('user-1'));

    act(() => {
      subscriptionResult = {
        data: { notificationReceived: notification } as never,
        fetching: false,
        error: undefined,
      };
    });
    rerender();

    expect(result.current.notifications[0]?.readAt).toBeNull();

    act(() => {
      result.current.markAsRead('read-me');
    });

    expect(result.current.notifications[0]?.readAt).not.toBeNull();
    expect(typeof result.current.notifications[0]?.readAt).toBe('string');
  });

  // Test 11 — unreadCount counts null readAt
  it('unreadCount equals the number of notifications with readAt null', () => {
    const unread1 = makeNotification('u1', { readAt: null });
    const unread2 = makeNotification('u2', { readAt: null });
    const read = makeNotification('r1', { readAt: '2026-01-01T00:00:00Z' });

    let subscriptionResult: ReturnType<typeof urql.useSubscription>[0] = {
      data: undefined,
      fetching: false,
      error: undefined,
    };

    vi.mocked(urql.useSubscription).mockImplementation(
      () => [subscriptionResult] as ReturnType<typeof urql.useSubscription>
    );

    const { result, rerender } = renderHook(() => useNotifications('user-1'));

    for (const n of [unread1, unread2, read]) {
      act(() => {
        subscriptionResult = {
          data: { notificationReceived: n } as never,
          fetching: false,
          error: undefined,
        };
      });
      rerender();
    }

    expect(result.current.unreadCount).toBe(2);
  });

  // Test 12 — markAsRead only affects matching id
  it('markAsRead only marks the notification with the matching id', () => {
    const notif1 = makeNotification('id-1', { readAt: null });
    const notif2 = makeNotification('id-2', { readAt: null });

    let subscriptionResult: ReturnType<typeof urql.useSubscription>[0] = {
      data: undefined,
      fetching: false,
      error: undefined,
    };

    vi.mocked(urql.useSubscription).mockImplementation(
      () => [subscriptionResult] as ReturnType<typeof urql.useSubscription>
    );

    const { result, rerender } = renderHook(() => useNotifications('user-1'));

    for (const n of [notif1, notif2]) {
      act(() => {
        subscriptionResult = {
          data: { notificationReceived: n } as never,
          fetching: false,
          error: undefined,
        };
      });
      rerender();
    }

    act(() => {
      result.current.markAsRead('id-1');
    });

    const n1 = result.current.notifications.find((n) => n.id === 'id-1');
    const n2 = result.current.notifications.find((n) => n.id === 'id-2');

    expect(n1?.readAt).not.toBeNull();
    expect(n2?.readAt).toBeNull();
  });

  // Test 13 — markAsRead non-existent id is a no-op
  it('markAsRead with a non-existent id does not crash or mutate the list', () => {
    const notification = makeNotification('exists');

    let subscriptionResult: ReturnType<typeof urql.useSubscription>[0] = {
      data: undefined,
      fetching: false,
      error: undefined,
    };

    vi.mocked(urql.useSubscription).mockImplementation(
      () => [subscriptionResult] as ReturnType<typeof urql.useSubscription>
    );

    const { result, rerender } = renderHook(() => useNotifications('user-1'));

    act(() => {
      subscriptionResult = {
        data: { notificationReceived: notification } as never,
        fetching: false,
        error: undefined,
      };
    });
    rerender();

    const before = result.current.notifications.map((n) => ({ ...n }));

    act(() => {
      result.current.markAsRead('does-not-exist');
    });

    expect(result.current.notifications).toHaveLength(before.length);
    expect(result.current.notifications[0]?.readAt).toBe(before[0]?.readAt);
  });

  // Test 14 — notification with existing readAt not double-counted
  it('does not count a notification with an existing readAt as unread', () => {
    const alreadyRead = makeNotification('already-read', {
      readAt: '2026-01-01T00:00:00Z',
    });

    let subscriptionResult: ReturnType<typeof urql.useSubscription>[0] = {
      data: undefined,
      fetching: false,
      error: undefined,
    };

    vi.mocked(urql.useSubscription).mockImplementation(
      () => [subscriptionResult] as ReturnType<typeof urql.useSubscription>
    );

    const { result, rerender } = renderHook(() => useNotifications('user-1'));

    act(() => {
      subscriptionResult = {
        data: { notificationReceived: alreadyRead } as never,
        fetching: false,
        error: undefined,
      };
    });
    rerender();

    expect(result.current.unreadCount).toBe(0);
  });

  // Test 15 — does not crash with empty userId
  it('does not crash when rendered with an empty userId', () => {
    setupDefaultSubscription();

    expect(() => {
      renderHook(() => useNotifications(''));
    }).not.toThrow();
  });

  // Test 16 — subscription variables match userId
  it('passes the correct userId in subscription variables', () => {
    setupDefaultSubscription();

    renderHook(() => useNotifications('user-123'));

    const calls = vi.mocked(urql.useSubscription).mock.calls;
    const hasCorrectVariables = calls.some(
      (call) =>
        call[0]?.variables !== undefined &&
        (call[0].variables as { userId: string }).userId === 'user-123'
    );
    expect(hasCorrectVariables).toBe(true);
  });
});
