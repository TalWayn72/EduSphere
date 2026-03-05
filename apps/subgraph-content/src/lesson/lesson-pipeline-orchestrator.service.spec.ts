/**
 * lesson-pipeline-orchestrator.service.spec.ts
 * Unit tests for LessonPipelineOrchestratorService.
 * Covers: cancelRun, onModuleDestroy, AbortController lifecycle.
 * executeRun is integration-tested via mocks (DB + NATS + workflow stubs).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── DB mocks ──────────────────────────────────────────────────────────────────

const { mockDb } = vi.hoisted(() => {
  const mockDb = {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
  };
  return { mockDb };
});

vi.mock('@edusphere/db', () => ({
  createDatabaseConnection: vi.fn().mockReturnValue(mockDb),
  schema: {
    lesson_pipelines: { id: 'id', lesson_id: 'lesson_id', nodes: 'nodes', status: 'status' },
    lesson_assets: { lesson_id: 'lesson_id', asset_type: 'asset_type', source_url: 'source_url', file_url: 'file_url' },
    lesson_pipeline_results: {},
    lesson_pipeline_runs: { id: 'id', status: 'status', completed_at: 'completed_at' },
    lessons: { id: 'id', status: 'status' },
  },
  eq: vi.fn((a: unknown, b: unknown) => ({ eq: [a, b] })),
  closeAllPools: vi.fn().mockResolvedValue(undefined),
}));

// ── NATS mock ─────────────────────────────────────────────────────────────────

const mockNatsConnect = vi.fn().mockResolvedValue({
  publish: vi.fn(),
  drain: vi.fn().mockResolvedValue(undefined),
});

vi.mock('nats', () => ({
  connect: (...args: unknown[]) => mockNatsConnect(...args),
  StringCodec: vi.fn().mockReturnValue({ encode: vi.fn().mockReturnValue(new Uint8Array()) }),
}));

vi.mock('@edusphere/nats-client', () => ({
  buildNatsOptions: vi.fn().mockReturnValue({}),
  NatsSubjects: {
    LESSON_PIPELINE_MODULE_COMPLETED: 'lesson.pipeline.module.completed',
    LESSON_PIPELINE_COMPLETED: 'lesson.pipeline.completed',
  },
}));

// ── LangGraph workflow mocks ──────────────────────────────────────────────────

vi.mock('@edusphere/langgraph-workflows', () => ({
  createLessonIngestionWorkflow: vi.fn().mockReturnValue({ run: vi.fn().mockResolvedValue({ bundle: {} }) }),
  createHebrewNERWorkflow: vi.fn().mockReturnValue({ run: vi.fn().mockResolvedValue({ entities: [], enrichedTranscript: '' }) }),
  createContentCleaningWorkflow: vi.fn().mockReturnValue({ run: vi.fn().mockResolvedValue({ cleanedText: '' }) }),
  createSummarizationWorkflow: vi.fn().mockReturnValue({ run: vi.fn().mockResolvedValue({ shortSummary: '', longSummary: '', keyPoints: [] }) }),
  createStructuredNotesWorkflow: vi.fn().mockReturnValue({ run: vi.fn().mockResolvedValue({ outputMarkdown: '' }) }),
  createDiagramGeneratorWorkflow: vi.fn().mockReturnValue({ run: vi.fn().mockResolvedValue({ mermaidSrc: '', svgOutput: '' }) }),
  createCitationVerifierWorkflow: vi.fn().mockReturnValue({ run: vi.fn().mockResolvedValue({ matchReport: [] }) }),
  createQAWorkflow: vi.fn().mockReturnValue({ run: vi.fn().mockResolvedValue({ overallScore: 9, fixList: [] }) }),
}));

import { LessonPipelineOrchestratorService } from './lesson-pipeline-orchestrator.service.js';

describe('LessonPipelineOrchestratorService', () => {
  let service: LessonPipelineOrchestratorService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new LessonPipelineOrchestratorService();
  });

  // ── cancelRun ─────────────────────────────────────────────────────────────

  it('cancelRun aborts the controller for the given runId', () => {
    const ctrl = new AbortController();
    const abortSpy = vi.spyOn(ctrl, 'abort');
    // @ts-expect-error — accessing private field for testing
    service['runControllers'].set('run-1', ctrl);
    // @ts-expect-error — accessing private field for testing
    service['activeControllers'].add(ctrl);
    service.cancelRun('run-1');
    expect(abortSpy).toHaveBeenCalled();
    // @ts-expect-error — accessing private field for testing
    expect(service['runControllers'].has('run-1')).toBe(false);
    // @ts-expect-error — accessing private field for testing
    expect(service['activeControllers'].has(ctrl)).toBe(false);
  });

  it('cancelRun is a no-op when runId does not exist', () => {
    expect(() => service.cancelRun('nonexistent-run')).not.toThrow();
  });

  // ── onModuleDestroy ───────────────────────────────────────────────────────

  it('aborts all active controllers on destroy', async () => {
    const ctrl1 = new AbortController();
    const ctrl2 = new AbortController();
    const abort1 = vi.spyOn(ctrl1, 'abort');
    const abort2 = vi.spyOn(ctrl2, 'abort');
    // @ts-expect-error — accessing private field for testing
    service['activeControllers'].add(ctrl1);
    // @ts-expect-error — accessing private field for testing
    service['activeControllers'].add(ctrl2);
    await service.onModuleDestroy();
    expect(abort1).toHaveBeenCalled();
    expect(abort2).toHaveBeenCalled();
  });

  it('drains NATS connection on destroy if connected', async () => {
    const mockNc = { drain: vi.fn().mockResolvedValue(undefined), publish: vi.fn() };
    // @ts-expect-error — accessing private field for testing
    service['nc'] = mockNc;
    await service.onModuleDestroy();
    expect(mockNc.drain).toHaveBeenCalled();
  });

  it('calls closeAllPools on destroy', async () => {
    const { closeAllPools } = await import('@edusphere/db');
    await service.onModuleDestroy();
    expect(closeAllPools).toHaveBeenCalled();
  });

  // ── executeRun — pipeline not found ──────────────────────────────────────

  it('executeRun throws when pipeline row not found', async () => {
    mockDb.select.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([]),
        }),
      }),
    });
    await expect(
      service.executeRun('run-1', 'pipe-missing', { tenantId: 't1', userId: 'u1', userRole: 'STUDENT' })
    ).rejects.toThrow('not found');
  });
});
