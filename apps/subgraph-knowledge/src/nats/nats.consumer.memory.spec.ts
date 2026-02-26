/**
 * Memory-safety tests for NatsConsumer.
 * Verifies: ensureStream max_age+max_bytes, drain on destroy, message processing.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NatsConsumer } from './nats.consumer';
import type { CypherService } from '../graph/cypher.service';

// vi.mock is hoisted -- factory must NOT reference module-level vars.
// Use vi.fn() only inside factory; configure mocks in beforeEach.
vi.mock('nats', () => ({
  connect: vi.fn(),
  StringCodec: vi.fn(() => ({
    encode: vi.fn((s: string) => Buffer.from(s)),
    decode: vi.fn((b: Buffer) => b.toString()),
  })),
}));

let mockJsmStreamsInfo: ReturnType<typeof vi.fn>;
let mockJsmStreamsAdd: ReturnType<typeof vi.fn>;
let mockJsPublish: ReturnType<typeof vi.fn>;
let mockDrain: ReturnType<typeof vi.fn>;
let mockSubscribe: ReturnType<typeof vi.fn>;

const mockCypherService: Partial<CypherService> = {
  findConceptByNameCaseInsensitive: vi.fn().mockResolvedValue(null),
  createConcept: vi.fn().mockResolvedValue('new-id'),
  linkConceptsByName: vi.fn().mockResolvedValue(undefined),
};

describe('NatsConsumer memory safety', () => {
  let consumer: NatsConsumer;

  beforeEach(async () => {
    vi.clearAllMocks();
    mockJsmStreamsInfo = vi.fn();
    mockJsmStreamsAdd = vi.fn().mockResolvedValue(undefined);
    mockJsPublish = vi.fn().mockResolvedValue(undefined);
    mockDrain = vi.fn().mockResolvedValue(undefined);
    mockSubscribe = vi.fn();
    const { connect } = await import('nats');
    vi.mocked(connect).mockResolvedValue({
      jetstreamManager: vi.fn().mockResolvedValue({
        streams: { info: mockJsmStreamsInfo, add: mockJsmStreamsAdd },
      }),
      jetstream: vi.fn().mockReturnValue({ publish: mockJsPublish }),
      subscribe: mockSubscribe,
      drain: mockDrain,
    } as any);
    consumer = new NatsConsumer(mockCypherService as CypherService);
  });

  it('ensureStream creates stream with max_age and max_bytes when stream does not exist', async () => {
    mockJsmStreamsInfo.mockRejectedValueOnce(new Error('stream not found'));
    mockSubscribe.mockReturnValue({
      [Symbol.asyncIterator]: () => ({ next: () => new Promise(() => {}) }),
    });
    await consumer.onModuleInit();
    expect(mockJsmStreamsAdd).toHaveBeenCalledOnce();
    const callArgs = mockJsmStreamsAdd.mock.calls[0][0] as Record<
      string,
      unknown
    >;
    expect(callArgs.name).toBe('KNOWLEDGE');
    expect((callArgs.subjects as string[]).includes('knowledge.*')).toBe(true);
    expect(typeof callArgs.max_age).toBe('number');
    expect(callArgs.max_age as number).toBeGreaterThan(0);
    expect(typeof callArgs.max_bytes).toBe('number');
    expect(callArgs.max_bytes as number).toBeGreaterThan(0);
  });

  it('ensureStream skips stream creation when stream already exists', async () => {
    mockJsmStreamsInfo.mockResolvedValueOnce({ config: { name: 'KNOWLEDGE' } });
    mockSubscribe.mockReturnValue({
      [Symbol.asyncIterator]: () => ({ next: () => new Promise(() => {}) }),
    });
    await consumer.onModuleInit();
    expect(mockJsmStreamsAdd).not.toHaveBeenCalled();
  });

  it('onModuleDestroy calls connection.drain() to prevent dangling NATS connections', async () => {
    mockJsmStreamsInfo.mockResolvedValueOnce({ config: {} });
    mockSubscribe.mockReturnValue({
      [Symbol.asyncIterator]: () => ({ next: () => new Promise(() => {}) }),
    });
    await consumer.onModuleInit();
    await consumer.onModuleDestroy();
    expect(mockDrain).toHaveBeenCalledOnce();
  });

  it('onModuleDestroy does not call drain when NATS connection was never established', async () => {
    await consumer.onModuleDestroy();
    expect(mockDrain).not.toHaveBeenCalled();
  });

  it('ensureStream sets max_age to 24 hours in nanoseconds', async () => {
    mockJsmStreamsInfo.mockRejectedValueOnce(new Error('not found'));
    mockSubscribe.mockReturnValue({
      [Symbol.asyncIterator]: () => ({ next: () => new Promise(() => {}) }),
    });
    await consumer.onModuleInit();
    const callArgs = mockJsmStreamsAdd.mock.calls[0][0] as Record<
      string,
      unknown
    >;
    expect(callArgs.max_age).toBe(24 * 60 * 60 * 1_000_000_000);
  });

  it('ensureStream sets max_bytes to 100 MB', async () => {
    mockJsmStreamsInfo.mockRejectedValueOnce(new Error('not found'));
    mockSubscribe.mockReturnValue({
      [Symbol.asyncIterator]: () => ({ next: () => new Promise(() => {}) }),
    });
    await consumer.onModuleInit();
    const callArgs = mockJsmStreamsAdd.mock.calls[0][0] as Record<
      string,
      unknown
    >;
    expect(callArgs.max_bytes).toBe(100 * 1024 * 1024);
  });

  it('processes an incoming message via processConcepts when subscribed', async () => {
    mockJsmStreamsInfo.mockResolvedValueOnce({ config: {} });
    const payload = JSON.stringify({
      concepts: [
        {
          name: 'Epistemology',
          definition: 'Study of knowledge',
          relatedTerms: [],
        },
      ],
      courseId: 'course-mem-1',
      tenantId: 'tenant-mem-1',
    });
    const fakeMsg = { data: Buffer.from(payload) };
    mockSubscribe.mockReturnValue({
      [Symbol.asyncIterator]: () => {
        let done = false;
        return {
          next: async () => {
            if (!done) {
              done = true;
              return { value: fakeMsg, done: false };
            }
            return { value: undefined, done: true };
          },
        };
      },
    });
    await consumer.onModuleInit();
    await new Promise<void>((r) => setTimeout(r, 20));
    expect(
      mockCypherService.findConceptByNameCaseInsensitive
    ).toHaveBeenCalledWith('Epistemology', 'tenant-mem-1');
  });

  it('onModuleInit swallows NATS connection errors and leaves consumer inactive', async () => {
    const { connect } = await import('nats');
    vi.mocked(connect).mockRejectedValueOnce(new Error('Connection refused'));
    await expect(consumer.onModuleInit()).resolves.toBeUndefined();
    await consumer.onModuleDestroy();
    expect(mockDrain).not.toHaveBeenCalled();
  });
});
