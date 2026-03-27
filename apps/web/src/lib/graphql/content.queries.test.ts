import { describe, it, expect } from 'vitest';
import { CONTENT_ITEM_QUERY, COURSE_CONTENTS_QUERY, COURSE_DETAIL_QUERY, SEARCH_SEMANTIC_BY_TEXT_QUERY, PRESIGNED_UPLOAD_QUERY, CONFIRM_MEDIA_UPLOAD_MUTATION, CREATE_COURSE_MUTATION, ENROLL_COURSE_MUTATION, UNENROLL_COURSE_MUTATION, MY_ENROLLMENTS_QUERY, MY_COURSE_PROGRESS_QUERY, MARK_CONTENT_VIEWED_MUTATION, UPDATE_COURSE_MUTATION, COURSE_READINESS_QUERY, PUBLISH_COURSE_MUTATION, UNPUBLISH_COURSE_MUTATION, DELETE_COURSE_MUTATION, CREATE_MODULE_MUTATION, UPDATE_MODULE_MUTATION, DELETE_MODULE_MUTATION, REORDER_MODULES_MUTATION, CREATE_CONTENT_ITEM_MUTATION, FORK_COURSE_MUTATION, SEARCH_COURSES_QUERY } from './content.queries';

describe('content.queries', () => {
  it('exports CONTENT_ITEM_QUERY as a query DocumentNode', () => {
    expect(CONTENT_ITEM_QUERY).toBeDefined();
    expect(CONTENT_ITEM_QUERY.kind).toBe('Document');
    expect(CONTENT_ITEM_QUERY.definitions.length).toBeGreaterThanOrEqual(1);
    const def = CONTENT_ITEM_QUERY.definitions[0] as { kind: string; operation: string; name?: { value: string } };
    expect(def.kind).toBe('OperationDefinition');
    expect(def.operation).toBe('query');
    expect(def.name?.value).toBe('ContentItem');
  });

  it('exports COURSE_CONTENTS_QUERY as a query DocumentNode', () => {
    expect(COURSE_CONTENTS_QUERY).toBeDefined();
    expect(COURSE_CONTENTS_QUERY.kind).toBe('Document');
    expect(COURSE_CONTENTS_QUERY.definitions.length).toBeGreaterThanOrEqual(1);
    const def = COURSE_CONTENTS_QUERY.definitions[0] as { kind: string; operation: string; name?: { value: string } };
    expect(def.kind).toBe('OperationDefinition');
    expect(def.operation).toBe('query');
    expect(def.name?.value).toBe('CourseContents');
  });

  it('exports COURSE_DETAIL_QUERY as a query DocumentNode', () => {
    expect(COURSE_DETAIL_QUERY).toBeDefined();
    expect(COURSE_DETAIL_QUERY.kind).toBe('Document');
    expect(COURSE_DETAIL_QUERY.definitions.length).toBeGreaterThanOrEqual(1);
    const def = COURSE_DETAIL_QUERY.definitions[0] as { kind: string; operation: string; name?: { value: string } };
    expect(def.kind).toBe('OperationDefinition');
    expect(def.operation).toBe('query');
    expect(def.name?.value).toBe('CourseDetail');
  });

  it('exports SEARCH_SEMANTIC_BY_TEXT_QUERY as a query DocumentNode', () => {
    expect(SEARCH_SEMANTIC_BY_TEXT_QUERY).toBeDefined();
    expect(SEARCH_SEMANTIC_BY_TEXT_QUERY.kind).toBe('Document');
    expect(SEARCH_SEMANTIC_BY_TEXT_QUERY.definitions.length).toBeGreaterThanOrEqual(1);
    const def = SEARCH_SEMANTIC_BY_TEXT_QUERY.definitions[0] as { kind: string; operation: string; name?: { value: string } };
    expect(def.kind).toBe('OperationDefinition');
    expect(def.operation).toBe('query');
    expect(def.name?.value).toBe('SearchSemanticByText');
  });

  it('exports PRESIGNED_UPLOAD_QUERY as a query DocumentNode', () => {
    expect(PRESIGNED_UPLOAD_QUERY).toBeDefined();
    expect(PRESIGNED_UPLOAD_QUERY.kind).toBe('Document');
    expect(PRESIGNED_UPLOAD_QUERY.definitions.length).toBeGreaterThanOrEqual(1);
    const def = PRESIGNED_UPLOAD_QUERY.definitions[0] as { kind: string; operation: string; name?: { value: string } };
    expect(def.kind).toBe('OperationDefinition');
    expect(def.operation).toBe('query');
    expect(def.name?.value).toBe('GetPresignedUploadUrl');
  });

  it('exports CONFIRM_MEDIA_UPLOAD_MUTATION as a mutation DocumentNode', () => {
    expect(CONFIRM_MEDIA_UPLOAD_MUTATION).toBeDefined();
    expect(CONFIRM_MEDIA_UPLOAD_MUTATION.kind).toBe('Document');
    expect(CONFIRM_MEDIA_UPLOAD_MUTATION.definitions.length).toBeGreaterThanOrEqual(1);
    const def = CONFIRM_MEDIA_UPLOAD_MUTATION.definitions[0] as { kind: string; operation: string; name?: { value: string } };
    expect(def.kind).toBe('OperationDefinition');
    expect(def.operation).toBe('mutation');
    expect(def.name?.value).toBe('ConfirmMediaUpload');
  });

  it('exports CREATE_COURSE_MUTATION as a mutation DocumentNode', () => {
    expect(CREATE_COURSE_MUTATION).toBeDefined();
    expect(CREATE_COURSE_MUTATION.kind).toBe('Document');
    expect(CREATE_COURSE_MUTATION.definitions.length).toBeGreaterThanOrEqual(1);
    const def = CREATE_COURSE_MUTATION.definitions[0] as { kind: string; operation: string; name?: { value: string } };
    expect(def.kind).toBe('OperationDefinition');
    expect(def.operation).toBe('mutation');
    expect(def.name?.value).toBe('CreateCourse');
  });

  it('exports ENROLL_COURSE_MUTATION as a mutation DocumentNode', () => {
    expect(ENROLL_COURSE_MUTATION).toBeDefined();
    expect(ENROLL_COURSE_MUTATION.kind).toBe('Document');
    expect(ENROLL_COURSE_MUTATION.definitions.length).toBeGreaterThanOrEqual(1);
    const def = ENROLL_COURSE_MUTATION.definitions[0] as { kind: string; operation: string; name?: { value: string } };
    expect(def.kind).toBe('OperationDefinition');
    expect(def.operation).toBe('mutation');
    expect(def.name?.value).toBe('EnrollCourse');
  });

  it('exports UNENROLL_COURSE_MUTATION as a mutation DocumentNode', () => {
    expect(UNENROLL_COURSE_MUTATION).toBeDefined();
    expect(UNENROLL_COURSE_MUTATION.kind).toBe('Document');
    expect(UNENROLL_COURSE_MUTATION.definitions.length).toBeGreaterThanOrEqual(1);
    const def = UNENROLL_COURSE_MUTATION.definitions[0] as { kind: string; operation: string; name?: { value: string } };
    expect(def.kind).toBe('OperationDefinition');
    expect(def.operation).toBe('mutation');
    expect(def.name?.value).toBe('UnenrollCourse');
  });

  it('exports MY_ENROLLMENTS_QUERY as a query DocumentNode', () => {
    expect(MY_ENROLLMENTS_QUERY).toBeDefined();
    expect(MY_ENROLLMENTS_QUERY.kind).toBe('Document');
    expect(MY_ENROLLMENTS_QUERY.definitions.length).toBeGreaterThanOrEqual(1);
    const def = MY_ENROLLMENTS_QUERY.definitions[0] as { kind: string; operation: string; name?: { value: string } };
    expect(def.kind).toBe('OperationDefinition');
    expect(def.operation).toBe('query');
    expect(def.name?.value).toBe('MyEnrollments');
  });

  it('exports MY_COURSE_PROGRESS_QUERY as a query DocumentNode', () => {
    expect(MY_COURSE_PROGRESS_QUERY).toBeDefined();
    expect(MY_COURSE_PROGRESS_QUERY.kind).toBe('Document');
    expect(MY_COURSE_PROGRESS_QUERY.definitions.length).toBeGreaterThanOrEqual(1);
    const def = MY_COURSE_PROGRESS_QUERY.definitions[0] as { kind: string; operation: string; name?: { value: string } };
    expect(def.kind).toBe('OperationDefinition');
    expect(def.operation).toBe('query');
    expect(def.name?.value).toBe('MyCourseProgress');
  });

  it('exports MARK_CONTENT_VIEWED_MUTATION as a mutation DocumentNode', () => {
    expect(MARK_CONTENT_VIEWED_MUTATION).toBeDefined();
    expect(MARK_CONTENT_VIEWED_MUTATION.kind).toBe('Document');
    expect(MARK_CONTENT_VIEWED_MUTATION.definitions.length).toBeGreaterThanOrEqual(1);
    const def = MARK_CONTENT_VIEWED_MUTATION.definitions[0] as { kind: string; operation: string; name?: { value: string } };
    expect(def.kind).toBe('OperationDefinition');
    expect(def.operation).toBe('mutation');
    expect(def.name?.value).toBe('MarkContentViewed');
  });

  it('exports UPDATE_COURSE_MUTATION as a mutation DocumentNode', () => {
    expect(UPDATE_COURSE_MUTATION).toBeDefined();
    expect(UPDATE_COURSE_MUTATION.kind).toBe('Document');
    expect(UPDATE_COURSE_MUTATION.definitions.length).toBeGreaterThanOrEqual(1);
    const def = UPDATE_COURSE_MUTATION.definitions[0] as { kind: string; operation: string; name?: { value: string } };
    expect(def.kind).toBe('OperationDefinition');
    expect(def.operation).toBe('mutation');
    expect(def.name?.value).toBe('UpdateCourse');
  });

  it('exports COURSE_READINESS_QUERY as a query DocumentNode', () => {
    expect(COURSE_READINESS_QUERY).toBeDefined();
    expect(COURSE_READINESS_QUERY.kind).toBe('Document');
    expect(COURSE_READINESS_QUERY.definitions.length).toBeGreaterThanOrEqual(1);
    const def = COURSE_READINESS_QUERY.definitions[0] as { kind: string; operation: string; name?: { value: string } };
    expect(def.kind).toBe('OperationDefinition');
    expect(def.operation).toBe('query');
    expect(def.name?.value).toBe('CourseReadiness');
  });

  it('exports PUBLISH_COURSE_MUTATION as a mutation DocumentNode', () => {
    expect(PUBLISH_COURSE_MUTATION).toBeDefined();
    expect(PUBLISH_COURSE_MUTATION.kind).toBe('Document');
    expect(PUBLISH_COURSE_MUTATION.definitions.length).toBeGreaterThanOrEqual(1);
    const def = PUBLISH_COURSE_MUTATION.definitions[0] as { kind: string; operation: string; name?: { value: string } };
    expect(def.kind).toBe('OperationDefinition');
    expect(def.operation).toBe('mutation');
    expect(def.name?.value).toBe('PublishCourse');
  });

  it('exports UNPUBLISH_COURSE_MUTATION as a mutation DocumentNode', () => {
    expect(UNPUBLISH_COURSE_MUTATION).toBeDefined();
    expect(UNPUBLISH_COURSE_MUTATION.kind).toBe('Document');
    expect(UNPUBLISH_COURSE_MUTATION.definitions.length).toBeGreaterThanOrEqual(1);
    const def = UNPUBLISH_COURSE_MUTATION.definitions[0] as { kind: string; operation: string; name?: { value: string } };
    expect(def.kind).toBe('OperationDefinition');
    expect(def.operation).toBe('mutation');
    expect(def.name?.value).toBe('UnpublishCourse');
  });

  it('exports DELETE_COURSE_MUTATION as a mutation DocumentNode', () => {
    expect(DELETE_COURSE_MUTATION).toBeDefined();
    expect(DELETE_COURSE_MUTATION.kind).toBe('Document');
    expect(DELETE_COURSE_MUTATION.definitions.length).toBeGreaterThanOrEqual(1);
    const def = DELETE_COURSE_MUTATION.definitions[0] as { kind: string; operation: string; name?: { value: string } };
    expect(def.kind).toBe('OperationDefinition');
    expect(def.operation).toBe('mutation');
    expect(def.name?.value).toBe('DeleteCourse');
  });

  it('exports CREATE_MODULE_MUTATION as a mutation DocumentNode', () => {
    expect(CREATE_MODULE_MUTATION).toBeDefined();
    expect(CREATE_MODULE_MUTATION.kind).toBe('Document');
    expect(CREATE_MODULE_MUTATION.definitions.length).toBeGreaterThanOrEqual(1);
    const def = CREATE_MODULE_MUTATION.definitions[0] as { kind: string; operation: string; name?: { value: string } };
    expect(def.kind).toBe('OperationDefinition');
    expect(def.operation).toBe('mutation');
    expect(def.name?.value).toBe('CreateModule');
  });

  it('exports UPDATE_MODULE_MUTATION as a mutation DocumentNode', () => {
    expect(UPDATE_MODULE_MUTATION).toBeDefined();
    expect(UPDATE_MODULE_MUTATION.kind).toBe('Document');
    expect(UPDATE_MODULE_MUTATION.definitions.length).toBeGreaterThanOrEqual(1);
    const def = UPDATE_MODULE_MUTATION.definitions[0] as { kind: string; operation: string; name?: { value: string } };
    expect(def.kind).toBe('OperationDefinition');
    expect(def.operation).toBe('mutation');
    expect(def.name?.value).toBe('UpdateModule');
  });

  it('exports DELETE_MODULE_MUTATION as a mutation DocumentNode', () => {
    expect(DELETE_MODULE_MUTATION).toBeDefined();
    expect(DELETE_MODULE_MUTATION.kind).toBe('Document');
    expect(DELETE_MODULE_MUTATION.definitions.length).toBeGreaterThanOrEqual(1);
    const def = DELETE_MODULE_MUTATION.definitions[0] as { kind: string; operation: string; name?: { value: string } };
    expect(def.kind).toBe('OperationDefinition');
    expect(def.operation).toBe('mutation');
    expect(def.name?.value).toBe('DeleteModule');
  });

  it('exports REORDER_MODULES_MUTATION as a mutation DocumentNode', () => {
    expect(REORDER_MODULES_MUTATION).toBeDefined();
    expect(REORDER_MODULES_MUTATION.kind).toBe('Document');
    expect(REORDER_MODULES_MUTATION.definitions.length).toBeGreaterThanOrEqual(1);
    const def = REORDER_MODULES_MUTATION.definitions[0] as { kind: string; operation: string; name?: { value: string } };
    expect(def.kind).toBe('OperationDefinition');
    expect(def.operation).toBe('mutation');
    expect(def.name?.value).toBe('ReorderModules');
  });

  it('exports CREATE_CONTENT_ITEM_MUTATION as a mutation DocumentNode', () => {
    expect(CREATE_CONTENT_ITEM_MUTATION).toBeDefined();
    expect(CREATE_CONTENT_ITEM_MUTATION.kind).toBe('Document');
    expect(CREATE_CONTENT_ITEM_MUTATION.definitions.length).toBeGreaterThanOrEqual(1);
    const def = CREATE_CONTENT_ITEM_MUTATION.definitions[0] as { kind: string; operation: string; name?: { value: string } };
    expect(def.kind).toBe('OperationDefinition');
    expect(def.operation).toBe('mutation');
    expect(def.name?.value).toBe('CreateContentItem');
  });

  it('exports FORK_COURSE_MUTATION as a mutation DocumentNode', () => {
    expect(FORK_COURSE_MUTATION).toBeDefined();
    expect(FORK_COURSE_MUTATION.kind).toBe('Document');
    expect(FORK_COURSE_MUTATION.definitions.length).toBeGreaterThanOrEqual(1);
    const def = FORK_COURSE_MUTATION.definitions[0] as { kind: string; operation: string; name?: { value: string } };
    expect(def.kind).toBe('OperationDefinition');
    expect(def.operation).toBe('mutation');
    expect(def.name?.value).toBe('ForkCourse');
  });

  it('exports SEARCH_COURSES_QUERY as a query DocumentNode', () => {
    expect(SEARCH_COURSES_QUERY).toBeDefined();
    expect(SEARCH_COURSES_QUERY.kind).toBe('Document');
    expect(SEARCH_COURSES_QUERY.definitions.length).toBeGreaterThanOrEqual(1);
    const def = SEARCH_COURSES_QUERY.definitions[0] as { kind: string; operation: string; name?: { value: string } };
    expect(def.kind).toBe('OperationDefinition');
    expect(def.operation).toBe('query');
    expect(def.name?.value).toBe('SearchCourses');
  });

});
