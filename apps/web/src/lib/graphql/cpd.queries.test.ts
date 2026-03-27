import { describe, it, expect } from 'vitest';
import { MY_CPD_REPORT_QUERY, CPD_CREDIT_TYPES_QUERY, EXPORT_CPD_REPORT_MUTATION, CREATE_CPD_CREDIT_TYPE_MUTATION, ASSIGN_CPD_CREDITS_MUTATION } from './cpd.queries';

describe('cpd.queries', () => {
  it('exports MY_CPD_REPORT_QUERY as a query DocumentNode', () => {
    expect(MY_CPD_REPORT_QUERY).toBeDefined();
    expect(MY_CPD_REPORT_QUERY.kind).toBe('Document');
    expect(MY_CPD_REPORT_QUERY.definitions.length).toBeGreaterThanOrEqual(1);
    const def = MY_CPD_REPORT_QUERY.definitions[0] as any;
    expect(def.kind).toBe('OperationDefinition');
    expect(def.operation).toBe('query');
    expect(def.name?.value).toBe('MyCpdReport');
  });

  it('exports CPD_CREDIT_TYPES_QUERY as a query DocumentNode', () => {
    expect(CPD_CREDIT_TYPES_QUERY).toBeDefined();
    expect(CPD_CREDIT_TYPES_QUERY.kind).toBe('Document');
    expect(CPD_CREDIT_TYPES_QUERY.definitions.length).toBeGreaterThanOrEqual(1);
    const def = CPD_CREDIT_TYPES_QUERY.definitions[0] as any;
    expect(def.kind).toBe('OperationDefinition');
    expect(def.operation).toBe('query');
    expect(def.name?.value).toBe('CpdCreditTypes');
  });

  it('exports EXPORT_CPD_REPORT_MUTATION as a mutation DocumentNode', () => {
    expect(EXPORT_CPD_REPORT_MUTATION).toBeDefined();
    expect(EXPORT_CPD_REPORT_MUTATION.kind).toBe('Document');
    expect(EXPORT_CPD_REPORT_MUTATION.definitions.length).toBeGreaterThanOrEqual(1);
    const def = EXPORT_CPD_REPORT_MUTATION.definitions[0] as any;
    expect(def.kind).toBe('OperationDefinition');
    expect(def.operation).toBe('mutation');
    expect(def.name?.value).toBe('ExportCpdReport');
  });

  it('exports CREATE_CPD_CREDIT_TYPE_MUTATION as a mutation DocumentNode', () => {
    expect(CREATE_CPD_CREDIT_TYPE_MUTATION).toBeDefined();
    expect(CREATE_CPD_CREDIT_TYPE_MUTATION.kind).toBe('Document');
    expect(CREATE_CPD_CREDIT_TYPE_MUTATION.definitions.length).toBeGreaterThanOrEqual(1);
    const def = CREATE_CPD_CREDIT_TYPE_MUTATION.definitions[0] as any;
    expect(def.kind).toBe('OperationDefinition');
    expect(def.operation).toBe('mutation');
    expect(def.name?.value).toBe('CreateCpdCreditType');
  });

  it('exports ASSIGN_CPD_CREDITS_MUTATION as a mutation DocumentNode', () => {
    expect(ASSIGN_CPD_CREDITS_MUTATION).toBeDefined();
    expect(ASSIGN_CPD_CREDITS_MUTATION.kind).toBe('Document');
    expect(ASSIGN_CPD_CREDITS_MUTATION.definitions.length).toBeGreaterThanOrEqual(1);
    const def = ASSIGN_CPD_CREDITS_MUTATION.definitions[0] as any;
    expect(def.kind).toBe('OperationDefinition');
    expect(def.operation).toBe('mutation');
    expect(def.name?.value).toBe('AssignCpdCreditsToCourse');
  });

});
