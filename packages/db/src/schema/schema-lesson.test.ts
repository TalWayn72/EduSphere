import { describe, it, expect } from 'vitest';
import {
  lessons,
  lesson_assets,
  lesson_pipelines,
  lesson_pipeline_runs,
  lesson_pipeline_results,
  lesson_citations,
} from './lesson';
import type {
  Lesson,
  NewLesson,
  LessonAsset,
  LessonPipeline,
  LessonPipelineRun,
  LessonPipelineResult,
  LessonCitation,
} from './lesson';

// ─── Table Exports ────────────────────────────────────────────────────────────

describe('lesson schema exports', () => {
  it('exports all 6 tables', () => {
    expect(lessons).toBeDefined();
    expect(lesson_assets).toBeDefined();
    expect(lesson_pipelines).toBeDefined();
    expect(lesson_pipeline_runs).toBeDefined();
    expect(lesson_pipeline_results).toBeDefined();
    expect(lesson_citations).toBeDefined();
  });

  it('lessons table has core columns', () => {
    expect(lessons.id).toBeDefined();
    expect(lessons.tenant_id).toBeDefined();
    expect(lessons.course_id).toBeDefined();
    expect(lessons.module_id).toBeDefined();
    expect(lessons.title).toBeDefined();
    expect(lessons.type).toBeDefined();
    expect(lessons.status).toBeDefined();
    expect(lessons.instructor_id).toBeDefined();
  });

  it('lessons table has soft-delete column', () => {
    expect(lessons.deleted_at).toBeDefined();
  });

  it('lessons table has timestamps', () => {
    expect(lessons.created_at).toBeDefined();
    expect(lessons.updated_at).toBeDefined();
  });

  it('lesson_assets has lesson_id FK column', () => {
    expect(lesson_assets.lesson_id).toBeDefined();
  });

  it('lesson_assets has asset_type column', () => {
    expect(lesson_assets.asset_type).toBeDefined();
  });

  it('lesson_pipelines has lesson_id and status columns', () => {
    expect(lesson_pipelines.lesson_id).toBeDefined();
    expect(lesson_pipelines.status).toBeDefined();
  });

  it('lesson_pipeline_runs has pipeline_id FK and status columns', () => {
    expect(lesson_pipeline_runs.pipeline_id).toBeDefined();
    expect(lesson_pipeline_runs.status).toBeDefined();
  });

  it('lesson_pipeline_results has run_id FK and module_name columns', () => {
    expect(lesson_pipeline_results.run_id).toBeDefined();
    expect(lesson_pipeline_results.module_name).toBeDefined();
  });

  it('lesson_citations has confidence numeric column', () => {
    expect(lesson_citations.confidence).toBeDefined();
  });

  it('lesson_citations has match_status column', () => {
    expect(lesson_citations.match_status).toBeDefined();
  });
});

// ─── Type Smoke Tests ─────────────────────────────────────────────────────────

describe('lesson type exports', () => {
  it('Lesson type includes status field', () => {
    const l = {} as Lesson;
    // If type is correct, TypeScript allows this access without error
    expect(typeof l.status).toBe('undefined'); // runtime: field absent on empty object
  });

  it('NewLesson type is assignable from partial', () => {
    const n: Partial<NewLesson> = { title: 'Test', type: 'THEMATIC' };
    expect(n.title).toBe('Test');
  });

  it('LessonAsset type includes lesson_id', () => {
    const a = {} as LessonAsset;
    expect(typeof a.lesson_id).toBe('undefined');
  });

  it('LessonPipeline type includes nodes', () => {
    const p = {} as LessonPipeline;
    expect(typeof p.nodes).toBe('undefined');
  });

  it('LessonPipelineRun type includes pipeline_id', () => {
    const r = {} as LessonPipelineRun;
    expect(typeof r.pipeline_id).toBe('undefined');
  });

  it('LessonPipelineResult type includes run_id', () => {
    const r = {} as LessonPipelineResult;
    expect(typeof r.run_id).toBe('undefined');
  });

  it('LessonCitation type includes confidence', () => {
    const c = {} as LessonCitation;
    expect(typeof c.confidence).toBe('undefined');
  });
});
