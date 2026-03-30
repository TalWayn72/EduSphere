import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LessonPipelineQueryService } from './lesson-pipeline-query.service';

const mockSelect = vi.fn();
const mockDb = { select: mockSelect };

vi.mock('@edusphere/db', () => ({
  createDatabaseConnection: vi.fn(() => mockDb),
  closeAllPools: vi.fn().mockResolvedValue(undefined),
  schema: {
    lesson_pipelines: {
      lesson_id: 'lesson_id',
      created_at: 'created_at',
    },
    lesson_pipeline_runs: {
      id: 'id',
      pipeline_id: 'pipeline_id',
      lesson_id: 'lesson_id',
      started_at: 'started_at',
      run_number: 'run_number',
    },
    lesson_pipeline_results: {
      run_id: 'run_id',
    },
  },
  eq: vi.fn((col, val) => ({ col, val })),
  desc: vi.fn((col) => ({ desc: col })),
  sql: vi.fn(),
}));

function makeChain(rows: unknown[]) {
  const limit = vi.fn().mockResolvedValue(rows);
  const orderBy = vi.fn().mockReturnValue({ limit });
  const where = vi.fn().mockReturnValue({ orderBy, limit });
  const from = vi.fn().mockReturnValue({ where });
  return { from, where, orderBy, limit };
}

function makeChainNoLimit(rows: unknown[]) {
  const orderBy = vi.fn().mockResolvedValue(rows);
  const limit = vi.fn().mockResolvedValue(rows);
  const where = vi.fn().mockReturnValue({ orderBy: vi.fn().mockReturnValue({ limit }) });
  const from = vi.fn().mockReturnValue({ where });
  return { from, where, limit };
}

describe('LessonPipelineQueryService', () => {
  let service: LessonPipelineQueryService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new LessonPipelineQueryService();
  });

  describe('mapPipeline()', () => {
    it('returns null for null/undefined input', () => {
      expect(service.mapPipeline(null)).toBeNull();
      expect(service.mapPipeline(undefined)).toBeNull();
    });

    it('maps row fields correctly', () => {
      const row = {
        id: 'p1',
        lesson_id: 'l1',
        template_name: 'default',
        nodes: [{ id: 'n1' }],
        config: { key: 'val' },
        status: 'ACTIVE',
        created_at: '2026-01-01',
      };
      const result = service.mapPipeline(row);
      expect(result).toEqual({
        id: 'p1',
        lessonId: 'l1',
        templateName: 'default',
        nodes: [{ id: 'n1' }],
        config: { key: 'val' },
        status: 'ACTIVE',
        createdAt: '2026-01-01',
      });
    });

    it('uses fallback field names (camelCase)', () => {
      const row = { id: 'p1', lessonId: 'l1', status: 'DRAFT' };
      const result = service.mapPipeline(row);
      expect(result?.lessonId).toBe('l1');
    });
  });

  describe('mapRun()', () => {
    it('returns null for null input', () => {
      expect(service.mapRun(null)).toBeNull();
    });

    it('maps run row correctly', () => {
      const row = {
        id: 'r1',
        pipeline_id: 'p1',
        lesson_id: 'l1',
        run_number: 3,
        triggered_by: 'AUTO',
        started_at: '2026-02-01',
        completed_at: '2026-02-01T01:00:00',
        status: 'COMPLETED',
        logs: ['log1'],
      };
      const result = service.mapRun(row);
      expect(result).toMatchObject({
        id: 'r1',
        pipelineId: 'p1',
        runNumber: 3,
        triggeredBy: 'AUTO',
        status: 'COMPLETED',
      });
    });

    it('defaults triggeredBy to MANUAL and runNumber to 1', () => {
      const row = { id: 'r1', status: 'RUNNING' };
      const result = service.mapRun(row);
      expect(result?.triggeredBy).toBe('MANUAL');
      expect(result?.runNumber).toBe(1);
    });
  });

  describe('findByLesson()', () => {
    it('returns mapped pipeline for lesson', async () => {
      const chain = makeChain([{
        id: 'p1', lesson_id: 'l1', status: 'ACTIVE',
        template_name: null, nodes: [], config: {}, created_at: null,
      }]);
      mockSelect.mockReturnValue({ from: chain.from });

      const result = await service.findByLesson('l1');
      expect(result?.id).toBe('p1');
    });

    it('returns null when no pipeline exists', async () => {
      const chain = makeChain([]);
      mockSelect.mockReturnValue({ from: chain.from });

      const result = await service.findByLesson('l-none');
      expect(result).toBeNull();
    });
  });

  describe('findRunById()', () => {
    it('returns mapped run', async () => {
      const chain = makeChain([{
        id: 'r1', pipeline_id: 'p1', status: 'COMPLETED',
      }]);
      mockSelect.mockReturnValue({ from: chain.from });

      const result = await service.findRunById('r1');
      expect(result?.id).toBe('r1');
    });
  });

  describe('getNextRunNumber()', () => {
    it('returns max run number + 1', async () => {
      const chain = makeChain([{ maxRun: 5 }]);
      mockSelect.mockReturnValue({ from: chain.from });

      const result = await service.getNextRunNumber('l1');
      expect(result).toBe(6);
    });

    it('returns 1 when no previous runs', async () => {
      const chain = makeChain([{ maxRun: 0 }]);
      mockSelect.mockReturnValue({ from: chain.from });

      const result = await service.getNextRunNumber('l1');
      expect(result).toBe(1);
    });
  });

  describe('onModuleDestroy()', () => {
    it('calls closeAllPools', async () => {
      const { closeAllPools } = await import('@edusphere/db');
      await service.onModuleDestroy();
      expect(closeAllPools).toHaveBeenCalled();
    });
  });
});
