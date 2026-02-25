/**
 * plagiarism.service.spec.ts - Unit tests for F-005 PlagiarismService
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockCloseAllPools, mockExecute, mockDbSelect, mockNatsConnect } = vi.hoisted(() => {
  const mockCloseAllPools = vi.fn().mockResolvedValue(undefined);
  const mockExecute = vi.fn().mockResolvedValue([]);
  const mockDbSelect = vi.fn();
  const asyncIter = { next: vi.fn().mockResolvedValue({ done: true }) };
  const mockSub = { unsubscribe: vi.fn(), [Symbol.asyncIterator]: vi.fn().mockReturnValue(asyncIter) };
  const mockNatsConnect = vi.fn().mockResolvedValue({ subscribe: vi.fn().mockReturnValue(mockSub), drain: vi.fn().mockResolvedValue(undefined) });
  return { mockCloseAllPools, mockExecute, mockDbSelect, mockNatsConnect };
});

vi.mock('@edusphere/db', async () => {
  const actual = await vi.importActual('@edusphere/db');
  return {
    ...actual,
    createDatabaseConnection: () => ({
      execute: mockExecute,
      select: mockDbSelect,
      update: vi.fn().mockReturnValue({ set: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue([]) }) }),
    }),
    closeAllPools: mockCloseAllPools,
    withTenantContext: vi.fn(),
  };
});

vi.mock('nats', () => ({ connect: mockNatsConnect, StringCodec: vi.fn().mockReturnValue({ decode: vi.fn().mockReturnValue('{}'), encode: vi.fn() }) }));
vi.mock('@edusphere/nats-client', () => ({ buildNatsOptions: vi.fn().mockReturnValue({ servers: 'nats://localhost:4222' }) }));

import { PlagiarismService } from './plagiarism.service.js';
import { EmbeddingClient } from './embedding.client.js';
import { withTenantContext } from '@edusphere/db';

const ZERO_VEC = new Array(768).fill(0);
const ONE_VEC = new Array(768).fill(1);

function makeEmbeddingClient(vector) {
  const client = new EmbeddingClient();
  vi.spyOn(client, 'embed').mockResolvedValue(vector);
  return client;
}

function makeSelectChain(data) {
  return { from: vi.fn().mockReturnValue({ where: vi.fn().mockReturnValue({ limit: vi.fn().mockResolvedValue(data) }) }) };
}

function makeTx(selectData, updateSetMock) {
  const setMock = updateSetMock ?? vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue([]) });
  return { execute: mockExecute, select: vi.fn().mockReturnValue(makeSelectChain(selectData)), update: vi.fn().mockReturnValue({ set: setMock }) };
}

describe('PlagiarismService', () => {
  beforeEach(() => { vi.clearAllMocks(); mockExecute.mockResolvedValue([]); });

  it('flags submission when highest similarity >= threshold (0.85)', async () => {
    mockExecute
      .mockResolvedValueOnce([{ submission_id: 'sub-2', user_id: 'u2', similarity: '0.95', submitted_at: new Date() }])
      .mockResolvedValueOnce([]);
    // getThreshold uses this.db.select (not withTenantContext)
    mockDbSelect.mockReturnValue(makeSelectChain([{ settings: { plagiarism_threshold: 0.85 } }]));
    const setMock = vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue([]) });
    vi.mocked(withTenantContext)
      .mockImplementationOnce(async (_d, _c, fn) => fn(makeTx([{ id: 'sub-1', textContent: 'text', isFlagged: false }], setMock)))
      .mockImplementationOnce(async (_d, _c, fn) => fn(makeTx([], setMock)))   // runSimilarityQuery tx
      .mockImplementationOnce(async (_d, _c, fn) => fn({ execute: mockExecute, update: vi.fn().mockReturnValue({ set: setMock }) }));
    const svc = new PlagiarismService(makeEmbeddingClient(ONE_VEC));
    await svc.processSubmission('sub-1', 'tenant-1', 'course-1');
    expect(setMock).toHaveBeenCalledWith({ isFlagged: true });
  });

  it('does not flag when similarity < threshold (0.40 < 0.85)', async () => {
    mockExecute
      .mockResolvedValueOnce([{ submission_id: 'sub-2', user_id: 'u', similarity: '0.40', submitted_at: new Date() }])
      .mockResolvedValueOnce([]);
    mockDbSelect.mockReturnValue(makeSelectChain([{ settings: {} }]));
    const setMock = vi.fn();
    vi.mocked(withTenantContext)
      .mockImplementationOnce(async (_d, _c, fn) => fn(makeTx([{ id: 'sub-1', textContent: 'text', isFlagged: false }], setMock)))
      .mockImplementationOnce(async (_d, _c, fn) => fn(makeTx([], setMock)))
      .mockImplementationOnce(async (_d, _c, fn) => fn({ execute: mockExecute, update: vi.fn().mockReturnValue({ set: setMock }) }));
    const svc = new PlagiarismService(makeEmbeddingClient(ZERO_VEC));
    await svc.processSubmission('sub-1', 'tenant-1', 'course-1');
    expect(setMock).not.toHaveBeenCalled();
  });

  it('respects custom threshold of 0.65 from tenant settings', async () => {
    mockExecute
      .mockResolvedValueOnce([{ submission_id: 'sub-2', user_id: 'u', similarity: '0.70', submitted_at: new Date() }])
      .mockResolvedValueOnce([]);
    mockDbSelect.mockReturnValue(makeSelectChain([{ settings: { plagiarism_threshold: 0.65 } }]));
    const setMock = vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue([]) });
    vi.mocked(withTenantContext)
      .mockImplementationOnce(async (_d, _c, fn) => fn(makeTx([{ id: 'sub-1', textContent: 't', isFlagged: false }], setMock)))
      .mockImplementationOnce(async (_d, _c, fn) => fn(makeTx([], setMock)))
      .mockImplementationOnce(async (_d, _c, fn) => fn({ execute: mockExecute, update: vi.fn().mockReturnValue({ set: setMock }) }));
    const svc = new PlagiarismService(makeEmbeddingClient(ONE_VEC));
    await svc.processSubmission('sub-1', 'tenant-1', 'course-1');
    expect(setMock).toHaveBeenCalledWith({ isFlagged: true });
  });

  it('does not throw when submission is not found', async () => {
    vi.mocked(withTenantContext).mockImplementationOnce(async (_d, _c, fn) => fn(makeTx([])));
    const svc = new PlagiarismService(makeEmbeddingClient(ZERO_VEC));
    await expect(svc.processSubmission('missing', 'tenant-1', 'course-1')).resolves.toBeUndefined();
  });

  it('does not throw when embedding provider fails', async () => {
    vi.mocked(withTenantContext).mockImplementationOnce(async (_d, _c, fn) =>
      fn(makeTx([{ id: 'sub-1', textContent: 'text', isFlagged: false }])),
    );
    const client = new EmbeddingClient();
    vi.spyOn(client, 'embed').mockRejectedValue(new Error('Ollama down'));
    const svc = new PlagiarismService(client);
    await expect(svc.processSubmission('sub-1', 'tenant-1', 'course-1')).resolves.toBeUndefined();
  });
});
