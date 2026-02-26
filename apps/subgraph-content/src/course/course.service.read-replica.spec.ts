/**
 * Read-replica routing tests for CourseService.
 *
 * Verifies that:
 *  - Read-only methods (findById, findAll) delegate to withReadReplica.
 *  - Write methods (create, update) do NOT call withReadReplica.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Hoisted mocks — must use vi.hoisted() so they are available inside vi.mock()
// ---------------------------------------------------------------------------
const mocks = vi.hoisted(() => {
  // Write-path db mock
  const mockReturning = vi.fn();
  const mockValues = vi.fn(() => ({ returning: mockReturning }));
  const mockInsert = vi.fn(() => ({ values: mockValues }));

  const mockWhere = vi.fn();
  const mockSet = vi.fn(() => ({ where: mockWhere }));
  const mockUpdate = vi.fn(() => ({ set: mockSet }));

  const mockWriteDb = { insert: mockInsert, update: mockUpdate };

  // withReadReplica — default impl returns empty array; tests override per-call
  const withReadReplicaMock = vi.fn(
    (_fn: (db: unknown) => unknown) => Promise.resolve([])
  );

  return {
    mockReturning,
    mockValues,
    mockInsert,
    mockWhere,
    mockSet,
    mockUpdate,
    mockWriteDb,
    withReadReplicaMock,
  };
});

vi.mock('@edusphere/db', () => ({
  createDatabaseConnection: vi.fn(() => mocks.mockWriteDb),
  closeAllPools: vi.fn(),
  withReadReplica: mocks.withReadReplicaMock,
  schema: {
    courses: {
      id: 'id',
      created_at: 'created_at',
      tenant_id: 'tenant_id',
    },
  },
  eq: vi.fn((col: unknown, val: unknown) => ({ col, val })),
  desc: vi.fn((col: unknown) => ({ col, direction: 'desc' })),
}));

import { CourseService } from './course.service';

const MOCK_COURSE = {
  id: 'course-1',
  tenant_id: 'tenant-1',
  title: 'Test Course',
  description: 'A test course',
  instructor_id: 'user-1',
  created_at: new Date('2026-01-01'),
  updated_at: new Date('2026-01-01'),
  is_published: false,
  slug: 'test-course',
  thumbnail_url: null,
  estimated_hours: null,
};

describe('CourseService — read-replica routing', () => {
  let service: CourseService;

  beforeEach(() => {
    vi.clearAllMocks();

    // Default: withReadReplica returns an empty array
    mocks.withReadReplicaMock.mockResolvedValue([]);

    // Wire up the write returning chain
    mocks.mockReturning.mockResolvedValue([MOCK_COURSE]);
    mocks.mockWhere.mockReturnValue({ returning: mocks.mockReturning });

    service = new CourseService();
  });

  // ─── READ METHODS — must use withReadReplica ────────────────────────────

  describe('findById()', () => {
    it('calls withReadReplica', async () => {
      mocks.withReadReplicaMock.mockResolvedValueOnce([MOCK_COURSE]);
      await service.findById('course-1');
      expect(mocks.withReadReplicaMock).toHaveBeenCalledTimes(1);
    });

    it('passes a function to withReadReplica', async () => {
      mocks.withReadReplicaMock.mockResolvedValueOnce([MOCK_COURSE]);
      await service.findById('course-1');
      const [fn] = mocks.withReadReplicaMock.mock.calls[0] as [unknown];
      expect(typeof fn).toBe('function');
    });

    it('returns null when the record is not found', async () => {
      mocks.withReadReplicaMock.mockResolvedValueOnce([]);
      const result = await service.findById('nonexistent');
      expect(result).toBeNull();
    });
  });

  describe('findAll()', () => {
    it('calls withReadReplica', async () => {
      mocks.withReadReplicaMock.mockResolvedValueOnce([MOCK_COURSE]);
      await service.findAll(10, 0);
      expect(mocks.withReadReplicaMock).toHaveBeenCalledTimes(1);
    });

    it('passes a function to withReadReplica', async () => {
      mocks.withReadReplicaMock.mockResolvedValueOnce([MOCK_COURSE]);
      await service.findAll(10, 0);
      const [fn] = mocks.withReadReplicaMock.mock.calls[0] as [unknown];
      expect(typeof fn).toBe('function');
    });

    it('returns an array', async () => {
      mocks.withReadReplicaMock.mockResolvedValueOnce([MOCK_COURSE]);
      const result = await service.findAll(10, 0);
      expect(Array.isArray(result)).toBe(true);
    });
  });

  // ─── WRITE METHODS — must NOT use withReadReplica ───────────────────────

  describe('create()', () => {
    it('does NOT call withReadReplica', async () => {
      await service.create({
        tenantId: 'tenant-1',
        title: 'New Course',
        description: 'Desc',
        instructorId: 'user-1',
      });
      expect(mocks.withReadReplicaMock).not.toHaveBeenCalled();
    });

    it('calls the write db insert', async () => {
      await service.create({
        tenantId: 'tenant-1',
        title: 'New Course',
        description: 'Desc',
        instructorId: 'user-1',
      });
      expect(mocks.mockInsert).toHaveBeenCalled();
    });
  });

  describe('update()', () => {
    it('does NOT call withReadReplica', async () => {
      await service.update('course-1', { title: 'Updated' });
      expect(mocks.withReadReplicaMock).not.toHaveBeenCalled();
    });

    it('calls the write db update', async () => {
      await service.update('course-1', { title: 'Updated' });
      expect(mocks.mockUpdate).toHaveBeenCalled();
    });
  });
});
