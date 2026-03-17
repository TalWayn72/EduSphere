/**
 * pipeline-orchestrator.integration.spec.ts
 * Integration test for LessonPipelineOrchestratorService.
 * Mocks DB + NATS but exercises the full executeRun pipeline flow.
 * Validates: module execution order, result persistence, NATS events,
 * NER entity publishing, run status transitions, and PUBLISH_SHARE delegation.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── DB mock ──────────────────────────────────────────────────────────────────

const insertedResults: Array<Record<string, unknown>> = [];
const updatedRows: Array<{ table: string; set: Record<string, unknown> }> = [];

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

// ── NATS mock — capture published messages ──────────────────────────────────

const publishedMessages: Array<{ subject: string; data: string }> = [];

const { mockNatsPublish, mockNatsConnect } = vi.hoisted(() => {
  const mockNatsPublish = vi.fn();
  const mockNatsConnect = vi.fn();
  return { mockNatsPublish, mockNatsConnect };
});

// Set up implementations (using the hoisted refs)
mockNatsPublish.mockImplementation((subject: string, data: Uint8Array) => {
  publishedMessages.push({ subject, data: new TextDecoder().decode(data) });
});

mockNatsConnect.mockResolvedValue({
  publish: mockNatsPublish,
  drain: vi.fn().mockResolvedValue(undefined),
});

vi.mock('nats', () => ({
  connect: (...args: unknown[]) => mockNatsConnect(...args),
  StringCodec: vi.fn().mockReturnValue({
    encode: vi.fn((s: string) => new TextEncoder().encode(s)),
  }),
}));

vi.mock('@edusphere/nats-client', () => ({
  buildNatsOptions: vi.fn().mockReturnValue({}),
  NatsSubjects: {
    LESSON_PIPELINE_MODULE_COMPLETED: 'EDUSPHERE.lesson.pipeline.module.completed',
    LESSON_PIPELINE_COMPLETED: 'EDUSPHERE.lesson.pipeline.completed',
  },
}));

// ── LangGraph workflow mocks — return realistic outputs ─────────────────────

const {
  ingestionRun,
  nerRun,
  cleaningRun,
  summarizationRun,
  notesRun,
  diagramRun,
  citationRun,
  qaRun,
  mockPublishLesson,
} = vi.hoisted(() => ({
  ingestionRun: vi.fn().mockResolvedValue({ bundle: { transcript: 'Hello' } }),
  nerRun: vi.fn().mockResolvedValue({
    entities: [
      { text: 'Talmud', type: 'Source' },
      { text: 'Rashi', type: 'Person' },
    ],
    enrichedTranscript: 'Hello enriched',
  }),
  cleaningRun: vi.fn().mockResolvedValue({ cleanedText: 'Cleaned text' }),
  summarizationRun: vi.fn().mockResolvedValue({
    shortSummary: 'Short',
    longSummary: 'Long summary',
    keyPoints: ['Point A', 'Point B'],
  }),
  notesRun: vi.fn().mockResolvedValue({ outputMarkdown: '# Notes' }),
  diagramRun: vi.fn().mockResolvedValue({ mermaidSrc: 'graph TD', svgOutput: '<svg/>' }),
  citationRun: vi.fn().mockResolvedValue({ matchReport: [] }),
  qaRun: vi.fn().mockResolvedValue({ overallScore: 9, fixList: [] }),
  mockPublishLesson: vi.fn().mockResolvedValue({
    publishUrl: '/lessons/l-1',
    publishedAt: '2026-01-01T00:00:00.000Z',
    publishedRunId: 'run-1',
  }),
}));

vi.mock('@edusphere/langgraph-workflows', () => ({
  createLessonIngestionWorkflow: vi.fn().mockReturnValue({ run: ingestionRun }),
  createHebrewNERWorkflow: vi.fn().mockReturnValue({ run: nerRun }),
  createContentCleaningWorkflow: vi.fn().mockReturnValue({ run: cleaningRun }),
  createSummarizationWorkflow: vi.fn().mockReturnValue({ run: summarizationRun }),
  createStructuredNotesWorkflow: vi.fn().mockReturnValue({ run: notesRun }),
  createDiagramGeneratorWorkflow: vi.fn().mockReturnValue({ run: diagramRun }),
  createCitationVerifierWorkflow: vi.fn().mockReturnValue({ run: citationRun }),
  createQAWorkflow: vi.fn().mockReturnValue({ run: qaRun }),
}));

// ── PublishService mock ─────────────────────────────────────────────────────

vi.mock('../../lesson/lesson-publish.service', () => ({
  LessonPublishService: vi.fn().mockImplementation(() => ({
    publishLesson: mockPublishLesson,
  })),
}));

import { LessonPipelineOrchestratorService } from '../../lesson/lesson-pipeline-orchestrator.service';
import type { LessonPublishService } from '../../lesson/lesson-publish.service';

// ── Fixtures ────────────────────────────────────────────────────────────────

const TENANT_CTX = { tenantId: 't-1', userId: 'u-1', userRole: 'INSTRUCTOR' as const };

const FULL_PIPELINE_NODES = [
  { id: 'n1', moduleType: 'INGESTION', config: {}, enabled: true, order: 1 },
  { id: 'n2', moduleType: 'NER_SOURCE_LINKING', config: {}, enabled: true, order: 2 },
  { id: 'n3', moduleType: 'CONTENT_CLEANING', config: {}, enabled: true, order: 3 },
  { id: 'n4', moduleType: 'SUMMARIZATION', config: {}, enabled: true, order: 4 },
  { id: 'n5', moduleType: 'STRUCTURED_NOTES', config: {}, enabled: true, order: 5 },
  { id: 'n6', moduleType: 'DIAGRAM_GENERATOR', config: {}, enabled: true, order: 6 },
  { id: 'n7', moduleType: 'CITATION_VERIFIER', config: {}, enabled: true, order: 7 },
  { id: 'n8', moduleType: 'QA_GATE', config: {}, enabled: true, order: 8 },
  { id: 'n9', moduleType: 'PUBLISH_SHARE', config: {}, enabled: true, order: 9 },
];

// ── Helpers ──────────────────────────────────────────────────────────────────

function setupDbForFullRun(): void {
  // select().from(lesson_pipelines).where().limit() → pipeline row
  // select().from(lesson_assets).where() → asset rows
  // insert().values() → result rows
  // update().set().where() → run status updates

  let selectCallIndex = 0;
  mockDb.select.mockImplementation(() => {
    const idx = selectCallIndex++;
    if (idx === 0) {
      // Pipeline lookup
      return {
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([{
              id: 'pipe-1',
              lesson_id: 'l-1',
              nodes: FULL_PIPELINE_NODES,
              status: 'RUNNING',
            }]),
          }),
        }),
      };
    }
    // Lesson assets lookup
    return {
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([
          { asset_type: 'VIDEO', source_url: 'https://example.com/video.mp4', file_url: null },
        ]),
      }),
    };
  });

  mockDb.insert.mockImplementation(() => ({
    values: vi.fn().mockImplementation((row: Record<string, unknown>) => {
      insertedResults.push(row);
      return Promise.resolve();
    }),
  }));

  mockDb.update.mockImplementation(() => ({
    set: vi.fn().mockImplementation((setObj: Record<string, unknown>) => ({
      where: vi.fn().mockImplementation(() => {
        updatedRows.push({ table: 'unknown', set: setObj });
        return Promise.resolve();
      }),
    })),
  }));
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('Pipeline Orchestrator Integration', () => {
  let service: LessonPipelineOrchestratorService;

  beforeEach(() => {
    vi.clearAllMocks();
    insertedResults.length = 0;
    updatedRows.length = 0;
    publishedMessages.length = 0;

    // Restore default mock implementations after clearAllMocks
    ingestionRun.mockResolvedValue({ bundle: { transcript: 'Hello' } });
    nerRun.mockResolvedValue({
      entities: [
        { text: 'Talmud', type: 'Source' },
        { text: 'Rashi', type: 'Person' },
      ],
      enrichedTranscript: 'Hello enriched',
    });
    cleaningRun.mockResolvedValue({ cleanedText: 'Cleaned text' });
    summarizationRun.mockResolvedValue({
      shortSummary: 'Short',
      longSummary: 'Long summary',
      keyPoints: ['Point A', 'Point B'],
    });
    notesRun.mockResolvedValue({ outputMarkdown: '# Notes' });
    diagramRun.mockResolvedValue({ mermaidSrc: 'graph TD', svgOutput: '<svg/>' });
    citationRun.mockResolvedValue({ matchReport: [] });
    qaRun.mockResolvedValue({ overallScore: 9, fixList: [] });
    mockPublishLesson.mockResolvedValue({
      publishUrl: '/lessons/l-1',
      publishedAt: '2026-01-01T00:00:00.000Z',
      publishedRunId: 'run-1',
    });
    mockNatsPublish.mockImplementation((subject: string, data: Uint8Array) => {
      publishedMessages.push({ subject, data: new TextDecoder().decode(data) });
    });

    const publishService = { publishLesson: mockPublishLesson } as unknown as LessonPublishService;
    service = new LessonPipelineOrchestratorService(publishService);
  });

  // ── Full pipeline run ────────────────────────────────────────────────────

  it('executes all 9 modules in order and marks run COMPLETED', async () => {
    setupDbForFullRun();

    await service.executeRun('run-1', 'pipe-1', TENANT_CTX);

    // All 9 workflow runs should have been called
    expect(ingestionRun).toHaveBeenCalledTimes(1);
    expect(nerRun).toHaveBeenCalledTimes(1);
    expect(cleaningRun).toHaveBeenCalledTimes(1);
    expect(summarizationRun).toHaveBeenCalledTimes(1);
    expect(notesRun).toHaveBeenCalledTimes(1);
    expect(diagramRun).toHaveBeenCalledTimes(1);
    expect(citationRun).toHaveBeenCalledTimes(1);
    expect(qaRun).toHaveBeenCalledTimes(1);

    // 9 result rows inserted (one per module)
    expect(insertedResults).toHaveLength(9);
  });

  it('each module produces an output row in lesson_pipeline_results', async () => {
    setupDbForFullRun();

    await service.executeRun('run-1', 'pipe-1', TENANT_CTX);

    const moduleNames = insertedResults.map((r) => r['module_name']);
    expect(moduleNames).toEqual([
      'INGESTION',
      'NER_SOURCE_LINKING',
      'CONTENT_CLEANING',
      'SUMMARIZATION',
      'STRUCTURED_NOTES',
      'DIAGRAM_GENERATOR',
      'CITATION_VERIFIER',
      'QA_GATE',
      'PUBLISH_SHARE',
    ]);
  });

  // ── PUBLISH_SHARE calls PublishService ─────────────────────────────────

  it('PUBLISH_SHARE module delegates to LessonPublishService', async () => {
    setupDbForFullRun();

    await service.executeRun('run-1', 'pipe-1', TENANT_CTX);

    expect(mockPublishLesson).toHaveBeenCalledWith('l-1', 'run-1', TENANT_CTX);
  });

  // ── NER entities published to NATS ────────────────────────────────────

  it('publishes NER entities to NATS after NER_SOURCE_LINKING module', async () => {
    setupDbForFullRun();

    await service.executeRun('run-1', 'pipe-1', TENANT_CTX);

    // Wait for async NATS publish (fire-and-forget)
    await new Promise((r) => setTimeout(r, 50));

    const nerMessages = publishedMessages.filter((m) =>
      m.subject.includes('ner.extracted')
    );
    expect(nerMessages.length).toBeGreaterThanOrEqual(1);

    const nerPayload = JSON.parse(nerMessages[0]!.data);
    expect(nerPayload.tenantId).toBe('t-1');
    expect(nerPayload.lessonId).toBe('l-1');
    expect(nerPayload.entities).toHaveLength(2);
    expect(nerPayload.entities[0].name).toBe('Talmud');
  });

  // ── Module completion events published to NATS ────────────────────────

  it('publishes module completion events for each module', async () => {
    setupDbForFullRun();

    await service.executeRun('run-1', 'pipe-1', TENANT_CTX);

    // Wait for async fire-and-forget publishes
    await new Promise((r) => setTimeout(r, 50));

    const moduleEvents = publishedMessages.filter(
      (m) => m.subject === 'EDUSPHERE.lesson.pipeline.module.completed'
    );
    // 9 modules = 9 module completion events
    expect(moduleEvents.length).toBe(9);

    const firstPayload = JSON.parse(moduleEvents[0]!.data);
    expect(firstPayload.status).toBe('COMPLETED');
    expect(firstPayload.runId).toBe('run-1');
  });

  // ── Run status transitions ────────────────────────────────────────────

  it('updates run status to COMPLETED after all modules finish', async () => {
    setupDbForFullRun();

    await service.executeRun('run-1', 'pipe-1', TENANT_CTX);

    const completedUpdates = updatedRows.filter(
      (r) => r.set['status'] === 'COMPLETED'
    );
    // At least run + pipeline updated to COMPLETED
    expect(completedUpdates.length).toBeGreaterThanOrEqual(2);
  });

  it('updates lesson status to READY after pipeline completes', async () => {
    setupDbForFullRun();

    await service.executeRun('run-1', 'pipe-1', TENANT_CTX);

    const readyUpdates = updatedRows.filter(
      (r) => r.set['status'] === 'READY'
    );
    expect(readyUpdates.length).toBeGreaterThanOrEqual(1);
  });

  // ── Pipeline not found ────────────────────────────────────────────────

  it('throws when pipeline is not found', async () => {
    mockDb.select.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([]),
        }),
      }),
    });

    await expect(
      service.executeRun('run-1', 'pipe-missing', TENANT_CTX)
    ).rejects.toThrow('not found');
  });

  // ── Cancellation mid-run ──────────────────────────────────────────────

  it('stops executing modules when run is cancelled', async () => {
    // Override ingestionRun for this test only — cancel mid-flight
    ingestionRun.mockImplementationOnce(async () => {
      service.cancelRun('run-cancel');
      return { bundle: {} };
    });

    let selectIdx = 0;
    mockDb.select.mockImplementation(() => {
      const idx = selectIdx++;
      if (idx === 0) {
        return {
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([{
                id: 'pipe-c',
                lesson_id: 'l-c',
                nodes: [
                  { id: 'n1', moduleType: 'INGESTION', config: {}, enabled: true, order: 1 },
                  { id: 'n2', moduleType: 'NER_SOURCE_LINKING', config: {}, enabled: true, order: 2 },
                ],
                status: 'RUNNING',
              }]),
            }),
          }),
        };
      }
      return {
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      };
    });

    mockDb.insert.mockReturnValue({
      values: vi.fn().mockResolvedValue(undefined),
    });
    mockDb.update.mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      }),
    });

    await service.executeRun('run-cancel', 'pipe-c', TENANT_CTX);

    // NER should NOT have been called because run was cancelled after INGESTION
    expect(nerRun).not.toHaveBeenCalled();
  });

  // ── Disabled modules are skipped ──────────────────────────────────────

  it('skips disabled modules', async () => {
    let selectIdx = 0;
    mockDb.select.mockImplementation(() => {
      const idx = selectIdx++;
      if (idx === 0) {
        return {
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([{
                id: 'pipe-d',
                lesson_id: 'l-d',
                nodes: [
                  { id: 'n1', moduleType: 'INGESTION', config: {}, enabled: true, order: 1 },
                  { id: 'n2', moduleType: 'NER_SOURCE_LINKING', config: {}, enabled: false, order: 2 },
                ],
                status: 'RUNNING',
              }]),
            }),
          }),
        };
      }
      return {
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      };
    });

    mockDb.insert.mockReturnValue({
      values: vi.fn().mockResolvedValue(undefined),
    });
    mockDb.update.mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      }),
    });

    await service.executeRun('run-d', 'pipe-d', TENANT_CTX);

    expect(ingestionRun).toHaveBeenCalled();
    expect(nerRun).not.toHaveBeenCalled();
  });

  // ── Module failure is caught and reported ─────────────────────────────

  it('continues to next module when one fails, publishes FAILED event', async () => {
    ingestionRun.mockRejectedValueOnce(new Error('LLM timeout'));

    let selectIdx = 0;
    mockDb.select.mockImplementation(() => {
      const idx = selectIdx++;
      if (idx === 0) {
        return {
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([{
                id: 'pipe-f',
                lesson_id: 'l-f',
                nodes: [
                  { id: 'n1', moduleType: 'INGESTION', config: {}, enabled: true, order: 1 },
                  { id: 'n2', moduleType: 'CONTENT_CLEANING', config: {}, enabled: true, order: 2 },
                ],
                status: 'RUNNING',
              }]),
            }),
          }),
        };
      }
      return {
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      };
    });

    mockDb.insert.mockReturnValue({
      values: vi.fn().mockResolvedValue(undefined),
    });
    mockDb.update.mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      }),
    });

    await service.executeRun('run-f', 'pipe-f', TENANT_CTX);

    // Wait for async publishes
    await new Promise((r) => setTimeout(r, 50));

    // CONTENT_CLEANING still runs even though INGESTION failed
    expect(cleaningRun).toHaveBeenCalled();

    // One FAILED event published for INGESTION
    const failedEvents = publishedMessages.filter((m) => {
      if (m.subject !== 'EDUSPHERE.lesson.pipeline.module.completed') return false;
      try {
        const p = JSON.parse(m.data);
        return p.status === 'FAILED';
      } catch {
        return false;
      }
    });
    expect(failedEvents.length).toBeGreaterThanOrEqual(1);
  });
});
