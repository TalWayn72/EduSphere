import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Test } from '@nestjs/testing';
import { NatsService } from './nats.service';

// Mock the nats package
vi.mock('nats', () => {
  const mockJsm = {
    streams: {
      info: vi.fn().mockRejectedValue(new Error('stream not found')),
      add: vi.fn().mockResolvedValue({}),
    },
  };

  const mockJs = {
    publish: vi.fn().mockResolvedValue({}),
  };

  const mockConn = {
    jetstream: vi.fn().mockReturnValue(mockJs),
    jetstreamManager: vi.fn().mockResolvedValue(mockJsm),
    drain: vi.fn().mockResolvedValue(undefined),
    subscribe: vi.fn(),
  };

  return {
    connect: vi.fn().mockResolvedValue(mockConn),
    StringCodec: vi.fn().mockReturnValue({
      encode: vi.fn((s: string) => Buffer.from(s)),
      decode: vi.fn((b: Uint8Array) => Buffer.from(b).toString()),
    }),
  };
});

describe('NatsService', () => {
  let service: NatsService;

  beforeEach(async () => {
    vi.clearAllMocks();
    process.env.NATS_URL = 'nats://localhost:4222';

    const module = await Test.createTestingModule({
      providers: [NatsService],
    }).compile();

    service = module.get(NatsService);
  });

  describe('onModuleInit', () => {
    it('connects to NATS using NATS_URL env var', async () => {
      const { connect } = await import('nats');
      await service.onModuleInit();
      expect(connect).toHaveBeenCalledWith({ servers: 'nats://localhost:4222' });
    });

    it('does not throw when NATS is unreachable', async () => {
      const { connect } = await import('nats');
      (connect as any).mockRejectedValueOnce(new Error('connection refused'));
      await expect(service.onModuleInit()).resolves.toBeUndefined();
    });
  });

  describe('publish', () => {
    it('encodes JSON payload and publishes to the given subject', async () => {
      await service.onModuleInit();
      await service.publish('transcription.completed', { assetId: 'abc', segmentCount: 5 });

      const { connect } = await import('nats');
      const conn = await (connect as any).mock.results[0].value;
      const js = conn.jetstream();
      expect(js.publish).toHaveBeenCalledWith(
        'transcription.completed',
        expect.any(Buffer)
      );
    });

    it('logs a warning and does not throw when not connected', async () => {
      // Don't call onModuleInit — connection is null
      await expect(
        service.publish('transcription.completed', { assetId: 'x' })
      ).resolves.toBeUndefined();
    });
  });

  describe('onModuleDestroy', () => {
    it('drains the connection on shutdown', async () => {
      await service.onModuleInit();
      await service.onModuleDestroy();

      const { connect } = await import('nats');
      const conn = await (connect as any).mock.results[0].value;
      expect(conn.drain).toHaveBeenCalled();
    });

    it('does not throw when connection is null', async () => {
      await expect(service.onModuleDestroy()).resolves.toBeUndefined();
    });
  });

  describe('getConnection', () => {
    it('returns null before onModuleInit', () => {
      expect(service.getConnection()).toBeNull();
    });

    it('returns the connection after onModuleInit', async () => {
      await service.onModuleInit();
      expect(service.getConnection()).not.toBeNull();
    });
  });
});
