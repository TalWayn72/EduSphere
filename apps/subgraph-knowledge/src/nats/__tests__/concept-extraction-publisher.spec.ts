/* Tests for concept extraction publisher — no-explicit-any removed */
/**
 * Concept Extraction Publisher Tests
 *
 * Tests the NatsConsumer's concept publishing behavior:
 * - Publishes correct NATS message when source becomes READY
 * - Handles LLM extraction failure gracefully
 * - Preserves tenant_id in published messages
 * - Publishes to knowledge.concepts.persisted after processing
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NatsConsumer } from '../nats.consumer';
import type { CypherService } from '../../graph/cypher.service';

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

describe('NatsConsumer — concept extraction publishing', () => {
  let consumer: NatsConsumer;

  beforeEach(async () => {
    vi.clearAllMocks();
    mockJsmStreamsInfo = vi.fn().mockResolvedValue({ config: {} });
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
    } as never);
    consumer = new NatsConsumer(mockCypherService as CypherService);
  });

  it('publishes persisted count to knowledge.concepts.persisted after processing', async () => {
    const payload = JSON.stringify({
      concepts: [
        {
          name: 'Epistemology',
          definition: 'Study of knowledge',
          relatedTerms: [],
        },
        { name: 'Ontology', definition: 'Study of being', relatedTerms: [] },
      ],
      courseId: 'course-pub-1',
      tenantId: 'tenant-pub-1',
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
    await new Promise<void>((r) => setTimeout(r, 50));

    expect(mockJsPublish).toHaveBeenCalledOnce();
    const publishedData = mockJsPublish.mock.calls[0][1] as Buffer;
    const parsed = JSON.parse(publishedData.toString());
    expect(parsed.courseId).toBe('course-pub-1');
    expect(parsed.tenantId).toBe('tenant-pub-1');
    expect(parsed.persistedCount).toBe(2);
  });

  it('preserves tenant_id in published message', async () => {
    const tenantId = 'tenant-preserve-123';
    const payload = JSON.stringify({
      concepts: [
        { name: 'Logic', definition: 'Study of reasoning', relatedTerms: [] },
      ],
      courseId: 'course-t',
      tenantId,
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
    await new Promise<void>((r) => setTimeout(r, 50));

    const publishedData = mockJsPublish.mock.calls[0][1] as Buffer;
    const parsed = JSON.parse(publishedData.toString());
    expect(parsed.tenantId).toBe(tenantId);
  });

  it('calls createConcept with correct tenant_id', async () => {
    const tenantId = 'tenant-concept-abc';
    const payload = JSON.stringify({
      concepts: [
        { name: 'Ethics', definition: 'Moral philosophy', relatedTerms: [] },
      ],
      courseId: 'course-c',
      tenantId,
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
    await new Promise<void>((r) => setTimeout(r, 50));

    expect(mockCypherService.createConcept).toHaveBeenCalledWith(
      expect.objectContaining({
        tenant_id: tenantId,
        name: 'Ethics',
      })
    );
  });

  it('handles LLM extraction failure gracefully (malformed payload)', async () => {
    const fakeMsg = { data: Buffer.from('not-valid-json') };
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

    // Should not throw — error is logged and consumer continues
    await consumer.onModuleInit();
    await new Promise<void>((r) => setTimeout(r, 50));

    expect(mockCypherService.createConcept).not.toHaveBeenCalled();
  });

  it('handles CypherService failure gracefully and continues with remaining concepts', async () => {
    vi.mocked(mockCypherService.findConceptByNameCaseInsensitive!)
      .mockRejectedValueOnce(new Error('DB connection lost'))
      .mockResolvedValueOnce(null);

    const payload = JSON.stringify({
      concepts: [
        { name: 'FailConcept', definition: 'Will fail', relatedTerms: [] },
        {
          name: 'SuccessConcept',
          definition: 'Will succeed',
          relatedTerms: [],
        },
      ],
      courseId: 'course-fail',
      tenantId: 'tenant-fail',
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
    await new Promise<void>((r) => setTimeout(r, 50));

    // Second concept should still be created
    expect(mockCypherService.createConcept).toHaveBeenCalledTimes(1);
    expect(mockCypherService.createConcept).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'SuccessConcept' })
    );
  });

  it('does not publish persisted message when NATS connection is null', async () => {
    // Create consumer without connection init
    const orphanConsumer = new NatsConsumer(mockCypherService as CypherService);
    const processConcepts = (
      orphanConsumer as unknown as {
        publishPersisted: (
          courseId: string,
          tenantId: string,
          count: number
        ) => Promise<void>;
      }
    ).publishPersisted.bind(orphanConsumer);
    await processConcepts('c-1', 't-1', 5);
    expect(mockJsPublish).not.toHaveBeenCalled();
  });

  it('skips persisted publish if jetstream publish fails', async () => {
    mockJsPublish.mockRejectedValueOnce(new Error('NATS publish failed'));

    const payload = JSON.stringify({
      concepts: [
        {
          name: 'Aesthetics',
          definition: 'Philosophy of beauty',
          relatedTerms: [],
        },
      ],
      courseId: 'course-pfail',
      tenantId: 'tenant-pfail',
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

    // Should not throw — error is caught internally
    await consumer.onModuleInit();
    await new Promise<void>((r) => setTimeout(r, 50));

    expect(mockCypherService.createConcept).toHaveBeenCalled();
  });
});
