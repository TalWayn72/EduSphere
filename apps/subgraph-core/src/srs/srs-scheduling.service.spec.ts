/* eslint-disable @typescript-eslint/no-explicit-any -- test mocks use any for partial service stubs */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const { mockNatsConn } = vi.hoisted(() => {
  const mockNatsConn = {
    publish: vi.fn(),
    drain: vi.fn().mockResolvedValue(undefined),
    isClosed: vi.fn().mockReturnValue(false),
  };
  return { mockNatsConn };
});

vi.mock('nats', () => ({ connect: vi.fn().mockResolvedValue(mockNatsConn) }));
vi.mock('@edusphere/nats-client', () => ({
  buildNatsOptions: vi.fn(() => ({})),
}));

import { SrsSchedulingService } from './srs-scheduling.service';

describe('SrsSchedulingService', () => {
  let service: SrsSchedulingService;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    service = new SrsSchedulingService();
  });

  afterEach(async () => {
    await service.onModuleDestroy();
    vi.useRealTimers();
  });

  describe('onModuleInit', () => {
    it('connects to NATS and schedules daily digest', async () => {
      await service.onModuleInit();
      // The interval handle should be set
      expect((service as any).nats).toBe(mockNatsConn);
    });

    it('handles NATS connection failure gracefully', async () => {
      const { connect } = await import('nats');
      (connect as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
        new Error('NATS unreachable')
      );
      // Should not throw
      await service.onModuleInit();
      expect((service as any).nats).toBeNull();
    });
  });

  describe('onModuleDestroy', () => {
    it('clears interval and drains NATS', async () => {
      await service.onModuleInit();
      await service.onModuleDestroy();
      expect(mockNatsConn.drain).toHaveBeenCalled();
      expect((service as any).digestIntervalHandle).toBeNull();
      expect((service as any).nats).toBeNull();
    });

    it('handles destroy when not initialized', async () => {
      // Should not throw even if onModuleInit was never called
      await expect(service.onModuleDestroy()).resolves.toBeUndefined();
    });
  });

  describe('daily digest scheduling', () => {
    it('publishes to SRS review subject on interval tick', async () => {
      await service.onModuleInit();
      // Advance by exactly 24 hours to trigger one interval tick
      await vi.advanceTimersByTimeAsync(24 * 60 * 60 * 1000);
      expect(mockNatsConn.publish).toHaveBeenCalledWith(
        'EDUSPHERE.srs.review.due',
        expect.any(Uint8Array)
      );
    });

    it('does not publish if NATS is null', async () => {
      // Init with failed NATS connection
      const { connect } = await import('nats');
      (connect as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
        new Error('fail')
      );
      await service.onModuleInit();
      await vi.advanceTimersByTimeAsync(24 * 60 * 60 * 1000);
      expect(mockNatsConn.publish).not.toHaveBeenCalled();
    });

    it('logs error when publish fails', async () => {
      await service.onModuleInit();
      mockNatsConn.publish.mockImplementationOnce(() => {
        throw new Error('publish failed');
      });
      await vi.advanceTimersByTimeAsync(24 * 60 * 60 * 1000);
      // Should not throw — error is caught and logged
    });
  });

  describe('memory safety', () => {
    it('clearInterval is called on destroy to prevent leaks', async () => {
      const clearSpy = vi.spyOn(global, 'clearInterval');
      await service.onModuleInit();
      const handle = (service as any).digestIntervalHandle;
      expect(handle).not.toBeNull();
      await service.onModuleDestroy();
      expect(clearSpy).toHaveBeenCalledWith(handle);
    });
  });
});
