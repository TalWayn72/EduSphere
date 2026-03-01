import { describe, it, expect } from 'vitest';
import {
  isLessonEvent,
  isLessonPipelineModuleCompletedEvent,
  NatsSubjects,
} from './events.js';
import type {
  LessonPayload,
  LessonPipelineModuleCompletedPayload,
} from './events.js';

// ─── isLessonEvent ────────────────────────────────────────────────────────────

describe('isLessonEvent', () => {
  const base: LessonPayload = {
    type: 'lesson.created',
    lessonId: 'l-1',
    courseId: 'c-1',
    tenantId: 't-1',
    timestamp: '2026-01-01T00:00:00Z',
  };

  it('returns true for lesson.created', () => {
    expect(isLessonEvent(base)).toBe(true);
  });

  it('returns true for lesson.asset.uploaded', () => {
    expect(isLessonEvent({ ...base, type: 'lesson.asset.uploaded' })).toBe(true);
  });

  it('returns true for lesson.pipeline.started', () => {
    expect(isLessonEvent({ ...base, type: 'lesson.pipeline.started' })).toBe(true);
  });

  it('returns true for lesson.pipeline.module.completed', () => {
    expect(
      isLessonEvent({ ...base, type: 'lesson.pipeline.module.completed' })
    ).toBe(true);
  });

  it('returns true for lesson.pipeline.completed', () => {
    expect(
      isLessonEvent({ ...base, type: 'lesson.pipeline.completed' })
    ).toBe(true);
  });

  it('returns true for lesson.published', () => {
    expect(isLessonEvent({ ...base, type: 'lesson.published' })).toBe(true);
  });

  it('returns false for a session.created payload', () => {
    expect(
      isLessonEvent({ type: 'session.created', sessionId: 'x', userId: 'y' })
    ).toBe(false);
  });

  it('returns false when lessonId is missing', () => {
    const { lessonId: _drop, ...noLessonId } = base;
    expect(isLessonEvent(noLessonId)).toBe(false);
  });

  it('returns false when courseId is missing', () => {
    const { courseId: _drop, ...noCourseId } = base;
    expect(isLessonEvent(noCourseId)).toBe(false);
  });

  it('returns false for null', () => {
    expect(isLessonEvent(null)).toBe(false);
  });

  it('returns false for undefined', () => {
    expect(isLessonEvent(undefined)).toBe(false);
  });

  it('returns false for a primitive', () => {
    expect(isLessonEvent('lesson.created')).toBe(false);
  });
});

// ─── isLessonPipelineModuleCompletedEvent ─────────────────────────────────────

describe('isLessonPipelineModuleCompletedEvent', () => {
  const base: LessonPipelineModuleCompletedPayload = {
    type: 'lesson.pipeline.module.completed',
    lessonId: 'l-1',
    runId: 'run-1',
    moduleType: 'TRANSCRIPTION',
    moduleName: 'Transcription',
    status: 'COMPLETED',
    tenantId: 't-1',
    timestamp: '2026-01-01T00:00:00Z',
  };

  it('returns true for valid payload', () => {
    expect(isLessonPipelineModuleCompletedEvent(base)).toBe(true);
  });

  it('returns false when type is wrong', () => {
    expect(
      isLessonPipelineModuleCompletedEvent({ ...base, type: 'lesson.created' })
    ).toBe(false);
  });

  it('returns false when runId is missing', () => {
    const { runId: _drop, ...noRunId } = base;
    expect(isLessonPipelineModuleCompletedEvent(noRunId)).toBe(false);
  });

  it('returns false when moduleType is missing', () => {
    const { moduleType: _drop, ...noModuleType } = base;
    expect(isLessonPipelineModuleCompletedEvent(noModuleType)).toBe(false);
  });

  it('returns false for null', () => {
    expect(isLessonPipelineModuleCompletedEvent(null)).toBe(false);
  });

  it('returns false for undefined', () => {
    expect(isLessonPipelineModuleCompletedEvent(undefined)).toBe(false);
  });
});

// ─── NatsSubjects ─────────────────────────────────────────────────────────────

describe('NatsSubjects lesson entries', () => {
  it('LESSON_CREATED has EDUSPHERE. prefix', () => {
    expect(NatsSubjects.LESSON_CREATED).toBe('EDUSPHERE.lesson.created');
  });

  it('LESSON_ASSET_UPLOADED is correct', () => {
    expect(NatsSubjects.LESSON_ASSET_UPLOADED).toBe(
      'EDUSPHERE.lesson.asset.uploaded'
    );
  });

  it('LESSON_PIPELINE_STARTED is correct', () => {
    expect(NatsSubjects.LESSON_PIPELINE_STARTED).toBe(
      'EDUSPHERE.lesson.pipeline.started'
    );
  });

  it('LESSON_PIPELINE_MODULE_COMPLETED is correct', () => {
    expect(NatsSubjects.LESSON_PIPELINE_MODULE_COMPLETED).toBe(
      'EDUSPHERE.lesson.pipeline.module.completed'
    );
  });

  it('LESSON_PIPELINE_COMPLETED is correct', () => {
    expect(NatsSubjects.LESSON_PIPELINE_COMPLETED).toBe(
      'EDUSPHERE.lesson.pipeline.completed'
    );
  });

  it('LESSON_PUBLISHED is correct', () => {
    expect(NatsSubjects.LESSON_PUBLISHED).toBe('EDUSPHERE.lesson.published');
  });
});
