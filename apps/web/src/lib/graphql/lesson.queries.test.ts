import { describe, it, expect } from 'vitest';
import {
  CREATE_LESSON_MUTATION,
  LESSONS_BY_COURSE_QUERY,
  LESSON_QUERY,
  SAVE_LESSON_PIPELINE_MUTATION,
  START_PIPELINE_RUN_MUTATION,
  CANCEL_PIPELINE_RUN_MUTATION,
  ADD_LESSON_ASSET_MUTATION,
  PUBLISH_LESSON_MUTATION,
  LESSON_PIPELINE_RUNS_QUERY,
  PIPELINE_TEMPLATES_QUERY,
  CREATE_PIPELINE_TEMPLATE_MUTATION,
  UPDATE_PIPELINE_TEMPLATE_MUTATION,
  DELETE_PIPELINE_TEMPLATE_MUTATION,
  LESSON_PIPELINE_PROGRESS_SUBSCRIPTION,
} from './lesson.queries';

describe('lesson.queries', () => {
  it('exports CREATE_LESSON_MUTATION as a mutation DocumentNode', () => {
    expect(CREATE_LESSON_MUTATION).toBeDefined();
    expect(CREATE_LESSON_MUTATION.kind).toBe('Document');
    expect(CREATE_LESSON_MUTATION.definitions.length).toBeGreaterThanOrEqual(1);
    const def = CREATE_LESSON_MUTATION.definitions[0] as {
      kind: string;
      operation: string;
      name?: { value: string };
    };
    expect(def.kind).toBe('OperationDefinition');
    expect(def.operation).toBe('mutation');
    expect(def.name?.value).toBe('CreateLesson');
  });

  it('exports LESSONS_BY_COURSE_QUERY as a query DocumentNode', () => {
    expect(LESSONS_BY_COURSE_QUERY).toBeDefined();
    expect(LESSONS_BY_COURSE_QUERY.kind).toBe('Document');
    expect(LESSONS_BY_COURSE_QUERY.definitions.length).toBeGreaterThanOrEqual(
      1
    );
    const def = LESSONS_BY_COURSE_QUERY.definitions[0] as {
      kind: string;
      operation: string;
      name?: { value: string };
    };
    expect(def.kind).toBe('OperationDefinition');
    expect(def.operation).toBe('query');
    expect(def.name?.value).toBe('LessonsByCourse');
  });

  it('exports LESSON_QUERY as a query DocumentNode', () => {
    expect(LESSON_QUERY).toBeDefined();
    expect(LESSON_QUERY.kind).toBe('Document');
    expect(LESSON_QUERY.definitions.length).toBeGreaterThanOrEqual(1);
    const def = LESSON_QUERY.definitions[0] as {
      kind: string;
      operation: string;
      name?: { value: string };
    };
    expect(def.kind).toBe('OperationDefinition');
    expect(def.operation).toBe('query');
    expect(def.name?.value).toBe('Lesson');
  });

  it('exports SAVE_LESSON_PIPELINE_MUTATION as a mutation DocumentNode', () => {
    expect(SAVE_LESSON_PIPELINE_MUTATION).toBeDefined();
    expect(SAVE_LESSON_PIPELINE_MUTATION.kind).toBe('Document');
    expect(
      SAVE_LESSON_PIPELINE_MUTATION.definitions.length
    ).toBeGreaterThanOrEqual(1);
    const def = SAVE_LESSON_PIPELINE_MUTATION.definitions[0] as {
      kind: string;
      operation: string;
      name?: { value: string };
    };
    expect(def.kind).toBe('OperationDefinition');
    expect(def.operation).toBe('mutation');
    expect(def.name?.value).toBe('SaveLessonPipeline');
  });

  it('exports START_PIPELINE_RUN_MUTATION as a mutation DocumentNode', () => {
    expect(START_PIPELINE_RUN_MUTATION).toBeDefined();
    expect(START_PIPELINE_RUN_MUTATION.kind).toBe('Document');
    expect(
      START_PIPELINE_RUN_MUTATION.definitions.length
    ).toBeGreaterThanOrEqual(1);
    const def = START_PIPELINE_RUN_MUTATION.definitions[0] as {
      kind: string;
      operation: string;
      name?: { value: string };
    };
    expect(def.kind).toBe('OperationDefinition');
    expect(def.operation).toBe('mutation');
    expect(def.name?.value).toBe('StartLessonPipelineRun');
  });

  it('exports CANCEL_PIPELINE_RUN_MUTATION as a mutation DocumentNode', () => {
    expect(CANCEL_PIPELINE_RUN_MUTATION).toBeDefined();
    expect(CANCEL_PIPELINE_RUN_MUTATION.kind).toBe('Document');
    expect(
      CANCEL_PIPELINE_RUN_MUTATION.definitions.length
    ).toBeGreaterThanOrEqual(1);
    const def = CANCEL_PIPELINE_RUN_MUTATION.definitions[0] as {
      kind: string;
      operation: string;
      name?: { value: string };
    };
    expect(def.kind).toBe('OperationDefinition');
    expect(def.operation).toBe('mutation');
    expect(def.name?.value).toBe('CancelLessonPipelineRun');
  });

  it('exports ADD_LESSON_ASSET_MUTATION as a mutation DocumentNode', () => {
    expect(ADD_LESSON_ASSET_MUTATION).toBeDefined();
    expect(ADD_LESSON_ASSET_MUTATION.kind).toBe('Document');
    expect(ADD_LESSON_ASSET_MUTATION.definitions.length).toBeGreaterThanOrEqual(
      1
    );
    const def = ADD_LESSON_ASSET_MUTATION.definitions[0] as {
      kind: string;
      operation: string;
      name?: { value: string };
    };
    expect(def.kind).toBe('OperationDefinition');
    expect(def.operation).toBe('mutation');
    expect(def.name?.value).toBe('AddLessonAsset');
  });

  it('exports PUBLISH_LESSON_MUTATION as a mutation DocumentNode', () => {
    expect(PUBLISH_LESSON_MUTATION).toBeDefined();
    expect(PUBLISH_LESSON_MUTATION.kind).toBe('Document');
    expect(PUBLISH_LESSON_MUTATION.definitions.length).toBeGreaterThanOrEqual(
      1
    );
    const def = PUBLISH_LESSON_MUTATION.definitions[0] as {
      kind: string;
      operation: string;
      name?: { value: string };
    };
    expect(def.kind).toBe('OperationDefinition');
    expect(def.operation).toBe('mutation');
    expect(def.name?.value).toBe('PublishLesson');
  });

  it('exports LESSON_PIPELINE_RUNS_QUERY as a query DocumentNode', () => {
    expect(LESSON_PIPELINE_RUNS_QUERY).toBeDefined();
    expect(LESSON_PIPELINE_RUNS_QUERY.kind).toBe('Document');
    expect(
      LESSON_PIPELINE_RUNS_QUERY.definitions.length
    ).toBeGreaterThanOrEqual(1);
    const def = LESSON_PIPELINE_RUNS_QUERY.definitions[0] as {
      kind: string;
      operation: string;
      name?: { value: string };
    };
    expect(def.kind).toBe('OperationDefinition');
    expect(def.operation).toBe('query');
    expect(def.name?.value).toBe('LessonPipelineRunHistory');
  });

  it('exports PIPELINE_TEMPLATES_QUERY as a query DocumentNode', () => {
    expect(PIPELINE_TEMPLATES_QUERY).toBeDefined();
    expect(PIPELINE_TEMPLATES_QUERY.kind).toBe('Document');
    expect(PIPELINE_TEMPLATES_QUERY.definitions.length).toBeGreaterThanOrEqual(
      1
    );
    const def = PIPELINE_TEMPLATES_QUERY.definitions[0] as {
      kind: string;
      operation: string;
      name?: { value: string };
    };
    expect(def.kind).toBe('OperationDefinition');
    expect(def.operation).toBe('query');
    expect(def.name?.value).toBe('PipelineTemplates');
  });

  it('exports CREATE_PIPELINE_TEMPLATE_MUTATION as a mutation DocumentNode', () => {
    expect(CREATE_PIPELINE_TEMPLATE_MUTATION).toBeDefined();
    expect(CREATE_PIPELINE_TEMPLATE_MUTATION.kind).toBe('Document');
    expect(
      CREATE_PIPELINE_TEMPLATE_MUTATION.definitions.length
    ).toBeGreaterThanOrEqual(1);
    const def = CREATE_PIPELINE_TEMPLATE_MUTATION.definitions[0] as {
      kind: string;
      operation: string;
      name?: { value: string };
    };
    expect(def.kind).toBe('OperationDefinition');
    expect(def.operation).toBe('mutation');
    expect(def.name?.value).toBe('CreatePipelineTemplate');
  });

  it('exports UPDATE_PIPELINE_TEMPLATE_MUTATION as a mutation DocumentNode', () => {
    expect(UPDATE_PIPELINE_TEMPLATE_MUTATION).toBeDefined();
    expect(UPDATE_PIPELINE_TEMPLATE_MUTATION.kind).toBe('Document');
    expect(
      UPDATE_PIPELINE_TEMPLATE_MUTATION.definitions.length
    ).toBeGreaterThanOrEqual(1);
    const def = UPDATE_PIPELINE_TEMPLATE_MUTATION.definitions[0] as {
      kind: string;
      operation: string;
      name?: { value: string };
    };
    expect(def.kind).toBe('OperationDefinition');
    expect(def.operation).toBe('mutation');
    expect(def.name?.value).toBe('UpdatePipelineTemplate');
  });

  it('exports DELETE_PIPELINE_TEMPLATE_MUTATION as a mutation DocumentNode', () => {
    expect(DELETE_PIPELINE_TEMPLATE_MUTATION).toBeDefined();
    expect(DELETE_PIPELINE_TEMPLATE_MUTATION.kind).toBe('Document');
    expect(
      DELETE_PIPELINE_TEMPLATE_MUTATION.definitions.length
    ).toBeGreaterThanOrEqual(1);
    const def = DELETE_PIPELINE_TEMPLATE_MUTATION.definitions[0] as {
      kind: string;
      operation: string;
      name?: { value: string };
    };
    expect(def.kind).toBe('OperationDefinition');
    expect(def.operation).toBe('mutation');
    expect(def.name?.value).toBe('DeletePipelineTemplate');
  });

  it('exports LESSON_PIPELINE_PROGRESS_SUBSCRIPTION as a subscription DocumentNode', () => {
    expect(LESSON_PIPELINE_PROGRESS_SUBSCRIPTION).toBeDefined();
    expect(LESSON_PIPELINE_PROGRESS_SUBSCRIPTION.kind).toBe('Document');
    expect(
      LESSON_PIPELINE_PROGRESS_SUBSCRIPTION.definitions.length
    ).toBeGreaterThanOrEqual(1);
    const def = LESSON_PIPELINE_PROGRESS_SUBSCRIPTION.definitions[0] as {
      kind: string;
      operation: string;
      name?: { value: string };
    };
    expect(def.kind).toBe('OperationDefinition');
    expect(def.operation).toBe('subscription');
    expect(def.name?.value).toBe('LessonPipelineProgress');
  });
});
