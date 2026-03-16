/**
 * Lesson Pipeline Events
 *
 * Covers: lesson lifecycle, asset uploads, pipeline orchestration
 */

export type LessonEventType =
  | 'lesson.created'
  | 'lesson.asset.uploaded'
  | 'lesson.pipeline.started'
  | 'lesson.pipeline.module.completed'
  | 'lesson.pipeline.completed'
  | 'lesson.published';

export interface LessonPayload {
  readonly type: LessonEventType;
  readonly lessonId: string;
  readonly courseId: string;
  readonly tenantId: string;
  readonly timestamp: string; // ISO 8601
}

export interface LessonPipelineModuleCompletedPayload {
  readonly type: 'lesson.pipeline.module.completed';
  readonly lessonId: string;
  readonly runId: string;
  readonly moduleType: string;
  readonly moduleName: string;
  readonly status: 'COMPLETED' | 'FAILED';
  readonly tenantId: string;
  readonly timestamp: string; // ISO 8601
}

// ─── Type Guards ─────────────────────────────────────────────────────────────

export function isLessonEvent(e: unknown): e is LessonPayload {
  if (!e || typeof e !== 'object') return false;
  const obj = e as Record<string, unknown>;
  const LESSON_EVENT_TYPES = new Set([
    'lesson.created',
    'lesson.asset.uploaded',
    'lesson.pipeline.started',
    'lesson.pipeline.module.completed',
    'lesson.pipeline.completed',
    'lesson.published',
  ]);
  return (
    typeof obj['lessonId'] === 'string' &&
    typeof obj['courseId'] === 'string' &&
    typeof obj['tenantId'] === 'string' &&
    typeof obj['type'] === 'string' &&
    LESSON_EVENT_TYPES.has(obj['type'])
  );
}

export function isLessonPipelineModuleCompletedEvent(
  e: unknown
): e is LessonPipelineModuleCompletedPayload {
  if (!e || typeof e !== 'object') return false;
  const obj = e as Record<string, unknown>;
  return (
    typeof obj['lessonId'] === 'string' &&
    typeof obj['runId'] === 'string' &&
    typeof obj['moduleType'] === 'string' &&
    obj['type'] === 'lesson.pipeline.module.completed'
  );
}
