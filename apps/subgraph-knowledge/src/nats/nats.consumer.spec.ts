/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NatsConsumer } from './nats.consumer';
import type { CypherService } from '../graph/cypher.service';

// Mock nats module
vi.mock('nats', () => ({
  connect: vi.fn(),
  StringCodec: vi.fn(() => ({
    encode: vi.fn((s: string) => Buffer.from(s)),
    decode: vi.fn((b: Buffer) => b.toString()),
  })),
}));

const mockCypherService: Partial<CypherService> = {
  findConceptByNameCaseInsensitive: vi.fn(),
  createConcept: vi.fn(),
  linkConceptsByName: vi.fn(),
};

describe('NatsConsumer', () => {
  let consumer: NatsConsumer;

  beforeEach(() => {
    consumer = new NatsConsumer(mockCypherService as CypherService);
    vi.clearAllMocks();
  });

  it('is defined', () => {
    expect(consumer).toBeDefined();
  });

  it('calls findConceptByNameCaseInsensitive before creating a concept', async () => {
    vi.mocked(
      mockCypherService.findConceptByNameCaseInsensitive!
    ).mockResolvedValue(null);
    vi.mocked(mockCypherService.createConcept!).mockResolvedValue('new-id');

    // Access private method via any cast for unit testing
    const upsert = (consumer as any).upsertConcept.bind(consumer);
    await upsert(
      { name: 'Metaphysics', definition: 'Study of being', relatedTerms: [] },
      'course-1',
      'tenant-1'
    );

    expect(
      mockCypherService.findConceptByNameCaseInsensitive
    ).toHaveBeenCalledWith('Metaphysics', 'tenant-1');
    expect(mockCypherService.createConcept).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Metaphysics',
        tenant_id: 'tenant-1',
        source_ids: ['course-1'],
      })
    );
  });

  it('skips createConcept when concept already exists', async () => {
    vi.mocked(
      mockCypherService.findConceptByNameCaseInsensitive!
    ).mockResolvedValue({
      id: 'existing-id',
      name: 'Metaphysics',
    });

    const upsert = (consumer as any).upsertConcept.bind(consumer);
    await upsert(
      { name: 'Metaphysics', definition: 'Study of being', relatedTerms: [] },
      'course-1',
      'tenant-1'
    );

    expect(mockCypherService.createConcept).not.toHaveBeenCalled();
  });

  it('creates RELATED_TO edges for each relatedTerm', async () => {
    vi.mocked(
      mockCypherService.findConceptByNameCaseInsensitive!
    ).mockResolvedValue({
      id: 'existing-id',
      name: 'Metaphysics',
    });
    vi.mocked(mockCypherService.linkConceptsByName!).mockResolvedValue(
      undefined
    );

    const process = (consumer as any).processConcepts.bind(consumer);
    await process({
      concepts: [
        {
          name: 'Metaphysics',
          definition: 'Study of being',
          relatedTerms: ['Ontology', 'Logic'],
        },
      ],
      courseId: 'course-1',
      tenantId: 'tenant-1',
    });

    expect(mockCypherService.linkConceptsByName).toHaveBeenCalledWith(
      'Metaphysics',
      'Ontology',
      'tenant-1',
      0.7
    );
    expect(mockCypherService.linkConceptsByName).toHaveBeenCalledWith(
      'Metaphysics',
      'Logic',
      'tenant-1',
      0.7
    );
  });

  it('continues processing when one concept fails', async () => {
    vi.mocked(mockCypherService.findConceptByNameCaseInsensitive!)
      .mockRejectedValueOnce(new Error('DB error'))
      .mockResolvedValueOnce(null);
    vi.mocked(mockCypherService.createConcept!).mockResolvedValue('new-id');
    vi.mocked(mockCypherService.linkConceptsByName!).mockResolvedValue(
      undefined
    );

    const process = (consumer as any).processConcepts.bind(consumer);
    await expect(
      process({
        concepts: [
          { name: 'BadConcept', definition: 'Will fail', relatedTerms: [] },
          { name: 'GoodConcept', definition: 'Will succeed', relatedTerms: [] },
        ],
        courseId: 'course-1',
        tenantId: 'tenant-1',
      })
    ).resolves.toBeUndefined();

    expect(mockCypherService.createConcept).toHaveBeenCalledTimes(1);
  });

  it('silently skips linkConceptsByName errors', async () => {
    vi.mocked(
      mockCypherService.findConceptByNameCaseInsensitive!
    ).mockResolvedValue({
      id: 'id',
      name: 'Metaphysics',
    });
    vi.mocked(mockCypherService.linkConceptsByName!).mockRejectedValueOnce(
      new Error('Node not found')
    );

    const process = (consumer as any).processConcepts.bind(consumer);
    await expect(
      process({
        concepts: [
          {
            name: 'Metaphysics',
            definition: 'Study',
            relatedTerms: ['Unknown'],
          },
        ],
        courseId: 'course-1',
        tenantId: 'tenant-1',
      })
    ).resolves.toBeUndefined();
  });

  it('does not throw in onModuleInit when NATS is unreachable', async () => {
    const { connect } = await import('nats');
    vi.mocked(connect).mockRejectedValueOnce(new Error('Connection refused'));

    await expect(consumer.onModuleInit()).resolves.toBeUndefined();
  });
});
