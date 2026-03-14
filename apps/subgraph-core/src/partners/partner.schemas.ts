/**
 * partner.schemas.ts — Zod validation schemas for partner mutations.
 */
import { z } from 'zod';

export const RegeneratePartnerApiKeySchema = z.object({
  partnerId: z.string().uuid(),
});

export type RegeneratePartnerApiKeyInput = z.infer<
  typeof RegeneratePartnerApiKeySchema
>;
