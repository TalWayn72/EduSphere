import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockExecuteCypher } = vi.hoisted(() => ({
  mockExecuteCypher: vi.fn().mockResolvedValue([]),
}));

vi.mock('@edusphere/db', () => ({
  db: {},
  executeCypher: mockExecuteCypher,
}));

vi.mock('@edusphere/config', () => ({
  graphConfig: { graphName: 'edusphere_graph' },
}));

import { MergeConceptsService } from './merge-concepts.service.js';

const MOCK_SOURCE = {
  id: 'concept-source',
  name: 'Source Concept',
  tenant_id: 'tenant-1',
};
const MOCK_TARGET = {
  id: 'concept-target',
  name: 'Target Concept',
  tenant_id: 'tenant-1',
};

describe('MergeConceptsService', () => {
  let service: MergeConceptsService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new MergeConceptsService();
  });

  it('instantiates without error', () => {
    expect(service).toBeDefined();
  });

  it('throws BadRequestException when source and target are the same', async () => {
    await expect(
      service.mergeNodes(
        {
          sourceConceptId: 'concept-1',
          targetConceptId: 'concept-1',
          keepTarget: true,
        },
        'tenant-1'
      )
    ).rejects.toThrow('Source and target concept IDs must be different');
  });

  it('throws NotFoundException when source concept not found', async () => {
    mockExecuteCypher.mockResolvedValueOnce([]); // source not found

    await expect(
      service.mergeNodes(
        {
          sourceConceptId: 'nonexistent',
          targetConceptId: 'concept-target',
          keepTarget: true,
        },
        'tenant-1'
      )
    ).rejects.toThrow('Source concept nonexistent not found');
  });

  it('throws NotFoundException when target concept not found', async () => {
    mockExecuteCypher
      .mockResolvedValueOnce([MOCK_SOURCE]) // source found
      .mockResolvedValueOnce([]); // target not found

    await expect(
      service.mergeNodes(
        {
          sourceConceptId: 'concept-source',
          targetConceptId: 'nonexistent',
          keepTarget: true,
        },
        'tenant-1'
      )
    ).rejects.toThrow('Target concept nonexistent not found');
  });

  it('merges nodes successfully and returns the target', async () => {
    mockExecuteCypher
      .mockResolvedValueOnce([MOCK_SOURCE]) // source lookup
      .mockResolvedValueOnce([MOCK_TARGET]) // target lookup
      .mockResolvedValueOnce([]) // move outgoing edges
      .mockResolvedValueOnce([]) // move incoming edges
      .mockResolvedValueOnce([]) // delete source
      .mockResolvedValueOnce([MOCK_TARGET]); // return merged target

    const result = await service.mergeNodes(
      {
        sourceConceptId: 'concept-source',
        targetConceptId: 'concept-target',
        keepTarget: true,
      },
      'tenant-1'
    );

    expect(result).toEqual(MOCK_TARGET);
    // 6 Cypher calls: 2 lookups + 2 edge moves + 1 delete + 1 return
    expect(mockExecuteCypher).toHaveBeenCalledTimes(6);
  });

  it('handles edge-move errors gracefully', async () => {
    mockExecuteCypher
      .mockResolvedValueOnce([MOCK_SOURCE]) // source lookup
      .mockResolvedValueOnce([MOCK_TARGET]) // target lookup
      .mockRejectedValueOnce(new Error('No edges')) // outgoing fails
      .mockRejectedValueOnce(new Error('No edges')) // incoming fails
      .mockResolvedValueOnce([]) // delete source
      .mockResolvedValueOnce([MOCK_TARGET]); // return merged

    const result = await service.mergeNodes(
      {
        sourceConceptId: 'concept-source',
        targetConceptId: 'concept-target',
        keepTarget: true,
      },
      'tenant-1'
    );

    expect(result).toEqual(MOCK_TARGET);
  });
});
