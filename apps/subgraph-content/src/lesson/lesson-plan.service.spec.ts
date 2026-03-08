import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LessonPlanService } from './lesson-plan.service';

// ─── DB chain mocks ───────────────────────────────────────────────────────────

const mockReturning = vi.fn();
const mockWhere = vi.fn();
const _mockLimit = vi.fn();
const _mockOrderBy = vi.fn();
const _mockFrom = vi.fn();
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
  withTenantContext: vi.fn(
    (_db: unknown, _ctx: unknown, fn: (tx: unknown) => unknown) => fn(mockDb)
  ),
  schema: {
    course_lesson_plans: {
      id: 'id',
      course_id: 'course_id',
      tenant_id: 'tenant_id',
      status: 'status',
      created_by: 'created_by',
      updated_at: 'updated_at',
    },
    course_lesson_steps: {
      id: 'id',
      plan_id: 'plan_id',
      step_order: 'step_order',
      step_type: 'step_type',
    },
  },
  eq: vi.fn((col, val) => ({ col, val })),
  and: vi.fn((...args: unknown[]) => args),
  asc: vi.fn((col) => ({ col, direction: 'asc' })),
}));

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const TENANT_CTX = { tenantId: 't-1', userId: 'u-1', userRole: 'INSTRUCTOR' as const };

const MOCK_PLAN_ROW = {
  id: 'plan-1',
  course_id: 'course-1',
  tenant_id: 't-1',
  title: 'Test Plan',
  status: 'DRAFT',
  created_by: 'u-1',
  created_at: new Date('2026-01-01'),
  updated_at: new Date('2026-01-01'),
};

const MOCK_STEP_ROW = {
  id: 'step-1',
  plan_id: 'plan-1',
  step_type: 'VIDEO',
  step_order: 0,
  config: {},
  created_at: new Date('2026-01-01'),
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('LessonPlanService', () => {
  let service: LessonPlanService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new LessonPlanService();
  });

  describe('createPlan()', () => {
    it('inserts a new plan and returns plan with empty steps', async () => {
      mockReturning.mockResolvedValue([MOCK_PLAN_ROW]);
      mockValues.mockReturnValue({ returning: mockReturning });
      mockInsert.mockReturnValue({ values: mockValues });

      const result = await service.createPlan('course-1', TENANT_CTX, 'Test Plan');

      expect(mockInsert).toHaveBeenCalled();
      expect(result.id).toBe('plan-1');
      expect(result.steps).toHaveLength(0);
      expect(result.status).toBe('DRAFT');
    });
  });

  describe('addStep()', () => {
    it('appends a step and returns updated plan', async () => {
      // existing steps query (count)
      const mockExistingLimit = vi.fn().mockResolvedValue([]);
      const mockExistingOrderBy = vi.fn().mockReturnValue({ limit: mockExistingLimit });
      const mockExistingWhere = vi.fn().mockReturnValue({ orderBy: mockExistingOrderBy });
      const mockExistingFrom = vi.fn().mockReturnValue({ where: mockExistingWhere });

      // insert step
      mockValues.mockReturnValue({ returning: vi.fn().mockResolvedValue([MOCK_STEP_ROW]) });
      mockInsert.mockReturnValue({ values: mockValues });

      // select plan
      const mockPlanLimit = vi.fn().mockResolvedValue([MOCK_PLAN_ROW]);
      const mockPlanWhere = vi.fn().mockReturnValue({ limit: mockPlanLimit });
      const mockPlanFrom = vi.fn().mockReturnValue({ where: mockPlanWhere });

      // select steps after insert
      const mockStepsOrderBy = vi.fn().mockResolvedValue([MOCK_STEP_ROW]);
      const mockStepsWhere = vi.fn().mockReturnValue({ orderBy: mockStepsOrderBy });
      const mockStepsFrom = vi.fn().mockReturnValue({ where: mockStepsWhere });

      let callCount = 0;
      mockSelect.mockImplementation(() => {
        callCount++;
        if (callCount === 1) return { from: mockExistingFrom }; // existing steps
        if (callCount === 2) return { from: mockPlanFrom };     // plan select
        return { from: mockStepsFrom };                          // steps after insert
      });

      const result = await service.addStep('plan-1', TENANT_CTX, 'VIDEO', {});

      expect(result.id).toBe('plan-1');
      expect(result.steps[0]?.stepType).toBe('VIDEO');
    });
  });

  describe('publishPlan()', () => {
    it('sets status to PUBLISHED and returns updated plan', async () => {
      const publishedRow = { ...MOCK_PLAN_ROW, status: 'PUBLISHED' };
      mockReturning.mockResolvedValue([publishedRow]);
      mockWhere.mockReturnValue({ returning: mockReturning });
      mockSet.mockReturnValue({ where: mockWhere });
      mockUpdate.mockReturnValue({ set: mockSet });

      // steps query after update
      const mockOrderBySteps = vi.fn().mockResolvedValue([]);
      const mockWhereSteps = vi.fn().mockReturnValue({ orderBy: mockOrderBySteps });
      const mockFromSteps = vi.fn().mockReturnValue({ where: mockWhereSteps });
      mockSelect.mockReturnValue({ from: mockFromSteps });

      const result = await service.publishPlan('plan-1', TENANT_CTX);

      expect(mockUpdate).toHaveBeenCalled();
      expect(result.status).toBe('PUBLISHED');
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
