import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ExamGradingService } from './exam-grading.service';

// Mock all external dependencies
vi.mock('@edusphere/db', () => ({
  createDatabaseConnection: vi.fn(() => ({})),
  closeAllPools: vi.fn(),
}));
vi.mock('nats', () => ({
  connect: vi.fn(),
  StringCodec: vi.fn(() => ({ encode: vi.fn(), decode: vi.fn() })),
}));
vi.mock('@edusphere/nats-client', () => ({
  buildNatsOptions: vi.fn(() => ({})),
}));

function makeItem(
  id: string,
  domain: string,
  bloom: string,
  a = 1,
  b = 0,
  c = 0.2
) {
  return {
    id,
    domainTag: domain,
    bloomLevel: bloom,
    irtA: a,
    irtB: b,
    irtC: c,
    calibrationStatus: 'CALIBRATED',
    questionData: { type: 'MULTIPLE_CHOICE', correctOptionIds: ['opt-a'] },
    tenantId: 't1',
    courseId: 'c1',
    source: 'MANUAL',
    difFlagged: false,
    exposureCount: 0,
    createdBy: 'u1',
    moduleId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  };
}

describe('ExamGradingService — internal scoring logic', () => {
  let service: ExamGradingService;
  let mockPersistence: Record<string, ReturnType<typeof vi.fn>>;

  beforeEach(() => {
    service = new ExamGradingService();

    mockPersistence = {
      loadSession: vi.fn(),
      loadResponses: vi.fn(),
      loadItems: vi.fn(),
      loadBlueprint: vi.fn(),
      insertResult: vi.fn(),
      writeResponseLog: vi.fn(),
      updateExposureCounts: vi.fn(),
      markResponseCorrectness: vi.fn(),
    };
    // Inject mock persistence
    (service as unknown as { persistence: unknown }).persistence =
      mockPersistence;
  });

  const setupMocks = (
    items: ReturnType<typeof makeItem>[],
    responses: Array<{
      itemId: string;
      answerData: unknown;
      timeSpentMs: number;
    }>,
    passingScore = 600
  ) => {
    const questionOrder = items.map((i) => i.id);
    mockPersistence.loadSession.mockResolvedValue({
      id: 'sess-1',
      blueprintId: 'bp-1',
      userId: 'u1',
      questionOrder,
      status: 'SUBMITTED',
    });
    mockPersistence.loadResponses.mockResolvedValue(responses);
    mockPersistence.loadItems.mockResolvedValue(items);
    mockPersistence.loadBlueprint.mockResolvedValue({
      id: 'bp-1',
      passingScore,
      courseId: 'c1',
    });
    mockPersistence.insertResult.mockImplementation((_ctx, data) => ({
      id: 'result-1',
      ...data,
    }));
    mockPersistence.writeResponseLog.mockResolvedValue(undefined);
    mockPersistence.updateExposureCounts.mockResolvedValue(undefined);
    mockPersistence.markResponseCorrectness.mockResolvedValue(undefined);
  };

  it('calculates correct raw score (all correct)', async () => {
    const items = [
      makeItem('i1', 'algebra', 'REMEMBER'),
      makeItem('i2', 'algebra', 'APPLY'),
    ];
    setupMocks(items, [
      { itemId: 'i1', answerData: ['opt-a'], timeSpentMs: 5000 },
      { itemId: 'i2', answerData: ['opt-a'], timeSpentMs: 3000 },
    ]);

    const result = await service.gradeExam('sess-1', 't1');
    expect(result.rawScore).toBe(1);
    expect(result.scaledScore).toBe(1000);
  });

  it('calculates correct raw score (none correct)', async () => {
    const items = [
      makeItem('i1', 'algebra', 'REMEMBER'),
      makeItem('i2', 'algebra', 'APPLY'),
    ];
    setupMocks(items, [
      { itemId: 'i1', answerData: ['opt-wrong'], timeSpentMs: 5000 },
      { itemId: 'i2', answerData: ['opt-wrong'], timeSpentMs: 3000 },
    ]);

    const result = await service.gradeExam('sess-1', 't1');
    expect(result.rawScore).toBe(0);
    expect(result.scaledScore).toBe(200);
  });

  it('calculates scaled score in 200-1000 range', async () => {
    const items = [
      makeItem('i1', 'math', 'REMEMBER'),
      makeItem('i2', 'math', 'APPLY'),
      makeItem('i3', 'math', 'ANALYZE'),
      makeItem('i4', 'math', 'EVALUATE'),
    ];
    // 2 of 4 correct = 50% raw = 200 + 800*0.5 = 600
    setupMocks(items, [
      { itemId: 'i1', answerData: ['opt-a'], timeSpentMs: 5000 },
      { itemId: 'i2', answerData: ['opt-a'], timeSpentMs: 3000 },
      { itemId: 'i3', answerData: ['opt-wrong'], timeSpentMs: 4000 },
      { itemId: 'i4', answerData: ['opt-wrong'], timeSpentMs: 2000 },
    ]);

    const result = await service.gradeExam('sess-1', 't1');
    expect(result.scaledScore).toBe(600);
  });

  it('determines pass/fail based on threshold', async () => {
    const items = [makeItem('i1', 'math', 'REMEMBER')];
    // 1 correct = 100% = scaled 1000, passing=600 => pass
    setupMocks(
      items,
      [{ itemId: 'i1', answerData: ['opt-a'], timeSpentMs: 5000 }],
      600
    );

    const result = await service.gradeExam('sess-1', 't1');
    expect(result.passed).toBe(true);
  });

  it('determines fail when below threshold', async () => {
    const items = [makeItem('i1', 'math', 'REMEMBER')];
    setupMocks(
      items,
      [{ itemId: 'i1', answerData: ['opt-wrong'], timeSpentMs: 5000 }],
      600
    );

    const result = await service.gradeExam('sess-1', 't1');
    expect(result.passed).toBe(false);
  });

  it('calculates domain scores correctly', async () => {
    const items = [
      makeItem('i1', 'algebra', 'REMEMBER'),
      makeItem('i2', 'algebra', 'APPLY'),
      makeItem('i3', 'geometry', 'REMEMBER'),
    ];
    setupMocks(items, [
      { itemId: 'i1', answerData: ['opt-a'], timeSpentMs: 5000 },
      { itemId: 'i2', answerData: ['opt-wrong'], timeSpentMs: 3000 },
      { itemId: 'i3', answerData: ['opt-a'], timeSpentMs: 4000 },
    ]);

    const result = await service.gradeExam('sess-1', 't1');
    const algebraDomain = result.domainScores.find(
      (d: { domain: string }) => d.domain === 'algebra'
    );
    const geomDomain = result.domainScores.find(
      (d: { domain: string }) => d.domain === 'geometry'
    );
    expect(algebraDomain?.correct).toBe(1);
    expect(algebraDomain?.total).toBe(2);
    expect(geomDomain?.correct).toBe(1);
    expect(geomDomain?.total).toBe(1);
  });

  it('calculates bloom scores correctly', async () => {
    const items = [
      makeItem('i1', 'math', 'REMEMBER'),
      makeItem('i2', 'math', 'APPLY'),
      makeItem('i3', 'math', 'APPLY'),
    ];
    setupMocks(items, [
      { itemId: 'i1', answerData: ['opt-a'], timeSpentMs: 5000 },
      { itemId: 'i2', answerData: ['opt-a'], timeSpentMs: 3000 },
      { itemId: 'i3', answerData: ['opt-wrong'], timeSpentMs: 4000 },
    ]);

    const result = await service.gradeExam('sess-1', 't1');
    const remember = result.bloomScores.find(
      (b: { level: string }) => b.level === 'REMEMBER'
    );
    const apply = result.bloomScores.find(
      (b: { level: string }) => b.level === 'APPLY'
    );
    expect(remember?.correct).toBe(1);
    expect(remember?.total).toBe(1);
    expect(apply?.correct).toBe(1);
    expect(apply?.total).toBe(2);
  });
});
