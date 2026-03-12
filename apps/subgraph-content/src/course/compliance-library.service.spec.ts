/**
 * Unit tests for ComplianceLibraryService — Phase 64 (F-038).
 *
 * 5 tests:
 *  1. getComplianceCourses returns exactly 8 courses
 *  2. getComplianceCourses — all courses have isTemplate: true
 *  3. cloneComplianceCourse returns cloned course with isTemplate: false
 *  4. cloneComplianceCourse throws when templateCourseId not found
 *  5. onModuleDestroy calls closeAllPools
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mocks ─────────────────────────────────────────────────────────────────────

const { mockCloseAllPools } = vi.hoisted(() => ({
  mockCloseAllPools: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@edusphere/db', () => ({
  closeAllPools: mockCloseAllPools,
}));

// ── Import after mocks ────────────────────────────────────────────────────────

import { ComplianceLibraryService } from './compliance-library.service';

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('ComplianceLibraryService', () => {
  let service: ComplianceLibraryService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new ComplianceLibraryService();
  });

  it('getComplianceCourses returns exactly 8 courses', () => {
    const courses = service.getComplianceCourses();
    expect(courses).toHaveLength(8);
  });

  it('getComplianceCourses — all courses have isTemplate: true', () => {
    const courses = service.getComplianceCourses();
    expect(courses.every((c) => c.isTemplate === true)).toBe(true);
  });

  it('cloneComplianceCourse returns cloned course with isTemplate: false', async () => {
    const cloned = await service.cloneComplianceCourse(
      '00000000-0000-0000-0000-000000000c01',
      'tenant-abc',
      'user-xyz'
    );
    expect(cloned.isTemplate).toBe(false);
    expect(cloned.title).toBe('FERPA Basics for Educators');
    expect(cloned.id).toMatch(/^clone-\d+$/);
  });

  it('cloneComplianceCourse throws when templateCourseId not found', async () => {
    await expect(
      service.cloneComplianceCourse('non-existent-id', 'tenant-abc', 'user-xyz')
    ).rejects.toThrow('Compliance template not found: non-existent-id');
  });

  it('onModuleDestroy calls closeAllPools', () => {
    service.onModuleDestroy();
    expect(mockCloseAllPools).toHaveBeenCalledTimes(1);
  });
});
