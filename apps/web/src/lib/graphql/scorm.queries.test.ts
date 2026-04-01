import { describe, it, expect } from 'vitest';
import { EXPORT_COURSE_AS_SCORM_MUTATION } from './scorm.queries';

describe('scorm.queries', () => {
  it('exports EXPORT_COURSE_AS_SCORM_MUTATION as a mutation DocumentNode', () => {
    expect(EXPORT_COURSE_AS_SCORM_MUTATION).toBeDefined();
    expect(EXPORT_COURSE_AS_SCORM_MUTATION.kind).toBe('Document');
    expect(
      EXPORT_COURSE_AS_SCORM_MUTATION.definitions.length
    ).toBeGreaterThanOrEqual(1);
    const def = EXPORT_COURSE_AS_SCORM_MUTATION.definitions[0] as {
      kind: string;
      operation: string;
      name?: { value: string };
    };
    expect(def.kind).toBe('OperationDefinition');
    expect(def.operation).toBe('mutation');
    expect(def.name?.value).toBe('ExportCourseAsScorm');
  });
});
