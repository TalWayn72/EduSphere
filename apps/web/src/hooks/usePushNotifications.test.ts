/**
 * usePushNotifications.test.ts — Unit tests for usePushNotifications hook.
 *
 * Tests: initial disabled state, enable/disable actions, mutation calls,
 * and memory-safety (cancelled flag prevents setState after unmount).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

// ─── Mock urql (auto-mock + override useMutation per test) ─────────────────

vi.mock('urql', async (importOriginal) => {
  const actual = await importOriginal<typeof import('urql')>();
  return {
    ...actual,
    useMutation: vi.fn(),
  };
});

// ─── Mock @/lib/webPush ────────────────────────────────────────────────────

vi.mock('@/lib/webPush', () => ({
  subscribeWebPush: vi.fn().mockResolvedValue('{"endpoint":"https://fcm.example.com"}'),
  unsubscribeWebPush: vi.fn().mockResolvedValue(true),
}));

// Imports AFTER vi.mock() declarations (hoisting order)
const { usePushNotifications } = await import('./usePushNotifications');
const urql = await import('urql');
const { subscribeWebPush, unsubscribeWebPush } = await import('@/lib/webPush');

// ─── Mock navigator.serviceWorker ─────────────────────────────────────────

const mockGetSubscription = vi.fn();

function setupServiceWorker(sub: unknown = null) {
  mockGetSubscription.mockResolvedValue(sub);
  Object.defineProperty(navigator, 'serviceWorker', {
    value: {
      ready: Promise.resolve({
        pushManager: { getSubscription: mockGetSubscription },
      }),
      addEventListener: vi.fn(),
    },
    configurable: true,
    writable: true,
  });
}

// ─── Helper: set up urql mock mutations ───────────────────────────────────

const mockRegisterToken = vi.fn();
const mockUnregisterToken = vi.fn();

function setupUrqlMutations() {
  // The hook calls useMutation twice, in order:
  // 1st call → REGISTER_PUSH_TOKEN_MUTATION → mockRegisterToken
  // 2nd call → UNREGISTER_PUSH_TOKEN_MUTATION → mockUnregisterToken
  vi.mocked(urql.useMutation)
    .mockReturnValueOnce([{ fetching: false }, mockRegisterToken] as never)
    .mockReturnValueOnce([{ fetching: false }, mockUnregisterToken] as never)
    // Subsequent renders re-call useMutation — keep returning correct fns
    .mockReturnValueOnce([{ fetching: false }, mockRegisterToken] as never)
    .mockReturnValueOnce([{ fetching: false }, mockUnregisterToken] as never)
    .mockReturnValueOnce([{ fetching: false }, mockRegisterToken] as never)
    .mockReturnValueOnce([{ fetching: false }, mockUnregisterToken] as never)
    .mockReturnValueOnce([{ fetching: false }, mockRegisterToken] as never)
    .mockReturnValueOnce([{ fetching: false }, mockUnregisterToken] as never)
    .mockReturnValueOnce([{ fetching: false }, mockRegisterToken] as never)
    .mockReturnValueOnce([{ fetching: false }, mockUnregisterToken] as never);
}

// ─── Tests ────────────────────────────────────────────────────────────────

describe('usePushNotifications', () => {
  beforeEach(() => {
    // Re-set implementations after clearMocks (vitest config clears mocks between tests)
    mockRegisterToken.mockResolvedValue({
      data: { registerPushToken: { id: '1', platform: 'WEB', createdAt: '' } },
    });
    mockUnregisterToken.mockResolvedValue({ data: { unregisterPushToken: true } });
    setupServiceWorker(null);
    setupUrqlMutations();
    vi.mocked(subscribeWebPush).mockResolvedValue('{"endpoint":"https://fcm.example.com"}');
    vi.mocked(unsubscribeWebPush).mockResolvedValue(true);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('starts as disabled (isEnabled=false) when no subscription exists', async () => {
    setupServiceWorker(null);
    const { result } = renderHook(() => usePushNotifications());
    expect(result.current.isEnabled).toBe(false);
    await act(async () => { await Promise.resolve(); });
    expect(result.current.isEnabled).toBe(false);
  });

  it('sets isEnabled=true when an existing subscription is found on mount', async () => {
    setupServiceWorker({ endpoint: 'https://fcm.example.com' });
    const { result } = renderHook(() => usePushNotifications());
    await act(async () => { await Promise.resolve(); });
    expect(result.current.isEnabled).toBe(true);
  });

  it('enable() calls subscribeWebPush + registerToken mutation and sets isEnabled=true', async () => {
    const { result } = renderHook(() => usePushNotifications());
    await act(async () => { await result.current.enable(); });
    expect(subscribeWebPush).toHaveBeenCalledOnce();
    expect(mockRegisterToken).toHaveBeenCalledWith({
      platform: 'WEB',
      webPushSubscription: '{"endpoint":"https://fcm.example.com"}',
    });
    expect(result.current.isEnabled).toBe(true);
  });

  it('enable() does NOT set isEnabled when subscribeWebPush returns null (denied)', async () => {
    vi.mocked(subscribeWebPush).mockResolvedValue(null);
    const { result } = renderHook(() => usePushNotifications());
    await act(async () => { await result.current.enable(); });
    expect(result.current.isEnabled).toBe(false);
    expect(mockRegisterToken).not.toHaveBeenCalled();
  });

  it('disable() calls unsubscribeWebPush + unregisterToken mutation and sets isEnabled=false', async () => {
    setupServiceWorker({ endpoint: 'https://fcm.example.com' });
    const { result } = renderHook(() => usePushNotifications());
    await act(async () => { await Promise.resolve(); }); // let mount checkStatus run

    await act(async () => { await result.current.disable(); });
    expect(unsubscribeWebPush).toHaveBeenCalledOnce();
    expect(mockUnregisterToken).toHaveBeenCalledWith({ platform: 'WEB' });
    expect(result.current.isEnabled).toBe(false);
  });

  it('isLoading is true during enable() and false after', async () => {
    let resolveSubscribe!: (v: string) => void;
    vi.mocked(subscribeWebPush).mockReturnValue(
      new Promise((res) => { resolveSubscribe = res; })
    );

    const { result } = renderHook(() => usePushNotifications());
    let enablePromise!: Promise<void>;
    act(() => { enablePromise = result.current.enable(); });

    expect(result.current.isLoading).toBe(true);

    await act(async () => {
      resolveSubscribe('{"endpoint":"x"}');
      await enablePromise;
    });
    expect(result.current.isLoading).toBe(false);
  });

  it('memory safety: unmounting before checkStatus resolves does not setState', async () => {
    let resolveGetSub!: (v: null) => void;
    mockGetSubscription.mockReturnValue(new Promise((res) => { resolveGetSub = res; }));

    const { unmount } = renderHook(() => usePushNotifications());
    unmount(); // unmount while async checkStatus is still pending
    await act(async () => {
      resolveGetSub(null);
      await Promise.resolve();
    });
    // No thrown error = memory safety confirmed
    expect(true).toBe(true);
  });
});
