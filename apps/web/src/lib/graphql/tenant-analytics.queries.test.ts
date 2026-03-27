import { describe, it, expect } from 'vitest';
import { TENANT_ANALYTICS_QUERY, LEARNER_VELOCITY_QUERY, COHORT_RETENTION_QUERY, EXPORT_TENANT_ANALYTICS_MUTATION } from './tenant-analytics.queries';

describe('tenant-analytics.queries', () => {
  it('exports TENANT_ANALYTICS_QUERY as a query DocumentNode', () => {
    expect(TENANT_ANALYTICS_QUERY).toBeDefined();
    expect(TENANT_ANALYTICS_QUERY.kind).toBe('Document');
    expect(TENANT_ANALYTICS_QUERY.definitions.length).toBeGreaterThanOrEqual(1);
    const def = TENANT_ANALYTICS_QUERY.definitions[0] as { kind: string; operation: string; name?: { value: string } };
    expect(def.kind).toBe('OperationDefinition');
    expect(def.operation).toBe('query');
    expect(def.name?.value).toBe('TenantAnalytics');
  });

  it('exports LEARNER_VELOCITY_QUERY as a query DocumentNode', () => {
    expect(LEARNER_VELOCITY_QUERY).toBeDefined();
    expect(LEARNER_VELOCITY_QUERY.kind).toBe('Document');
    expect(LEARNER_VELOCITY_QUERY.definitions.length).toBeGreaterThanOrEqual(1);
    const def = LEARNER_VELOCITY_QUERY.definitions[0] as { kind: string; operation: string; name?: { value: string } };
    expect(def.kind).toBe('OperationDefinition');
    expect(def.operation).toBe('query');
    expect(def.name?.value).toBe('LearnerVelocity');
  });

  it('exports COHORT_RETENTION_QUERY as a query DocumentNode', () => {
    expect(COHORT_RETENTION_QUERY).toBeDefined();
    expect(COHORT_RETENTION_QUERY.kind).toBe('Document');
    expect(COHORT_RETENTION_QUERY.definitions.length).toBeGreaterThanOrEqual(1);
    const def = COHORT_RETENTION_QUERY.definitions[0] as { kind: string; operation: string; name?: { value: string } };
    expect(def.kind).toBe('OperationDefinition');
    expect(def.operation).toBe('query');
    expect(def.name?.value).toBe('CohortRetention');
  });

  it('exports EXPORT_TENANT_ANALYTICS_MUTATION as a mutation DocumentNode', () => {
    expect(EXPORT_TENANT_ANALYTICS_MUTATION).toBeDefined();
    expect(EXPORT_TENANT_ANALYTICS_MUTATION.kind).toBe('Document');
    expect(EXPORT_TENANT_ANALYTICS_MUTATION.definitions.length).toBeGreaterThanOrEqual(1);
    const def = EXPORT_TENANT_ANALYTICS_MUTATION.definitions[0] as { kind: string; operation: string; name?: { value: string } };
    expect(def.kind).toBe('OperationDefinition');
    expect(def.operation).toBe('mutation');
    expect(def.name?.value).toBe('ExportTenantAnalytics');
  });

});
