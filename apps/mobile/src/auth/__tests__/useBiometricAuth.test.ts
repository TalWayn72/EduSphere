/**
 * Tests for useBiometricAuth — verifies availability check, authentication
 * result handling, SecureStore persistence, and AppState re-prompt logic.
 * Memory-safe: AppState subscription removed in cleanup.
 *
 * Strategy: vi.mock('react') stubs hooks so the hook can be invoked directly
 * in a node environment. react-native is aliased to the hand-written mock.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ── Hoisted mocks ─────────────────────────────────────────────────────────────
const {
  mockHasHardwareAsync,
  mockIsEnrolledAsync,
  mockAuthenticateAsync,
  mockGetItemAsync,
  mockSetItemAsync,
  mockDeleteItemAsync,
  mockAppStateAddListener,
  mockSubscriptionRemove,
} = vi.hoisted(() => {
  const mockSubscriptionRemove = vi.fn();
  return {
    mockSubscriptionRemove,
    mockHasHardwareAsync: vi.fn().mockResolvedValue(true),
    mockIsEnrolledAsync: vi.fn().mockResolvedValue(true),
    mockAuthenticateAsync: vi
      .fn()
      .mockResolvedValue({ success: true, error: null }),
    mockGetItemAsync: vi.fn().mockResolvedValue(null),
    mockSetItemAsync: vi.fn().mockResolvedValue(null),
    mockDeleteItemAsync: vi.fn().mockResolvedValue(null),
    mockAppStateAddListener: vi
      .fn()
      .mockReturnValue({ remove: mockSubscriptionRemove }),
  };
});

vi.mock('expo-local-authentication', () => ({
  hasHardwareAsync: mockHasHardwareAsync,
  isEnrolledAsync: mockIsEnrolledAsync,
  authenticateAsync: mockAuthenticateAsync,
}));

vi.mock('expo-secure-store', () => ({
  getItemAsync: mockGetItemAsync,
  setItemAsync: mockSetItemAsync,
  deleteItemAsync: mockDeleteItemAsync,
}));

// react-native is aliased in vitest.config.ts; override AppState.addEventListener
// with our mock via vi.mock so the spy is consistent across imports.
vi.mock('react-native', () => ({
  Platform: { OS: 'ios' },
  AppState: {
    currentState: 'active',
    addEventListener: mockAppStateAddListener,
  },
}));

// State captures for useEffect / useState
const capturedCleanups: Array<() => void> = [];
const capturedSetters: Array<ReturnType<typeof vi.fn>> = [];
let capturedAuthenticate: (() => Promise<string>) | null = null;

vi.mock('react', async (importActual) => {
  const actual = (await importActual()) as Record<string, unknown>;
  return {
    ...actual,
    useState: vi.fn((initial: unknown) => {
      const setter = vi.fn();
      capturedSetters.push(setter);
      return [initial, setter];
    }),
    useEffect: vi.fn((fn: () => (() => void) | void) => {
      const cleanup = fn();
      if (typeof cleanup === 'function') capturedCleanups.push(cleanup);
    }),
    useRef: vi.fn((val: unknown) => ({ current: val })),
    useCallback: vi.fn((fn: unknown) => {
      // Capture the authenticate function
      capturedAuthenticate = fn as () => Promise<string>;
      return fn;
    }),
  };
});

import { useBiometricAuth } from '../useBiometricAuth';

// ── Helpers ───────────────────────────────────────────────────────────────────
function mountHook() {
  capturedCleanups.length = 0;
  capturedSetters.length = 0;
  capturedAuthenticate = null;

  const result = useBiometricAuth();
  return {
    result,
    cleanups: [...capturedCleanups],
    authenticate: capturedAuthenticate,
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────────
describe('useBiometricAuth — AppState subscription', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    capturedCleanups.length = 0;
    capturedSetters.length = 0;
    capturedAuthenticate = null;
    mockAppStateAddListener.mockReturnValue({ remove: mockSubscriptionRemove });
    mockGetItemAsync.mockResolvedValue(null);
    mockHasHardwareAsync.mockResolvedValue(true);
    mockIsEnrolledAsync.mockResolvedValue(true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('registers AppState change listener on mount', async () => {
    const { cleanups } = mountHook();
    await new Promise((r) => setTimeout(r, 0));
    cleanups.forEach((c) => c());

    expect(mockAppStateAddListener).toHaveBeenCalledWith(
      'change',
      expect.any(Function)
    );
  });

  it('removes AppState listener on cleanup (memory-safe)', async () => {
    const { cleanups } = mountHook();
    await new Promise((r) => setTimeout(r, 0));
    cleanups.forEach((c) => c());

    expect(mockSubscriptionRemove).toHaveBeenCalled();
  });
});

describe('useBiometricAuth — authenticate()', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    capturedCleanups.length = 0;
    capturedSetters.length = 0;
    capturedAuthenticate = null;
    mockHasHardwareAsync.mockResolvedValue(true);
    mockIsEnrolledAsync.mockResolvedValue(true);
    mockAppStateAddListener.mockReturnValue({ remove: mockSubscriptionRemove });
    mockGetItemAsync.mockResolvedValue(null);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns "authenticated" on success', async () => {
    mockAuthenticateAsync.mockResolvedValueOnce({
      success: true,
      error: null,
    });
    const { authenticate, cleanups } = mountHook();
    await new Promise((r) => setTimeout(r, 0));

    const outcome = await authenticate!();

    expect(outcome).toBe('authenticated');
    expect(mockSetItemAsync).toHaveBeenCalled();
    cleanups.forEach((c) => c());
  });

  it('returns "fallback" when user chooses PIN', async () => {
    mockAuthenticateAsync.mockResolvedValueOnce({
      success: false,
      error: 'user_fallback',
    });
    const { authenticate, cleanups } = mountHook();
    await new Promise((r) => setTimeout(r, 0));

    const outcome = await authenticate!();

    expect(outcome).toBe('fallback');
    expect(mockSetItemAsync).toHaveBeenCalled();
    cleanups.forEach((c) => c());
  });

  it('returns "cancelled" when user dismisses prompt', async () => {
    mockAuthenticateAsync.mockResolvedValueOnce({
      success: false,
      error: 'user_cancel',
    });
    const { authenticate, cleanups } = mountHook();
    await new Promise((r) => setTimeout(r, 0));

    const outcome = await authenticate!();

    expect(outcome).toBe('cancelled');
    cleanups.forEach((c) => c());
  });

  it('returns "failed" and clears SecureStore on auth failure', async () => {
    mockAuthenticateAsync.mockResolvedValueOnce({
      success: false,
      error: 'lockout',
    });
    const { authenticate, cleanups } = mountHook();
    await new Promise((r) => setTimeout(r, 0));

    const outcome = await authenticate!();

    expect(outcome).toBe('failed');
    expect(mockDeleteItemAsync).toHaveBeenCalled();
    cleanups.forEach((c) => c());
  });

  it('returns "unavailable" when hardware is not present', async () => {
    // Use mockResolvedValue (not Once) so both the useEffect availability check
    // and the authenticate() call both see false
    mockHasHardwareAsync.mockResolvedValue(false);
    const { authenticate, cleanups } = mountHook();
    await new Promise((r) => setTimeout(r, 0));

    const outcome = await authenticate!();

    expect(outcome).toBe('unavailable');
    expect(mockAuthenticateAsync).not.toHaveBeenCalled();
    cleanups.forEach((c) => c());
  });

  it('returns "unavailable" when no biometrics enrolled', async () => {
    // Use mockResolvedValue (not Once) so both the useEffect and authenticate()
    // calls both see the same unavailable state
    mockHasHardwareAsync.mockResolvedValue(true);
    mockIsEnrolledAsync.mockResolvedValue(false);
    const { authenticate, cleanups } = mountHook();
    await new Promise((r) => setTimeout(r, 0));

    const outcome = await authenticate!();

    expect(outcome).toBe('unavailable');
    cleanups.forEach((c) => c());
  });
});

describe('useBiometricAuth — persisted auth session', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    capturedCleanups.length = 0;
    capturedSetters.length = 0;
    capturedAuthenticate = null;
    mockHasHardwareAsync.mockResolvedValue(true);
    mockIsEnrolledAsync.mockResolvedValue(true);
    mockAppStateAddListener.mockReturnValue({ remove: mockSubscriptionRemove });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('reads persisted token from SecureStore on mount', async () => {
    mockGetItemAsync.mockResolvedValueOnce(String(Date.now()));

    const { cleanups } = mountHook();
    await new Promise((r) => setTimeout(r, 0));

    expect(mockGetItemAsync).toHaveBeenCalledWith(
      '@edusphere/biometric_authenticated'
    );
    cleanups.forEach((c) => c());
  });

  it('does not call authenticateAsync when session is fresh (< 5 min)', async () => {
    const recentTs = String(Date.now() - 60_000); // 1 minute ago
    mockGetItemAsync.mockResolvedValueOnce(recentTs);

    const { cleanups } = mountHook();
    await new Promise((r) => setTimeout(r, 10));

    // Session is fresh — auto-authenticate must not have been triggered
    expect(mockAuthenticateAsync).not.toHaveBeenCalled();
    cleanups.forEach((c) => c());
  });

  it('stores auth timestamp in SecureStore on successful authentication', async () => {
    mockGetItemAsync.mockResolvedValue(null);
    mockAuthenticateAsync.mockResolvedValueOnce({
      success: true,
      error: null,
    });

    const { authenticate, cleanups } = mountHook();
    await new Promise((r) => setTimeout(r, 0));
    await authenticate!();

    expect(mockSetItemAsync).toHaveBeenCalledWith(
      '@edusphere/biometric_authenticated',
      expect.any(String)
    );
    cleanups.forEach((c) => c());
  });
});
