/**
 * notifications.resolver.spec.ts — Unit tests for NotificationsResolver.
 * Covers: auth guard (no userId throws), ownership check, pubSub.subscribe delegation.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UnauthorizedException } from '@nestjs/common';

// ── Mocks ─────────────────────────────────────────────────────────────────────

const { mockSubscribe } = vi.hoisted(() => ({
  mockSubscribe: vi.fn().mockReturnValue({}),
}));

vi.mock('./notifications.pubsub.js', () => ({
  notificationPubSub: {
    subscribe: mockSubscribe,
    publish: vi.fn(),
    asyncIterator: vi.fn(),
  },
}));

// ── Import after mocks ────────────────────────────────────────────────────────

import { NotificationsResolver } from './notifications.resolver.js';

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeCtx(authUserId?: string) {
  return {
    req: {},
    authContext: authUserId ? { userId: authUserId, tenantId: 'tenant-1', roles: [] } : undefined,
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('NotificationsResolver', () => {
  let resolver: NotificationsResolver;

  beforeEach(() => {
    vi.clearAllMocks();
    resolver = new NotificationsResolver();
  });

  // 1. Throws UnauthorizedException when authContext is absent
  it('throws UnauthorizedException when authContext is not present', () => {
    expect(() => resolver.notificationReceived('user-1', makeCtx(undefined))).toThrow(
      UnauthorizedException,
    );
  });

  // 2. Throws UnauthorizedException when authUserId is absent (null userId)
  it('throws UnauthorizedException when authContext has no userId', () => {
    const ctx = { req: {}, authContext: { userId: '', tenantId: 't1', roles: [] } };
    expect(() =>
      resolver.notificationReceived('user-1', ctx as never),
    ).toThrow(UnauthorizedException);
  });

  // 3. Throws UnauthorizedException when authUserId !== requested userId
  it('throws UnauthorizedException when authUserId does not match requested userId', () => {
    expect(() =>
      resolver.notificationReceived('user-2', makeCtx('user-1')),
    ).toThrow(UnauthorizedException);
  });

  // 4. The ownership error message mentions the user context
  it('ownership error message says cannot subscribe to another user', () => {
    let message = '';
    try {
      resolver.notificationReceived('user-other', makeCtx('user-me'));
    } catch (err) {
      message = (err as Error).message;
    }
    expect(message).toMatch(/another user/i);
  });

  // 5. Calls pubSub.subscribe with keyed channel when authorized
  it('calls notificationPubSub.subscribe with the correct channel key', () => {
    resolver.notificationReceived('user-1', makeCtx('user-1'));
    expect(mockSubscribe).toHaveBeenCalledWith('notificationReceived.user-1');
  });

  // 6. Returns the result from pubSub.subscribe
  it('returns the AsyncIterator result from pubSub.subscribe', () => {
    const mockIterator = Symbol('asyncIterator');
    mockSubscribe.mockReturnValueOnce(mockIterator);
    const result = resolver.notificationReceived('user-1', makeCtx('user-1'));
    expect(result).toBe(mockIterator);
  });
});
