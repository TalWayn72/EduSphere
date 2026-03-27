import { describe, it, expect } from 'vitest';
import { COMPLIANCE_COURSES_QUERY, GENERATE_COMPLIANCE_REPORT_MUTATION, UPDATE_COURSE_COMPLIANCE_MUTATION } from './compliance.queries';

describe('compliance.queries', () => {
  it('exports COMPLIANCE_COURSES_QUERY as a query DocumentNode', () => {
    expect(COMPLIANCE_COURSES_QUERY).toBeDefined();
    expect(COMPLIANCE_COURSES_QUERY.kind).toBe('Document');
    expect(COMPLIANCE_COURSES_QUERY.definitions.length).toBeGreaterThanOrEqual(1);
    const def = COMPLIANCE_COURSES_QUERY.definitions[0] as { kind: string; operation: string; name?: { value: string } };
    expect(def.kind).toBe('OperationDefinition');
    expect(def.operation).toBe('query');
    expect(def.name?.value).toBe('ComplianceCourses');
  });

  it('exports GENERATE_COMPLIANCE_REPORT_MUTATION as a mutation DocumentNode', () => {
    expect(GENERATE_COMPLIANCE_REPORT_MUTATION).toBeDefined();
    expect(GENERATE_COMPLIANCE_REPORT_MUTATION.kind).toBe('Document');
    expect(GENERATE_COMPLIANCE_REPORT_MUTATION.definitions.length).toBeGreaterThanOrEqual(1);
    const def = GENERATE_COMPLIANCE_REPORT_MUTATION.definitions[0] as { kind: string; operation: string; name?: { value: string } };
    expect(def.kind).toBe('OperationDefinition');
    expect(def.operation).toBe('mutation');
    expect(def.name?.value).toBe('GenerateComplianceReport');
  });

  it('exports UPDATE_COURSE_COMPLIANCE_MUTATION as a mutation DocumentNode', () => {
    expect(UPDATE_COURSE_COMPLIANCE_MUTATION).toBeDefined();
    expect(UPDATE_COURSE_COMPLIANCE_MUTATION.kind).toBe('Document');
    expect(UPDATE_COURSE_COMPLIANCE_MUTATION.definitions.length).toBeGreaterThanOrEqual(1);
    const def = UPDATE_COURSE_COMPLIANCE_MUTATION.definitions[0] as { kind: string; operation: string; name?: { value: string } };
    expect(def.kind).toBe('OperationDefinition');
    expect(def.operation).toBe('mutation');
    expect(def.name?.value).toBe('UpdateCourseComplianceSettings');
  });

});
