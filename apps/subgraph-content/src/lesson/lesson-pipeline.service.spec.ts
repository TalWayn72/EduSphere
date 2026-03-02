import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LessonPipelineService } from './lesson-pipeline.service';

vi.mock('./lesson-pipeline-orchestrator.service', () => ({
  LessonPipelineOrchestratorService: vi.fn().mockImplementation(() => ({
    executeRun: vi.fn().mockResolvedValue(undefined),
    cancelRun: vi.fn(),
  })),
}));

// ─── DB chain mocks ───────────────────────────────────────────────────────────

const mockReturning = vi.fn();
const mockWhere = vi.fn();
const mockLimit = vi.fn();
const mockOrderBy = vi.fn();
const mockFrom = vi.fn();
const mockSelect = vi.fn();
const mockValues = vi.fn();
const mockInsert = vi.fn();
const mockSet = vi.fn();
const mockUpdate = vi.fn();

const mockDb = {
  select: mockSelect,
  insert: mockInsert,
  update: mockUpdate,
};

vi.mock('@edusphere/db', () => ({
  createDatabaseConnection: vi.fn(() => mockDb),
  closeAllPools: vi.fn(),
  schema: {
    lesson_pipelines: {
      id: 'id',
      lesson_id: 'lesson_id',
      status: 'status',
      created_at: 'created_at',
    },
    lesson_pipeline_runs: {
      id: 'id',
      pipeline_id: 'pipeline_id',
      status: 'status',
      started_at: 'started_at',
      completed_at: 'completed_at',
    },
    lesson_pipeline_results: { run_id: 'run_id' },
    lessons: { id: 'id', course_id: 'course_id' },
  },
  eq: vi.fn((col, val) => ({ col, val })),
  and: vi.fn((...args: unknown[]) => args),
  desc: vi.fn((col) => ({ col, direction: 'desc' })),
}));

vi.mock('nats', () => ({
  connect: vi.fn().mockResolvedValue({
    publish: vi.fn(),
    drain: vi.fn().mockResolvedValue(undefined),
  }),
  StringCodec: vi.fn(() => ({ encode: vi.fn((s: string) => s) })),
}));

vi.mock('@edusphere/nats-client', () => ({
  buildNatsOptions: vi.fn(() => ({})),
  NatsSubjects: {
    LESSON_PIPELINE_STARTED: 'EDUSPHERE.lesson.pipeline.started',
  },
}));

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const TENANT_CTX = { tenantId: 't-1', userId: 'u-1', userRole: 'INSTRUCTOR' };

const MOCK_PIPELINE_ROW = {
  id: 'pipe-1',
  lesson_id: 'l-1',
  template_name: 'default',
  nodes: [],
  config: {},
  status: 'DRAFT',
  created_at: new Date('2026-01-01'),
};

const MOCK_RUN_ROW = {
  id: 'run-1',
  pipeline_id: 'pipe-1',
  started_at: new Date('2026-01-01'),
  completed_at: null,
  status: 'RUNNING',
  logs: [],
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('LessonPipelineService', () => {
  let service: LessonPipelineService;
  const mockOrchestrator = {
    executeRun: vi.fn().mockResolvedValue(undefined),
    cancelRun: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockOrchestrator.executeRun = vi.fn().mockResolvedValue(undefined);
    mockOrchestrator.cancelRun = vi.fn();
    service = new LessonPipelineService(mockOrchestrator as never);
  });

  describe('findByLesson()', () => {
    it('returns null when no pipeline row exists', async () => {
      mockLimit.mockResolvedValue([]);
      mockOrderBy.mockReturnValue({ limit: mockLimit });
      mockWhere.mockReturnValue({ orderBy: mockOrderBy });
      mockFrom.mockReturnValue({ where: mockWhere });
      mockSelect.mockReturnValue({ from: mockFrom });

      const result = await service.findByLesson('l-1');
      expect(result).toBeNull();
    });

    it('returns mapped pipeline when row exists', async () => {
      mockLimit.mockResolvedValue([MOCK_PIPELINE_ROW]);
      mockOrderBy.mockReturnValue({ limit: mockLimit });
      mockWhere.mockReturnValue({ orderBy: mockOrderBy });
      mockFrom.mockReturnValue({ where: mockWhere });
      mockSelect.mockReturnValue({ from: mockFrom });

      const result = await service.findByLesson('l-1');
      expect(result?.id).toBe('pipe-1');
    });
  });

  describe('savePipeline() — new lesson', () => {
    it('inserts a new pipeline row when none exists', async () => {
      // findByLesson returns nothing (no existing pipeline)
      mockLimit.mockResolvedValue([]);
      mockOrderBy.mockReturnValue({ limit: mockLimit });
      mockWhere.mockReturnValue({
        orderBy: mockOrderBy,
        returning: mockReturning,
      });
      mockFrom.mockReturnValue({ where: mockWhere });
      mockSelect.mockReturnValue({ from: mockFrom });
      // insert chain
      mockReturning.mockResolvedValue([MOCK_PIPELINE_ROW]);
      mockValues.mockReturnValue({ returning: mockReturning });
      mockInsert.mockReturnValue({ values: mockValues });

      const result = await service.savePipeline(
        'l-1',
        { nodes: [], templateName: 'default' },
        TENANT_CTX
      );
      expect(mockInsert).toHaveBeenCalled();
      expect(result?.lessonId).toBe('l-1');
    });
  });

  describe('cancelRun()', () => {
    it('calls orchestrator.cancelRun with the runId', async () => {
      mockReturning.mockResolvedValue([
        { ...MOCK_RUN_ROW, status: 'CANCELLED' },
      ]);
      mockWhere.mockReturnValue({ returning: mockReturning });
      mockSet.mockReturnValue({ where: mockWhere });
      mockUpdate.mockReturnValue({ set: mockSet });

      await service.cancelRun('run-1', TENANT_CTX);
      expect(mockOrchestrator.cancelRun).toHaveBeenCalledWith('run-1');
    });

    it('updates run status to CANCELLED', async () => {
      let captured: Record<string, unknown> = {};
      mockSet.mockImplementation((v: Record<string, unknown>) => {
        captured = v;
        return { where: mockWhere };
      });
      mockReturning.mockResolvedValue([
        { ...MOCK_RUN_ROW, status: 'CANCELLED' },
      ]);
      mockWhere.mockReturnValue({ returning: mockReturning });
      mockUpdate.mockReturnValue({ set: mockSet });

      await service.cancelRun('run-1', TENANT_CTX);
      expect(captured['status']).toBe('CANCELLED');
    });

    it('returns mapped run with CANCELLED status', async () => {
      mockReturning.mockResolvedValue([
        { ...MOCK_RUN_ROW, status: 'CANCELLED' },
      ]);
      mockWhere.mockReturnValue({ returning: mockReturning });
      mockSet.mockReturnValue({ where: mockWhere });
      mockUpdate.mockReturnValue({ set: mockSet });

      const result = await service.cancelRun('run-1', TENANT_CTX);
      expect(result?.status).toBe('CANCELLED');
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
