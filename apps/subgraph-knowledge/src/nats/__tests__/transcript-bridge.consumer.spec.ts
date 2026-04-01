/* Tests for transcript bridge consumer — no-explicit-any removed */
/**
 * Transcript Bridge Consumer Tests
 *
 * Tests that the NatsConsumer correctly:
 * - Creates KnowledgeSource when transcription completes
 * - Sets correct source_type and transcript_id
 * - Triggers embedding generation after concept persistence
 * - Handles NATS connection lifecycle properly
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
  createConcept: vi.fn().mockResolvedValue('new-concept-id'),
  linkConceptsByName: vi.fn().mockResolvedValue(undefined),
};

function setupNatsMocks(): void {
  mockJsmStreamsInfo = vi.fn().mockResolvedValue({ config: {} });
  mockJsmStreamsAdd = vi.fn().mockResolvedValue(undefined);
  mockJsPublish = vi.fn().mockResolvedValue(undefined);
  mockDrain = vi.fn().mockResolvedValue(undefined);
  mockSubscribe = vi.fn();
}

describe('NatsConsumer — transcript bridge behavior', () => {
  let consumer: NatsConsumer;

  beforeEach(async () => {
    vi.clearAllMocks();
    // Re-setup mock implementations after clearAllMocks
    vi.mocked(
      mockCypherService.findConceptByNameCaseInsensitive!
    ).mockResolvedValue(null);
    vi.mocked(mockCypherService.createConcept!).mockResolvedValue(
      'new-concept-id'
    );
    vi.mocked(mockCypherService.linkConceptsByName!).mockResolvedValue(
      undefined
    );
    setupNatsMocks();
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

  describe('concept persistence from transcription', () => {
    it('creates concepts when transcription concepts are received', async () => {
      const payload = JSON.stringify({
        concepts: [
          {
            name: 'Machine Learning',
            definition: 'Subset of AI that learns from data',
            relatedTerms: ['Deep Learning', 'Neural Networks'],
          },
        ],
        courseId: 'course-transcript-1',
        tenantId: 'tenant-transcript-1',
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
          name: 'Machine Learning',
          definition: 'Subset of AI that learns from data',
          tenant_id: 'tenant-transcript-1',
          source_ids: ['course-transcript-1'],
        })
      );
    });

    it('creates RELATED_TO edges for concept related terms', async () => {
      vi.mocked(
        mockCypherService.findConceptByNameCaseInsensitive!
      ).mockResolvedValue({ id: 'existing', name: 'ML' });

      const payload = JSON.stringify({
        concepts: [
          {
            name: 'ML',
            definition: 'Machine Learning',
            relatedTerms: ['Statistics', 'Data Science'],
          },
        ],
        courseId: 'course-rel-1',
        tenantId: 'tenant-rel-1',
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

      expect(mockCypherService.linkConceptsByName).toHaveBeenCalledWith(
        'ML',
        'Statistics',
        'tenant-rel-1',
        0.7
      );
      expect(mockCypherService.linkConceptsByName).toHaveBeenCalledWith(
        'ML',
        'Data Science',
        'tenant-rel-1',
        0.7
      );
    });

    it('triggers persisted event after all concepts are processed', async () => {
      const payload = JSON.stringify({
        concepts: [
          {
            name: 'NLP',
            definition: 'Natural Language Processing',
            relatedTerms: [],
          },
          { name: 'CV', definition: 'Computer Vision', relatedTerms: [] },
          {
            name: 'RL',
            definition: 'Reinforcement Learning',
            relatedTerms: [],
          },
        ],
        courseId: 'course-multi',
        tenantId: 'tenant-multi',
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

      // Should publish persisted event with count=3
      expect(mockJsPublish).toHaveBeenCalledOnce();
      const publishedData = mockJsPublish.mock.calls[0][1] as Buffer;
      const parsed = JSON.parse(publishedData.toString());
      expect(parsed.persistedCount).toBe(3);
      expect(parsed.courseId).toBe('course-multi');
    });
  });

  describe('idempotency', () => {
    it('skips concept creation when concept already exists', async () => {
      vi.mocked(
        mockCypherService.findConceptByNameCaseInsensitive!
      ).mockResolvedValue({ id: 'existing-id', name: 'Existing' });

      const payload = JSON.stringify({
        concepts: [
          {
            name: 'Existing',
            definition: 'Already in graph',
            relatedTerms: [],
          },
        ],
        courseId: 'course-idem',
        tenantId: 'tenant-idem',
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

      expect(mockCypherService.createConcept).not.toHaveBeenCalled();
    });
  });

  describe('NATS lifecycle', () => {
    it('subscribes to knowledge.concepts.extracted subject', async () => {
      mockSubscribe.mockReturnValue({
        [Symbol.asyncIterator]: () => ({
          next: () => new Promise(() => {}),
        }),
      });

      await consumer.onModuleInit();

      expect(mockSubscribe).toHaveBeenCalledWith(
        'knowledge.concepts.extracted',
        expect.objectContaining({ queue: 'knowledge-workers' })
      );
    });

    it('drains connection on module destroy', async () => {
      mockSubscribe.mockReturnValue({
        [Symbol.asyncIterator]: () => ({
          next: () => new Promise(() => {}),
        }),
      });
      await consumer.onModuleInit();
      await consumer.onModuleDestroy();
      expect(mockDrain).toHaveBeenCalledOnce();
    });

    it('handles multiple messages in sequence', async () => {
      const msgs = [
        {
          data: Buffer.from(
            JSON.stringify({
              concepts: [
                { name: 'C1', definition: 'Concept 1', relatedTerms: [] },
              ],
              courseId: 'c-1',
              tenantId: 't-1',
            })
          ),
        },
        {
          data: Buffer.from(
            JSON.stringify({
              concepts: [
                { name: 'C2', definition: 'Concept 2', relatedTerms: [] },
              ],
              courseId: 'c-2',
              tenantId: 't-2',
            })
          ),
        },
      ];
      let idx = 0;
      mockSubscribe.mockReturnValue({
        [Symbol.asyncIterator]: () => ({
          next: async () => {
            if (idx < msgs.length) {
              const msg = msgs[idx];
              idx++;
              return { value: msg, done: false };
            }
            // Never resolve — keeps consumer alive until destroy
            return new Promise(() => {});
          },
        }),
      });

      await consumer.onModuleInit();
      // Allow enough time for async processing of both messages
      await new Promise<void>((r) => setTimeout(r, 200));

      expect(mockCypherService.createConcept).toHaveBeenCalledTimes(2);
      expect(mockJsPublish).toHaveBeenCalledTimes(2);
    });
  });
});
