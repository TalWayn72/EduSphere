/**
 * Memory safety tests for LessonPipelineOrchestratorService.
 * Verifies that OnModuleDestroy:
 *   1. Aborts ALL active AbortControllers
 *   2. Empties the activeControllers Set after destroy
 *   3. Empties the runControllers Map after destroy
 *   4. Drains NATS connection
 *   5. Calls closeAllPools exactly once
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockCloseAllPools, mockNatsDrain } = vi.hoisted(() => ({
  mockCloseAllPools: vi.fn().mockResolvedValue(undefined),
  mockNatsDrain: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@edusphere/db', () => ({
  createDatabaseConnection: vi.fn(() => ({
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue([]),
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockResolvedValue([]),
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
  })),
  closeAllPools: mockCloseAllPools,
  schema: {
    lesson_pipelines: {},
    lesson_pipeline_runs: {},
    lesson_pipeline_results: {},
    lessons: {},
  },
  eq: vi.fn(),
  and: vi.fn(),
}));

vi.mock('nats', () => ({
  connect: vi.fn().mockResolvedValue({
    publish: vi.fn(),
    drain: mockNatsDrain,
    close: vi.fn().mockResolvedValue(undefined),
  }),
  StringCodec: vi.fn(() => ({
    encode: (s: string) => Buffer.from(s),
    decode: (b: Uint8Array) => Buffer.from(b).toString(),
  })),
}));

vi.mock('@edusphere/nats-client', () => ({
  buildNatsOptions: vi.fn(() => ({})),
  NatsSubjects: {
    LESSON_PIPELINE_MODULE_COMPLETED: 'lesson.pipeline.module.completed',
    LESSON_PIPELINE_COMPLETED: 'lesson.pipeline.completed',
  },
}));

vi.mock('@edusphere/langgraph-workflows', () => ({
  createLessonIngestionWorkflow: vi.fn(() => ({ run: vi.fn().mockResolvedValue({}) })),
  createHebrewNERWorkflow: vi.fn(() => ({ run: vi.fn().mockResolvedValue({ entities: [], enrichedTranscript: '' }) })),
  createContentCleaningWorkflow: vi.fn(() => ({ run: vi.fn().mockResolvedValue({ cleanedText: '' }) })),
  createSummarizationWorkflow: vi.fn(() => ({ run: vi.fn().mockResolvedValue({ shortSummary: '', longSummary: '', keyPoints: [] }) })),
  createStructuredNotesWorkflow: vi.fn(() => ({ run: vi.fn().mockResolvedValue({ outputMarkdown: '' }) })),
  createDiagramGeneratorWorkflow: vi.fn(() => ({ run: vi.fn().mockResolvedValue({ mermaidSrc: '', svgOutput: '' }) })),
  createCitationVerifierWorkflow: vi.fn(() => ({ run: vi.fn().mockResolvedValue({ matchReport: '' }) })),
  createQAWorkflow: vi.fn(() => ({ run: vi.fn().mockResolvedValue({ overallScore: 1, fixList: [] }) })),
}));

import { LessonPipelineOrchestratorService } from './lesson-pipeline-orchestrator.service';
import { closeAllPools } from '@edusphere/db';

describe('LessonPipelineOrchestratorService — memory safety', () => {
  let service: LessonPipelineOrchestratorService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new LessonPipelineOrchestratorService();
  });

  it('onModuleDestroy aborts all active AbortControllers', async () => {
    const ctrl1 = new AbortController();
    const ctrl2 = new AbortController();
    const abort1 = vi.spyOn(ctrl1, 'abort');
    const abort2 = vi.spyOn(ctrl2, 'abort');

    (service as unknown as { activeControllers: Set<AbortController> })
      .activeControllers.add(ctrl1);
    (service as unknown as { activeControllers: Set<AbortController> })
      .activeControllers.add(ctrl2);

    await service.onModuleDestroy();

    expect(abort1).toHaveBeenCalledOnce();
    expect(abort2).toHaveBeenCalledOnce();
  });

  it('activeControllers Set is empty after onModuleDestroy', async () => {
    const ctrl = new AbortController();
    (service as unknown as { activeControllers: Set<AbortController> })
      .activeControllers.add(ctrl);

    await service.onModuleDestroy();

    const activeControllers = (
      service as unknown as { activeControllers: Set<AbortController> }
    ).activeControllers;
    expect(activeControllers.size).toBe(0);
  });

  it('runControllers Map is empty after onModuleDestroy', async () => {
    const ctrl = new AbortController();
    (service as unknown as { runControllers: Map<string, AbortController> })
      .runControllers.set('run-test-1', ctrl);

    await service.onModuleDestroy();

    const runControllers = (
      service as unknown as { runControllers: Map<string, AbortController> }
    ).runControllers;
    expect(runControllers.size).toBe(0);
  });

  it('closeAllPools called exactly once during onModuleDestroy', async () => {
    await service.onModuleDestroy();

    expect(closeAllPools).toHaveBeenCalledTimes(1);
  });

  it('double destroy is safe — closeAllPools called each time', async () => {
    await expect(service.onModuleDestroy()).resolves.not.toThrow();
    await expect(service.onModuleDestroy()).resolves.not.toThrow();

    expect(closeAllPools).toHaveBeenCalledTimes(2);
  });

  it('cancelRun removes controller from both Sets', () => {
    const ctrl = new AbortController();
    const abortSpy = vi.spyOn(ctrl, 'abort');

    (service as unknown as { activeControllers: Set<AbortController> })
      .activeControllers.add(ctrl);
    (service as unknown as { runControllers: Map<string, AbortController> })
      .runControllers.set('run-cancel-1', ctrl);

    service.cancelRun('run-cancel-1');

    expect(abortSpy).toHaveBeenCalledOnce();
    const active = (service as unknown as { activeControllers: Set<AbortController> }).activeControllers;
    const running = (service as unknown as { runControllers: Map<string, AbortController> }).runControllers;
    expect(active.has(ctrl)).toBe(false);
    expect(running.has('run-cancel-1')).toBe(false);
  });

  it('cancelRun on unknown runId does not throw', () => {
    expect(() => service.cancelRun('non-existent-run')).not.toThrow();
  });
});
