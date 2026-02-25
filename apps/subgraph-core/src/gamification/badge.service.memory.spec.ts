/**
 * Memory safety tests for BadgeService.
 * Verifies NATS subscriptions are cleaned up in onModuleDestroy.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Use vi.hoisted() so these variables are available when vi.mock factories are hoisted
const { mockExecute, mockTx, unsubscribeMock, _mockSub, drainMock, mockNatsConn } =
  vi.hoisted(() => {
    const mockExecute = vi.fn().mockResolvedValue({ rows: [] });
    const mockTx = {
      execute: mockExecute,
      select: vi.fn().mockReturnValue({ from: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue([]) }) }),
      insert: vi.fn().mockReturnValue({ values: vi.fn().mockResolvedValue(undefined) }),
    };
    const unsubscribeMock = vi.fn();
    const _mockSub = {
      [Symbol.asyncIterator]: () => ({ next: async () => ({ done: true, value: undefined }) }),
      unsubscribe: unsubscribeMock,
    };
    const drainMock = vi.fn().mockResolvedValue(undefined);
    const mockNatsConn = { subscribe: vi.fn(() => _mockSub), drain: drainMock };
    return { mockExecute, mockTx, unsubscribeMock, _mockSub, drainMock, mockNatsConn };
  });

vi.mock('@edusphere/db', () => ({
  createDatabaseConnection: vi.fn(() => mockTx),
  schema: { badges: {}, userBadges: {}, userPoints: {}, pointEvents: {}, annotations: {} },
  withTenantContext: vi.fn(async (_d: unknown, _c: unknown, fn: (t: unknown) => unknown) => fn(mockTx)),
  closeAllPools: vi.fn().mockResolvedValue(undefined),
  eq: vi.fn(), and: vi.fn(), sql: vi.fn(() => ({})),
}));

vi.mock('nats', () => ({ connect: vi.fn().mockResolvedValue(mockNatsConn) }));
vi.mock('@edusphere/nats-client', () => ({ buildNatsOptions: vi.fn(() => ({})) }));
vi.mock('./badge-definitions.js', () => ({ PLATFORM_BADGES: [], POINT_AWARDS: {} }));

import { BadgeService } from './badge.service.js';
import { closeAllPools } from '@edusphere/db';

describe('BadgeService memory safety', () => {
  let service: BadgeService;

  beforeEach(() => {
    vi.clearAllMocks();
    mockExecute.mockResolvedValue({ rows: [] });
    service = new BadgeService();
  });

  it('unsubscribes all NATS subscriptions on destroy', async () => {
    await service.onModuleInit();
    expect(mockNatsConn.subscribe).toHaveBeenCalledTimes(3);
    await service.onModuleDestroy();
    expect(unsubscribeMock).toHaveBeenCalledTimes(3);
  });

  it('drains NATS connection on destroy', async () => {
    await service.onModuleInit();
    await service.onModuleDestroy();
    expect(drainMock).toHaveBeenCalled();
  });

  it('calls closeAllPools on destroy', async () => {
    await service.onModuleDestroy();
    expect(closeAllPools).toHaveBeenCalled();
  });

  it('does not double-drain if destroy called twice', async () => {
    await service.onModuleInit();
    await service.onModuleDestroy();
    await service.onModuleDestroy();
    expect(drainMock).toHaveBeenCalledTimes(1);
  });
});
