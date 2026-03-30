import { describe, it, expect } from 'vitest';
import { UpdateTenantPlanSchema, TenantPlanEnum } from './tenant-plan.schemas';

describe('UpdateTenantPlanSchema', () => {
  it('accepts valid input with all fields', () => {
    const input = {
      tenantId: '550e8400-e29b-41d4-a716-446655440000',
      plan: 'ENTERPRISE',
      effectiveDate: '2026-04-01T00:00:00.000Z',
    };
    const result = UpdateTenantPlanSchema.parse(input);
    expect(result.tenantId).toBe(input.tenantId);
    expect(result.plan).toBe('ENTERPRISE');
  });

  it('accepts valid input without effectiveDate', () => {
    const input = {
      tenantId: '550e8400-e29b-41d4-a716-446655440000',
      plan: 'FREE',
    };
    const result = UpdateTenantPlanSchema.parse(input);
    expect(result.plan).toBe('FREE');
    expect(result.effectiveDate).toBeUndefined();
  });

  it('rejects invalid tenant ID', () => {
    const input = { tenantId: 'not-a-uuid', plan: 'FREE' };
    expect(() => UpdateTenantPlanSchema.parse(input)).toThrow();
  });

  it('rejects invalid plan value', () => {
    const input = {
      tenantId: '550e8400-e29b-41d4-a716-446655440000',
      plan: 'INVALID_PLAN',
    };
    expect(() => UpdateTenantPlanSchema.parse(input)).toThrow();
  });

  it('validates all TenantPlan enum values', () => {
    for (const plan of ['FREE', 'STARTER', 'PROFESSIONAL', 'ENTERPRISE']) {
      expect(() => TenantPlanEnum.parse(plan)).not.toThrow();
    }
  });
});
