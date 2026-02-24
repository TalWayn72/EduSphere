import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CourseGeneratorService } from './course-generator.service.js';
import { GraphQLError } from 'graphql';

// ── DB mock ───────────────────────────────────────────────────────────────────

const mockReturning = vi.fn();
const mockWhere = vi.fn();
const mockSet = vi.fn();
const mockValues = vi.fn();
const mockInsert = vi.fn();
const mockUpdate = vi.fn();
const mockSelect = vi.fn();

const mockDb = {
  insert: mockInsert,
  update: mockUpdate,
  select: mockSelect,
};

vi.mock('@edusphere/db', () => ({
  createDatabaseConnection: vi.fn(() => mockDb),
  schema: {
    agent_executions: {
      id: 'id',
      agent_id: 'agent_id',
      user_id: 'user_id',
      status: 'status',
    },
  },
  eq: vi.fn((col, val) => ({ col, val })),
  closeAllPools: vi.fn().mockResolvedValue(undefined),
}));

// ── Workflow mock ─────────────────────────────────────────────────────────────

const mockWorkflowInvoke = vi.fn();
vi.mock('./course-generator.workflow.js', () => ({
  createCourseGeneratorWorkflow: vi.fn(() => ({ invoke: mockWorkflowInvoke })),
}));

// ── Consent guard mock ────────────────────────────────────────────────────────

const mockAssertConsent = vi.fn();
const mockConsentGuard = { assertConsent: mockAssertConsent };

// ── Fixture ───────────────────────────────────────────────────────────────────

const MOCK_EXECUTION = {
  id: 'exec-course-1',
  status: 'RUNNING',
  user_id: 'user-1',
  agent_id: 'course-generator',
  input: {},
  output: null,
  metadata: {},
};

const MOCK_OUTLINE = {
  courseOutline: {
    title: 'Intro to AI',
    description: 'Learn the fundamentals of AI',
    modules: [
      { title: 'Module 1', description: 'Basics', contentItemTitles: ['Lesson 1'] },
      { title: 'Module 2', description: 'Advanced', contentItemTitles: ['Lesson 2'] },
    ],
  },
  conceptNames: ['Intro to AI', 'Module 1'],
  error: undefined,
};

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('CourseGeneratorService', () => {
  let service: CourseGeneratorService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new CourseGeneratorService(mockConsentGuard as never);

    // Default DB mock chain: insert().values().returning()
    mockReturning.mockResolvedValue([MOCK_EXECUTION]);
    mockValues.mockReturnValue({ returning: mockReturning });
    mockInsert.mockReturnValue({ values: mockValues });

    // Default DB mock chain: update().set().where()
    mockWhere.mockResolvedValue([]);
    mockSet.mockReturnValue({ where: mockWhere });
    mockUpdate.mockReturnValue({ set: mockSet });

    // Default workflow result
    mockWorkflowInvoke.mockResolvedValue(MOCK_OUTLINE);

    // Default consent: allow
    mockAssertConsent.mockResolvedValue(undefined);
  });

  it('checks consent before LLM call', async () => {
    await service.generateCourse(
      { prompt: 'Test course' },
      'user-1',
      'tenant-1',
    );
    expect(mockAssertConsent).toHaveBeenCalledOnce();
    expect(mockAssertConsent).toHaveBeenCalledWith('user-1', expect.any(Boolean));
  });

  it('throws CONSENT_REQUIRED when consent is missing', async () => {
    mockAssertConsent.mockRejectedValueOnce(
      new GraphQLError('Consent required', {
        extensions: { code: 'CONSENT_REQUIRED' },
      }),
    );
    await expect(
      service.generateCourse({ prompt: 'Test' }, 'user-1', 'tenant-1'),
    ).rejects.toMatchObject({
      extensions: { code: 'CONSENT_REQUIRED' },
    });
  });

  it('creates an execution record and returns RUNNING status', async () => {
    const result = await service.generateCourse(
      { prompt: 'Intro to Machine Learning' },
      'user-1',
      'tenant-1',
    );
    expect(result.executionId).toBe('exec-course-1');
    expect(result.status).toBe('RUNNING');
    expect(result.modules).toEqual([]);
  });

  it('passes prompt, level, and hours to the insert values', async () => {
    await service.generateCourse(
      { prompt: 'React course', targetAudienceLevel: 'beginner', estimatedHours: 5 },
      'user-1',
      'tenant-1',
    );
    expect(mockValues).toHaveBeenCalledWith(
      expect.objectContaining({
        input: expect.objectContaining({
          prompt: 'React course',
          targetAudienceLevel: 'beginner',
          estimatedHours: 5,
        }),
      }),
    );
  });

  it('implements OnModuleDestroy which calls closeAllPools', async () => {
    const { closeAllPools } = await import('@edusphere/db');
    await service.onModuleDestroy();
    expect(closeAllPools).toHaveBeenCalledOnce();
  });
});
