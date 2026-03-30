import { z } from 'zod';

export const TenantPlanEnum = z.enum([
  'FREE',
  'STARTER',
  'PROFESSIONAL',
  'ENTERPRISE',
]);

export const UpdateTenantPlanSchema = z.object({
  tenantId: z.string().uuid('Invalid tenant ID'),
  plan: TenantPlanEnum,
  effectiveDate: z.string().datetime().optional(),
});

export type UpdateTenantPlanInput = z.infer<typeof UpdateTenantPlanSchema>;
