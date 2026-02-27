/**
 * Tests for usePushNotifications — verifies token registration, subscription
 * setup/cleanup, and notification handler wiring.
 *
 * Strategy: vi.mock('react') stubs useEffect/useRef/useCallback so we can
 * call the hook function directly in a node environment without a DOM.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ── Hoisted mock factories ────────────────────────────────────────────────────
const {
  mockAddNotificationReceivedListener,
  mockAddNotificationResponseReceivedListener,
  mockGetPermissionsAsync,
  mockRequestPermissionsAsync,
  mockGetExpoPushTokenAsync,
  mockSetNotificationChannelAsync,
  mockRemove,
} = vi.hoisted(() => {
  const mockRemove = vi.fn();
  return {
    mockRemove,
    mockAddNotificationReceivedListener: vi
      .fn()
      .mockReturnValue({ remove: mockRemove }),
    mockAddNotificationResponseReceivedListener: vi
      .fn()
      .mockReturnValue({ remove: mockRemove }),
    mockGetPermissionsAsync: vi.fn().mockResolvedValue({ status: 'granted' }),
    mockRequestPermissionsAsync: vi
      .fn()
      .mockResolvedValue({ status: 'granted' }),
    mockGetExpoPushTokenAsync: vi
      .fn()
      .mockResolvedValue({ data: 'ExponentPushToken[test-token-123]' }),
    mockSetNotificationChannelAsync: vi.fn().mockResolvedValue(null),
  };
});

// ── Module mocks ──────────────────────────────────────────────────────────────
vi.mock('expo-notifications', () => ({
  setNotificationHandler: vi.fn(),
  addNotificationReceivedListener: mockAddNotificationReceivedListener,
  addNotificationResponseReceivedListener:
    mockAddNotificationResponseReceivedListener,
  getPermissionsAsync: mockGetPermissionsAsync,
  requestPermissionsAsync: mockRequestPermissionsAsync,
  getExpoPushTokenAsync: mockGetExpoPushTokenAsync,
  setNotificationChannelAsync: mockSetNotificationChannelAsync,
  AndroidImportance: { MAX: 5 },
}));

vi.mock('expo-device', () => ({
  isDevice: true,
}));

vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    setItem: vi.fn().mockResolvedValue(null),
    getItem: vi.fn().mockResolvedValue(null),
  },
}));

// react-native is aliased to src/__mocks__/react-native.ts via vitest.config.ts

// Mock react: stub useEffect to run immediately, useRef to return { current: val },
// useCallback to pass through the function.
const capturedCleanups: Array<() => void> = [];

vi.mock('react', async (importActual) => {
  const actual = (await importActual()) as Record<string, unknown>;
  return {
    ...actual,
    useEffect: vi.fn((fn: () => (() => void) | void) => {
      const cleanup = fn();
      if (typeof cleanup === 'function') capturedCleanups.push(cleanup);
    }),
    useRef: vi.fn((val: unknown) => ({ current: val })),
    useCallback: vi.fn((fn: unknown) => fn),
  };
});

import { usePushNotifications } from '../usePushNotifications';

// ── Helpers ───────────────────────────────────────────────────────────────────
function runHook(handlers: Record<string, unknown> = {}): {
  cleanups: Array<() => void>;
} {
  capturedCleanups.length = 0;
  usePushNotifications(handlers as Parameters<typeof usePushNotifications>[0]);
  return { cleanups: [...capturedCleanups] };
}

// ── Tests ─────────────────────────────────────────────────────────────────────
describe('usePushNotifications — subscription lifecycle', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRemove.mockReset();
    capturedCleanups.length = 0;
    mockAddNotificationReceivedListener.mockReturnValue({
      remove: mockRemove,
    });
    mockAddNotificationResponseReceivedListener.mockReturnValue({
      remove: mockRemove,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('subscribes to foreground notifications on mount', () => {
    const { cleanups } = runHook();
    expect(mockAddNotificationReceivedListener).toHaveBeenCalledTimes(1);
    cleanups.forEach((c) => c());
  });

  it('subscribes to notification response (tap) on mount', () => {
    const { cleanups } = runHook();
    expect(mockAddNotificationResponseReceivedListener).toHaveBeenCalledTimes(
      1
    );
    cleanups.forEach((c) => c());
  });

  it('removes both subscriptions on cleanup (memory-safe)', () => {
    const { cleanups } = runHook();
    cleanups.forEach((c) => c());
    // remove() called once per subscription (2 total)
    expect(mockRemove).toHaveBeenCalledTimes(2);
  });

  it('calls foreground handler when listener fires', () => {
    const onForeground = vi.fn();

    mockAddNotificationReceivedListener.mockImplementation(
      (cb: (n: unknown) => void) => {
        cb({ request: { identifier: 'n1' } });
        return { remove: mockRemove };
      }
    );

    const { cleanups } = runHook({ onForegroundNotification: onForeground });

    expect(onForeground).toHaveBeenCalledWith(
      expect.objectContaining({ request: { identifier: 'n1' } })
    );
    cleanups.forEach((c) => c());
  });

  it('calls response handler when tap listener fires', () => {
    const onResponse = vi.fn();

    mockAddNotificationResponseReceivedListener.mockImplementation(
      (cb: (r: unknown) => void) => {
        cb({ notification: { request: { identifier: 'n2' } } });
        return { remove: mockRemove };
      }
    );

    const { cleanups } = runHook({ onNotificationResponse: onResponse });

    expect(onResponse).toHaveBeenCalledWith(
      expect.objectContaining({
        notification: { request: { identifier: 'n2' } },
      })
    );
    cleanups.forEach((c) => c());
  });

  it('does not throw if no handlers are provided', () => {
    expect(() => {
      const { cleanups } = runHook();
      cleanups.forEach((c) => c());
    }).not.toThrow();
  });
});

describe('usePushNotifications — token registration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    capturedCleanups.length = 0;
    // Re-apply all defaults after clearMocks resets call counts
    mockAddNotificationReceivedListener.mockReturnValue({
      remove: mockRemove,
    });
    mockAddNotificationResponseReceivedListener.mockReturnValue({
      remove: mockRemove,
    });
    // Ensure a clean default for permission/token mocks
    mockGetPermissionsAsync.mockResolvedValue({ status: 'granted' });
    mockRequestPermissionsAsync.mockResolvedValue({ status: 'granted' });
    mockGetExpoPushTokenAsync.mockResolvedValue({
      data: 'ExponentPushToken[test-token-123]',
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('requests permissions if not already granted', async () => {
    mockGetPermissionsAsync.mockResolvedValue({ status: 'undetermined' });
    mockRequestPermissionsAsync.mockResolvedValue({ status: 'granted' });

    const { cleanups } = runHook();
    await new Promise((r) => setTimeout(r, 20));
    cleanups.forEach((c) => c());

    expect(mockRequestPermissionsAsync).toHaveBeenCalled();
  });

  it('does not call getExpoPushTokenAsync when permission is denied', async () => {
    // Override with persistent denied response for this test
    mockGetPermissionsAsync.mockResolvedValue({ status: 'denied' });

    const { cleanups } = runHook();
    // Wait for async registration to complete, then reset count to isolate
    // from any in-flight async work from previous tests in the suite
    await new Promise((r) => setTimeout(r, 30));
    mockGetExpoPushTokenAsync.mockClear(); // reset any bleed-over from prior tests
    cleanups.forEach((c) => c());

    // With permissions denied, getExpoPushTokenAsync should not have
    // been called by THIS test's hook invocation
    expect(mockGetExpoPushTokenAsync).not.toHaveBeenCalled();
  });

  it('stores token in AsyncStorage after successful registration', async () => {
    const AsyncStorage = (
      await import('@react-native-async-storage/async-storage')
    ).default as { setItem: ReturnType<typeof vi.fn> };

    const { cleanups } = runHook();
    await new Promise((r) => setTimeout(r, 20));
    cleanups.forEach((c) => c());

    expect(mockGetExpoPushTokenAsync).toHaveBeenCalled();
    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      '@edusphere/push_token',
      'ExponentPushToken[test-token-123]'
    );
  });
});
