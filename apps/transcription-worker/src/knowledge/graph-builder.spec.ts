import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GraphBuilder } from './graph-builder';
import type { NatsService } from '../nats/nats.service';
import type { ExtractedConcept } from './concept-extractor';

const mockNatsService = {
  publish: vi.fn(),
} as unknown as NatsService;

const CONCEPTS: ExtractedConcept[] = [
  { name: 'Metaphysics', definition: 'Study of being', relatedTerms: ['Ontology'] },
  { name: 'Ontology', definition: 'Study of existence', relatedTerms: [] },
];

describe('GraphBuilder', () => {
  let graphBuilder: GraphBuilder;

  beforeEach(() => {
    graphBuilder = new GraphBuilder(mockNatsService);
    vi.clearAllMocks();
  });

  it('publishes concepts to knowledge.concepts.extracted subject', async () => {
    vi.mocked(mockNatsService.publish).mockResolvedValueOnce(undefined);

    await graphBuilder.publishConcepts(CONCEPTS, 'course-1', 'tenant-1');

    expect(mockNatsService.publish).toHaveBeenCalledWith(
      'knowledge.concepts.extracted',
      expect.objectContaining({
        concepts: CONCEPTS,
        courseId: 'course-1',
        tenantId: 'tenant-1',
      })
    );
  });

  it('skips publishing when concepts array is empty', async () => {
    await graphBuilder.publishConcepts([], 'course-1', 'tenant-1');

    expect(mockNatsService.publish).not.toHaveBeenCalled();
  });

  it('does not throw when NATS publish fails', async () => {
    vi.mocked(mockNatsService.publish).mockRejectedValueOnce(new Error('NATS down'));

    await expect(
      graphBuilder.publishConcepts(CONCEPTS, 'course-1', 'tenant-1')
    ).resolves.toBeUndefined();
  });

  it('includes all concept fields in the payload', async () => {
    vi.mocked(mockNatsService.publish).mockResolvedValueOnce(undefined);

    await graphBuilder.publishConcepts(CONCEPTS, 'course-2', 'tenant-2');

    const [, payload] = vi.mocked(mockNatsService.publish).mock.calls[0] as [string, any];
    expect(payload.concepts).toHaveLength(2);
    expect(payload.concepts[0].relatedTerms).toContain('Ontology');
    expect(payload.courseId).toBe('course-2');
    expect(payload.tenantId).toBe('tenant-2');
  });
});
