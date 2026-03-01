import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GraphQLError } from 'graphql';

// ─── CourseGeneratorService mock ──────────────────────────────────────────────
const mockGenerateCourse = vi.fn();

vi.mock('../ai/course-generator.service.js', () => ({
  CourseGeneratorService: class {
    generateCourse = mockGenerateCourse;
  },
}));

// ─── @edusphere/auth mock ─────────────────────────────────────────────────────
vi.mock('@edusphere/auth', () => ({}));

import { CourseGeneratorResolver } from './course-generator.resolver.js';
import { CourseGeneratorService } from '../ai/course-generator.service.js';

const makeCtx = (userId = 'user-1', tenantId = 'tenant-1') => ({
  authContext: { userId, tenantId },
});

const sampleResult = {
  executionId: 'exec-1',
  status: 'COMPLETED',
  courseTitle: 'Intro to AI',
  courseDescription: 'A course about AI',
  modules: [{ title: 'Module 1', lessons: [] }],
  draftCourseId: 'course-draft-1',
};

describe('CourseGeneratorResolver', () => {
  let resolver: CourseGeneratorResolver;

  beforeEach(() => {
    vi.clearAllMocks();
    resolver = new CourseGeneratorResolver(
      new CourseGeneratorService({} as never)
    );
  });

  describe('generateCourseFromPrompt()', () => {
    it('returns mapped result from service', async () => {
      mockGenerateCourse.mockResolvedValue(sampleResult);

      const result = await resolver.generateCourseFromPrompt(
        { prompt: 'Build a course about React' },
        makeCtx()
      );

      expect(result.executionId).toBe('exec-1');
      expect(result.courseTitle).toBe('Intro to AI');
      expect(result.modules).toHaveLength(1);
    });

    it('passes prompt and optional params to service', async () => {
      mockGenerateCourse.mockResolvedValue(sampleResult);

      await resolver.generateCourseFromPrompt(
        {
          prompt: 'Build a course',
          targetAudienceLevel: 'BEGINNER',
          estimatedHours: 10,
          language: 'he',
        },
        makeCtx()
      );

      expect(mockGenerateCourse).toHaveBeenCalledWith(
        {
          prompt: 'Build a course',
          targetAudienceLevel: 'BEGINNER',
          estimatedHours: 10,
          language: 'he',
        },
        'user-1',
        'tenant-1'
      );
    });

    it('throws GraphQLError UNAUTHORIZED when userId missing', async () => {
      const ctx = { authContext: {} };
      await expect(
        resolver.generateCourseFromPrompt({ prompt: 'test' }, ctx as never)
      ).rejects.toThrow(GraphQLError);
    });

    it('throws GraphQLError when authContext is missing', async () => {
      await expect(
        resolver.generateCourseFromPrompt({ prompt: 'test' }, {} as never)
      ).rejects.toThrow(GraphQLError);
    });

    it('uses "default" as tenantId when tenantId is null', async () => {
      mockGenerateCourse.mockResolvedValue(sampleResult);

      await resolver.generateCourseFromPrompt(
        { prompt: 'test' },
        { authContext: { userId: 'user-1', tenantId: null } } as never
      );

      expect(mockGenerateCourse).toHaveBeenCalledWith(
        expect.anything(),
        'user-1',
        'default'
      );
    });

    it('maps null courseTitle to null in response', async () => {
      mockGenerateCourse.mockResolvedValue({
        ...sampleResult,
        courseTitle: null,
        draftCourseId: null,
      });

      const result = await resolver.generateCourseFromPrompt(
        { prompt: 'test' },
        makeCtx()
      );

      expect(result.courseTitle).toBeNull();
      expect(result.draftCourseId).toBeNull();
    });
  });
});
