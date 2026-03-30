import { describe, it, expect } from 'vitest';
import {
  isLessonEvent,
  isLessonNEREntitiesEvent,
  isLessonPipelineModuleCompletedEvent,
} from './lesson-events.js';

describe('lesson-events type guards', () => {
  describe('isLessonEvent', () => {
    const valid = {
      type: 'lesson.created' as const,
      lessonId: 'l-001',
      courseId: 'c-001',
      tenantId: 't-001',
      timestamp: '2026-03-30T00:00:00Z',
    };

    it('returns true for lesson.created', () => {
      expect(isLessonEvent(valid)).toBe(true);
    });

    it('returns true for lesson.asset.uploaded', () => {
      expect(isLessonEvent({ ...valid, type: 'lesson.asset.uploaded' })).toBe(true);
    });

    it('returns true for lesson.pipeline.started', () => {
      expect(isLessonEvent({ ...valid, type: 'lesson.pipeline.started' })).toBe(true);
    });

    it('returns true for lesson.pipeline.completed', () => {
      expect(isLessonEvent({ ...valid, type: 'lesson.pipeline.completed' })).toBe(true);
    });

    it('returns true for lesson.published', () => {
      expect(isLessonEvent({ ...valid, type: 'lesson.published' })).toBe(true);
    });

    it('returns false for unknown lesson type', () => {
      expect(isLessonEvent({ ...valid, type: 'lesson.unknown' })).toBe(false);
    });

    it('returns false for null', () => {
      expect(isLessonEvent(null)).toBe(false);
    });

    it('returns false for undefined', () => {
      expect(isLessonEvent(undefined)).toBe(false);
    });

    it('returns false when lessonId missing', () => {
      const { lessonId: _, ...rest } = valid;
      expect(isLessonEvent(rest)).toBe(false);
    });

    it('returns false when courseId missing', () => {
      const { courseId: _, ...rest } = valid;
      expect(isLessonEvent(rest)).toBe(false);
    });

    it('returns false when tenantId missing', () => {
      const { tenantId: _, ...rest } = valid;
      expect(isLessonEvent(rest)).toBe(false);
    });

    it('returns false when type missing', () => {
      const { type: _, ...rest } = valid;
      expect(isLessonEvent(rest)).toBe(false);
    });

    it('returns false for non-string lessonId', () => {
      expect(isLessonEvent({ ...valid, lessonId: 42 })).toBe(false);
    });
  });

  describe('isLessonNEREntitiesEvent', () => {
    const valid = {
      type: 'lesson.ner.extracted' as const,
      tenantId: 't-001',
      lessonId: 'l-001',
      runId: 'run-001',
      entities: [
        { name: 'DNA', type: 'Concept', confidence: 0.95 },
      ],
      timestamp: '2026-03-30T00:00:00Z',
    };

    it('returns true for valid NER event', () => {
      expect(isLessonNEREntitiesEvent(valid)).toBe(true);
    });

    it('returns true with empty entities array', () => {
      expect(isLessonNEREntitiesEvent({ ...valid, entities: [] })).toBe(true);
    });

    it('returns false for null', () => {
      expect(isLessonNEREntitiesEvent(null)).toBe(false);
    });

    it('returns false for wrong type', () => {
      expect(
        isLessonNEREntitiesEvent({ ...valid, type: 'lesson.created' })
      ).toBe(false);
    });

    it('returns false when runId missing', () => {
      const { runId: _, ...rest } = valid;
      expect(isLessonNEREntitiesEvent(rest)).toBe(false);
    });

    it('returns false when entities is not array', () => {
      expect(
        isLessonNEREntitiesEvent({ ...valid, entities: 'not-array' })
      ).toBe(false);
    });
  });

  describe('isLessonPipelineModuleCompletedEvent', () => {
    const valid = {
      type: 'lesson.pipeline.module.completed' as const,
      lessonId: 'l-001',
      runId: 'run-001',
      moduleType: 'transcription',
      moduleName: 'whisper',
      status: 'COMPLETED' as const,
      tenantId: 't-001',
      timestamp: '2026-03-30T00:00:00Z',
    };

    it('returns true for valid module completed event', () => {
      expect(isLessonPipelineModuleCompletedEvent(valid)).toBe(true);
    });

    it('returns true for FAILED status', () => {
      expect(
        isLessonPipelineModuleCompletedEvent({ ...valid, status: 'FAILED' })
      ).toBe(true);
    });

    it('returns false for null', () => {
      expect(isLessonPipelineModuleCompletedEvent(null)).toBe(false);
    });

    it('returns false for wrong type', () => {
      expect(
        isLessonPipelineModuleCompletedEvent({ ...valid, type: 'lesson.created' })
      ).toBe(false);
    });

    it('returns false when runId missing', () => {
      const { runId: _, ...rest } = valid;
      expect(isLessonPipelineModuleCompletedEvent(rest)).toBe(false);
    });

    it('returns false when moduleType missing', () => {
      const { moduleType: _, ...rest } = valid;
      expect(isLessonPipelineModuleCompletedEvent(rest)).toBe(false);
    });

    it('returns false when lessonId is not a string', () => {
      expect(
        isLessonPipelineModuleCompletedEvent({ ...valid, lessonId: 42 })
      ).toBe(false);
    });
  });
});
